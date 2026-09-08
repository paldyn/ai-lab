import { useState } from 'react';
import { useLocation } from 'react-router';
import { LearnRail } from '../components/LearnRail';
import { LearnTabs } from '../components/LearnTabs';
import { MirrorCard } from '../components/MirrorCard';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { SortSelect, type SortOption } from '../components/SortSelect';
import { pythonNoteCount, pythonNotes } from '../data/mirror';

/**
 * 파이썬 목록.
 *
 * **여기 실린 글은 우리가 쓴 것이 아닙니다.** 원본은 `paldyn/tech-blog`이고, 그쪽의
 * 파이썬 글 265편을 빌드 직전에 받아 우리 화면으로 그립니다. 골라 싣지 않습니다 —
 * 무엇을 먼저 읽을지는 정렬이 맡습니다.
 *
 * **화면은 다른 갈래와 같습니다** — 왼쪽에 레일, 오른쪽에 글 줄입니다.
 */
type PythonSort = 'latest' | 'oldest';

const SORTS: SortOption<PythonSort>[] = [
  { id: 'latest', label: '최신순' },
  { id: 'oldest', label: '오래된순' },
];

export function PythonTrackPage() {
  const [sort, setSort] = useState<PythonSort>('latest');
  /*
    같은 목록이 주소 둘에 섭니다 — `/learn/lang`은 갈래 전체이고 `/learn/python`은 그
    안의 한 언어입니다. 지금은 언어가 하나뿐이라 목록이 같지만, 레일에서 켜지는 줄이
    다르고 R이 생기면 앞쪽만 늘어납니다.
  */
  const isLangRoot = useLocation().pathname === '/learn/lang';

  /*
    데이터는 발행 순(처음 쓴 것부터)으로 들어옵니다. 최신순은 그것을 뒤집은 것이고,
    카드에 찍는 번호는 뒤집어도 그대로입니다 — 번호는 자리가 아니라 그 글이 몇 번째로
    쓰인 글인가입니다.
  */
  const shown = sort === 'oldest' ? pythonNotes : [...pythonNotes].reverse();

  return (
    <>
      <Seo
        title="파이썬"
        description="PALDYN Tech Blog의 파이썬 글을 이 화면에서 그대로 읽습니다. 문법부터 데이터 도구, 패키징과 비동기까지 265편입니다."
        path={isLangRoot ? '/learn/lang' : '/learn/python'}
      />

      <PageHeader
        kicker="PALDYN LEARN"
        title="파이썬"
        description="AI 코드를 읽고 고치는 데 필요한 언어입니다. 본문은 PALDYN Tech Blog의 글을 그대로 싣습니다."
        stats={[
          { label: '파이썬', value: `${pythonNoteCount}편` },
          { label: '원본', value: 'Tech Blog' },
        ]}
      />

      <LearnTabs active="lang" />

      <div className="site-wrap learn-layout">
        <LearnRail tab="lang" active={isLangRoot ? 'lang' : 'python'} />

        <section className="learn-list">
          <div className="explorer-bar">
            <p className="explorer-count">RESULT / {shown.length}</p>
            <SortSelect options={SORTS} value={sort} onChange={setSort} />
          </div>

          <div>
            {shown.map((note) => (
              <MirrorCard key={note.slug} note={note} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
