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

/** 통째로 잡힌 코드 칩에 붙는 표시. 배경과 테두리를 지워 띠에 녹입니다. */
const MELTED_ATTR = 'data-selection-melted';

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

interface Clipped {
  range: Range;
  /** 이 조각이 통째로 잡혔는가. 코드 칩을 띠에 녹여도 되는지를 이걸로 가릅니다. */
  whole: boolean;
}

/**
 * 선택 범위를 조각 하나로 좁힙니다. 본문에서 수식을 지나 계속 끌었을 때
 * 그 조각 안에 걸친 부분만 남깁니다. 겹치는 데가 없으면 null입니다.
 *
 * '통째로 잡혔는가'는 **글자를 비교해서** 봅니다. `compareBoundaryPoints`로
 * 가리면 안 됩니다 — 경계점 비교는 자손 노드의 오프셋을 무시하고 '몇 번째
 * 자식인가'만 보므로, 칩 한가운데에서 시작한 선택도 `(글자노드, 3)`이
 * `(code, 0)`보다 **앞**으로 판정됩니다. 그러면 걸치기만 해도 늘 참이 되어
 * 반쯤 잡힌 칩까지 녹습니다.
 */
function clipToNode(range: Range, node: Node): Clipped | null {
  const all = range.cloneRange();
  all.selectNodeContents(node);

  const part = range.cloneRange();
  if (part.compareBoundaryPoints(Range.START_TO_START, all) < 0) {
    part.setStart(all.startContainer, all.startOffset);
  }
  if (part.compareBoundaryPoints(Range.END_TO_END, all) > 0) {
    part.setEnd(all.endContainer, all.endOffset);
  }
  if (part.collapsed) return null;

  return { range: part, whole: part.toString() === (node.textContent ?? '') };
}

/** 본문 글자 한 조각: 글자 상자와, 그 글자가 앉은 줄 상자. */
interface TextRun {
  rect: DOMRect;
  top: number;
  height: number;
}

/**
 * 글자가 앉은 **줄 상자**를 냅니다. 브라우저는 선택 색을 글자 상자가 아니라 줄
 * 상자에 칠하기 때문에 이 값을 써야 옆 글자와 아귀가 맞습니다 — 본문 글자 상자가
 * 20px인데 줄 상자는 32.3px이라, 글자 상자에 맞추면 위아래로 6.15px씩 모자라
 * 수식 자리마다 어두운 홈이 팹니다. 정확히 그것 때문에 두 번 헛돌았습니다.
 *
 * 줄 상자는 글자 상자 위아래에 `(line-height − 글자 상자) / 2`씩(half-leading)
 * 더한 것입니다. `line-height: normal`처럼 px로 안 읽히면 글자 상자를 그대로 씁니다.
 */
function lineBoxOf(rect: DOMRect, element: Element, cache: Map<Element, number>): { top: number; height: number } {
  const lineHeight = lineHeightOf(element, cache);
  if (!lineHeight) return { top: rect.top, height: rect.height };

  return { top: rect.top - (lineHeight - rect.height) / 2, height: lineHeight };
}

/** 그릇의 줄 높이(px). `normal`처럼 px로 안 읽히면 0입니다. 한 번 그리는 동안 캐시합니다. */
function lineHeightOf(element: Element, cache: Map<Element, number>): number {
  const hit = cache.get(element);
  if (hit !== undefined) return hit;

  const raw = Number.parseFloat(getComputedStyle(element).lineHeight);
  const value = Number.isFinite(raw) && raw > 0 ? raw : 0;
  cache.set(element, value);
  return value;
}

/** 세로로 겹치는 넓이. 같은 줄인지 가릴 때 씁니다. */
function overlapOf(a: { top: number; bottom: number }, b: { top: number; bottom: number }): number {
  return Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
}

/** 여러 조각으로 흩어진 상자 중 이 띠와 같은 줄에 있는 것. 줄바꿈된 코드 칩에 씁니다. */
export function fragmentFor<T extends { top: number; bottom: number }>(
  fragments: readonly T[],
  band: { top: number; bottom: number },
): T | null {
  let best: T | null = null;
  let bestOverlap = 0;

  for (const fragment of fragments) {
    const overlap = overlapOf(fragment, band);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = fragment;
    }
  }

  return best;
}

/**
 * 한 그릇 안에서 **조각이 아닌 본문 글자**를 모읍니다.
 * 한 번 그리는 동안 같은 그릇을 여러 조각이 물어보므로 결과를 캐시합니다.
 */
