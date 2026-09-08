/**
 * techblog의 글을 빌드 직전에 받아 옵니다.
 *
 * **원본은 techblog 하나입니다.** 파이썬은 그쪽이 265편으로 이미 다루고 있어 같은 것을
 * 다시 쓰지 않습니다. 목록(`src/data/pythonTrack.ts`)에 적힌 것만 마크다운째 받아
 * 우리 화면으로 그리고, `rel=canonical`은 원문을 가리킵니다.
 *
 * **받아 온 파일은 커밋하지 않습니다**(`.gitignore`). 같은 글을 두 저장소에서 관리하지
 * 않으려는 것이 이 구조의 전부입니다 — `src/content/mirror/`는 원고가 아니라 **빌드
 * 캐시**이고, 고치는 자리는 언제나 techblog입니다. 여기 있는 파일을 고쳐도 다음 빌드에
 * 덮여 사라집니다.
 *
 * 받는 곳은 둘입니다. 옆에 클론이 있으면 그쪽을 읽고(오프라인에서도 됩니다), 없으면
 * GitHub raw에서 받습니다(CI가 이 경로를 씁니다).
 *
 *   npm run build                     prebuild가 이 스크립트를 먼저 돌립니다
 *   npm run sync:techblog             손으로 한 번 더 받고 싶을 때
 *   TECHBLOG_DIR=~/x npm run sync:techblog
 */
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.env.TECHBLOG_DIR
  ? path.resolve(process.env.TECHBLOG_DIR)
  : path.resolve(root, '../tech-blog');
const POSTS = path.join(source, 'src/content/posts');
const OUT = path.join(root, 'src/content/mirror');
const SITE = 'https://techblog.paldyn.com';
const RAW = 'https://raw.githubusercontent.com/paldyn/tech-blog/main/src/content/posts';

/** 목록은 타입스크립트 파일에 있습니다. 빌드 없이 읽으려고 슬러그만 뽑아 씁니다. */
async function trackSlugs() {
  const file = await readFile(path.join(root, 'src/data/pythonTrack.ts'), 'utf8');
  const slugs = [...file.matchAll(/^\s*'(python-[a-z0-9-]+)',$/gm)].map((m) => m[1]);
  if (slugs.length === 0) throw new Error('pythonTrack.ts에서 슬러그를 못 읽었습니다');
  return slugs;
}

/**
 * 원문의 상대 링크를 techblog 절대 주소로 바꿉니다.
 *
 * 옮겨 온 글 안의 `/posts/x/`는 이 사이트에 없는 주소입니다. 그대로 두면 404로 가고,
 * 우리 글로 억지로 이으면 없는 글을 가리킵니다. 원문으로 보내는 것이 맞습니다 —
 * 그쪽이 그 글의 집입니다. 그림도 같은 이유로 원본 주소를 그대로 씁니다.
 */
function rewrite(body) {
  return body
    .replace(/\]\(\/posts\/([a-z0-9-]+)\/?\)/g, `](${SITE}/posts/$1/)`)
    .replace(/\]\(\/assets\//g, `](${SITE}/assets/`)
    .replace(/src="\/assets\//g, `src="${SITE}/assets/`);
}

function frontmatterOf(raw, file) {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  if (!match) throw new Error(`${file}: frontmatter가 없습니다`);
  const data = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([a-zA-Z]+):\s*(.*)$/.exec(line);
    if (kv) data[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1');
  }
  return { data, body: raw.slice(match[0].length) };
}

const quote = (value) => `"${String(value).replace(/"/g, '\\"')}"`;

/** 옆 클론이 있으면 그쪽, 없으면 GitHub raw. 둘 다 안 되면 그 글만 건너뜁니다. */
async function fetchPost(slug, local) {
  if (local) {
    try {
      return await readFile(path.join(POSTS, `${slug}.md`), 'utf8');
    } catch {
      return null;
    }
  }
  const response = await fetch(`${RAW}/${slug}.md`);
  return response.ok ? response.text() : null;
}

async function main() {
  const slugs = await trackSlugs();
  const today = new Date().toISOString().slice(0, 10);
  const local = await access(POSTS)
    .then(() => true)
    .catch(() => false);
  console.log(local ? `옆 클론에서 읽습니다: ${POSTS}` : `GitHub raw에서 받습니다: ${RAW}`);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const missing = [];
  let written = 0;

  for (const slug of slugs) {
    const raw = await fetchPost(slug, local);
    if (raw === null) {
      missing.push(slug);
      continue;
    }

    const { data, body } = frontmatterOf(raw, slug);
    if (!data.title || !data.description) throw new Error(`${slug}: title·description이 없습니다`);

    const out = [
      '---',
      `title: ${quote(data.title)}`,
      `description: ${quote(data.description)}`,
      `sourceSlug: ${quote(slug)}`,
      `sourceUrl: ${quote(`${SITE}/posts/${slug}/`)}`,
      `pubDate: ${quote(data.pubDate ?? today)}`,
      `syncedAt: ${quote(today)}`,
      '---',
      '',
      rewrite(body).trimStart(),
    ].join('\n');

    await writeFile(path.join(OUT, `${slug}.md`), out);
    written += 1;
  }

  const rest = local
    ? (await readdir(POSTS)).filter((name) => name.startsWith('python-')).length
    : null;
  console.log(`받아 온 글 ${written}편${rest ? ` / techblog의 파이썬 ${rest}편` : ''}`);
  if (missing.length > 0) {
    console.error(`\n못 받은 슬러그 ${missing.length}개 — pythonTrack.ts를 고치거나 연결을 보세요:`);
    for (const slug of missing) console.error(`  ${slug}`);
    process.exitCode = 1;
  }
}

await main();
