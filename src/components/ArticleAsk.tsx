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
  calculateArticlePanelGeometry,
  captureArticleTextSelection,
  requestArticleAnswer,
  type ArticlePanelGeometry,
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

interface ArticleMobileViewport {
  compact: boolean;
  height: number;
  keyboardOpen: boolean;
  left: number;
  top: number;
  width: number;
}

const REQUEST_TIMEOUT_MS = 45_000;
const DEFAULT_COMPOSER_HEIGHT = 170;
const MIN_COMPOSER_HEIGHT = 142;
const MAX_COMPOSER_HEIGHT = 320;
const MOBILE_PANEL_BREAKPOINT = 640;
const MOBILE_LANDSCAPE_MAX_WIDTH = 960;
const MOBILE_LANDSCAPE_MAX_HEIGHT = 520;
const MOBILE_KEYBOARD_MIN_INSET = 120;
const MOBILE_KEYBOARD_MIN_COMPOSER_HEIGHT = 108;
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
  const [composerMaxHeight, setComposerMaxHeight] = useState(MAX_COMPOSER_HEIGHT);
  const [resizingComposer, setResizingComposer] = useState(false);
  const [mobileViewport, setMobileViewport] = useState<ArticleMobileViewport | null>(null);
  const [panelGeometry, setPanelGeometry] = useState<ArticlePanelGeometry>({
    placement: 'sheet',
    left: 16,
    width: 640,
  });

  const selectionButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const requestSerialRef = useRef(0);
  const resizeStartRef = useRef<{ pointerId: number; y: number; height: number } | null>(null);
  const mobileViewportBaselineRef = useRef<{ height: number; width: number } | null>(null);

  const readPanelGeometry = useCallback((): ArticlePanelGeometry => {
    const prose = ready ? proseRef.current : null;
    const rect = prose?.getBoundingClientRect();
    return calculateArticlePanelGeometry(
      document.documentElement.clientWidth,
      window.innerHeight,
      rect
        ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }
        : null,
    );
  }, [proseRef, ready]);

  const syncPanelGeometry = useCallback(() => {
    const next = readPanelGeometry();
    document.getElementById('root')?.setAttribute('data-article-ai-placement', next.placement);
    setPanelGeometry((current) => (
      current.placement === next.placement &&
      Math.abs(current.left - next.left) < 1 &&
      Math.abs(current.width - next.width) < 1
        ? current
        : next
    ));
  }, [readPanelGeometry]);

  const syncMobileViewport = useCallback(() => {
    const viewport = window.visualViewport;
    const viewportLeft = Math.max(0, viewport?.offsetLeft ?? 0);
    const viewportTop = Math.max(0, viewport?.offsetTop ?? 0);
    const viewportWidth = Math.max(0, viewport?.width ?? document.documentElement.clientWidth);
    const viewportHeight = Math.max(0, viewport?.height ?? window.innerHeight);
    const measuredLayoutHeight = Math.max(
      viewportHeight,
      window.innerHeight,
      document.documentElement.clientHeight,
    );
    const mobileSheet = window.innerWidth <= MOBILE_PANEL_BREAKPOINT || (
      viewportWidth <= MOBILE_LANDSCAPE_MAX_WIDTH &&
      measuredLayoutHeight <= MOBILE_LANDSCAPE_MAX_HEIGHT
    );
    if (!mobileSheet) {
      mobileViewportBaselineRef.current = null;
      setMobileViewport((current) => (current ? null : current));
      return;
    }

    const previousBaseline = mobileViewportBaselineRef.current;
    const orientationChanged = previousBaseline &&
      Math.abs(previousBaseline.width - viewportWidth) >= 80;
    const baselineHeight = !previousBaseline || orientationChanged
      ? measuredLayoutHeight
      : Math.max(previousBaseline.height, measuredLayoutHeight);
    mobileViewportBaselineRef.current = { height: baselineHeight, width: viewportWidth };
    const keyboardOpen = Boolean(
      viewport && baselineHeight - viewportHeight >= MOBILE_KEYBOARD_MIN_INSET,
    );
    const sheetHorizontalInset = 12;
    const sheetTopInset = 12;
    // 키보드 경계와 패널 테두리가 맞닿으면 iOS에서 아래 모서리가 잘려 보입니다.
    const sheetBottomInset = keyboardOpen ? 20 : 16;
    const sheetHeight = Math.min(
      520,
      Math.max(320, viewportHeight * 0.6),
      Math.max(0, viewportHeight - sheetTopInset - sheetBottomInset),
    );
    if (keyboardOpen) {
      // 키보드 위의 짧은 viewport에서는 답변 공간을 우선하고 조절 손잡이를 멈춥니다.
      resizeStartRef.current = null;
      setResizingComposer(false);
      setComposerHeight(clamp(
        sheetHeight - 49 - 24,
        MOBILE_KEYBOARD_MIN_COMPOSER_HEIGHT,
        MIN_COMPOSER_HEIGHT,
      ));
    } else {
      setComposerHeight((height) => Math.max(MIN_COMPOSER_HEIGHT, height));
    }
    const next = {
      compact: viewportHeight <= 520,
      height: Math.floor(sheetHeight),
      keyboardOpen,
      left: Math.ceil(viewportLeft + sheetHorizontalInset),
      top: Math.floor(viewportTop + viewportHeight - sheetHeight - sheetBottomInset),
      width: Math.floor(Math.max(0, viewportWidth - sheetHorizontalInset * 2)),
    };

    setMobileViewport((current) => (
      current &&
      current.compact === next.compact &&
      current.keyboardOpen === next.keyboardOpen &&
      Math.abs(current.height - next.height) < 1 &&
      Math.abs(current.left - next.left) < 1 &&
      Math.abs(current.top - next.top) < 1 &&
      Math.abs(current.width - next.width) < 1
        ? current
        : next
    ));
  }, []);

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
    const pageRoot = document.getElementById('root');
    pageRoot?.removeAttribute('data-article-ai-open');
    pageRoot?.removeAttribute('data-article-ai-placement');
    mobileViewportBaselineRef.current = null;
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

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', syncMobileViewport, { passive: true });
    viewport?.addEventListener('scroll', syncMobileViewport, { passive: true });
    window.addEventListener('orientationchange', syncMobileViewport, { passive: true });

    return () => {
      viewport?.removeEventListener('resize', syncMobileViewport);
      viewport?.removeEventListener('scroll', syncMobileViewport);
      window.removeEventListener('orientationchange', syncMobileViewport);
    };
  }, [open, syncMobileViewport]);

  useEffect(() => {
    if (!open) return undefined;

    const panel = panelRef.current;
    if (!panel) return undefined;

    let startPoint: { x: number; y: number } | null = null;
    let previousY: number | null = null;
    let scrollArea: HTMLElement | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        startPoint = null;
        previousY = null;
        scrollArea = null;
        return;
      }

      const touch = event.touches[0];
      const target = event.target instanceof Element ? event.target : null;
      const candidate = target?.closest<HTMLElement>('.article-ai-content, textarea') ?? null;
      startPoint = { x: touch.clientX, y: touch.clientY };
      previousY = touch.clientY;
      scrollArea = candidate && panel.contains(candidate) ? candidate : null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      if (!startPoint || previousY === null || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const currentY = touch.clientY;
      const scrollDelta = previousY - currentY;
      previousY = currentY;
      const totalX = touch.clientX - startPoint.x;
      const totalY = currentY - startPoint.y;
      if (Math.abs(scrollDelta) < 0.5 || Math.abs(totalY) <= Math.abs(totalX)) return;

      const maxScrollTop = scrollArea
        ? Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight)
        : 0;
      const canScroll = scrollArea && panel.contains(scrollArea) && maxScrollTop > 1 &&
        (scrollDelta < 0 ? scrollArea.scrollTop > 1 : scrollArea.scrollTop < maxScrollTop - 1);

      // 패널 안에서 시작한 제스처가 끝에 닿아도 뒤의 글로 이어지지 않게 합니다.
      if (!canScroll && event.cancelable) event.preventDefault();
    };
    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0];
        startPoint = { x: touch.clientX, y: touch.clientY };
        previousY = touch.clientY;
        return;
      }

      startPoint = null;
      previousY = null;
      scrollArea = null;
    };

    panel.addEventListener('touchstart', handleTouchStart, { passive: true });
    panel.addEventListener('touchmove', handleTouchMove, { passive: false });
    panel.addEventListener('touchend', handleTouchEnd, { passive: true });
    panel.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      panel.removeEventListener('touchstart', handleTouchStart);
      panel.removeEventListener('touchmove', handleTouchMove);
      panel.removeEventListener('touchend', handleTouchEnd);
      panel.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [open]);

  useEffect(() => {
    // 키보드가 열린 동안의 더 작은 높이는 visualViewport 계산이 소유합니다.
    if (!open || mobileViewport?.keyboardOpen) return undefined;

    const fitComposer = () => {
      const bounds = composerBounds();
      setComposerMaxHeight(bounds.max);
      setComposerHeight((height) => clamp(height, bounds.min, bounds.max));
    };

    fitComposer();
    window.addEventListener('resize', fitComposer, { passive: true });
    return () => window.removeEventListener('resize', fitComposer);
  }, [composerBounds, mobileViewport?.height, mobileViewport?.keyboardOpen, open, panelGeometry.placement]);

  useEffect(() => {
    if (!open) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      syncPanelGeometry();
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    schedule();
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    if (proseRef.current) observer?.observe(proseRef.current);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
      observer?.disconnect();
    };
  }, [open, proseRef, syncPanelGeometry]);

  useEffect(() => {
    if (!loading) return undefined;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setThinkingSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [loading]);

  // 경로 이동으로 패널이 사라질 때도 전역의 열림 표시가 남지 않게 합니다.
  useEffect(() => () => {
    const pageRoot = document.getElementById('root');
    pageRoot?.removeAttribute('data-article-ai-open');
    pageRoot?.removeAttribute('data-article-ai-placement');
  }, []);

  useEffect(() => {
    const root = proseRef.current;
    if (!ready || !root) return undefined;

    let frame = 0;
    const inspect = () => {
      frame = 0;
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
  }, [proseRef, ready]);

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
    syncPanelGeometry();
    syncMobileViewport();
    if (window.innerWidth <= MOBILE_PANEL_BREAKPOINT) setComposerHeight(MIN_COMPOSER_HEIGHT);
    // 패널과 자리가 겹치는 전역 단추를 패널이 그려지는 프레임부터 숨깁니다.
    document.getElementById('root')?.setAttribute('data-article-ai-open', '');
    setOpen(true);
  };

  const openFromSelection = () => {
    const root = proseRef.current;
    if (!root || !selectionPrompt) return;

    // 열린 패널에서 문맥을 바꾸면 이전 질문의 늦은 응답이 새 선택 위에 섞이지 않게 합니다.
    requestSerialRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setThinkingSeconds(0);
    setActiveSelection({
      context: buildArticleSelectionContext(root, selectionPrompt.range, selectionPrompt.selectedText),
      text: selectionPrompt.selectedText,
    });
    setAnswer(null);
    setError('');
    setQuestion('');
    setSelectionPrompt(null);
    syncPanelGeometry();
    syncMobileViewport();
    if (!open && window.innerWidth <= MOBILE_PANEL_BREAKPOINT) setComposerHeight(MIN_COMPOSER_HEIGHT);
    document.getElementById('root')?.setAttribute('data-article-ai-open', '');
    setOpen(true);
    // 이미 패널이 열린 상태에서 새 문장을 고른 경우에도 바로 질문을 이어갈 수 있게 합니다.
    // 모바일 키보드도 확실히 열리도록 선택 단추의 사용자 제스처 안에서 바로 잡습니다.
    if (open) focusQuietly(textareaRef.current);
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
    if (mobileViewport?.keyboardOpen) return;
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
    if (mobileViewport?.keyboardOpen) return;
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
    if (mobileViewport?.keyboardOpen) return;
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

  const panelStyle = useMemo(() => ({
    '--article-ai-panel-left': `${panelGeometry.left}px`,
    '--article-ai-panel-width': `${panelGeometry.width}px`,
    ...(mobileViewport
      ? {
          '--article-ai-mobile-height': `${mobileViewport.height}px`,
          '--article-ai-mobile-left': `${mobileViewport.left}px`,
          '--article-ai-mobile-top': `${mobileViewport.top}px`,
          '--article-ai-mobile-width': `${mobileViewport.width}px`,
        }
      : {}),
  }) as CSSProperties, [mobileViewport, panelGeometry.left, panelGeometry.width]);

  const composerResizeDisabled = mobileViewport?.keyboardOpen ?? false;

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

      {selectionPrompt && (
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
          data-placement={panelGeometry.placement}
          data-mobile-viewport={mobileViewport ? 'true' : undefined}
          data-mobile-compact={mobileViewport?.compact ? 'true' : undefined}
          data-mobile-keyboard={mobileViewport?.keyboardOpen ? 'true' : undefined}
          style={panelStyle}
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
              role={composerResizeDisabled ? undefined : 'slider'}
              aria-hidden={composerResizeDisabled || undefined}
              aria-label={composerResizeDisabled ? undefined : '질문 입력 영역 높이 조절'}
              aria-orientation={composerResizeDisabled ? undefined : 'vertical'}
              aria-valuemin={composerResizeDisabled ? undefined : MIN_COMPOSER_HEIGHT}
              aria-valuemax={composerResizeDisabled ? undefined : composerMaxHeight}
              aria-valuenow={composerResizeDisabled ? undefined : Math.round(composerHeight)}
              tabIndex={composerResizeDisabled ? -1 : 0}
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
