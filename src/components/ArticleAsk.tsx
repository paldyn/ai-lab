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
  type ClipboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp, Image as ImageIcon, MessageSquareText, Sparkles, X } from 'lucide-react';
import {
  articleAskErrorMessage,
  buildArticleQuestionContext,
  buildArticleSelectionContext,
  combineArticleSelections,
  MAX_PASTED_IMAGES,
  pickPastedImages,
  prepareArticleImage,
  calculateArticlePanelGeometry,
  captureArticleTextSelection,
  buildArticleConversationContext,
  requestArticleAnswer,
  type ArticlePanelGeometry,
  type ArticleConversationEntry,
  type ArticleImageAttachment,
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

/** 화면에 남는 한 차례. 답변을 마친 차례만 다음 질문의 문맥으로 넘어간다. */
interface ConversationTurn extends ArticleConversationEntry {
  id: number;
  quoted: string;
  shots: string[];
  html: string;
  status: 'loading' | 'done' | 'error';
  error: string;
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
  const [activeSelections, setActiveSelections] = useState<ActiveSelection[]>([]);
  const [activeImages, setActiveImages] = useState<ArticleImageAttachment[]>([]);
  const [selectionPrompt, setSelectionPrompt] = useState<ArticleTextSelection | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
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

  // 대화는 아래로 자란다. 새 차례가 붙거나 답이 채워지면 그 자리가 보이게 따라간다.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || turns.length === 0) return;
    content.scrollTop = content.scrollHeight;
  }, [turns]);

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
    let pointerSelecting = false;
    const inspect = () => {
      frame = 0;
      const next = captureArticleTextSelection(root, document.getSelection());
      // 키보드로 선택한 뒤 Tab으로 CTA에 닿을 때 selection이 먼저 접힐 수 있습니다.
      // 이미 CTA가 포커스를 받았다면 저장해 둔 범위를 한 번 더 쓸 수 있게 남깁니다.
      if (!next && document.activeElement === selectionButtonRef.current) return;
      setSelectionPrompt(next);
    };
    const schedule = () => {
      // 마우스·터치로 선택하는 중에는 CTA를 그리지 않고 포인터를 놓은 뒤 측정합니다.
      if (pointerSelecting) return;
      if (frame) return;
      frame = window.requestAnimationFrame(inspect);
    };
    const handleSelectionChange = () => {
      // 키보드·보조기술로 만든 선택은 selectionchange 경로로 계속 지원합니다.
      if (!pointerSelecting) schedule();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (selectionButtonRef.current?.contains(target)) return;
      if (root.contains(target)) {
        pointerSelecting = true;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        setSelectionPrompt(null);
        return;
      }
      pointerSelecting = false;
      setSelectionPrompt(null);
    };
    const handlePointerUp = () => {
      if (!pointerSelecting) return;
      pointerSelecting = false;
      schedule();
    };
    const handlePointerCancel = () => {
      if (!pointerSelecting) return;
      pointerSelecting = false;
      schedule();
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('pointercancel', handlePointerCancel, true);
    root.addEventListener('keyup', schedule);
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('pointercancel', handlePointerCancel, true);
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
    setActiveSelections([]);
    setSelectionPrompt(null);
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
    // 이미 붙인 문장을 다시 고르면 칩만 늘고 문맥은 그대로입니다 — 한 번만 둡니다.
    const picked: ActiveSelection = {
      context: buildArticleSelectionContext(root, selectionPrompt.range, selectionPrompt.selectedText),
      text: selectionPrompt.selectedText,
    };
    setActiveSelections((prev) =>
      prev.some((piece) => piece.text === picked.text) ? prev : [...prev, picked],
    );
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

  /** 캡처를 그대로 붙여넣습니다. 워커가 인라인으로 실어 보내므로 여기서 줄여 둡니다. */
  const handlePaste = async (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = pickPastedImages(Array.from(event.clipboardData?.files ?? []));
    if (files.length === 0) return;
    event.preventDefault();

    const room = MAX_PASTED_IMAGES - activeImages.length;
    if (room <= 0) return;

    const prepared: ArticleImageAttachment[] = [];
    for (const file of files.slice(0, room)) {
      const image = await prepareArticleImage(file);
      if (image) prepared.push(image);
    }
    if (prepared.length > 0) setActiveImages((prev) => [...prev, ...prepared].slice(0, MAX_PASTED_IMAGES));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || loading) return;

    // 이 질문이 딛고 선 선택들. 답이 오면 놓아 주므로 여기서 붙잡아 둡니다.
    const picked = activeSelections;
    const merged = combineArticleSelections(picked);
    const images = activeImages;
    const baseContext = merged.context ||
      buildArticleQuestionContext(proseRef.current, trimmedQuestion, fallbackContext);
    // 답변을 마친 차례만 문맥으로 보냅니다. 실패한 차례를 넣으면 빈 답을 이어받습니다.
    const history: ArticleConversationEntry[] = turns
      .filter((turn) => turn.status === 'done' && turn.answer)
      .map((turn) => ({ question: turn.question, answer: turn.answer }));

    const controller = new AbortController();
    const serial = requestSerialRef.current + 1;
    requestSerialRef.current = serial;
    requestRef.current?.abort();
    requestRef.current = controller;

    const turnId = serial;
    setTurns((prev) => [
      ...prev,
      {
        id: turnId,
        question: trimmedQuestion,
        quoted: picked.map((piece) => piece.text).join('\n'),
        shots: images.map((image) => image.preview),
        answer: '',
        html: '',
        status: 'loading',
        error: '',
      },
    ]);
    setLoading(true);
    setThinkingSeconds(0);
    setQuestion('');

    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await requestArticleAnswer(
        {
          title,
          context: buildArticleConversationContext(baseContext, history),
          selectedText: merged.selectedText,
          images: images.map((image) => ({ data: image.data, mimeType: image.mimeType })),
          question: trimmedQuestion,
        },
        controller.signal,
      );

      if (requestSerialRef.current !== serial) return;
      // Markdown 도구 묶음은 답변을 받은 뒤에만 내려받습니다. 글을 읽기만 하는 방문자의
      // 첫 번들에 parser와 sanitizer를 싣지 않습니다.
      const { renderAiMarkdown } = await import('../lib/aiMarkdown');
      if (requestSerialRef.current !== serial) return;

      setTurns((prev) =>
        prev.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                answer: response.answer,
                // renderAiMarkdown은 raw HTML을 버리고 allowlist sanitize를 통과한 HTML만 돌려줍니다.
                html: renderAiMarkdown(response.answer),
                status: 'done',
              }
            : turn,
        ),
      );
      // 한 번 답이 나왔으면 붙인 문장은 모두 놓아 줍니다. 다음 질문까지 끌고 가면
      // 엉뚱한 문단에 묶인 채 대화가 이어집니다.
      setActiveSelections([]);
      setActiveImages([]);
    } catch (caught) {
      if (requestSerialRef.current !== serial) return;
      const message = articleAskErrorMessage(caught);
      setTurns((prev) =>
        prev.map((turn) => (turn.id === turnId ? { ...turn, status: 'error', error: message } : turn)),
      );
    } finally {
      window.clearTimeout(timeout);
      if (requestSerialRef.current === serial) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  };

  /** 대화를 통째로 비웁니다. 선택 본문과 달리 저절로 사라지지 않으므로 버튼으로만 부릅니다. */
  const clearConversation = () => {
    requestSerialRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setThinkingSeconds(0);
    setTurns([]);
    focusQuietly(textareaRef.current);
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
            {turns.length > 0 && (
              <button
                type="button"
                className="article-ai-reset"
                onClick={clearConversation}
                title="대화를 비우고 새로 시작"
              >
                새 대화
              </button>
            )}
            <button type="button" className="article-ai-close" onClick={close} aria-label="AI 질문 패널 닫기" title="닫기">
              <X size={17} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </header>

          <div ref={contentRef} className="article-ai-content" aria-busy={loading}>
            {turns.length === 0 && (
              <div className="article-ai-empty">
                <Sparkles size={18} strokeWidth={1.5} aria-hidden="true" />
                <p>글의 개념, 수식, 코드에 대해 물어보세요.</p>
                <span>질문과 관련된 문단을 골라 답변의 문맥으로 사용합니다.</span>
              </div>
            )}

            {turns.length > 0 && (
              <ol
                className="article-ai-thread"
                aria-label="AI 대화"
                aria-live="polite"
                aria-relevant="additions text"
                role="log"
              >
                {turns.map((turn) => (
                  <li key={turn.id} className="article-ai-turn">
                    <div className="article-ai-ask">
                      {turn.shots.length > 0 && (
                        <span className="article-ai-ask-shots">
                          {turn.shots.map((src, at) => (
                            <img src={src} alt="붙여넣은 이미지" key={src.slice(0, 64) + at} />
                          ))}
                        </span>
                      )}
                      {turn.quoted && <blockquote>{turn.quoted}</blockquote>}
                      <p>{turn.question}</p>
                    </div>
                    <div className="article-ai-reply" data-status={turn.status}>
                      {turn.status === 'loading' && (
                        <p className="article-ai-status">
                          <span className="article-ai-status-dots" aria-hidden="true"><i /><i /><i /></span>
                          <span className="article-ai-status-label">생각 중</span>
                          <span className="article-ai-status-time" aria-hidden="true"> · {thinkingSeconds}초</span>
                        </p>
                      )}
                      {turn.status === 'error' && (
                        <p className="article-ai-status" role="alert">
                          <span className="article-ai-status-label">{turn.error}</span>
                        </p>
                      )}
                      {turn.status === 'done' && (
                        <div
                          className="article-ai-markdown"
                          // AI 출력은 renderAiMarkdown의 HTML allowlist와 URL 검사를 통과했습니다.
                          dangerouslySetInnerHTML={{ __html: turn.html }}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/*
            선택 본문과 입력창은 한 묶음입니다 — 높이 조절 손잡이가 둘 위에 함께
            얹혀야 인용구 밑줄처럼 보이지 않습니다.
          */}
          <div className="article-ai-composer">
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

            {activeSelections.length > 0 && (
              <aside className="article-ai-selection" aria-label="선택한 본문">
                {/* 마우스를 올리면 무엇을 골랐는지 위로 펼칩니다 */}
                <div className="article-ai-picks">
                  {activeSelections.map((piece, index) => {
                    // 한 줄로 보여 주므로 줄바꿈은 공백으로 눕힙니다. 자르는 일은 CSS가 맡습니다.
                    const label = piece.text.replace(/\s+/g, ' ').trim();
                    return (
                      <span className="article-ai-pick" key={piece.text}>
                        <span className="article-ai-pick-text" title={label}>{`\u201C${label}\u201D`}</span>
                        <button
                          type="button"
                          className="article-ai-pick-clear"
                          onClick={() => setActiveSelections((prev) => prev.filter((_, at) => at !== index))}
                          aria-label="이 문장 빼기"
                          title="빼기"
                        >
                          <X size={11} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <span className="article-ai-selection-chip">
                  <MessageSquareText size={14} strokeWidth={1.7} aria-hidden="true" />
                  <span className="article-ai-selection-count">텍스트 {activeSelections.length}개 선택</span>
                  <button
                    type="button"
                    className="article-ai-selection-clear"
                    onClick={() => setActiveSelections([])}
                    aria-label="선택 모두 해제"
                    title="모두 해제"
                  >
                    <X size={11} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </span>
              </aside>
            )}

            {activeImages.length > 0 && (
              <aside className="article-ai-images" aria-label="붙여넣은 이미지">
                <div className="article-ai-shots">
                  {activeImages.map((image, index) => (
                    <span className="article-ai-shot" key={image.preview.slice(0, 64) + index}>
                      <img src={image.preview} alt={image.name} />
                      <button
                        type="button"
                        className="article-ai-pick-clear"
                        onClick={() => setActiveImages((prev) => prev.filter((_, at) => at !== index))}
                        aria-label="이 이미지 빼기"
                        title="빼기"
                      >
                        <X size={11} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
                <span className="article-ai-selection-chip">
                  <ImageIcon size={14} strokeWidth={1.7} aria-hidden="true" />
                  <span className="article-ai-image-count">이미지 {activeImages.length}개</span>
                  <button
                    type="button"
                    className="article-ai-images-clear"
                    onClick={() => setActiveImages([])}
                    aria-label="이미지 모두 빼기"
                    title="모두 빼기"
                  >
                    <X size={11} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                </span>
              </aside>
            )}

            <form
              ref={formRef}
              className="article-ai-form"
              data-resizing={resizingComposer ? '' : undefined}
              style={{ height: composerHeight }}
              onSubmit={submit}
            >
            <label htmlFor="article-ai-question" className="sr-only">현재 글에 질문하기</label>
            <textarea
              ref={textareaRef}
              id="article-ai-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              onPaste={handlePaste}
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
          </div>
        </section>
      )}
    </div>,
    portalHost,
  );
}
