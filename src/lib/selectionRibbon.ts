/**
 * 본문을 드래그했을 때 선택 영역을 **줄마다 하나의 띠**로 직접 그립니다.
 *
 * 왜 브라우저에 맡기지 않는가. KaTeX 수식과 인라인 코드는 본문과 글꼴이 달라
 * 선택 상자의 크기와 위치가 어긋나고, 그대로 두면 한 줄을 끌었을 때 그 자리만
 * 위아래로 튀거나 틈이 벌어집니다. 원인이 셋입니다.
 *
 * 1. **틈** — KaTeX는 항 사이 간격을 글자 없는 `<span class="mspace">`의
 *    `margin-right`로 냅니다. `::selection`은 글자의 전진폭만 칠하므로 빈칸이 남습니다.
 * 2. **높이** — 선택 상자 높이는 그 조각이 쓰는 폰트 지표를 따릅니다. 숫자·괄호는
 *    KaTeX_Main(19.5px), 문자는 KaTeX_Math(15.5px)라 같은 16.64px에서도 갈립니다.
 * 3. **자리** — 같은 이유로 조각과 본문 글자의 상자가 어긋납니다.
 *
 * CSS로는 못 막습니다. margin을 padding으로 옮겨도 Chrome은 인라인 padding을 선택
 * 색으로 칠하지 않고, `inline-block`·`user-select: all`도 칠하는 방식을 바꾸지
 * 못하며, `line-height`는 선택 상자 높이에 영향이 없습니다.
 *
 * **그래서 조각만 그려서는 안 됩니다.** 처음에는 조각 안에만 띠를 그리고 옆 본문
 * 글자가 받는 칠에 높이를 맞췄는데, 그 높이를 세 번 틀렸습니다 — 글자 상자에
 * 맞췄다가(6.15px 모자람), 줄 상자를 `line-height`로 계산했다가(1px 안팎 모자람)
 * 실패했습니다. 브라우저가 칠하는 것은 **줄 상자**이고, 줄 상자는 그 줄에 놓인
 * 모든 인라인 상자의 지표가 함께 정합니다. 코드 칩의 mono 폰트는 descent가 본문
 * 폰트보다 깊어 줄 상자를 아래로 늘리므로, `line-height`만으로는 절대 못 맞춥니다.
 *
 * 그래서 **줄 전체를 우리가 그립니다.** 본문 안에서는 브라우저의 선택 칠을 모두
 * 끄고(styles.css), 줄마다 띠 하나를 놓습니다. 맞출 대상이 없어지므로 어긋날
 * 자리도 없습니다.
 *
 * **코드 블록도 우리가 그립니다.** 한동안 브라우저에 맡겼습니다 — 한 벌의 글꼴로만
 * 그려져 어긋날 일이 없다고 봤기 때문입니다. 그런데 어긋남이 아니라 **틈**이
 * 문제였습니다. 브라우저가 칠하는 높이는 글자 상자(13.5px 글꼴이면 약 17px)인데
 * 줄 높이는 1.75배(약 24px)라, 여러 줄을 끌면 줄 사이마다 검은 띠가 남습니다.
 * `line-height`는 선택 상자 높이를 바꾸지 못하므로 CSS로는 못 없앱니다.
 * 줄 상자를 우리가 그리면 그 틈이 사라집니다.
 *
 * 끄는 스위치를 JS가 붙이는 것이 중요합니다. 이 저장소는 프리렌더한 HTML을
 * 내보내므로 스크립트가 아직 안 붙은 동안이 있는데, CSS에 무조건 걸어 두면 그
 * 사이에 드래그해도 아무 색이 안 들어갑니다.
 */

/** 띠 한 장. 한 가지 색으로만 채운 그라디언트라 결국 사각형 하나입니다. */
const BAND_PAINT = 'linear-gradient(var(--brand),var(--brand))';

/** 본문에 붙는 표시. 이것이 있을 때만 브라우저의 선택 칠이 꺼집니다. */
const ACTIVE_ATTR = 'data-selection-ribbon';

/** 띠를 품는 그릇에 붙는 표시. 좌표 기준이 되도록 자리를 잡아 줍니다. */
const HOST_ATTR = 'data-selection-host';

/** 통째로 잡힌 코드 칩에 붙는 표시. 배경과 테두리를 지워 띠에 녹입니다. */
const MELTED_ATTR = 'data-selection-melted';

