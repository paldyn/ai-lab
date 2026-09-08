import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { GraduationCap } from 'lucide-react';
import type { CSSProperties } from 'react';
import { countByCategory } from '../data/articles';
import { categoryIdsIn } from '../data/categories';
import { categoriesInGroup, learnGroupPath, learnGroups, learnGroupSize } from '../data/learnGroups';
import { certs } from '../data/certs';

const learnCategoryIds = categoryIdsIn('learn');

/**
 * 학습의 분야 레일. 글 목록과 자격증이 함께 씁니다.
 *
 * **두 층입니다 — 묶음 아래 카테고리.** 카테고리 여덟을 한 줄로 늘어놓으면 수학
 * 120편이 AI 일곱 칸 사이에 끼어 같은 갈래로 읽힙니다. 묶음은 `data/learnGroups.ts`가
 * 들고 있고 글에는 아무것도 안 적힙니다.
 *
 * **구분선은 자격증에만 남깁니다.** 묶음마다 선을 그으면 자격증을 가르던 선이 넷 중
 * 하나가 되어 「여기서부터는 다른 곳으로 가는 길」이라는 뜻을 잃습니다. 묶음은 굵기와
 * 위 여백으로만 가릅니다.
 *
 * **자격증을 여기에 둡니다.** 따로 세우면 머리 메뉴가 다섯이 되는데, 정작 그 페이지가
 * 하는 일은 「우리 글 어디부터 읽으면 되는가」라 학습과 같은 일입니다. 분야 칸이 아니라
 * 단추 모양으로 세워 아홉 번째 분야로 읽히지 않게 합니다.
 */
export function LearnRail({ active }: { active?: string }) {
  const counts = countByCategory();
  const total = learnCategoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  const railRef = useRef<HTMLElement>(null);

  /*
    좁은 화면에서 레일은 가로로 눕습니다. 줄이 열에서 열넷으로 길어져 지금 보고 있는
    칸이 화면 밖에 있는 일이 생기므로, 그 칸을 가운데로 끌어옵니다. 세로 레일에서는
    `inline` 축이 스크롤되지 않아 아무 일도 일어나지 않습니다.
  */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth) return;
    rail.querySelector('[aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <nav className="learn-rail" aria-label="학습 분야" ref={railRef}>
      <p className="learn-rail-label">분야</p>

      <Link
        to="/learn"
        className={`learn-rail-item ${active ? '' : 'is-active'}`}
        aria-current={active ? undefined : 'page'}
      >
        <span>전체</span>
        <b>{total}</b>
      </Link>

      {learnGroups.map((group) => {
        const inGroup = categoriesInGroup(group);
        const tracks = group.tracks ?? [];
        const size = learnGroupSize(group);
        const groupTotal =
          group.categoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0) +
          tracks.reduce((sum, track) => sum + track.count, 0);
        const isActive =
          active === group.id ||
          (size === 1 && (active === inGroup[0]?.id || active === tracks[0]?.id));
        // 카테고리를 보고 있으면 그 카테고리가 든 묶음도 글자만 켭니다 — 지금 어느 갈래
        // 안에 있는지가 남습니다.
        const within =
          !isActive &&
          (inGroup.some((category) => category.id === active) ||
            tracks.some((track) => track.id === active));

        return (
          <div key={group.id} className="learn-rail-group-block">
            <Link
              to={learnGroupPath(group)}
              className={`learn-rail-item learn-rail-group ${isActive ? 'is-active' : ''}${within ? ' is-within' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{group.name}</span>
              <b>{groupTotal}</b>
            </Link>

            {/* 칸이 하나면 묶음 줄이 곧 그 칸이라 아래를 다시 세우지 않습니다. */}
            {size >= 2 &&
              tracks.map((track) => (
                <Link
                  key={track.id}
                  to={track.to}
                  className={`learn-rail-item is-nested ${active === track.id ? 'is-active' : ''}`}
                  aria-current={active === track.id ? 'page' : undefined}
                >
                  <span>{track.name}</span>
                  <b>{track.count}</b>
                </Link>
              ))}
            {size >= 2 &&
              inGroup.map((category) => (
                <Link
                  key={category.id}
                  to={`/learn/${category.id}`}
                  className={`learn-rail-item is-nested ${active === category.id ? 'is-active' : ''}`}
                  style={{ '--learn-accent': category.accent } as CSSProperties}
                  aria-current={active === category.id ? 'page' : undefined}
                >
                  <span>{category.name}</span>
                  <b>{counts[category.id] ?? 0}</b>
                </Link>
              ))}
          </div>
        );
      })}

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
