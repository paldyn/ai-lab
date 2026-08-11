import type { CSSProperties } from 'react';
import { isLevelTag } from '../data/articles';
import { categoryById, displayLevel } from '../data/categories';
import { trackPlace } from '../data/curriculum';
import type { Article, Category } from '../types/article';

interface ArticleVisualProps {
  article: Article;
  compact?: boolean;
}

/** slug에서 안정적인 번호를 뽑습니다. 같은 글은 언제나 같은 코드가 나옵니다. */
function slugNumber(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  return String(Math.abs(hash) % 100).padStart(2, '0');
}

/**
 * 카드 왼쪽 위에 붙는 코드.
 *
 * **수학은 진짜 번호를 씁니다.** 커리큘럼이 있는 글은 트랙 안의 번호를 쓰고,
 * 없는 글만 슬러그 해시를 씁니다. 예전에는 전부 해시였는데, 수학은 본문이
 * 「16번 · 일차방정식」처럼 번호로 서로를 가리키는 트랙이라 읽는 사람이 그
 * 숫자를 번호로 읽습니다 — 초급 7번인 피타고라스 정리에 `M-96`이 붙어 있었습니다.
 *
 * 트랙이 셋이라 같은 번호가 셋 나올 수 있는데, 카드 아래에 난이도가 함께
 * 찍히므로(`displayLevel`) 「초급 · M-09」로 읽힙니다.
 */
function articleCode(article: Article, category: Category): string {
  const initial = category.shortName.slice(0, 1);
  const place = trackPlace(article.slug);

  return `${initial}-${place ? String(place.number).padStart(2, '0') : slugNumber(article.slug)}`;
}

export function ArticleVisual({ article, compact = false }: ArticleVisualProps) {
  const category = categoryById[article.categoryId];
  const style = { '--visual-accent': category.accent } as CSSProperties;
  const code = articleCode(article, category);
  /*
    캡션에서 난이도 태그를 뺍니다.

    수학 글은 MATH-PLAN의 규칙대로 트랙 이름(초급·중급·고급)을 **첫 태그**로 답니다 —
    목록에서 같은 트랙끼리 묶어 보는 용도라 태그 자체는 그대로 둡니다. 다만 캡션이
    앞 두 태그를 이어 붙이는 자리라, 그대로 두면 바로 위 강조 라벨과 겹쳐
    「중급」 / 「중급 · 벡터」가 됩니다. 캡션이 말할 것은 난이도가 아니라 주제입니다.
  */
  const topicTags = article.tags.filter((tag) => !isLevelTag(tag));
  const caption = article.visual || topicTags.slice(0, 2).join(' · ') || category.name;

  return (
    <div className={`article-visual ${compact ? 'article-visual-compact' : ''}`} style={style} aria-hidden="true">
      <div className="visual-grid" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between font-mono text-[10px] tracking-[0.14em] text-white/55">
          <span>{code}</span>
          <span>{category.shortName}</span>
        </div>
        <div>
          {/* 난이도는 수학에서만 붙습니다 — displayLevel의 주석을 보세요. */}
          {displayLevel(article) && (
            <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-[var(--visual-accent)]">
              {displayLevel(article)}
            </p>
          )}
          <p className="visual-formula">{caption}</p>
        </div>
      </div>
    </div>
  );
}