/** 글꼴이 달라 줄 상자의 기준으로 삼으면 안 되는 조각. */
const ODD_PIECE = '.katex, code';

export interface Span {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** 세로로 겹치는 넓이. 어느 줄에 속하는지 가릴 때 씁니다. */
function overlapOf(a: { top: number; bottom: number }, b: { top: number; bottom: number }): number {
  return Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
}

/**
 * 사각형들을 줄로 나눕니다. 세로로 겹치면 같은 줄입니다 — 한 줄 안에서는 글자,
 * 수식, 코드 칩이 모두 같은 기준선에 놓이므로 반드시 겹칩니다. 줄과 줄은 잉크
 * 사이가 벌어져 안 겹칩니다.
 */
export function splitLines(rects: readonly Span[]): Span[][] {
  const lines: Span[][] = [];

  for (const rect of [...rects].sort((a, b) => a.top - b.top)) {
    const last = lines[lines.length - 1];
    if (last && last.some((other) => overlapOf(other, rect) > 0)) {
      last.push(rect);
      continue;
    }
    lines.push([rect]);
  }

  return lines;
}

/**
 * 한 줄에 놓인 사각형들로 그 줄의 띠를 만듭니다.
 *
 * 두께는 그릇의 `line-height`를 씁니다. 어디에 맞출지는 **그 줄에서 가장 넓은
 * 사각형**이 정합니다 — 한 줄의 폭은 대개 본문 글자가 차지하므로 그것이 기준이
 * 되고, 수식만 있는 줄에서는 수식이 기준이 됩니다. 어느 쪽이든 줄 전체를 우리가
 * 그리므로 옆 글자와 어긋날 자리가 없습니다.
 *
 * 그러고 나서 그 줄에 놓인 것들을 **함께** 덮습니다. 분수처럼 줄보다 큰 수식이
 * 있으면 브라우저도 그만큼 줄을 늘리므로, 잉크가 띠 밖에 남으면 그 글자만
 * 흰색으로 떠 보입니다.
 */
export function bandOf(rects: readonly Span[], lineHeight: number): Span {
  const widest = rects.reduce((a, b) => (b.right - b.left > a.right - a.left ? b : a));
  const height = lineHeight || widest.bottom - widest.top;
  const top = widest.top - (height - (widest.bottom - widest.top)) / 2;

  return {
    /*
      위아래를 픽셀에 맞춰 **한 픽셀씩 겹치게** 만듭니다.

      줄과 줄의 띠는 이미 정확히 맞닿습니다(틈 0). 그런데도 경계에 검은 줄이 보였습니다 —
      가장자리가 29.3처럼 소수점이라 그 픽셀 줄을 위 띠가 30%, 아래 띠가 70%만 덮고,
      배경 층은 알파로 합성되므로 합쳐도 1 - 0.7 × 0.3 = 79%밖에 안 찹니다. 나머지
      21%로 바탕이 비칩니다. 같은 색이라 겹치는 것은 눈에 안 보이고, 이렇게 하면
      경계 픽셀이 어느 한쪽으로 꽉 찹니다.
    */
    top: Math.floor(Math.min(top, ...rects.map((r) => r.top))),
    bottom: Math.ceil(Math.max(top + height, ...rects.map((r) => r.bottom))),
    left: Math.min(...rects.map((r) => r.left)),
    right: Math.max(...rects.map((r) => r.right)),
  };
}

interface Clipped {
  range: Range;
  /** 통째로 잡혔는가. 코드 칩을 띠에 녹여도 되는지를 이걸로 가릅니다. */
  whole: boolean;
}

/**
 * 선택 범위를 한 마디로 좁힙니다. 겹치는 데가 없으면 null입니다.
 *
 * '통째로 잡혔는가'는 **글자를 비교해서** 봅니다. 경계점 비교는 자손 노드의
 * 오프셋을 무시하고 '몇 번째 자식인가'만 보므로, 칩 한가운데에서 시작한 선택도
 * `(글자노드, 3)`이 `(code, 0)`보다 앞으로 판정되어 늘 참이 됩니다.
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

/**
 * 띠를 품을 그릇 — 글자가 놓인 가장 가까운 블록입니다.
 *
 * 수식·코드 칩은 건너뜁니다. `.katex`는 `inline-block`이라 그 자체가 그릇이 될 수
 * 있는데, 거기에 담으면 조각마다 띠가 따로 생겨 예전 문제로 돌아갑니다.
 * 줄 하나에 띠 하나여야 하므로 조각 바깥의 블록까지 올라갑니다.
 */
function hostOf(element: Element, root: HTMLElement, cache: Map<Element, HTMLElement | null>): HTMLElement | null {
  const hit = cache.get(element);
  if (hit !== undefined) return hit;

  let node: Element | null = element.closest(ODD_PIECE)?.parentElement ?? element;
  let host: HTMLElement | null = null;

  while (node) {
    if (getComputedStyle(node).display !== 'inline') {
      host = node as HTMLElement;
      break;
    }
    if (node === root) break;
    node = node.parentElement;
  }

  cache.set(element, host);
  return host;
}

function clear(root: HTMLElement): void {
  for (const host of root.querySelectorAll<HTMLElement>(`[${HOST_ATTR}]`)) {
    host.style.removeProperty('background-image');
    host.style.removeProperty('background-position');
    host.style.removeProperty('background-size');
    host.style.removeProperty('background-repeat');
    host.style.removeProperty('background-attachment');
    host.removeAttribute(HOST_ATTR);
  }
  for (const chip of root.querySelectorAll(`[${MELTED_ATTR}]`)) chip.removeAttribute(MELTED_ATTR);
}

/**
 * 띠를 놓을 기준점 — 배경이 (0, 0)에서 시작하는 자리(padding box의 왼쪽 위).
 * 그릇은 블록이라 줄바꿈으로 조각나지 않으므로 감싼 상자에서 테두리만 빼면 됩니다.
 *
 * **그릇이 스스로 스크롤하면 그만큼 되돌립니다.** 코드 블록은 `overflow-x: auto`라
 * 긴 줄이 있으면 옆으로 밀리는데, 좌표는 지금 보이는 자리를 잰 값이라 밀린 만큼
 * 어긋나 있습니다. 띠도 `background-attachment: local`로 내용과 함께 밀리므로
 * (paint 참고) 기준점을 스크롤 안 한 자리로 되돌려 두 값을 맞춥니다.
 */
function originOf(host: HTMLElement, style: CSSStyleDeclaration): { left: number; top: number } {
  const box = host.getBoundingClientRect();

  return {
    left: box.left + (Number.parseFloat(style.borderLeftWidth) || 0) - host.scrollLeft,
    top: box.top + (Number.parseFloat(style.borderTopWidth) || 0) - host.scrollTop,
  };
}

/**
 * 빈 줄에 세울 자리표를 만듭니다.
 *
 * 코드 블록에는 빈 줄이 있고, 잡아 놓으면 그 줄만 안 칠해져 검은 틈으로 보입니다.
 * 브라우저는 폭 0짜리 사각형 하나만 돌려주므로(잉크가 없으니 당연합니다) 그대로는
 * 띠가 안 서고, `bandOf`에 넣어도 폭 0이라 안 보입니다.
 *
 * **잉크가 하나도 없는 줄만 고릅니다.** 폭 0짜리는 글자가 있는 줄에도 줄 끝마다
 * 하나씩 딸려 오는데(줄바꿈 자리), 그것까지 세우면 모든 줄이 글자 끝에서 한 글자
 * 더 튀어나옵니다. 세로로 겹치는 것이 하나도 없을 때만 빈 줄입니다.
 *
 * **마디가 아니라 줄과 견줍니다.** 마디 하나하나와 대 보면 줄 수에 제곱으로 커집니다 —
 * 152줄짜리 블록이 마디 1,026개를 가지므로 16만 번이고, 재 보니 3.8ms입니다. 줄의
 * 위아래 끝만 남기면 143번에 0.4ms입니다.
 *
 * 폭은 한 글자입니다. 코드 글꼴 JetBrains Mono의 전진폭이 0.6em이라 13.5px에서
 * 8.1px입니다. 글꼴이 아직 안 실렸거나 대체 글꼴로 그려지면(한글이 그렇습니다) 조금
 * 어긋나지만, 빈 줄에 세우는 자리표라 눈에 띄지 않습니다.
 */
function blankLinesOf(
  marks: readonly Span[],
  lines: readonly (readonly Span[])[],
  style: CSSStyleDeclaration,
): Span[] {
  // 대부분의 그릇에는 빈 줄이 없습니다. 줄의 끝을 재기 전에 빠져나갑니다.
  if (marks.length === 0) return [];

  const width = (Number.parseFloat(style.fontSize) || 0) * 0.6;
  if (!width) return [];

  const inked = lines.map((line) => ({
    top: Math.min(...line.map((rect) => rect.top)),
    bottom: Math.max(...line.map((rect) => rect.bottom)),
  }));

  return marks
    .filter((mark) => !inked.some((line) => overlapOf(line, mark) > 0))
    .map((mark) => ({ top: mark.top, bottom: mark.bottom, left: mark.left, right: mark.left + width }));
}

interface Plan {
  host: HTMLElement;
  bands: Span[];
}

/** 한 그릇에서 선택이 시작하고 끝나는 자리. 좌표는 아직 안 읽습니다. */
interface Reach {
  start: [Node, number];
  end: [Node, number];
  extra: HTMLElement[];
}

/**
 * **재는 일과 쓰는 일을 갈라 둡니다.** 하나 재고 붙이고 다음을 재면 브라우저가
 * 그때마다 레이아웃을 다시 계산합니다. 전부 재고 나서 한꺼번에 붙입니다.
 *
 * 그리고 **좌표는 그릇마다 한 번만 읽습니다.** 글자 마디마다 읽어 보았더니 글
 * 전체를 잡았을 때 한 프레임에 143ms가 걸렸습니다. 한 그릇을 통째로 감싸는
 * 범위를 만들면 `getClientRects()`가 줄마다 하나씩 돌려주므로 한 번이면 됩니다.
 */
function measure(root: HTMLElement, ranges: readonly Range[], melt: HTMLElement[]): Plan[] {
  const reach = new Map<HTMLElement, Reach>();
  const hostCache = new Map<Element, HTMLElement | null>();

  // ── 1. 어느 그릇의 어디부터 어디까지가 잡혔는가 (좌표를 안 읽습니다) ──
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent) continue;
    // 낭독기용 MathML 사본은 눈에 안 보입니다.
    if (parent.closest('.katex-mathml')) continue;
    /*
      공백뿐인 노드는 대개 블록과 블록 사이의 줄바꿈이라 건너뜁니다. **코드 블록
      안에서만 내용으로 칩니다** — 거기서는 빈 줄과 들여쓰기가 그 자리에 있습니다.
      건너뛰면 아래에서 재는 범위가 잉크 있는 노드까지 안쪽으로 당겨져, 선택의
      첫 줄이나 마지막 줄이 빈 줄이면 그 줄만 안 칠해집니다.
    */
    if (!node.nodeValue?.trim() && !parent.closest('pre')) continue;

