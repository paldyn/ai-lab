import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { modelUpdates, type ModelUpdate } from '../data/news';
import { assetUrl, getSource } from '../data/sources';
import { NewsPreviewModal, type NewsPreviewItem } from './NewsPreviewModal';

interface ModelRadarProps {
  limit?: number;
  showNewsLink?: boolean;
}

/**
 * 한 번에 내놓는 수. 넓은 화면에서 카드가 네 칸이므로 두 줄입니다.
 * 좁은 화면은 두 칸이라 같은 수가 네 줄이 되는데, 줄 수를 화면마다
 * 맞추려면 JS가 열 수를 알아야 합니다 — 그러자고 리사이즈를 듣기보다
 * 한 번에 늘어나는 양을 고정하는 편이 낫습니다.
 */
const RADAR_STEP = 8;

export function ModelRadar({ limit, showNewsLink = false }: ModelRadarProps) {
  const [selectedModel, setSelectedModel] = useState<NewsPreviewItem | null>(null);
  const [visible, setVisible] = useState(RADAR_STEP);

  // limit을 받으면 홈처럼 정해진 만큼만 보여 주는 자리라 더 보기를 두지 않습니다.
  const paged = typeof limit !== 'number';
  const items = paged ? modelUpdates.slice(0, visible) : modelUpdates.slice(0, limit);
  const hidden = paged ? modelUpdates.length - items.length : 0;

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
            <p>새 모델이 무엇을 바꾸었는지 핵심만 빠르게 확인합니다.</p>
          </div>
          {showNewsLink && <Link to="/news">모델 뉴스 전체 보기 <ArrowUpRight size={13} aria-hidden="true" /></Link>}
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
                  <time dateTime={item.publishedAt}>{item.publishedAt.replaceAll('-', '.')}</time>
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

        {hidden > 0 && (
          <button
            type="button"
            className="news-feed-more"
            onClick={() => setVisible((count) => count + RADAR_STEP)}
          >
            더 보기
            <span>{items.length} / {modelUpdates.length}</span>
          </button>
        )}
      </div>
      <NewsPreviewModal item={selectedModel} onClose={() => setSelectedModel(null)} />
    </section>
  );
}
