import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { categoryLabel, feedDate, newsItems, releaseOf, type NewsItem } from '../data/news';
import { assetUrl, getSource } from '../data/sources';
import { NewsPreviewModal, releasePreviewFields, type NewsPreviewItem } from './NewsPreviewModal';

/**
 * 홈에서만 씁니다. 뉴스 페이지에도 같은 격자를 세우던 때가 있었는데, 그러면 모델
 * 탭이 위는 카드 아래는 목록으로 한 벌의 발표를 두 번 읽게 만들었습니다. 지금
 * 뉴스 페이지는 목록 하나로 읽고 새 모델에는 마크만 붙입니다(GlobalNewsDesk).
 *
 * 여기에 카드가 남은 이유는 맡는 일이 다르기 때문입니다 — 홈은 '요즘 무엇이
 * 나왔나'를 훑는 자리라 스펙 몇 줄을 펼쳐 보여 주는 편이 낫고, 목록으로 바꾸면
 * 바로 위 기업 소식 칼럼과 생김새가 겹쳐 두 영역이 한 덩어리로 보입니다.
 *
 * 다만 **누가 무엇을 냈는가를 적는 방식은 뉴스 목록과 같습니다** — 회사 로고와
 * 회사 이름이 머리에 서고, 계열 마크는 모델 이름 옆에 붙습니다. 예전에는 계열
 * (Gemini)을 출처 자리에 놓아서, 같은 발표가 홈에서는 'Gemini'가 낸 것으로
 * 뉴스에서는 'Google'이 낸 것으로 보였습니다.
 */
const HOME_LIMIT = 4;

export function ModelRadar() {
  const [selectedModel, setSelectedModel] = useState<NewsPreviewItem | null>(null);

  /*
    파생 목록(modelUpdates)을 쓰지 않고 뉴스 항목을 그대로 씁니다. 카드가 여는
    모달이 뉴스 목록에서 여는 것과 한 글자도 다르지 않아야 하는데, 파생 목록에는
    뉴스 제목과 요약이 없어 카드 쪽만 모델 이름과 headline을 채워 넣고 있었습니다.
  */
  const items = newsItems.filter((item) => releaseOf(item)).slice(0, HOME_LIMIT);

  const openPreview = (item: NewsItem) => {
    const meta = getSource(item.source);
    setSelectedModel({
      id: item.id,
      source: meta.displayName,
      publishedAt: item.publishedAt,
      title: item.title,
      summary: item.summary,
      signal: item.signal,
      category: categoryLabel[item.category],
      url: item.url,
      accent: meta.accent,
      logo: assetUrl(meta.logo),
      monochrome: meta.monochrome,
      // 뉴스 목록과 같은 헬퍼입니다 — 한쪽만 채우면 같은 소식인데 내용이 갈립니다.
      ...releasePreviewFields(item),
    });
  };

  return (
    <section id="model-radar" className="model-radar-section scroll-mt-24">
      <div className="site-wrap">
        <div className="simple-section-heading model-radar-heading">
          <div>
            <p className="section-kicker">MODEL RADAR</p>
            <h2>주요 AI 모델 업데이트</h2>
            <p>새 모델이 무엇을 할 수 있고 어디에 쓰는지 카드 한 장으로 확인합니다.</p>
          </div>
          {/* 뉴스 페이지의 모델 탭을 바로 엽니다 — 여기서 이어 읽을 곳이 그 탭입니다. */}
          <Link to="/news/models">
            모델 뉴스 전체 보기 <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>

        <div className="model-radar-grid">
          {items.map((item, index) => {
            const meta = getSource(item.source);
            const release = releaseOf(item)!;
            return (
              <article
                key={item.id}
                className="model-radar-item"
                style={{ '--model-accent': meta.mark } as CSSProperties}
              >
                <div className="model-radar-top">
                  {/* 뉴스 목록의 meta 줄과 같은 짝입니다 — 회사 로고와 회사 이름. */}
                  <span className="news-feed-source" style={{ color: meta.accent }}>
                    <img
                      src={assetUrl(meta.logo)}
                      alt=""
                      aria-hidden="true"
                      className={`news-feed-logo ${meta.monochrome ? 'is-monochrome' : ''}`}
                    />
                    {meta.displayName}
                  </span>
                  <time className="news-feed-date" dateTime={item.publishedAt}>
                    {feedDate(item.publishedAt)}
                  </time>
                  <span className="model-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                </div>

                <div className="model-radar-body">
                  <p>{release.kind} · {release.status}</p>
                  {/*
                    계열 마크는 모델 이름 옆, 그리고 버튼 밖입니다 — 뉴스 목록의
                    제목과 같은 규칙입니다. 안에 넣으면 접근성 이름이 마크의
                    설명과 이어 붙습니다.
                  */}
                  <h3 className="has-mark">
                    <span
                      className="news-feed-mark"
                      style={{ '--model-logo': `url("${assetUrl(release.logo)}")` } as CSSProperties}
                    >
                      <span className={`model-logo-${release.tone}`} aria-hidden="true" />
                      <b className="sr-only">{release.family} 새 모델</b>
                    </span>
                    <button type="button" className="card-trigger" onClick={() => openPreview(item)}>
                      {release.name}
                    </button>
                  </h3>
                  <div className="model-use-case"><b>활용</b><span>{release.useCase}</span></div>
                  {/*
                    headline은 이 카드에만 나옵니다. 뉴스 목록은 summary(사실을
                    풀어 쓴 문단)를 쓰는데, 훑는 자리에는 한 줄로 벼린 쪽이 맞습니다.
                  */}
                  <span>{release.headline}</span>
                </div>

                <div className="model-radar-foot">
                  <b>{categoryLabel[item.category]}</b>
                  <span>요약 보기 <Eye size={13} aria-hidden="true" /></span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <NewsPreviewModal item={selectedModel} onClose={() => setSelectedModel(null)} />
    </section>
  );
}
