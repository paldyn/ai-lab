import { useRef, useState } from 'react';
import { GlobalNewsDesk } from '../components/GlobalNewsDesk';
import { PageHeader } from '../components/PageHeader';
import { newsItems, type GlobalNewsKind } from '../data/news';
import { ModelRadar } from '../components/ModelRadar';
import { Seo } from '../components/Seo';

type NewsView = 'all' | 'companies' | 'models';

/**
 * 탭은 `kind`와 같은 셋입니다. 한때 기업 소식의 갈래(제품·연구·안전·기업·인프라)를
 * 탭으로 올려 일곱 개까지 늘렸는데, 갈래는 항목마다 이미 붙어 있어 따로 거를
 * 화면을 둘 이유가 없었습니다. 여기서 가르는 질문은 하나뿐입니다 —
 * "이 발표로 쓸 수 있는 모델이 새로 생겼거나 바뀌었는가".
 */
const newsViews: Array<{ id: NewsView; label: string }> = [
  { id: 'all', label: '전체' },
  { id: 'companies', label: '기업 소식' },
  { id: 'models', label: 'AI 모델' },
];

/** 최근 며칠치를 셀 것인가. */
const STATS_DAYS = 7;

/**
 * 최근 일주일에 들어온 양을 탭과 같은 갈래로 보여 줍니다. 전체 = 기업 + 모델.
 *
 * 기준일은 `new Date()`가 아니라 가장 최근 발표일입니다. 정적 사이트라 '오늘'을
 * 쓰면 프리렌더 시각과 접속 시각이 갈려 하이드레이션이 어긋나고, 수집이 하루
 * 쉬면 창이 통째로 비어 0만 남습니다.
 *
 * 하루치를 세던 때는 실제로 하루에 한두 건이라 1·1·0이 떠 무엇을 세는 숫자인지
 * 알 수 없었고, 아카이브 전체를 세던 때는 387이 고정값이라 매일 봐도 달라지는
 * 것이 없었습니다. 일주일이 '요즘 무엇이 나왔나'를 보여 주는 폭입니다.
 */
function buildWeekStats() {
  const latest = newsItems[0]?.publishedAt;
  if (!latest) return { label: '', stats: [] };

  // 날짜만 다루므로 UTC 정오에 맞춰 셉니다. 자정에 두면 시간대에 따라 하루가 밀립니다.
  const end = new Date(`${latest}T12:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (STATS_DAYS - 1));
  const from = start.toISOString().slice(0, 10);

  const recent = newsItems.filter((item) => item.publishedAt >= from && item.publishedAt <= latest);
  const countOf = (kind: GlobalNewsKind) => recent.filter((item) => item.kind === kind).length;

  return {
    label: `최근 7일 · ${from.replaceAll('-', '.')} — ${latest.replaceAll('-', '.')}`,
    stats: [
      { label: '전체', value: String(recent.length) },
      { label: '기업 소식', value: String(countOf('company')) },
      { label: 'AI 모델', value: String(countOf('model')) },
    ],
  };
}

export function NewsPage() {
  const [view, setView] = useState<NewsView>('all');
  const week = buildWeekStats();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // 탭 위젯 키보드 규약: 좌우로 이동, Home/End로 양 끝. 포커스가 이동하면 선택도 함께 바뀝니다.
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = newsViews.length - 1;
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = index === lastIndex ? 0 : index + 1;
    else if (event.key === 'ArrowLeft') nextIndex = index === 0 ? lastIndex : index - 1;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = lastIndex;

    if (nextIndex === null) return;
    event.preventDefault();
    setView(newsViews[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <>
      <Seo
        title="AI 뉴스"
        description="Anthropic, OpenAI, Google DeepMind의 공식 발표를 선별해 무엇이 달라졌고 어디에 영향을 주는지 정리합니다."
        path="/news"
      />

      <PageHeader
        kicker="PALDYN AI NEWS"
        title="AI 뉴스"
        description="Anthropic · OpenAI · Google DeepMind의 공식 발표만 골라, 무엇이 달라졌고 어디에 영향을 주는지 함께 읽습니다."
        stats={week.stats}
        statsLabel={week.label}
      />

      {/*
        분류는 학습·리서치의 카테고리 필터와 같은 칩으로 둡니다. 밑줄 탭을
        머리말 바로 아래 띠로 두면 선이 겹쳐 두 줄이 되고, 선을 지우면
        이번엔 머리말 안에 든 것처럼 보였습니다. 칩은 본문 흐름에 놓여
        어느 쪽으로도 읽히지 않고, 세 섹션의 거르는 방식이 하나로 맞습니다.
      */}
      <div className="site-wrap news-view-tabs" role="tablist" aria-label="AI 뉴스 분류">
        {newsViews.map((item, index) => (
          <button
            key={item.id}
            ref={(node) => { tabRefs.current[index] = node; }}
            type="button"
            role="tab"
            id={`news-tab-${item.id}`}
            aria-selected={view === item.id}
            aria-controls="news-tabpanel"
            tabIndex={view === item.id ? 0 : -1}
            className={`filter-chip ${view === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div id="news-tabpanel" role="tabpanel" aria-labelledby={`news-tab-${view}`} tabIndex={-1}>
        {/*
          모델 탭은 레이더를 위에 얹습니다. 레이더만 두면 model 블록이 있는
          것만 보이고 나머지 모델 발표는 어느 탭에서도 안 나오니, 아래
          데스크에서 59건 전부를 읽게 합니다.
        */}
        {view === 'models' && <ModelRadar />}

        {/* key로 탭마다 갈아 끼웁니다 — 앞 탭에서 고른 출처와 펼친 개수를 되돌립니다. */}
        <GlobalNewsDesk
          key={view}
          kind={view === 'all' ? undefined : view === 'models' ? 'model' : 'company'}
        />
      </div>
    </>
  );
}
