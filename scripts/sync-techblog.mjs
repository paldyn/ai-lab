/**
 * techblog의 글을 이 저장소로 옮겨 둡니다.
 *
 * **원본은 techblog 하나입니다.** 파이썬은 그쪽이 265편으로 이미 다루고 있어 같은 것을
 * 다시 쓰지 않습니다. 대신 목록(`src/data/pythonTrack.ts`)에 적힌 것만 마크다운째 옮겨
 * 두고, 우리 화면으로 그리되 `rel=canonical`은 원문을 가리킵니다.
 *
 * **옮긴 파일을 커밋합니다.** 빌드 때 다른 저장소를 읽게 하면 CI에 그 저장소가 없을 때
 * 조용히 빈 목록이 나갑니다. 파일로 두면 무엇이 실려 있는지 diff로 보이고 빌드가
 * 어디서든 같은 결과를 냅니다. 원본이 바뀌면 이 스크립트를 다시 돌립니다.
 *
 *   npm run sync:techblog             ../tech-blog 를 읽습니다
 *   TECHBLOG_DIR=~/x npm run sync:techblog
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.env.TECHBLOG_DIR
  ? path.resolve(process.env.TECHBLOG_DIR)
  : path.resolve(root, '../tech-blog');
const POSTS = path.join(source, 'src/content/posts');
const OUT = path.join(root, 'src/content/mirror');
const SITE = 'https://techblog.paldyn.com';

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

async function main() {
  const slugs = await trackSlugs();
  const today = new Date().toISOString().slice(0, 10);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const missing = [];
  let written = 0;

  for (const slug of slugs) {
    const file = path.join(POSTS, `${slug}.md`);
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch {
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

  const rest = (await readdir(POSTS)).filter((name) => name.startsWith('python-')).length;
  console.log(`옮긴 글 ${written}편 / techblog의 파이썬 ${rest}편`);
  if (missing.length > 0) {
    console.error(`\n원본에 없는 슬러그 ${missing.length}개 — pythonTrack.ts를 고치세요:`);
    for (const slug of missing) console.error(`  ${slug}`);
    process.exitCode = 1;
  }
}

await main();
