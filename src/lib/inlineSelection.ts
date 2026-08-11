/**
 * 본문을 드래그했을 때 선택 영역을 **한 줄에서 모두 같은 두께로** 보이게 합니다.
 *
 * 브라우저가 칠해 주는 것을 그대로 두면 수식과 인라인 코드에서만 유독 지저분합니다.
 * 원인이 셋인데 전부 CSS로는 못 막습니다.
 *
 * 1. **틈** — KaTeX는 항 사이 간격을 글자 없는 `<span class="mspace">`의
 *    `margin-right`로 냅니다. `::selection`은 글자의 전진폭만 칠하므로 그 자리가
 *    빈칸으로 남습니다. 한 수식에서 폭 270px 중 59px(틈 14개)이 그것이었습니다.
 * 2. **단차** — 선택 상자 높이는 그 조각이 쓰는 폰트의 지표를 따릅니다. KaTeX는
 *    숫자·괄호·연산자를 KaTeX_Main, 문자를 KaTeX_Math로 그리는데 두 폰트의
 *    ascent+descent가 달라 같은 16.64px에서도 19.5px와 15.5px가 나옵니다.
 * 3. **주변 글자와의 어긋남** — 같은 이유로 수식과 코드 칩은 본문 글자보다
 *    상자가 크고 위치도 어긋나, 한 줄을 끌면 그 자리만 위아래로 튀어나옵니다.
 *
 * 시도해 보고 안 된 것들입니다.
 * - margin을 padding으로 옮기기 — **Chrome은 인라인 padding을 선택 색으로 칠하지 않습니다.**
 * - `display: inline-block`, `user-select: all` — 칠하는 방식이 그대로입니다.
 * - `line-height` — 선택 상자 높이에 영향이 없습니다. 폰트 지표가 정합니다.
 * - 여백을 공백 글자로 바꾸기 — 틈은 메워지지만 2·3번이 그대로 드러납니다.
 *
 * 그래서 이 조각들 안에서만 기본 칠을 끄고(styles.css의 `[data-inline-selection]`)
 * 사각형을 직접 그립니다. 두 가지를 맞춥니다.
 *
 * - **가로** — 선택된 사각형들을 줄 단위로 하나로 합쳐 틈을 없앱니다.
 * - **세로** — 같은 줄에 있는 **본문 글자의 선택 상자**를 찾아 그 높이·위치를
 *   그대로 씁니다. 그래서 수식이든 코드든 옆 글자와 정확히 같은 띠가 됩니다.
 *   같은 줄에 본문 글자가 없으면(블록 수식) 조각 자신의 크기를 씁니다.
 *
 * 끄는 스위치를 JS가 붙이는 것이 중요합니다. 이 저장소는 프리렌더한 HTML을
 * 내보내므로 스크립트가 아직 안 붙은 동안이 있는데, CSS에 무조건 걸어 두면 그
 * 사이에 수식을 선택해도 색이 안 들어갑니다. 표시가 붙어야 꺼지게 두면 최악이
 * '예전처럼 튀어나온다'가 됩니다.
 */

/** 그려 넣는 사각형에 붙는 클래스. styles.css가 모양을 담당합니다. */
const MARK_CLASS = 'inline-selection';

/** 본문에 붙는 표시. 이것이 있을 때만 기본 선택 칠이 꺼집니다. */
const ACTIVE_ATTR = 'data-inline-selection';

/** 주변 글자와 선택 상자가 어긋나는 조각들. */
const ODD_PIECE = '.katex, code';

/** 줄이 담기는 그릇. 여기 안에서 같은 줄의 본문 글자를 찾습니다. */
const BLOCK = 'p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, figcaption, dt, dd';

/**
 * 같은 줄로 볼 세로 간격. 분수의 분자와 분모는 이 안에 들어 한 덩어리가 되고,
 * 여러 줄짜리 수식의 줄과 줄은 이보다 넉넉히 벌어져 따로 잡힙니다.
 */
