import { Link } from 'react-router';
import { GraduationCap } from 'lucide-react';
import type { CSSProperties } from 'react';
import { countByCategory } from '../data/articles';
import { categoriesIn, categoryIdsIn } from '../data/categories';
import { certs } from '../data/certs';

const learnCategories = categoriesIn('learn');
const learnCategoryIds = categoryIdsIn('learn');

/**
 * 학습의 분야 레일. 글 목록과 자격증이 함께 씁니다.
 *
 * **자격증을 여기에 둡니다.** 따로 세우면 머리 메뉴가 다섯이 되는데, 정작 그
 * 페이지가 하는 일은 「우리 글 어디부터 읽으면 되는가」라 학습과 같은 일입니다.
 * 분야 하나로 두면 글을 보다가 자격증으로, 자격증에서 그 분야 글로 오갑니다.
 *
 * 자격증은 분야 칸이 아니라 **단추 모양**으로 세웁니다. 나머지 여덟은 글을
 * 걸러 보는 칸인데 이것만 다른 곳으로 가는 길이라, 같은 모양으로 두면 아홉
 * 번째 분야로 읽힙니다. 위에 선을 하나 얹고 그 선의 위아래 여백을 같게 둡니다.
 */
export function LearnRail({ active }: { active?: string }) {
  const counts = countByCategory();
  const total = learnCategoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);

  return (
    <nav className="learn-rail" aria-label="학습 분야">
      <p className="learn-rail-label">분야</p>

      <Link
        to="/learn"
        className={`learn-rail-item ${active ? '' : 'is-active'}`}
        aria-current={active ? undefined : 'page'}
      >
        <span>전체</span>
        <b>{total}</b>
      </Link>

      {learnCategories.map((category) => (
        <Link
          key={category.id}
          to={`/learn/${category.id}`}
          className={`learn-rail-item ${active === category.id ? 'is-active' : ''}`}
          style={{ '--learn-accent': category.accent } as CSSProperties}
          aria-current={active === category.id ? 'page' : undefined}
        >
          <span>{category.name}</span>
          <b>{counts[category.id] ?? 0}</b>
        </Link>
      ))}

      <div className="learn-rail-extra">
        <Link
          to="/learn/certs"
          className={`learn-rail-cert ${active === 'certs' ? 'is-active' : ''}`}
          aria-current={active === 'certs' ? 'page' : undefined}
        >
          <GraduationCap size={15} strokeWidth={1.7} aria-hidden="true" />
          <span>자격증</span>
          <b>{certs.length}</b>
        </Link>
      </div>
    </nav>
  );
}
