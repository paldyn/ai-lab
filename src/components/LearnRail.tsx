import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { CSSProperties } from 'react';
import { articles, countByCategory } from '../data/articles';
import { categoryById } from '../data/categories';
import {
  learnGroupById,
  learnGroupPath,
  learnTabById,
  type LearnTabId,
} from '../data/learnGroups';
import { mathTracks } from '../data/curriculum';

/**
 * 학습의 두 번째 층. 갈래 안에서 더 좁힐 칸을 세웁니다.
 *
 * **갈래는 위의 칩이 맡고 자격증은 그 줄의 오른쪽 끝으로 갔습니다.** 레일에 남는 것은
 * 갈래 안에서 더 좁힐 칸과, 아무것도 안 고른 상태로 되돌아올 「전체」 한 줄입니다.
 *
 * **갈래마다 세우는 것이 다릅니다** — 수학은 난이도 트랙, 언어는 언어별, AI는 묶음 둘
 * 아래 카테고리 일곱입니다. 「전체」 갈래처럼 **더 좁힐 칸이 없으면 레일을 아예 그리지
 * 않고** 목록이 화면 폭을 다 씁니다(`learnRailShown`).
 *
 * **묶음 줄과 카테고리 줄은 글씨로 갈립니다** — 묶음은 10px 모노 라벨에 밑줄, 카테고리는
 * 13.5px 본문 글씨에 색 띠입니다. 층을 들여쓰기로만 가르면 눈에 안 들어옵니다.
 */