    let part: Clipped | null = null;
    for (const range of ranges) {
      if (!range.intersectsNode(node)) continue;
      part = clipToNode(range, node);
      if (part) break;
    }
    if (!part) continue;

    const host = hostOf(parent, root, hostCache);
    if (!host) continue;

    const start: [Node, number] = [part.range.startContainer, part.range.startOffset];
    const end: [Node, number] = [part.range.endContainer, part.range.endOffset];
    const hit = reach.get(host);
    // 글의 순서대로 훑으므로 처음 만난 것이 시작, 마지막이 끝입니다.
    if (hit) hit.end = end;
    else reach.set(host, { start, end, extra: [] });
  }

  /*
    코드 칩은 테두리와 좌우 6px 여백을 두른 상자라, 글자 폭만 칠하면 그 여백이
    어두운 테두리로 남아 띠가 끊겨 보입니다. 통째로 잡혔을 때만 배경과 테두리를
    지우고(styles.css) 칩의 상자를 띠에 넣어 한 줄로 잇습니다. 일부만 잡힌 칩은
    원래 모습을 지키고 브라우저의 칠을 그대로 받습니다.
  */
  for (const chip of root.querySelectorAll<HTMLElement>('code')) {
    if (chip.closest('pre')) continue;

    const covered = ranges.some((range) => {
      if (!range.intersectsNode(chip)) return false;
      return clipToNode(range, chip)?.whole ?? false;
    });
    if (!covered) continue;

    const host = hostOf(chip, root, hostCache);
    reach.get(host as HTMLElement)?.extra.push(chip);
    melt.push(chip);
  }

  // ── 2. 그릇마다 한 번씩만 잽니다 ──
  const plans: Plan[] = [];

  for (const [host, span] of reach) {
    const range = root.ownerDocument.createRange();
    range.setStart(span.start[0], span.start[1]);
    range.setEnd(span.end[0], span.end[1]);

    const rects: Span[] = [];
    // 잉크가 없는 자리. 빈 줄인지는 다른 사각형과 견줘 봐야 알 수 있어 따로 둡니다.
    const marks: Span[] = [];
    for (const rect of range.getClientRects()) {
      if (rect.height <= 0) continue;
      if (rect.width > 0) rects.push(rect);
      else marks.push(rect);
    }
    for (const chip of span.extra) {
      for (const rect of chip.getClientRects()) rects.push(rect);
    }

    const style = getComputedStyle(host);
    const lines = splitLines(rects);
    // 빈 줄의 자리표끼리도 한 번 묶습니다. 한 줄에 폭 0짜리가 둘씩 오기 때문입니다.
    for (const blank of splitLines(blankLinesOf(marks, lines, style))) lines.push(blank);
    if (lines.length === 0) continue;

    const origin = originOf(host, style);
    const lineHeight = Number.parseFloat(style.lineHeight) || 0;
    const bands = lines
      .map((line) => bandOf(line, lineHeight))
      .map((band) => ({
        top: band.top - origin.top,
        bottom: band.bottom - origin.top,
        left: band.left - origin.left,
        right: band.right - origin.left,
      }));

    plans.push({ host, bands });
  }

  return plans;
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
 * 띠는 **그릇의 배경**으로 그립니다. 요소를 만들어 얹지 않습니다.
 *
 * 처음에는 띠마다 `<span>`을 하나씩 붙였는데, 글 전체를 잡으면 띠가 308개라 한
 * 프레임에 140ms가 걸렸습니다. 재는 데 드는 시간은 3ms였고 나머지는 전부 상자
 * 308개를 새로 앉히는 렌더링 비용이었습니다. 배경은 겹쳐 그릴 수 있으므로
 * `linear-gradient`를 줄 수만큼 얹으면 요소가 하나도 안 늘어납니다.
 *
 * 덤으로 걱정 하나가 사라집니다 — 선택 한가운데에 DOM을 넣고 빼지 않으므로
 * 끌고 있던 선택이 끊길 일이 없습니다. 복사한 글에 빈 span이 섞이지도 않습니다.
 *
 * 배경 그림은 배경색 **위**, 글자 **아래**에 깔립니다. 그릇 자신이 배경색을
 * 가지고 있어도 띠가 그 위에 옳게 놓입니다.
 */
