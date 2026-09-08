import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { GraduationCap } from 'lucide-react';
import type { CSSProperties } from 'react';
import { articles, countByCategory } from '../data/articles';
import { categoryById } from '../data/categories';
import { learnGroupById, learnGroupPath, learnTabById, type LearnTabId } from '../data/learnGroups';
import { mathTracks } from '../data/curriculum';
import { certs } from '../data/certs';

/**
 * 학습의 두 번째 층. 탭이 고른 갈래 안에서 어디로 갈지 세웁니다.
 *
 * **탭마다 세우는 것이 다릅니다** — 전체는 지도 전체, 수학은 난이도 트랙, 언어는
 * 언어별, AI는 묶음 둘 아래 카테고리 일곱입니다. 그래서 이 컴포넌트는 카테고리
 * 목록을 그리는 것이 아니라 **탭이 정한 구성을 그립니다.**
 *
 * **구분선은 자격증에만 남깁니다.** 묶음마다 선을 그으면 자격증을 가르던 선이 넷 중
 * 하나가 되어 「여기서부터는 다른 곳으로 가는 길」이라는 뜻을 잃습니다.
 */
export function LearnRail({ tab, active }: { tab: LearnTabId; active?: string }) {
  const counts = countByCategory();
  const railRef = useRef<HTMLElement>(null);
  const current = learnTabById[tab];

  /*
    좁은 화면에서 레일은 가로로 눕습니다. 지금 보고 있는 칸이 화면 밖에 있으면
    가운데로 끌어옵니다. 세로 레일에서는 `inline` 축이 안 스크롤되어 아무 일도 없습니다.
  */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || rail.scrollWidth <= rail.clientWidth) return;
    rail.querySelector('[aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active, tab]);

  const tabTotal = current.categoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);

  return (
    <nav className="learn-rail" aria-label="학습 분야" ref={railRef}>
      <p className="learn-rail-label">{tab === 'all' ? '분야' : current.name}</p>

      {/*
        갈래 안의 「전체」. 전체 탭에서는 학습 466편이고, AI 탭에서는 AI 346편입니다.
        수학·언어는 목록이 하나뿐이라 이 줄이 곧 그 목록입니다.
      */}
      <Link
        to={current.to}
        className={`learn-rail-item ${active === undefined || active === tab || active === current.to.split('/').pop() ? 'is-active' : ''}`}
        aria-current={active === undefined || active === tab ? 'page' : undefined}
      >
        <span>{tab === 'all' ? '전체' : `${current.name} 전체`}</span>
        <b>{tab === 'lang' ? langTotal() : tabTotal}</b>
      </Link>

      {/* 수학은 난이도가 두 번째 층입니다 — 초급이 목록 맨 아래에 있어 찾기 어려웠습니다. */}
      {tab === 'math' &&
        mathTracks.map((track) => {
          const written = track.slugs.filter((slug) => hasArticle(slug)).length;
          if (written === 0) return null;
          return (
            <Link
              key={track.id}
              to={`/learn/math-for-ai/${track.id}`}
              className={`learn-rail-item is-nested ${active === track.id ? 'is-active' : ''}`}
              style={{ '--learn-accent': categoryById['math-for-ai'].accent } as CSSProperties}
              aria-current={active === track.id ? 'page' : undefined}
            >
              <span>{track.name}</span>
              <b>{written}</b>
            </Link>
          );
        })}

      {current.groupIds.map((groupId) => {
        const group = learnGroupById[groupId];
        /*
          갈래 안에 갈 곳이 하나뿐이면 위의 「전체」 줄이 곧 그 줄입니다 — 언어 탭에서
          「언어 전체 46」과 「언어 46」이 나란히 서던 자리입니다.
        */
        if (learnGroupPath(group) === current.to) return null;
        const inGroup = group.categoryIds.map((id) => categoryById[id]);
        const tracks = group.tracks ?? [];
        const size = inGroup.length + tracks.length;
        const groupTotal =
          group.categoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0) +
          tracks.reduce((sum, track) => sum + track.count, 0);
        const isActive =
          active === group.id ||
          (size === 1 && (active === inGroup[0]?.id || active === tracks[0]?.id));
        // 카테고리를 보고 있으면 그 카테고리가 든 묶음도 글자만 켭니다.
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

      {/*
        자격증은 탭 밖입니다. 어느 갈래를 보고 있든 가는 길이 같아야 해서 레일 맨
        아래에 선 하나로 떨어져 섭니다 — 분야 칸이 아니라 다른 곳으로 가는 길입니다.
      */}
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

const written = new Set(articles.map((article) => article.slug));
const hasArticle = (slug: string) => written.has(slug);

/** 언어 탭의 편수는 옮겨 온 글이라 카테고리 집계에 없습니다. */
function langTotal(): number {
  const group = learnGroupById.lang;
  return (group.tracks ?? []).reduce((sum, track) => sum + track.count, 0);
}
