import { useState } from 'react';
import { useLocation } from 'react-router';
import { LearnRail } from '../components/LearnRail';
import { LearnTabs } from '../components/LearnTabs';
import { MirrorCard } from '../components/MirrorCard';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { SortSelect, type SortOption } from '../components/SortSelect';
import { pythonNotes } from '../data/mirror';
import { countByCategory } from '../data/articles';
import { categoryIdsIn } from '../data/categories';

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

/** 머리말의 지표는 학습 전체를 가리킵니다 — 옮겨 온 글은 그 편수에 안 듭니다. */
const learnCategoryIds = categoryIdsIn('learn');

export function PythonTrackPage() {
  const [sort, setSort] = useState<PythonSort>('latest');
  const counts = countByCategory();
  const learnTotal = learnCategoryIds.reduce((sum, id) => sum + (counts[id] ?? 0), 0);
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

      {/* 머리말은 학습의 다른 화면과 같습니다 — 이유는 `LearnPage`에 적어 두었습니다. */}
      <PageHeader
        kicker="PALDYN LEARN"
        title="AI 학습"
        description="AI가 어떻게 작동하는지 배웁니다. 모델의 원리부터 그 아래를 떠받치는 수학, 실제로 굴리는 방법까지."
        stats={[
          { label: '전체', value: `${learnTotal}편` },
          { label: '분야', value: String(learnCategoryIds.length).padStart(2, '0') },
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
