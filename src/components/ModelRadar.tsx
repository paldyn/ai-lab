import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { feedDate, modelUpdates, type ModelUpdate } from '../data/news';
import { assetUrl, getSource } from '../data/sources';
import { NewsPreviewModal, type NewsPreviewItem } from './NewsPreviewModal';

/**
 * 홈에서만 씁니다. 뉴스 페이지에도 같은 격자를 세우던 때가 있었는데, 그러면 모델
 * 탭이 위는 카드 아래는 목록으로 한 벌의 발표를 두 번 읽게 만들었습니다. 지금
 * 뉴스 페이지는 목록 하나로 읽고 새 모델에는 마크만 붙입니다(GlobalNewsDesk).
 *
 * 여기에 카드가 남은 이유는 맡는 일이 다르기 때문입니다 — 홈은 '요즘 무엇이
 * 나왔나'를 훑는 자리라 스펙 몇 줄을 펼쳐 보여 주는 편이 낫고, 목록으로 바꾸면
 * 바로 위 기업 소식 칼럼과 생김새가 겹쳐 두 영역이 한 덩어리로 보입니다.
 */
const HOME_LIMIT = 4;

export function ModelRadar() {
  const [selectedModel, setSelectedModel] = useState<NewsPreviewItem | null>(null);
  const items = modelUpdates.slice(0, HOME_LIMIT);

  const openPreview = (item: ModelUpdate) => {
    setSelectedModel({
      id: item.id,
      source: item.family,
      publishedAt: item.publishedAt,
      title: item.name,
      summary: item.headline,
      signal: 'MODEL RADAR',
      category: `${item.kind} · ${item.status}`,
      contextLabel: 'USE CASE',
      contextValue: item.useCase,
      url: item.url,
      accent: item.accent,
      logo: assetUrl(item.logo),
      logoTone: item.tone,
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
          {items.map((item, index) => (
            <article
              key={item.id}
              className="model-radar-item"
              style={{ '--model-accent': getSource(item.source).mark } as CSSProperties}
            >
              <div className="model-radar-top">
                <span
                  className="model-company-logo"
                  style={{ '--model-logo': `url("${assetUrl(item.logo)}")` } as CSSProperties}
                  aria-hidden="true"
                >
                  <span className={`model-logo-${item.tone}`} />
                </span>
                <div>
                  <p className={`model-family-name model-family-${item.tone}`}>{item.family}</p>
                  {/*
                    바로 위 기업 소식 칼럼과 같은 형식·같은 급으로 적습니다. 여기만
                    8px 회색으로 두었더니 한 화면에서 날짜 위계가 두 갈래로 보였습니다.
                  */}
                  <time className="news-feed-date" dateTime={item.publishedAt}>{feedDate(item.publishedAt)}</time>
                </div>
                <span className="model-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="model-radar-body">
                <p>{item.kind} · {item.status}</p>
                <h3>
                  <button type="button" className="card-trigger" onClick={() => openPreview(item)}>
                    {item.name}
                  </button>
                </h3>
                <div className="model-use-case"><b>활용</b><span>{item.useCase}</span></div>
                <span>{item.headline}</span>
              </div>
              <div className="model-radar-foot">
                <b>{getSource(item.source).fullName}</b>
                <span>요약 보기 <Eye size={13} aria-hidden="true" /></span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <NewsPreviewModal item={selectedModel} onClose={() => setSelectedModel(null)} />
    </section>
  );
}
