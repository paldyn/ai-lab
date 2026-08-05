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

const { render, prerenderRoutes, sitemapRoutes, absoluteUrl, siteUrl, buildId, newsCount } =
  await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href);

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

/*
 * 배포 표식.
 * 글 목록은 virtual:article-index로 빌드 때 번들에 박히므로, 탭을 열어 둔 채
 * 새 배포가 나가면 클라이언트 라우팅만으로는 새 글을 볼 방법이 없습니다.
 * 열려 있는 탭이 "내가 든 번들이 최신인가"를 물어볼 자리를 하나 만들어 둡니다.
 *
 * dist에는 그걸 알려 줄 것이 없었습니다 — 에셋 해시는 index.html 안에만 있어
 * 수십 KB를 다시 받아 파싱해야 하고, sitemap의 lastmod는 글 발행일이라 코드만
 * 고친 배포에는 움직이지 않습니다.
 *
 * articles·latestPublishedAt·news는 '새 내용이 생겼는가'와 '코드만 바뀌었는가'를
 * 가릅니다. 배너로 사람을 부르는 것은 앞쪽뿐입니다. 뉴스를 함께 싣는 이유는
 * 그것도 번들에 박히는 콘텐츠이고, 수집 루틴이 매일 돌아 글이 없는 날에도
 * 목록이 늘기 때문입니다 — 빼 두면 그런 배포는 열린 탭에 아무 표시도 못 남깁니다.
 * sitemapRoutes에서 lastModified가 붙는 것은 글뿐이라 목록을 따로 넘기지 않아도 셉니다.
 */
const articleDates = sitemapRoutes.map((route) => route.lastModified).filter(Boolean).sort();
const version = {
  buildId,
  builtAt: new Date().toISOString(),
  articles: articleDates.length,
  latestPublishedAt: articleDates.at(-1) ?? '',
  news: newsCount,
};
await writeFile(path.join(distDir, 'version.json'), `${JSON.stringify(version)}\n`, 'utf8');

await rm(ssrDir, { recursive: true, force: true });

console.log(
  `Prerendered ${count} routes + 404.html, sitemap.xml, robots.txt, version.json (build ${buildId})`,
);
