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

export function ModelRadar({ limit, showNewsLink = false }: ModelRadarProps) {
  const [selectedModel, setSelectedModel] = useState<NewsPreviewItem | null>(null);
  const items = typeof limit === 'number' ? modelUpdates.slice(0, limit) : modelUpdates;

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
      </div>
      <NewsPreviewModal item={selectedModel} onClose={() => setSelectedModel(null)} />
    </section>
  );
}
