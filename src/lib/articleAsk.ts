export const ARTICLE_AI_ENDPOINT = 'https://paldyn-ai-lab.dev21mo-508.workers.dev';

export const MAX_ARTICLE_CONTEXT_CHARS = 7_000;
export const MAX_SELECTED_TEXT_CHARS = 4_000;

const MAX_CONTEXT_BLOCKS = 8;
const MAX_BLOCK_CHARS = 1_600;

const STOP_WORDS = new Set([
  '관련',
  '내용',
  '대해',
  '무엇',
  '설명',
  '어떤',
  '알려줘',
  '알려주세요',
  '이것',
  '이해',
  '질문',
  '현재',
  '해줘',
  '해주세요',
]);

const PARTICLES = ['으로', '에서', '에게', '부터', '까지', '처럼', '보다', '인가요', '나요', '은', '는', '이', '가', '을', '를', '의', '와', '과', '로'];

export interface ArticleContextBlock {
  text: string;
  heading?: string;
  kind?: 'heading' | 'body';
}

interface DomContextBlock extends ArticleContextBlock {
  element: HTMLElement;
}

export interface ArticleTextSelection {
  range: Range;
  selectedText: string;
  placement: {
    above: boolean;
    left: number;
    top: number;
  };
}

export interface ArticleAskPayload {
  title: string;
  context: string;
  selectedText: string;
  question: string;
}

export interface ArticleAskResponse {
  answer: string;
  model: string;
}

export class ArticleAskHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Article AI request failed with ${status}`);
    this.name = 'ArticleAskHttpError';
    this.status = status;
  }
}

export class ArticleAskResponseError extends Error {
  constructor() {
    super('Article AI returned an invalid response');
    this.name = 'ArticleAskResponseError';
  }
}

export function normalizeArticleText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** 코드 선택의 들여쓰기와 줄바꿈은 의미이므로 selectedText에서는 보존합니다. */
export function normalizeSelectedArticleText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 2)).trimEnd()} …`;
}

function stemKoreanToken(token: string): string {
  for (const particle of PARTICLES) {
    if (token.endsWith(particle) && token.length - particle.length >= 2) {
      return token.slice(0, -particle.length);
    }
  }
  return token;
}

export function articleQuestionTokens(value: string): string[] {
  const normalized = value.normalize('NFKC').toLocaleLowerCase('ko-KR');
  const matches = normalized.match(/[가-힣]{2,}|[a-z0-9][a-z0-9.+#/_-]*/g) ?? [];
  const tokens = matches
    .map((token) => (/^[가-힣]+$/.test(token) ? stemKoreanToken(token) : token))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));

  return [...new Set(tokens)].slice(0, 16);
}

function occurrenceCount(haystack: string, needle: string): number {
  let count = 0;
  let from = 0;

  while (count < 4) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    count += 1;
    from = at + needle.length;
  }

  return count;
}

function scoreBlock(block: ArticleContextBlock, tokens: readonly string[]): number {
  const text = block.text.normalize('NFKC').toLocaleLowerCase('ko-KR');
  const heading = (block.heading ?? '').normalize('NFKC').toLocaleLowerCase('ko-KR');

  return tokens.reduce(
    (score, token) => score + occurrenceCount(text, token) * 3 + occurrenceCount(heading, token) * 5,
    0,
  );
}

function excerptAround(value: string, tokens: readonly string[], selectedText = ''): string {
  if (value.length <= MAX_BLOCK_CHARS) return value;

  const lower = value.toLocaleLowerCase('ko-KR');
  const selectedNeedle = truncate(normalizeArticleText(selectedText), 180).toLocaleLowerCase('ko-KR');
  let hit = selectedNeedle ? lower.indexOf(selectedNeedle) : -1;

  if (hit < 0) {
    for (const token of tokens) {
      hit = lower.indexOf(token);
      if (hit >= 0) break;
    }
  }

  if (hit < 0) return truncate(value, MAX_BLOCK_CHARS);

  const start = Math.max(0, Math.min(hit - 420, value.length - MAX_BLOCK_CHARS));
  const end = Math.min(value.length, start + MAX_BLOCK_CHARS);
  return `${start > 0 ? '… ' : ''}${value.slice(start, end).trim()}${end < value.length ? ' …' : ''}`;
}

interface Candidate {
  index: number;
  priority: number;
}

function addCandidate(map: Map<number, number>, index: number, priority: number, length: number): void {
  if (index < 0 || index >= length) return;
  map.set(index, Math.max(priority, map.get(index) ?? Number.NEGATIVE_INFINITY));
}

