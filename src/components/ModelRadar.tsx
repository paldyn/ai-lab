import { useState } from 'react';
import { ArrowUpRight, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { modelUpdates, type ModelUpdate } from '../data/modelUpdates';
import { NewsPreviewModal, type NewsPreviewItem } from './NewsPreviewModal';

interface ModelRadarProps {
  limit?: number;
  showNewsLink?: boolean;
}

export function ModelRadar({ limit, showNewsLink = false }: ModelRadarProps) {
  const [selectedModel, setSelectedModel] = useState<NewsPreviewItem | null>(null);
  const items = typeof limit === 'number' ? modelUpdates.slice(0, limit) : modelUpdates;
  const assetBase = import.meta.env.BASE_URL;
  const openPreview = (item: ModelUpdate) => {
    setSelectedModel({
      id: item.id,
      source: item.family,
      publishedAt: item.publishedAt,
      title: item.model,
      summary: item.summary,
      signal: 'MODEL RADAR',
      category: `${item.kind} · ${item.status}`,
      contextLabel: 'USE CASE',
      contextValue: item.useCase,
      url: item.url,
      accent: item.accent,
      logo: `${assetBase}${item.modelLogo}`,
      logoTone: item.logoTone,
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
          {showNewsLink && <Link to="/news">모델 뉴스 전체 보기 <ArrowUpRight size={13} /></Link>}
        </div>

        <div className="model-radar-grid">
          {items.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className="model-radar-item"
              style={{ '--model-accent': item.accent } as React.CSSProperties}
              onClick={() => openPreview(item)}
            >
              <div className="model-radar-top">
                <span
                  className="model-company-logo"
                  role="img"
                  aria-label={`${item.model} 로고`}
                  style={{ '--model-logo': `url("${assetBase}${item.modelLogo}")` } as React.CSSProperties}
                >
                  <span className={`model-logo-${item.logoTone}`} aria-hidden="true" />
                </span>
                <div>
                  <p className={`model-family-name model-family-${item.logoTone}`}>{item.family}</p>
                  <time dateTime={item.publishedAt}>{item.publishedAt.replaceAll('-', '.')}</time>
                </div>
                <span className="model-order">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="model-radar-body">
                <p>{item.kind} · {item.status}</p>
                <h3>{item.model}</h3>
                <div className="model-use-case"><b>활용</b><span>{item.useCase}</span></div>
                <span>{item.summary}</span>
              </div>
              <div className="model-radar-foot">
                <b>{item.company}</b>
                <span>요약 보기 <Eye size={13} /></span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <NewsPreviewModal item={selectedModel} onClose={() => setSelectedModel(null)} />
    </section>
  );
}
