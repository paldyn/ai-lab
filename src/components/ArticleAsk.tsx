import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Sparkles, X } from 'lucide-react';
import {
  articleAskErrorMessage,
  buildArticleQuestionContext,
  buildArticleSelectionContext,
  captureArticleTextSelection,
  requestArticleAnswer,
  type ArticleTextSelection,
} from '../lib/articleAsk';
import { captureFocusOrigin, focusQuietly, restoreFocus } from '../lib/restoreFocus';

interface ArticleAskProps {
  title: string;
  fallbackContext: string;
  proseRef: RefObject<HTMLDivElement | null>;
  ready: boolean;
}

interface ActiveSelection {
  context: string;
  text: string;
}

interface AnswerState {
  html: string;
  question: string;
}

const REQUEST_TIMEOUT_MS = 45_000;
const DEFAULT_COMPOSER_HEIGHT = 150;
const MIN_COMPOSER_HEIGHT = 142;
const MAX_COMPOSER_HEIGHT = 320;
const subscribeHydration = () => () => {};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ArticleAsk({ title, fallbackContext, proseRef, ready }: ArticleAskProps) {
  // 서버와 hydration 첫 렌더에는 portal을 비워 두고, DOM을 이어받은 뒤 host를 찾습니다.
  const hydrated = useSyncExternalStore(subscribeHydration, () => true, () => false);
  const portalHost = hydrated ? document.getElementById('article-assistant-root') : null;
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [activeSelection, setActiveSelection] = useState<ActiveSelection | null>(null);
  const [selectionPrompt, setSelectionPrompt] = useState<ArticleTextSelection | null>(null);
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [composerHeight, setComposerHeight] = useState(DEFAULT_COMPOSER_HEIGHT);
  const [resizingComposer, setResizingComposer] = useState(false);
  const panelState = loading || error || answer || activeSelection ? 'active' : 'idle';

  const selectionButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestSerialRef = useRef(0);
  const resizeStartRef = useRef<{ pointerId: number; y: number; height: number } | null>(null);

  const composerBounds = useCallback(() => {
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? window.innerHeight;
    return {
      min: MIN_COMPOSER_HEIGHT,
      // 헤더와 답변 영역이 최소한으로 남도록 패널 높이에 맞춰 상한을 낮춥니다.
      max: Math.max(MIN_COMPOSER_HEIGHT, Math.min(MAX_COMPOSER_HEIGHT, panelHeight - 165)),
    };
  }, []);

  const close = useCallback(() => {
    requestSerialRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    document.getElementById('root')?.removeAttribute('data-article-ai-open');
    setLoading(false);
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const origin = captureFocusOrigin();
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      // 더 위에 열린 전역 검색·라이트박스가 이미 받은 Esc까지 가로채지 않습니다.
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };

    document.addEventListener('keydown', handleKeyDown);
    if (origin.keyboard) textareaRef.current?.focus({ preventScroll: true });
    else focusQuietly(textareaRef.current);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocus(origin);
    };
  }, [close, open]);

  useEffect(() => {
    if (!open) return undefined;

    const fitComposer = () => {
      const bounds = composerBounds();
      setComposerHeight((height) => clamp(height, bounds.min, bounds.max));
    };

    fitComposer();
    window.addEventListener('resize', fitComposer, { passive: true });
    return () => window.removeEventListener('resize', fitComposer);
  }, [composerBounds, open, panelState]);

  useEffect(() => {
    if (!loading) return undefined;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setThinkingSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [loading]);

  // 경로 이동으로 패널이 사라질 때도 레이아웃 예약 상태가 남지 않게 합니다.
  useEffect(
    () => () => document.getElementById('root')?.removeAttribute('data-article-ai-open'),
    [],
  );

  useEffect(() => {
    const root = proseRef.current;
    if (!ready || !root) return undefined;

    let frame = 0;
    const inspect = () => {
      frame = 0;
      if (open) {
        setSelectionPrompt(null);
        return;
      }

      const next = captureArticleTextSelection(root, document.getSelection());
      // 키보드로 선택한 뒤 Tab으로 CTA에 닿을 때 selection이 먼저 접힐 수 있습니다.
      // 이미 CTA가 포커스를 받았다면 저장해 둔 범위를 한 번 더 쓸 수 있게 남깁니다.
      if (!next && document.activeElement === selectionButtonRef.current) return;
      setSelectionPrompt(next);
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(inspect);
    };
    const clearAway = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (root.contains(target) || selectionButtonRef.current?.contains(target)) return;
      setSelectionPrompt(null);
    };

    document.addEventListener('selectionchange', schedule);
    document.addEventListener('pointerdown', clearAway, true);
    root.addEventListener('pointerup', schedule);
    root.addEventListener('keyup', schedule);
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', schedule);
      document.removeEventListener('pointerdown', clearAway, true);
      root.removeEventListener('pointerup', schedule);
      root.removeEventListener('keyup', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
    };
  }, [open, proseRef, ready]);

  useEffect(
    () => () => {
      requestSerialRef.current += 1;
      requestRef.current?.abort();
    },
    [],
  );

  const openGeneral = () => {
    setActiveSelection(null);
    setSelectionPrompt(null);
    setError('');
    // 패널을 그리기 전에 공간부터 예약해 첫 프레임에도 본문과 겹치지 않게 합니다.
    document.getElementById('root')?.setAttribute('data-article-ai-open', '');
    setOpen(true);
  };

  const openFromSelection = () => {
    const root = proseRef.current;
    if (!root || !selectionPrompt) return;

    setActiveSelection({
      context: buildArticleSelectionContext(root, selectionPrompt.range, selectionPrompt.selectedText),
      text: selectionPrompt.selectedText,
    });
    setAnswer(null);
    setError('');
    setQuestion('');
    setSelectionPrompt(null);
    document.getElementById('root')?.setAttribute('data-article-ai-open', '');
    setOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    const context = activeSelection?.context ||
      buildArticleQuestionContext(proseRef.current, trimmedQuestion, fallbackContext);
    const controller = new AbortController();
    const serial = requestSerialRef.current + 1;
    requestSerialRef.current = serial;
    requestRef.current?.abort();
    requestRef.current = controller;

    setLoading(true);
    setThinkingSeconds(0);
    setQuestion('');
    setError('');
    setAnswer(null);
    if (contentRef.current) contentRef.current.scrollTop = 0;

    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await requestArticleAnswer(
        {
          title,
          context,
          selectedText: activeSelection?.text ?? '',
          question: trimmedQuestion,
        },
        controller.signal,
      );

      if (requestSerialRef.current !== serial) return;
      // Markdown 도구 묶음은 답변을 받은 뒤에만 내려받습니다. 글을 읽기만 하는 방문자의
      // 첫 번들에 parser와 sanitizer를 싣지 않습니다.
      const { renderAiMarkdown } = await import('../lib/aiMarkdown');
      if (requestSerialRef.current !== serial) return;
      setAnswer({
        // renderAiMarkdown은 raw HTML을 버리고 allowlist sanitize를 통과한 HTML만 돌려줍니다.
        html: renderAiMarkdown(response.answer),
        question: trimmedQuestion,
      });
    } catch (caught) {
      if (requestSerialRef.current !== serial) return;
      setError(articleAskErrorMessage(caught));
    } finally {
      window.clearTimeout(timeout);
      if (requestSerialRef.current === serial) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleQuestionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const startComposerResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    resizeStartRef.current = {
      pointerId: event.pointerId,
      y: event.clientY,
      height: formRef.current?.getBoundingClientRect().height ?? composerHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setResizingComposer(true);
  };

  const resizeComposer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = resizeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const bounds = composerBounds();
    setComposerHeight(clamp(start.height + start.y - event.clientY, bounds.min, bounds.max));
  };

  const stopComposerResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeStartRef.current?.pointerId !== event.pointerId) return;
    resizeStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setResizingComposer(false);
  };

  const handleComposerResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const bounds = composerBounds();
    let next: number | null = null;

    if (event.key === 'ArrowUp') next = composerHeight + 16;
    if (event.key === 'ArrowDown') next = composerHeight - 16;
    if (event.key === 'Home') next = bounds.min;
    if (event.key === 'End') next = bounds.max;
    if (next === null) return;

    event.preventDefault();
    setComposerHeight(clamp(next, bounds.min, bounds.max));
  };

  const selectionStyle = useMemo<CSSProperties | undefined>(() => {
    if (!selectionPrompt) return undefined;
    return {
      left: selectionPrompt.placement.left,
      top: selectionPrompt.placement.top,
      '--selection-ask-shift': selectionPrompt.placement.above ? '-100%' : '0%',
    } as CSSProperties;
  }, [selectionPrompt]);

  if (!portalHost) return null;

  return createPortal(
    <div className="article-ai-layer">
      {!open && (
        <button
          type="button"
          className="article-ai-trigger"
          onClick={openGeneral}
          aria-haspopup="dialog"
          aria-controls="article-ai-panel"
        >
          <Sparkles size={16} strokeWidth={1.7} aria-hidden="true" />
          <span>AI에게 질문하기</span>
        </button>
      )}

      {!open && selectionPrompt && (
        <button
          ref={selectionButtonRef}
          type="button"
          className="article-selection-ask"
          style={selectionStyle}
          onPointerDown={(event) => event.preventDefault()}
          onClick={openFromSelection}
        >
          <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
          AI에게 물어보기
        </button>
      )}

      {open && (
        <section
          ref={panelRef}
          id="article-ai-panel"
          className="article-ai-panel"
          data-state={panelState}
          role="dialog"
          aria-labelledby="article-ai-title"
          aria-describedby="article-ai-disclosure"
        >
          <header className="article-ai-bar">
            <p id="article-ai-title"><span aria-hidden="true" /> PALDYN / ARTICLE AI</p>
            <button type="button" onClick={close} aria-label="AI 질문 패널 닫기" title="닫기">
              <X size={17} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </header>

          <div ref={contentRef} className="article-ai-content" aria-live="polite" aria-busy={loading}>
            {activeSelection && (
              <aside className="article-ai-selection" aria-label="선택한 본문">
                <div>
                  <span>선택한 본문</span>
                  <button type="button" onClick={() => setActiveSelection(null)}>선택 해제</button>
                </div>
                <blockquote>{activeSelection.text}</blockquote>
              </aside>
            )}

            {!loading && !error && !answer && (
              <div className="article-ai-empty">
                <Sparkles size={18} strokeWidth={1.5} aria-hidden="true" />
                <p>글의 개념, 수식, 코드에 대해 물어보세요.</p>
                <span>질문과 관련된 문단을 골라 답변의 문맥으로 사용합니다.</span>
              </div>
            )}

            {loading && (
              <div className="article-ai-loading" role="status">
                <span className="article-ai-loading-dots" aria-hidden="true"><i /><i /><i /></span>
                <p>
                  생각 중
                  <span className="article-ai-loading-time" aria-hidden="true"> · {thinkingSeconds}초</span>
                </p>
              </div>
            )}

            {error && (
              <div className="article-ai-error" role="alert">
                <p>{error}</p>
              </div>
            )}

            {answer && (
              <div className="article-ai-answer">
                <p className="article-ai-question">Q. {answer.question}</p>
                <div
                  className="article-ai-markdown"
                  // AI 출력은 renderAiMarkdown의 HTML allowlist와 URL 검사를 통과했습니다.
                  dangerouslySetInnerHTML={{ __html: answer.html }}
                />
              </div>
            )}
          </div>

          <form
            ref={formRef}
            className="article-ai-form"
            data-resizing={resizingComposer ? '' : undefined}
            style={{ height: composerHeight }}
            onSubmit={submit}
          >
            <div
              className="article-ai-resize-handle"
              role="slider"
              aria-label="질문 입력 영역 높이 조절"
              aria-orientation="vertical"
              aria-valuemin={MIN_COMPOSER_HEIGHT}
              aria-valuemax={MAX_COMPOSER_HEIGHT}
              aria-valuenow={Math.round(composerHeight)}
              tabIndex={0}
              onKeyDown={handleComposerResizeKeyDown}
              onPointerDown={startComposerResize}
              onPointerMove={resizeComposer}
              onPointerUp={stopComposerResize}
              onPointerCancel={stopComposerResize}
              onLostPointerCapture={() => {
                resizeStartRef.current = null;
                setResizingComposer(false);
              }}
            />
            <label htmlFor="article-ai-question" className="sr-only">현재 글에 질문하기</label>
            <textarea
              ref={textareaRef}
              id="article-ai-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              placeholder="이 글에 대해 질문하세요"
              rows={3}
              maxLength={1_000}
              readOnly={loading}
              aria-disabled={loading}
            />
            <div className="article-ai-form-foot">
              <div className="article-ai-form-notes">
                <p className="article-ai-shortcut"><kbd>Enter</kbd> 전송 · <kbd>Shift + Enter</kbd> 줄바꿈</p>
                <p id="article-ai-disclosure" className="article-ai-disclosure">
                  질문과 관련 본문이 AI 답변 생성을 위해 전송됩니다.<br />
                  개인정보는 입력하지 마세요.
                </p>
              </div>
              <button type="submit" disabled={loading || !question.trim()}>
                <span>전송</span>
                <ArrowUp size={15} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      )}
    </div>,
    portalHost,
  );
}
