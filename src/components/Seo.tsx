import { useEffect } from 'react';
import { absoluteUrl, applyHead, recordHead, type HeadMeta } from '../lib/head';

interface SeoProps {
  title: string;
  description: string;
  /** 라우트 경로. 예: '/', '/news', '/articles/attention-is-all-you-need' */
  path: string;
  type?: HeadMeta['type'];
  publishedAt?: string;
  noindex?: boolean;
  /**
   * 원문이 다른 곳에 있을 때 그 주소.
   *
   * 옮겨 온 글(`src/content/mirror`)이 여기 해당합니다. 같은 글이 두 도메인에 서면
   * 검색엔진이 한쪽을 중복으로 떨어뜨리는데, canonical을 원문으로 걸면 원본이 어느
   * 쪽인지 밝히면서 우리 화면도 그대로 둘 수 있습니다.
   */
  canonical?: string;
}

const SITE_NAME = 'Paldyn AI Lab';

export function Seo({
  title,
  description,
  path,
  type = 'website',
  publishedAt,
  noindex,
  canonical,
}: SeoProps) {
  const meta: HeadMeta = {
    title: title === SITE_NAME ? title : `${title} · ${SITE_NAME}`,
    description,
    canonical: canonical ?? absoluteUrl(path),
    ogImage: absoluteUrl('assets/og-image.png'),
    type,
    publishedAt,
    noindex,
  };

  // 프리렌더는 renderToString 한 번으로 끝나므로 렌더 중에 기록해야 읽을 수 있습니다.
  // 순수 대입이라 StrictMode의 이중 렌더에서도 결과가 같습니다.
  recordHead(meta);

  const { title: resolvedTitle, canonical: resolvedCanonical, ogImage } = meta;
  useEffect(() => {
    applyHead({
      title: resolvedTitle,
      description,
      canonical: resolvedCanonical,
      ogImage,
      type,
      publishedAt,
      noindex,
    });
  }, [resolvedTitle, description, resolvedCanonical, ogImage, type, publishedAt, noindex]);

  return null;
}
