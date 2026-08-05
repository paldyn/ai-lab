import { describe, expect, it } from 'vitest';
import { articles } from './articles';
import { categories, categoryById } from './categories';
import type { CategoryId } from '../types/article';

/**
 * CLAUDE.md의 슬러그 접두사 표를 코드로 옮긴 것입니다. 문서 하나가 유일한
 * 장치였던 동안 `ai-guide`가 306편 중 186편을 모으도록 자랐고 아무 검사에도
 * 안 걸렸습니다. 표와 실제 배치가 갈리면 여기서 `npm test`가 섭니다.
 *
 * 순서가 있는 목록이고 **위에서부터** 먼저 걸리는 줄이 이깁니다 —
 * `ai-coding-`·`ai-agent`가 `ai-`보다 위에 있어야 합니다.
 * CLAUDE.md의 표를 고치면 이 목록도 같이 고칩니다.
 */
const prefixRules: [prefix: string, categoryId: CategoryId][] = [
  ['ai-coding-', 'build-with-ai'],
  ['ai-agent', 'agents-rag'],

  ['app-', 'build-with-ai'],
  ['huggingface-', 'build-with-ai'],
  ['pytorch-', 'build-with-ai'],
  ['python-for-ai', 'build-with-ai'],
  ['notebook-', 'build-with-ai'],
  ['tensorflow-', 'build-with-ai'],

  ['agent-', 'agents-rag'],
  ['rag-', 'agents-rag'],
  ['prompt-', 'agents-rag'],
  ['vector-', 'agents-rag'],

  ['math-', 'math-for-ai'],

  ['ml-', 'deep-learning'],
  ['nn-', 'deep-learning'],
  ['rnn-', 'deep-learning'],
  ['neural-network-', 'deep-learning'],
  ['embedding-', 'deep-learning'],

  ['llm-', 'llm-core'],
  ['transformer-', 'llm-core'],
  ['tokenizer-', 'llm-core'],
  ['reasoning-', 'llm-core'],

  ['cnn-', 'domain-models'],
  ['cv-', 'domain-models'],
  ['nlp-', 'domain-models'],
  ['rl-', 'domain-models'],
  ['recsys-', 'domain-models'],
  ['audio-', 'domain-models'],
  ['multimodal-', 'domain-models'],

  ['mlops-', 'ml-ops'],
  ['llmops-', 'ml-ops'],
  ['serving-', 'ml-ops'],
  ['inference-', 'ml-ops'],
  ['finetuning-', 'ml-ops'],
  ['quantization-', 'ml-ops'],
  ['eval-', 'ml-ops'],
  ['gpu-', 'ml-ops'],
  ['project-', 'ml-ops'],
  ['data-', 'ml-ops'],
  ['distillation', 'ml-ops'],
  ['pruning', 'ml-ops'],
  ['speculative-', 'ml-ops'],

  // 리서치 접두사. 표가 아니라 CLAUDE.md의 리서치 항목 산문이 정합니다.
  ['lab-', 'lab-notes'],
  ['paper-', 'paper-notes'],
  ['bench-', 'tools'],
  ['cost-', 'tools'],
  ['spec-', 'tools'],

  // 남은 `ai-`만 개론·안전 칸으로 갑니다. 잔여 칸이 아닙니다.
  ['ai-', 'ai-guide'],
];

/**
 * 표만으로는 안 갈리는 자리. 전부 CLAUDE.md에 근거가 적혀 있고,
 * 여기 없는 어긋남은 오배치입니다.
 */
const exceptions: Record<string, CategoryId> = {
  // `ai-`로 시작해도 신경망 학습 기본기입니다.
  'ai-loss-functions': 'deep-learning',
  'ai-regularization': 'deep-learning',
  // 검색에 쓰는 벡터를 다룹니다.
  'embedding-sentence': 'agents-rag',
  'embedding-multimodal': 'agents-rag',
  // 만드는 것이 에이전트·RAG입니다.
  'project-rag-from-scratch': 'agents-rag',
  'project-agent-from-scratch': 'agents-rag',
};

function categoryFromSlug(slug: string): CategoryId | undefined {
  if (slug.endsWith('-sdk')) return 'build-with-ai';
  return prefixRules.find(([prefix]) => slug.startsWith(prefix))?.[1];
}

describe('슬러그 접두사와 카테고리', () => {
  it('모든 글이 접두사 표의 한 줄에 걸린다', () => {
    for (const article of articles) {
      expect(categoryFromSlug(article.slug), article.slug).toBeDefined();
    }
  });

  it('표가 가리키는 칸과 frontmatter의 category가 같다', () => {
    for (const article of articles) {
      const expected = exceptions[article.slug] ?? categoryFromSlug(article.slug);
      expect(article.categoryId, article.slug).toBe(expected);
    }
  });

  it('예외 목록에 죽은 항목이 없다', () => {
    const slugs = new Set(articles.map((article) => article.slug));
    for (const [slug, categoryId] of Object.entries(exceptions)) {
      expect(slugs.has(slug), slug).toBe(true);
      // 표가 이미 같은 답을 주면 예외로 적어 둘 이유가 없습니다.
      expect(categoryFromSlug(slug), slug).not.toBe(categoryId);
    }
  });

  it('표가 정의된 카테고리만 가리킨다', () => {
    for (const [, categoryId] of prefixRules) {
      expect(categoryById[categoryId], categoryId).toBeDefined();
    }
    for (const categoryId of Object.values(exceptions)) {
      expect(categoryById[categoryId], categoryId).toBeDefined();
    }
  });

  it('학습 여덟 칸이 모두 표에 나온다', () => {
    const covered = new Set(prefixRules.map(([, categoryId]) => categoryId));
    for (const category of categories.filter((entry) => entry.section === 'learn')) {
      expect(covered.has(category.id), category.id).toBe(true);
    }
  });
});