function textRunsOf(block: Element, cache: Map<Element, TextRun[]>, lines: Map<Element, number>): TextRun[] {
  const hit = cache.get(block);
  if (hit) return hit;

  const runs: TextRun[] = [];
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent || !node.nodeValue?.trim()) continue;
    if (parent.closest(ODD_PIECE)) continue;

    const range = block.ownerDocument.createRange();
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) {
      if (rect.height > 0) runs.push({ rect, ...lineBoxOf(rect, parent, lines) });
    }
  }

  cache.set(block, runs);
  return runs;
}

/**
 * 이 띠와 같은 줄인 본문 글자의 줄 상자.
 *
 * 같은 줄에 글자가 없는 경우가 둘인데 답이 다릅니다. 줄바꿈된 코드 칩의 가운데
 * 줄처럼 **그릇은 있는데 그 줄에 다른 글자가 없는** 경우는 그릇의 줄 높이를 띠
 * 한가운데에 맞춰 씁니다 — 안 그러면 그 줄만 얇아져 홈이 도로 팹니다. 블록
 * 수식처럼 **그릇 자체가 없는** 경우는 조각 자신의 크기를 씁니다(null).
 */
function lineOf(
  host: Element,
  band: Band,
  cache: Map<Element, TextRun[]>,
  lines: Map<Element, number>,
): { top: number; height: number } | null {
  const block = host.closest(BLOCK);
  if (!block) return null;

  let best: TextRun | null = null;
  let bestOverlap = 0;
  for (const run of textRunsOf(block, cache, lines)) {
    const overlap = overlapOf(run.rect, band);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = run;
    }
  }
  if (best) return { top: best.top, height: best.height };

  const lineHeight = lineHeightOf(block, lines);
  if (!lineHeight) return null;

  const middle = (band.top + band.bottom) / 2;
  return { top: middle - lineHeight / 2, height: lineHeight };
}

function clearMarks(root: HTMLElement): void {
  for (const mark of root.querySelectorAll(`.${MARK_CLASS}`)) mark.remove();
  for (const host of root.querySelectorAll(`[${MELTED_ATTR}]`)) host.removeAttribute(MELTED_ATTR);
}

/**
 * 띠를 놓을 기준점 — 절대 위치가 (0, 0)으로 앉는 자리.
 *
 * `getBoundingClientRect()`를 그냥 쓰면 안 됩니다. 인라인 요소가 줄바꿈되면 그
 * 값은 **모든 조각을 감싼 상자**인데, 절대 위치의 기준은 **첫 조각**입니다.
 * 실제로 세 줄로 나뉜 코드 칩에서 기준점이 79.03인데 감싼 상자로 계산하면
 * 21.00이 나와 58px이 어긋났습니다.
 *
 * 그리고 기준이 되는 것은 테두리 상자가 아니라 그 안쪽(padding box)이라
 * 테두리 두께만큼 들어갑니다. 크기 0짜리를 실제로 놓아 본 값과 표본 10개
 * (수식·코드 칩, 줄바꿈된 것 포함)에서 전부 일치하는 것을 확인했습니다.
 * 재지 않고 계산하는 이유는 값이 같으면서 **DOM을 건드리지 않기** 때문입니다 —
 * 재려면 붙였다 떼야 하고, 그때마다 레이아웃이 강제로 다시 계산됩니다.
 */