const LINE_GAP_PX = 6;

interface Band {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** 사각형들을 줄 단위로 합칩니다. 위에서부터 훑으며 세로로 닿는 것끼리 묶습니다. */
export function toBands(rects: readonly DOMRect[]): Band[] {
  const bands: Band[] = [];

  for (const rect of [...rects].sort((a, b) => a.top - b.top)) {
    const last = bands[bands.length - 1];

    if (last && rect.top <= last.bottom + LINE_GAP_PX) {
      last.top = Math.min(last.top, rect.top);
      last.bottom = Math.max(last.bottom, rect.bottom);
      last.left = Math.min(last.left, rect.left);
      last.right = Math.max(last.right, rect.right);
      continue;
    }

    bands.push({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
  }

  return bands;
}

/**
 * 선택 범위를 조각 하나로 좁힙니다. 본문에서 수식을 지나 계속 끌었을 때
 * 그 조각 안에 걸친 부분만 남깁니다. 겹치는 데가 없으면 null입니다.
 */
function clipToNode(range: Range, node: Node): Range | null {
  const whole = range.cloneRange();
  whole.selectNodeContents(node);

  const part = range.cloneRange();
  if (part.compareBoundaryPoints(Range.START_TO_START, whole) < 0) {
    part.setStart(whole.startContainer, whole.startOffset);
  }
  if (part.compareBoundaryPoints(Range.END_TO_END, whole) > 0) {
    part.setEnd(whole.endContainer, whole.endOffset);
  }

  return part.collapsed ? null : part;
}

/**
 * 한 그릇 안에서 **조각이 아닌 본문 글자**의 선택 상자들을 모읍니다.
 * 한 번 그리는 동안 같은 그릇을 여러 조각이 물어보므로 결과를 캐시합니다.
 */
function textRectsOf(block: Element, cache: Map<Element, DOMRect[]>): DOMRect[] {
  const hit = cache.get(block);
  if (hit) return hit;

  const rects: DOMRect[] = [];
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue?.trim()) continue;
    if (node.parentElement?.closest(ODD_PIECE)) continue;

    const range = block.ownerDocument.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.height > 0) rects.push(rect);
    }
  }

  cache.set(block, rects);
  return rects;
}

/** 이 띠와 같은 줄에 있는 본문 글자의 세로 자리. 같은 줄에 글자가 없으면 null입니다. */
function lineOf(host: Element, band: Band, cache: Map<Element, DOMRect[]>): DOMRect | null {
  const block = host.closest(BLOCK);
  if (!block) return null;

  let best: DOMRect | null = null;
  let bestOverlap = 0;

  for (const rect of textRectsOf(block, cache)) {
    const overlap = Math.min(rect.bottom, band.bottom) - Math.max(rect.top, band.top);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = rect;
    }
  }

  return best;
}

function clearMarks(root: HTMLElement): void {
  for (const mark of root.querySelectorAll(`.${MARK_CLASS}`)) mark.remove();
}

/** 선택의 양끝. 이것이 그대로면 다시 그릴 이유가 없습니다. */
type Edges = ReadonlyArray<readonly [Node, number, Node, number]>;

function edgesOf(selection: Selection | null): Edges {
  if (!selection || selection.isCollapsed) return [];
  return Array.from({ length: selection.rangeCount }, (_, i) => {
    const range = selection.getRangeAt(i);
    return [range.startContainer, range.startOffset, range.endContainer, range.endOffset] as const;
  });
}

export function sameEdges(a: Edges, b: Edges): boolean {
  return a.length === b.length && a.every((edge, i) => edge.every((value, j) => value === b[i][j]));
}

