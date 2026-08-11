import type { CSSProperties } from 'react';
import { isLevelTag } from '../data/articles';
import { categoryById, displayLevel } from '../data/categories';
import { trackPlace } from '../data/curriculum';
import type { Article, Category } from '../types/article';

interface ArticleVisualProps {
  article: Article;
  compact?: boolean;
}

/**
 * 카드 왼쪽 위에 붙는 코드. **진짜 번호가 있는 글에만 붙습니다.**
 *
 * 수학은 커리큘럼이라 「초급 7번」이 실재합니다. 트랙의 차례를 함께 적어
 * `M1`·`M2`·`M3`(초급·중급·고급)로 가릅니다 — 셋 다 1번부터 시작하므로 번호만
 * 쓰면 `M-01`이 초급 1번에도 중급 1번에도 붙습니다.
 *
 * **나머지는 비웁니다.** 예전에는 전부 슬러그 해시를 100으로 나눈 나머지였는데,
 * 뜻이 없는 것은 물론이고 유일하지도 않았습니다 — 수학 뺀 315편 중 143편(45%)이
 * 남과 같은 코드를 달고 있었고(`A-14`가 두 편, `A-20`이 두 편 하는 식으로 66개),
 * 접두사 글자마저 겹쳤습니다(D는 DL과 DOMAIN, L은 LAB과 LLM, M은 MATH와 MLOPS).
 *
 * 번호를 새로 매기지 않는 이유가 있습니다. 다른 카테고리에는 정해진 순서가 없고,
 * 목록이 `publishedAt` 내림차순이라 발행순으로 매기면 **새 글이 하나 나올 때마다
 * 뒤 번호가 전부 밀립니다.** 어제 `L-42`였던 글이 오늘 `L-43`이 되는 편이
 * 지금보다 나쁩니다.
 *
 * 빈 자리로 두어도 어색하지 않습니다. 카드 오른쪽에 분야 이름이 이미 있고,
 * 빈 span이 flex 첫 칸을 그대로 차지해 그 이름이 왼쪽으로 밀리지 않습니다.
 */
function articleCode(article: Article, category: Category): string {
  const place = trackPlace(article.slug);
  if (!place) return '';

  return `${category.shortName.slice(0, 1)}${place.tier}-${String(place.number).padStart(2, '0')}`;
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
