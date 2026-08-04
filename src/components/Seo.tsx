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
}

const SITE_NAME = 'Paldyn AI Lab';

export function Seo({ title, description, path, type = 'website', publishedAt, noindex }: SeoProps) {
  const meta: HeadMeta = {
    title: title === SITE_NAME ? title : `${title} · ${SITE_NAME}`,
    description,
    canonical: absoluteUrl(path),
    ogImage: absoluteUrl('assets/og-image.png'),
    type,
    publishedAt,
    noindex,
  };

  // 프리렌더는 renderToString 한 번으로 끝나므로 렌더 중에 기록해야 읽을 수 있습니다.
  // 순수 대입이라 StrictMode의 이중 렌더에서도 결과가 같습니다.
  recordHead(meta);

  const { title: resolvedTitle, canonical, ogImage } = meta;
  useEffect(() => {
    applyHead({ title: resolvedTitle, description, canonical, ogImage, type, publishedAt, noindex });
  }, [resolvedTitle, description, canonical, ogImage, type, publishedAt, noindex]);

  return null;
}