function formatChosen(
  blocks: readonly ArticleContextBlock[],
  candidates: readonly Candidate[],
  tokens: readonly string[],
  selectedText: string,
  maxChars: number,
): string {
  const picked: Array<{ index: number; block: ArticleContextBlock; text: string }> = [];
  let estimated = 0;

  for (const candidate of [...candidates].sort((a, b) => b.priority - a.priority || a.index - b.index)) {
    if (picked.length >= MAX_CONTEXT_BLOCKS) break;
    const block = blocks[candidate.index];
    const text = excerptAround(block.text, tokens, selectedText);
    const overhead = (block.heading?.length ?? 0) + 16;
    if (picked.length > 0 && estimated + text.length + overhead > maxChars) continue;

    picked.push({ index: candidate.index, block, text });
    estimated += text.length + overhead;
  }

  if (picked.length === 0 && blocks.length > 0) {
    picked.push({ index: 0, block: blocks[0], text: excerptAround(blocks[0].text, tokens, selectedText) });
  }

  picked.sort((a, b) => a.index - b.index);

  const parts: string[] = [];
  let lastIndex = -1;
  let lastHeading = '';

  for (const item of picked) {
    if (lastIndex >= 0 && item.index > lastIndex + 1) parts.push('[중간 내용 생략]');

    if (item.block.kind === 'heading') {
      parts.push(`## ${item.text}`);
      lastHeading = item.text;
    } else {
      const heading = item.block.heading ?? '';
      if (heading && heading !== lastHeading) {
        parts.push(`## ${heading}`);
        lastHeading = heading;
      }
      parts.push(item.text);
    }

    lastIndex = item.index;
  }

  return truncate(parts.join('\n\n'), maxChars);
}