export function LearnRail({
  tab,
  active,
}: {
  tab: LearnTabId;
  active?: string;
}) {
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
    rail
      .querySelector("[aria-current]")
      ?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [active, tab]);

  /*
    갈래의 첫 화면에 있는가. 주소의 마지막 조각이 그 갈래가 가는 곳과 같으면 그렇습니다 —
    수학은 `math-for-ai`, AI는 `ai`, 언어는 `lang`입니다. 이 값이 「전체」 줄을 켭니다.
  */
  const atTabRoot = active === undefined || active === tab || active === current.to.split('/').pop();

  if (!learnRailShown(tab)) return null;

  return (
    <nav className="learn-rail" aria-label="학습 분야" ref={railRef}>
      <p className="learn-rail-label">
        {tab === 'math' ? '난이도' : tab === 'lang' ? '언어' : '분야'}
      </p>

      {/*
        갈래 안의 「전체」. 위의 칩과 같은 곳을 가리키지만 레일에도 둡니다 — 칸을 하나
        골라 놓고 되돌아올 자리가 레일 안에 있어야 하고, 아무것도 안 고른 상태가
        레일에서도 보여야 합니다. 기본으로 켜져 있는 줄이 이것입니다.
      */}
      <Link
        to={current.to}
        className={`learn-rail-item ${atTabRoot ? 'is-active' : ''}`}
        aria-current={atTabRoot ? 'page' : undefined}
      >
        <span>전체</span>
        <b>{tabTotal(tab)}</b>
      </Link>

      {/*
        수학은 난이도, 언어는 묶음이 두 번째 층입니다. 둘 다 위에 묶음 머리가 없으므로
        들여쓰지 않습니다 — 들여쓰기는 「위에 무엇이 있다」는 표시라 혼자 서면 어긋납니다.
      */}
      {tab === 'math' &&
        mathTracks.map((track) => {
          const written = track.slugs.filter((slug) => hasArticle(slug)).length;
          if (written === 0) return null;
          return (
            <Link
              key={track.id}
              to={`/learn/math-for-ai/${track.id}`}
              className={`learn-rail-item ${active === track.id ? "is-active" : ""}`}
              style={
                {
                  '--learn-accent': categoryById['math-for-ai'].accent,
                } as CSSProperties
              }
              aria-current={active === track.id ? 'page' : undefined}
            >
              <span>{track.name}</span>
              <b>{written}</b>
            </Link>
          );
        })}

      {/*
        언어는 언어별이 두 번째 층입니다. R은 아직 0편이라 눌리지 않는 「준비 중」 줄로
        섭니다 — 자리를 비워 두면 이 갈래가 파이썬만 다루는 곳처럼 읽힙니다.
      */}
      {tab === 'lang' &&
        (learnGroupById.lang.tracks ?? []).map((track) =>
          track.count > 0 ? (
            <Link
              key={track.id}
              to={track.to}
              className={`learn-rail-item ${active === track.id ? 'is-active' : ''}`}
              style={{ '--learn-accent': 'var(--brand)' } as CSSProperties}
              aria-current={active === track.id ? 'page' : undefined}
            >
              <span>{track.name}</span>
              <b>{track.count}</b>
            </Link>
          ) : (
            <span key={track.id} className="learn-rail-item is-waiting">
              <span>{track.name}</span>
              <b>준비 중</b>
            </span>
          ),
        )}

      {current.groupIds.map((groupId) => {
        const group = learnGroupById[groupId];
        /*
          이미 위에 선 묶음은 다시 세우지 않습니다. 언어는 트랙을 레일이 직접 그리므로
          여기서 또 그리면 「파이썬·R」이 두 벌 섭니다. 그리고 묶음이 가는 곳이 갈래의
          첫 화면과 같으면 그 줄은 위의 「전체」와 같은 줄입니다.
        */
        if (tab === 'lang' || learnGroupPath(group) === current.to) return null;
        const inGroup = group.categoryIds.map((id) => categoryById[id]);
        const tracks = group.tracks ?? [];
        const size = inGroup.length + tracks.length;
        const groupTotal =
          group.categoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0) +
          tracks.reduce((sum, track) => sum + track.count, 0);
        const isActive =
          active === group.id ||
          (size === 1 &&
            (active === inGroup[0]?.id || active === tracks[0]?.id));
        // 카테고리를 보고 있으면 그 카테고리가 든 묶음도 글자만 켭니다.
        const within =
          !isActive &&
          (inGroup.some((category) => category.id === active) ||
            tracks.some((track) => track.id === active));

        return (
          <div key={group.id} className="learn-rail-group-block">
            <Link
              to={learnGroupPath(group)}
              className={`learn-rail-item learn-rail-group ${isActive ? "is-active" : ""}${within ? " is-within" : ""}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{group.name}</span>
              <b>{groupTotal}</b>
            </Link>

            {/* 칸이 하나면 묶음 줄이 곧 그 칸이라 아래를 다시 세우지 않습니다. */}
            {size >= 2 && (
              <div className="learn-rail-nested">
                {tracks.map((track) => (
                  <Link
                    key={track.id}
                    to={track.to}
                    className={`learn-rail-item ${active === track.id ? "is-active" : ""}`}
                    aria-current={active === track.id ? 'page' : undefined}
                  >
                    <span>{track.name}</span>
                    <b>{track.count}</b>
                  </Link>
                ))}
                {inGroup.map((category) => (
                  <Link
                    key={category.id}
                    to={`/learn/${category.id}`}
                    className={`learn-rail-item ${active === category.id ? "is-active" : ""}`}
                    style={
                      { '--learn-accent': category.accent } as CSSProperties
                    }
                    aria-current={active === category.id ? 'page' : undefined}
                  >
                    <span>{category.name}</span>
                    <b>{counts[category.id] ?? 0}</b>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/** 갈래 하나가 담는 편수. 언어는 옮겨 온 글이라 카테고리 집계에 없습니다. */
function tabTotal(tab: LearnTabId): number {
  const current = learnTabById[tab];
  const counts = countByCategory();
  const fromCategories = current.categoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
  const fromTracks = current.groupIds
    .flatMap((id) => learnGroupById[id].tracks ?? [])
    .reduce((sum, track) => sum + track.count, 0);
  return fromCategories + fromTracks;
}

const written = new Set(articles.map((article) => article.slug));
const hasArticle = (slug: string) => written.has(slug);

/**
 * 이 갈래에 레일을 세우는가.
 *
 * 더 좁힐 칸이 없으면 안 세웁니다 — 전체는 갈래가 곧 칩이고, 언어는 지금 파이썬
 * 하나뿐입니다. 빈 레일을 두면 목록만 좁아집니다. R이 생기면 언어도 저절로 섭니다.
 */
export function learnRailShown(tab: LearnTabId): boolean {
  /*
    「전체」에는 레일을 두지 않습니다. 세울 줄이 전부 위의 칩과 같은 곳을 가리켜
    같은 말이 두 번 서기 때문입니다 — 전체는 갈래 없이 다 보는 자리이고, 좁히려면
    칩을 누릅니다. 카테고리로 바로 가는 길은 AI 칩 한 번 뒤에 그대로 있습니다.
  */
  if (tab === 'all') return false;
  if (tab === 'lang') return (learnGroupById.lang.tracks ?? []).length >= 2;
  if (tab === 'math')
    return (
      mathTracks.filter((track) => track.slugs.some(hasArticle)).length >= 2
    );
  const current = learnTabById[tab];
  const rows = current.groupIds
    .map((id) => learnGroupById[id])
    .filter((group) => learnGroupPath(group) !== current.to).length;
  return rows >= 2;
}
