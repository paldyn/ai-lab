import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const distDir = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');

const template = await readFile(path.join(distDir, 'index.html'), 'utf8');

for (const marker of ['<!--app-head-->', '<!--app-html-->']) {
  if (!template.includes(marker)) {
    throw new Error(`index.html에 ${marker} 자리표시자가 없습니다. 프리렌더를 진행할 수 없습니다.`);
  }
}

const { render, prerenderRoutes, sitemapRoutes, absoluteUrl, siteUrl } = await import(
  pathToFileURL(path.join(ssrDir, 'entry-server.js')).href
);

/**
 * String.replace는 치환 문자열의 $&, $1 같은 패턴을 특수 처리합니다.
 * 본문에 $가 들어갈 수 있으므로 함수 형태로 넘겨 그대로 삽입되게 합니다.
 */
const fill = (html, headTags, appHtml) =>
  html.replace('<!--app-head-->', () => headTags).replace('<!--app-html-->', () => appHtml);

/*
 * <path>/index.html이 아니라 <path>.html로 씁니다.
 * 디렉터리 형태로 두면 정적 호스팅이 /articles/foo 요청을 /articles/foo/로 한 번
 * 리다이렉트한 뒤에야 내려주는데, canonical과 사이트 내부 링크는 슬래시 없는
 * 주소를 쓰기 때문에 모든 글 진입에 왕복이 한 번씩 더 생깁니다.
 */
const outputPathFor = (route) =>
  route === '/' ? path.join(distDir, 'index.html') : path.join(distDir, `${route.replace(/^\//, '')}.html`);

async function writePage(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, 'utf8');
}

let count = 0;
for (const route of prerenderRoutes) {
  const { html, head } = await render(route);
  await writePage(outputPathFor(route), fill(template, head, html));
  count += 1;
}

// GitHub Pages는 없는 경로에 404.html을 돌려줍니다.
// 프리렌더된 페이지가 우선하고, 나머지는 여기서 클라이언트 라우터가 이어받습니다.
const notFound = await render('/404');
await writePage(path.join(distDir, '404.html'), fill(template, notFound.head, notFound.html));

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapRoutes.map(({ path: routePath, lastModified }) =>
    [
      '  <url>',
      `    <loc>${absoluteUrl(routePath)}</loc>`,
      lastModified ? `    <lastmod>${lastModified}</lastmod>` : null,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n'),
  ),
  '</urlset>',
  '',
].join('\n');

await writeFile(path.join(distDir, 'sitemap.xml'), sitemap, 'utf8');

const robots = ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n');
await writeFile(path.join(distDir, 'robots.txt'), robots, 'utf8');

await rm(ssrDir, { recursive: true, force: true });

console.log(`Prerendered ${count} routes + 404.html, sitemap.xml, robots.txt`);