/**
 * 사각형은 조각 안에 넣습니다. 조각과 함께 움직이므로 스크롤할 때마다 다시 그릴
 * 필요가 없고, 가로 스크롤되는 긴 블록 수식에서도 따라갑니다.
 *
 * **항상 마지막 자식으로 붙였다가 그것만 지웁니다.** DOM 명세는 삽입·삭제 위치보다
 * 뒤에 있는 Range 오프셋만 밀므로, 맨 뒤에 붙이는 한 지금 잡혀 있는 선택은
 * 건드려지지 않습니다. 중간에 끼우면 끌고 있던 선택이 끊깁니다.
 */
function paint(root: HTMLElement): void {
  clearMarks(root);

  const selection = root.ownerDocument.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

  const ranges = Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i));
  const lineCache = new Map<Element, DOMRect[]>();

  for (const host of root.querySelectorAll<HTMLElement>(ODD_PIECE)) {
    // 코드 블록은 그대로 둡니다 — 한 벌의 글꼴로만 그려져 어긋날 일이 없습니다.
    if (host.closest('pre')) continue;
    // KaTeX는 낭독기용 MathML을 한 벌 더 들고 있습니다. 눈에 보이는 쪽만 잽니다.
    const content = host.querySelector('.katex-html') ?? host;

    const rects: DOMRect[] = [];
    for (const range of ranges) {
      if (!range.intersectsNode(content)) continue;
      const part = clipToNode(range, content);
      if (!part) continue;
      for (const rect of part.getClientRects()) {
        if (rect.width > 0 && rect.height > 0) rects.push(rect);
      }
    }

    if (rects.length === 0) continue;
    const origin = host.getBoundingClientRect();

    for (const band of toBands(rects)) {
      // 같은 줄의 본문 글자가 있으면 그 세로 자리를 그대로 씁니다.
      const line = lineOf(host, band, lineCache);
      const top = line ? line.top : band.top;
      const height = line ? line.height : band.bottom - band.top;

      const mark = document.createElement('span');
      mark.className = MARK_CLASS;
      mark.setAttribute('aria-hidden', 'true');
      mark.style.left = `${band.left - origin.left}px`;
      mark.style.top = `${top - origin.top}px`;
      mark.style.width = `${band.right - band.left}px`;
      mark.style.height = `${height}px`;
      host.appendChild(mark);
    }
  }
}

/**
 * 본문에 붙입니다. 어긋나는 조각이 하나도 없으면 아무것도 하지 않습니다.
 * 돌려받은 함수를 부르면 표시와 사각형을 모두 걷어 갑니다.
 */
export function watchInlineSelection(root: HTMLElement): () => void {
  if (!root.querySelector(ODD_PIECE)) return () => {};

  root.setAttribute(ACTIVE_ATTR, '');

  const document_ = root.ownerDocument;
  const window_ = document_.defaultView;

  /*
    **선택이 실제로 달라졌을 때만 그립니다.** 사각형을 넣고 빼는 것도 DOM 변경이라
    Chrome이 그것을 보고 selectionchange를 한 번 더 낼 수 있습니다. 그대로 두면
    그리기 → 변경 → 다시 그리기가 프레임마다 돌아 렌더러가 멎습니다.
  */
  let edges: Edges = [];

  // selectionchange는 끄는 내내 마우스가 움직일 때마다 옵니다. 프레임당 한 번으로 묶습니다.
  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame =
      window_?.requestAnimationFrame(() => {
        frame = 0;
        const next = edgesOf(document_.getSelection());
        if (sameEdges(next, edges)) return;
        edges = next;
        paint(root);
      }) ?? 0;
  };

  // 창 크기가 바뀌면 자리는 그대로여도 좌표가 달라집니다. 비교를 건너뛰게 비웁니다.
  const relayout = () => {
    edges = [];
    schedule();
  };

  document_.addEventListener('selectionchange', schedule);
  window_?.addEventListener('resize', relayout);

  return () => {
    if (frame) window_?.cancelAnimationFrame(frame);
    document_.removeEventListener('selectionchange', schedule);
    window_?.removeEventListener('resize', relayout);
    clearMarks(root);
    root.removeAttribute(ACTIVE_ATTR);
  };
}
