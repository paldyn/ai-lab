import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, Eye } from 'lucide-react';
import { Link } from 'react-router';
import { categoryLabel, feedDate, newsItems, releaseOf, type NewsItem } from '../data/news';
import { assetUrl, getSource } from '../data/sources';
import { NewsPreviewModal, releasePreviewFields, type NewsPreviewItem } from './NewsPreviewModal';

/**
 * 홈의 AI 모델 소식. 뉴스 페이지 모델 탭의 앞머리 넉 장입니다.
 *
 * **`kind: 'model'`을 그대로 씁니다.** 예전에는 `model` 블록이 붙은 것만 뽑아
 * 41건을 봤는데, 모델 탭은 60건입니다 — 가격 개편·가용성 변경·지원 종료처럼
 * 스펙 카드로 세울 수 없는 발표가 통째로 빠져 있었고, 그중에 가장 최신
 * 모델 소식이 들어 있었습니다. 홈이 다루는 것은 '주요 모델 업데이트'가 아니라
 * 'AI 모델 뉴스'입니다.
 *
 * 카드로 두는 이유는 맡는 일이 달라서입니다 — 홈은 훑는 자리라 한 줄 요약을
 * 펼쳐 보여 주는 편이 낫고, 목록으로 바꾸면 바로 위 기업 소식 칼럼과 생김새가
 * 겹쳐 두 영역이 한 덩어리로 보입니다.
 *
 * 누가 무엇을 냈는가를 적는 방식은 뉴스 목록과 같습니다 — 회사 로고와 회사
 * 이름이 머리에 서고, 계열 마크는 제목 옆에 붙습니다.
 */
const HOME_LIMIT = 4;

export function ModelRadar() {
  const [selectedModel, setSelectedModel] = useState<NewsPreviewItem | null>(null);

  /*
    파생 목록을 쓰지 않고 뉴스 항목을 그대로 씁니다. 카드가 여는 모달이 뉴스
    목록에서 여는 것과 한 글자도 다르지 않아야 하는데, 파생 목록에는 뉴스
    제목과 요약이 없어 카드 쪽만 모델 이름을 제목 자리에 넣고 있었습니다.
  */
  const items = newsItems.filter((item) => item.kind === 'model').slice(0, HOME_LIMIT);

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
            <p className="section-kicker">MODEL NEWS</p>
            <h2>AI 모델 소식</h2>
            <p>새로 나온 모델과 계열 확장, 가격·가용성 변화를 최근 순으로 봅니다.</p>
          </div>
          {/* 뉴스 페이지의 모델 탭을 바로 엽니다 — 여기서 이어 읽을 곳이 그 탭입니다. */}
          <Link to="/news/models">
            모델 뉴스 전체 보기 <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>

        <div className="model-radar-grid">
          {items.map((item, index) => {
            const meta = getSource(item.source);
            // 모델 탭 60건 중 19건은 스펙 블록이 없습니다. 없어도 서야 합니다.
            const release = releaseOf(item);
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
                  {release && <span className="model-radar-name">{release.name}</span>}
                  <time className="news-feed-date" dateTime={item.publishedAt}>
                    {feedDate(item.publishedAt)}
                  </time>
                  <span className="model-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                </div>

                <div className="model-radar-body">
                  {/*
                    계열 마크는 이 갈래 줄에 붙습니다. 마크가 가리키는 것이 바로
                    '어느 계열의 새 모델인가'라 이 줄이 제 자리입니다.

                    제목 옆에 두었다가 옮겼습니다 — flex 항목이라 제목 블록 전체를
                    밀어내서, 마크가 있는 카드만 같은 폭에서 제목이 한 줄 더
                    접혔습니다(2줄 → 3줄). 갈래 줄은 짧아 마크가 들어갈 자리가 있습니다.
                  */}
                  <p className={release ? 'has-mark' : undefined}>
                    {release && (
                      <span
                        className="news-feed-mark"
                        style={{ '--model-logo': `url("${assetUrl(release.logo)}")` } as CSSProperties}
                      >
                        <span className={`model-logo-${release.tone}`} aria-hidden="true" />
                        <b className="sr-only">{release.family} 새 모델</b>
                      </span>
                    )}
                    {/* 스펙이 있으면 그것을, 없으면 그 발표의 갈래를 적습니다. */}
                    <span>{release ? `${release.kind} · ${release.status}` : item.signal}</span>
                  </p>
                  {/*
                    제목은 뉴스 제목입니다 — 모델 이름을 제목 자리에 넣으면 스펙이
                    없는 발표에는 쓸 것이 없고, 같은 소식이 홈과 뉴스에서 다른
                    제목으로 보입니다. 모델 이름은 위 회사 줄에 붙습니다.
                  */}
                  <h3>
                    <button type="button" className="card-trigger" onClick={() => openPreview(item)}>
                      {item.title}
                    </button>
                  </h3>
                  {release && (
                    <div className="model-use-case"><b>활용</b><span>{release.useCase}</span></div>
                  )}
                  {/*
                    headline은 카드용으로 벼린 한 줄이라 훑는 자리에 맞습니다.
                    스펙이 없는 발표는 요약을 그대로 씁니다.
                  */}
                  <span>{release?.headline ?? item.summary}</span>
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