function originOf(host: HTMLElement, fragments: readonly DOMRect[]): { left: number; top: number } {
  const first = fragments[0] ?? host.getBoundingClientRect();
  const style = getComputedStyle(host);

  return {
    left: first.left + (Number.parseFloat(style.borderLeftWidth) || 0),
    top: first.top + (Number.parseFloat(style.borderTopWidth) || 0),
  };
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
interface Plan {
  host: HTMLElement;
  melt: boolean;
  marks: { left: number; top: number; width: number; height: number }[];
}

/**
 * **재는 일과 쓰는 일을 갈라 둡니다.** 한 조각을 재고 붙이고 다음 조각을 재면
 * 브라우저가 그때마다 레이아웃을 다시 계산합니다(layout thrashing). 수식이 빽빽한
 * 글에서 한 프레임에 200ms 넘게 걸리던 원인이라, 전부 재고 나서 한꺼번에 붙입니다.
 */
function measure(root: HTMLElement, ranges: readonly Range[]): Plan[] {
  const plans: Plan[] = [];
  const runCache = new Map<Element, TextRun[]>();
  const lineCache = new Map<Element, number>();

  for (const host of root.querySelectorAll<HTMLElement>(ODD_PIECE)) {
    // 코드 블록은 그대로 둡니다 — 한 벌의 글꼴로만 그려져 어긋날 일이 없습니다.
    if (host.closest('pre')) continue;
    // KaTeX는 낭독기용 MathML을 한 벌 더 들고 있습니다. 눈에 보이는 쪽만 잽니다.
    const content = host.querySelector('.katex-html') ?? host;

    const rects: DOMRect[] = [];
    let whole = false;
    for (const range of ranges) {
      if (!range.intersectsNode(content)) continue;
      const part = clipToNode(range, content);
      if (!part) continue;
      whole ||= part.whole;
      for (const rect of part.range.getClientRects()) {
        if (rect.width > 0 && rect.height > 0) rects.push(rect);
      }
    }

    if (rects.length === 0) continue;

    /*
      코드 칩은 테두리와 좌우 6px 여백을 두른 상자라, 글자 폭만 칠하면 그 여백이
      어두운 테두리로 남아 띠가 끊겨 보입니다. 통째로 잡혔을 때는 칩의 배경과
      테두리를 지우고(styles.css) 띠를 상자 끝까지 늘려 한 줄로 잇습니다.
      수식은 여백이 없어 그대로 두고, 일부만 잡힌 칩도 원래 모습을 지킵니다.
    */
    const melt = whole && host.tagName === 'CODE';
    // 칩은 줄바꿈될 수 있습니다. **줄마다 그 줄의 조각**에 맞춰야 합니다 — 감싼
    // 상자를 쓰면 세 줄짜리 칩에서 띠가 옆 글자 위로 58px 넘게 번집니다.
    const fragments = [...host.getClientRects()];
    const origin = originOf(host, fragments);

    const marks = toBands(rects).map((band) => {
      const line = lineOf(host, band, runCache, lineCache);
      /*
        줄 상자와 **선택된 잉크를 함께** 덮습니다. 분수처럼 줄 상자보다 큰 수식은
        잉크가 띠 밖으로 나가는데, 선택된 글자는 흰색으로 칠해지므로 밝은 테마에서
        그 부분이 흰 바탕에 흰 글자가 됩니다.
      */
      const top = Math.min(line ? line.top : band.top, band.top);
      const bottom = Math.max(line ? line.top + line.height : band.bottom, band.bottom);

      const fragment = melt ? fragmentFor(fragments, band) : null;
      const left = fragment ? fragment.left : band.left;
      const right = fragment ? fragment.right : band.right;

      return {
        left: left - origin.left,
        top: top - origin.top,
        width: right - left,
        height: bottom - top,
      };
    });

    plans.push({ host, melt, marks });
  }

  return plans;
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

  for (const plan of measure(root, ranges)) {
    if (plan.melt) plan.host.setAttribute(MELTED_ATTR, '');

    for (const box of plan.marks) {
      const mark = root.ownerDocument.createElement('span');
      mark.className = MARK_CLASS;
      mark.setAttribute('aria-hidden', 'true');
      mark.style.left = `${box.left}px`;
      mark.style.top = `${box.top}px`;
      mark.style.width = `${box.width}px`;
      mark.style.height = `${box.height}px`;
      plan.host.appendChild(mark);
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

  /*
    선택은 그대로인데 글이 움직이는 경우가 있습니다 — 창 크기 변경, 늦게 온 웹폰트,
    뒤늦게 자리를 잡는 이미지. 그러면 이미 그려 둔 띠만 옛 좌표에 남아 엉뚱한 데를
    덮습니다. 양끝 비교를 건너뛰도록 비우고 다시 그립니다.
  */
  const relayout = () => {
    edges = [];
    schedule();
  };

  document_.addEventListener('selectionchange', schedule);
  window_?.addEventListener('resize', relayout);

  // 본문 높이가 달라지는 것으로 '글이 움직였다'를 잡습니다. 없는 환경은 창 크기만 봅니다.
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(relayout) : null;
  observer?.observe(root);

  return () => {
    if (frame) window_?.cancelAnimationFrame(frame);
    observer?.disconnect();
    document_.removeEventListener('selectionchange', schedule);
    window_?.removeEventListener('resize', relayout);
    clearMarks(root);
    root.removeAttribute(ACTIVE_ATTR);
  };
}