/** 질문 단어가 많이 겹치는 문단과 그 이웃을 고릅니다. 일치가 없으면 읽는 자리 주변을 씁니다. */
export function selectRelevantArticleContext(
  blocks: readonly ArticleContextBlock[],
  question: string,
  focusIndex = 0,
  maxChars = MAX_ARTICLE_CONTEXT_CHARS,
): string {
  if (blocks.length === 0) return '';

  const tokens = articleQuestionTokens(question);
  const scored = blocks
    .map((block, index) => ({ index, score: scoreBlock(block, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || Math.abs(a.index - focusIndex) - Math.abs(b.index - focusIndex));

  const seeds = scored.length > 0 ? scored.slice(0, 3) : [{ index: Math.max(0, Math.min(focusIndex, blocks.length - 1)), score: 1 }];
  const candidates = new Map<number, number>();

  for (const seed of seeds) {
    // 관련 문단이 먼저, 바로 앞뒤 문단은 문맥을 잇는 보조로 둡니다.
    addCandidate(candidates, seed.index, seed.score * 100 + 30, blocks.length);
    addCandidate(candidates, seed.index - 1, seed.score * 100 + 20, blocks.length);
    addCandidate(candidates, seed.index + 1, seed.score * 100 + 20, blocks.length);
    addCandidate(candidates, seed.index - 2, seed.score * 100 + 10, blocks.length);
    addCandidate(candidates, seed.index + 2, seed.score * 100 + 10, blocks.length);
  }

  // 질문이 넓을 때에도 지금 읽던 자리가 완전히 빠지지 않게 가장 낮은 우선순위로 둡니다.
  addCandidate(candidates, focusIndex, 1, blocks.length);

  return formatChosen(
    blocks,
    [...candidates].map(([index, priority]) => ({ index, priority })),
    tokens,
    '',
    maxChars,
  );
}

/** 드래그가 걸친 블록과 앞뒤 문단을 우선해 선택 질문용 문맥을 만듭니다. */
export function selectSurroundingArticleContext(
  blocks: readonly ArticleContextBlock[],
  selectedIndices: readonly number[],
  selectedText: string,
  maxChars = MAX_ARTICLE_CONTEXT_CHARS,
): string {
  if (blocks.length === 0) return '';

  const touched = selectedIndices.length > 0 ? [...new Set(selectedIndices)] : [0];
  const candidates = new Map<number, number>();

  for (const index of touched) {
    addCandidate(candidates, index, 1_000, blocks.length);
    addCandidate(candidates, index - 1, 200, blocks.length);
    addCandidate(candidates, index + 1, 200, blocks.length);
    addCandidate(candidates, index - 2, 100, blocks.length);
    addCandidate(candidates, index + 2, 100, blocks.length);
  }

  return formatChosen(
    blocks,
    [...candidates].map(([index, priority]) => ({ index, priority })),
    articleQuestionTokens(selectedText),
    selectedText,
    maxChars,
  );
}

function collectDomBlocks(root: HTMLElement): DomContextBlock[] {
  const blocks: DomContextBlock[] = [];
  let heading = '';

  for (const child of root.children) {
    if (!(child instanceof HTMLElement) || child.matches('script, style, [hidden], [aria-hidden="true"]')) continue;
    const text = normalizeArticleText(child.textContent ?? '');
    if (!text) continue;

    const isHeading = /^H[2-4]$/.test(child.tagName);
    if (isHeading) heading = text;

    blocks.push({
      element: child,
      heading: isHeading ? undefined : heading,
      kind: isHeading ? 'heading' : 'body',
      text,
    });
  }

  return blocks;
}

function focusBlockIndex(blocks: readonly DomContextBlock[]): number {
  const viewportCenter = window.innerHeight * 0.48;
  let closest = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  blocks.forEach((block, index) => {
    const rect = block.element.getBoundingClientRect();
    const distance = rect.top <= viewportCenter && rect.bottom >= viewportCenter
      ? 0
      : Math.min(Math.abs(rect.top - viewportCenter), Math.abs(rect.bottom - viewportCenter));
    if (distance < closestDistance) {
      closest = index;
      closestDistance = distance;
    }
  });

  return closest;
}

export function buildArticleQuestionContext(root: HTMLElement | null, question: string, fallback = ''): string {
  if (!root) return truncate(normalizeArticleText(fallback), MAX_ARTICLE_CONTEXT_CHARS);
  const blocks = collectDomBlocks(root);
  if (blocks.length === 0) return truncate(normalizeArticleText(fallback), MAX_ARTICLE_CONTEXT_CHARS);
  return selectRelevantArticleContext(blocks, question, focusBlockIndex(blocks));
}

function selectionRect(range: Range): DOMRect | null {
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
  if (rects.length === 0) return null;

  const visible = rects.filter((rect) => rect.bottom >= 8 && rect.top <= window.innerHeight - 8);
  return visible[visible.length - 1] ?? rects[rects.length - 1];
}

/** 본문 안에서만 끝나는 실제 선택을 읽고, CTA를 놓을 화면 좌표까지 돌려줍니다. */
export function captureArticleTextSelection(root: HTMLElement, selection: Selection | null): ArticleTextSelection | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  if (!selection.anchorNode || !selection.focusNode) return null;
  if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;

  const selectedText = truncate(normalizeSelectedArticleText(selection.toString()), MAX_SELECTED_TEXT_CHARS);
  if (selectedText.length < 2) return null;

  const range = selection.getRangeAt(0).cloneRange();
  const rect = selectionRect(range);
  if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) return null;

  const halfButton = Math.min(86, Math.max(64, window.innerWidth / 4));
  const left = Math.min(window.innerWidth - halfButton, Math.max(halfButton, rect.left + rect.width / 2));
  const above = rect.bottom + 48 > window.innerHeight;

  return {
    range,
    selectedText,
    placement: {
      above,
      left,
      top: above ? rect.top - 8 : rect.bottom + 8,
    },
  };
}

export function buildArticleSelectionContext(root: HTMLElement, range: Range, selectedText: string): string {
  const blocks = collectDomBlocks(root);
  const selectedIndices: number[] = [];

  blocks.forEach((block, index) => {
    try {
      if (range.intersectsNode(block.element)) selectedIndices.push(index);
    } catch {
      // 선택 직후 본문이 바뀌어 Range가 끊긴 경우에는 아래 fallback이 첫 문단을 씁니다.
    }
  });

  return selectSurroundingArticleContext(blocks, selectedIndices, selectedText);
}

export async function requestArticleAnswer(
  payload: ArticleAskPayload,
  signal?: AbortSignal,
): Promise<ArticleAskResponse> {
  const response = await fetch(ARTICLE_AI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
    credentials: 'omit',
    signal,
  });

  if (!response.ok) throw new ArticleAskHttpError(response.status);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new ArticleAskResponseError();
  }

  if (
    !data ||
    typeof data !== 'object' ||
    typeof (data as { answer?: unknown }).answer !== 'string' ||
    !(data as { answer: string }).answer.trim()
  ) {
    throw new ArticleAskResponseError();
  }

  const model = typeof (data as { model?: unknown }).model === 'string'
    ? (data as { model: string }).model
    : '';

  return { answer: (data as { answer: string }).answer.trim(), model };
}

export function articleAskErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return '답변이 조금 늦어지고 있어요. 잠시 후 다시 시도해 주세요.';
  }
  if (error instanceof ArticleAskHttpError) {
    if (error.status === 429) return '질문이 잠시 몰렸어요. 잠시 후 다시 시도해 주세요.';
    if (error.status >= 500) return 'AI가 잠시 응답하지 못했어요. 잠시 후 다시 시도해 주세요.';
    return '질문을 전송하지 못했어요. 내용을 확인한 뒤 다시 시도해 주세요.';
  }
  if (error instanceof ArticleAskResponseError) {
    return '답변을 읽지 못했어요. 다시 한 번 질문해 주세요.';
  }
  return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
}
