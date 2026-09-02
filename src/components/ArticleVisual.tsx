import type { CSSProperties } from 'react';
import { articleNumber, isLevelTag } from '../data/articles';
import { categoryById, displayLevel } from '../data/categories';
import type { Article } from '../types/article';

interface ArticleVisualProps {
  article: Article;
  compact?: boolean;
}

/**
 * 카드 왼쪽 위에는 **번호만** 찍고 카테고리는 오른쪽 위 `shortName`에 맡깁니다.
 * 왼쪽이 '어디쯤', 오른쪽이 '어느 줄'을 하나씩 말해서 같은 낱말이 두 번 나오지
 * 않습니다 — `LLM-42`처럼 접두사를 붙이면 30px 옆의 `LLM`과 같은 말이 됩니다.
 *
 * 그래서 **작은 썸네일에서도 `shortName`을 감추지 않습니다**(styles.css). 감추면
 * 왼쪽의 `42`가 홀로 남아 뜻을 잃고, 카테고리가 섞이는 목록에서는 LLM의 23과
 * MLOPS의 42가 같은 자로 잰 수처럼 보입니다.
 *
 * 예전에는 슬러그 해시를 100으로 나눈 나머지였습니다. 뜻이 없는 것은 물론이고
 * 유일하지도 않아서, 수학 뺀 315편 중 143편(45%)이 남과 같은 코드를 달고
 * 있었습니다(`A-14`가 두 편, `A-20`이 두 편 하는 식으로 66개).
 */
function articleCode(article: Article): string {
  return String(articleNumber(article)).padStart(2, '0');
}

export function ArticleVisual({ article, compact = false }: ArticleVisualProps) {
  const category = categoryById[article.categoryId];
  const style = { '--visual-accent': category.accent } as CSSProperties;
  const code = articleCode(article);
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
      <div className="visual-body">
        <div className="flex items-start justify-between font-mono text-[10px] tracking-[0.14em]">
          <span className="text-white/55">{code}</span>
          {/*
            분야는 그 카테고리의 색으로 적습니다. 번호와 같은 흐린 흰색으로 두었더니
            휴대폰에서 난이도만 눈에 들어오고 분야는 배경에 묻혔습니다 — 같은 상자
            안에서 색이 붙은 글자는 난이도 하나뿐이었습니다.
          */}
          <span className="visual-category">{category.shortName}</span>
        </div>
        <div>
          {/* 난이도는 수학에서만 붙습니다 — displayLevel의 주석을 보세요. */}
          {displayLevel(article) && (
            <p className="visual-level mb-2 font-mono text-[10px] tracking-[0.16em] text-[var(--visual-accent)]">
              {displayLevel(article)}
            </p>
          )}
          <p className="visual-formula">{caption}</p>
        </div>
      </div>
    </div>
  );
}