function paint(root: HTMLElement): void {
  clear(root);

  const selection = root.ownerDocument.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

  const ranges = Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i));
  const melt: HTMLElement[] = [];
  const plans = measure(root, ranges, melt);

  for (const chip of melt) chip.setAttribute(MELTED_ATTR, '');

  for (const plan of plans) {
    const layers: string[] = [];
    const positions: string[] = [];
    const sizes: string[] = [];

    for (const band of plan.bands) {
      layers.push(BAND_PAINT);
      positions.push(`${band.left}px ${band.top}px`);
      sizes.push(`${band.right - band.left}px ${band.bottom - band.top}px`);
    }

    plan.host.setAttribute(HOST_ATTR, '');
    plan.host.style.setProperty('background-image', layers.join(','));
    plan.host.style.setProperty('background-position', positions.join(','));
    plan.host.style.setProperty('background-size', sizes.join(','));
    plan.host.style.setProperty('background-repeat', 'no-repeat');
    // 코드 블록은 옆으로 스크롤합니다. 띠가 글자와 함께 밀리도록 내용에 붙입니다.
    plan.host.style.setProperty('background-attachment', 'local');
  }
}

/**
 * 본문에 붙입니다. 돌려받은 함수를 부르면 표시와 띠를 모두 걷어 갑니다.
 */
export function watchSelectionRibbon(root: HTMLElement): () => void {
  root.setAttribute(ACTIVE_ATTR, '');

  const document_ = root.ownerDocument;
  const window_ = document_.defaultView;

  /*
    **선택이 실제로 달라졌을 때만 그립니다.** 띠를 넣고 빼는 것도 DOM 변경이라
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
    뒤늦게 자리를 잡는 이미지. 그러면 띠만 옛 좌표에 남습니다.
  */
  const relayout = () => {
    edges = [];
    schedule();
  };

  document_.addEventListener('selectionchange', schedule);
  window_?.addEventListener('resize', relayout);

  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(relayout) : null;
  observer?.observe(root);

  return () => {
    if (frame) window_?.cancelAnimationFrame(frame);
    observer?.disconnect();
    document_.removeEventListener('selectionchange', schedule);
    window_?.removeEventListener('resize', relayout);
    clear(root);
    root.removeAttribute(ACTIVE_ATTR);
  };
}
