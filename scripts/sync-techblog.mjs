/**
 * techblog의 파이썬 글을 빌드 직전에 받아 옵니다.
 *
 * **원본은 techblog 하나입니다.** 파이썬은 그쪽이 265편으로 이미 다루고 있어 같은 것을
 * 다시 쓰지 않습니다. 그 글들을 마크다운째 받아 우리 화면으로 그리고, `rel=canonical`은
 * 원문을 가리킵니다.
 *
 * **골라 싣지 않고 전부 받습니다.** 처음에는 「AI에 필요한 46편」만 골랐는데, 읽는 사람이
 * 파이썬을 찾아 들어왔을 때 265편 중 46편만 있는 이유를 알 길이 없었습니다. 무엇을 먼저
 * 읽을지는 정렬이 맡습니다.
 *
 * **받아 온 파일은 커밋하지 않습니다**(`.gitignore`). 같은 글을 두 저장소에서 관리하지
 * 않으려는 것이 이 구조의 전부입니다 — `src/content/mirror/`는 원고가 아니라 **빌드
 * 캐시**이고, 고치는 자리는 언제나 techblog입니다.
 *
 * 받는 곳은 둘입니다. 옆에 클론이 있으면 그쪽을 읽고(오프라인에서도 됩니다), 없으면
 * GitHub에서 저장소 묶음을 한 번 받아 풉니다 — 265번 요청하지 않으려는 것입니다.
 *
 *   npm run build                     prebuild가 이 스크립트를 먼저 돌립니다
 *   npm test                          pretest도 같은 것을 돌립니다(CI가 이 경로를 씁니다)
 *   TECHBLOG_DIR=~/x npm run sync:techblog
 */
import { execFile } from 'node:child_process';
import matter from 'gray-matter';
import { access, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = process.env.TECHBLOG_DIR
  ? path.resolve(process.env.TECHBLOG_DIR)
  : path.resolve(root, '../tech-blog');
const POSTS = path.join(source, 'src/content/posts');
const OUT = path.join(root, 'src/content/mirror');
const SITE = 'https://techblog.paldyn.com';
const TARBALL = 'https://codeload.github.com/paldyn/tech-blog/tar.gz/refs/heads/main';
const PREFIX = 'python-';

/**
 * 원문의 상대 링크를 techblog 절대 주소로 바꿉니다.
 *
 * 받아 온 글 안의 `/posts/x/`는 이 사이트에 없는 주소입니다. 그대로 두면 404로 가고,
 * 우리 글로 억지로 이으면 없는 글을 가리킵니다. 원문으로 보내는 것이 맞습니다 —
 * 그쪽이 그 글의 집입니다. 그림도 같은 이유로 원본 주소를 그대로 씁니다.
 */
function rewrite(body) {
  return body
    .replace(/\]\(\/posts\/([a-z0-9-]+)\/?\)/g, `](${SITE}/posts/$1/)`)
    .replace(/\]\(\/assets\//g, `](${SITE}/assets/`)
    .replace(/src="\/assets\//g, `src="${SITE}/assets/`);
}

/*
  frontmatter는 정규식이 아니라 YAML 파서로 읽습니다. 따옴표를 손으로 벗기다
  `title: "if __name__ == \"__main__\" 이디엄"`처럼 값 안에 이스케이프된 따옴표가 든
  글에서 깨졌습니다 — 265편 중 한 편이 그랬고, 그 한 편이 목록 전체를 세웠습니다.
*/
function frontmatterOf(raw, file) {
  const parsed = matter(raw);
  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    throw new Error(`${file}: frontmatter가 없습니다`);
  }
  return { data: parsed.data, body: parsed.content };
}

/** JSON 문자열은 그대로 YAML의 큰따옴표 스칼라입니다 — 이스케이프 규칙이 같습니다. */
const quote = (value) => JSON.stringify(String(value));

/** 옆 클론이 없으면 저장소 묶음을 한 번 받아 풀고 그 폴더를 씁니다. */
async function postsDir() {
  const local = await access(POSTS)
    .then(() => true)
    .catch(() => false);
  if (local) {
    console.log(`옆 클론에서 읽습니다: ${POSTS}`);
    return POSTS;
  }

  const temp = await mkdir(path.join(os.tmpdir(), 'paldyn-techblog-'), { recursive: true })
    .then(() => path.join(os.tmpdir(), 'paldyn-techblog-'))
    .catch(() => null);
  if (!temp) throw new Error('임시 폴더를 못 만들었습니다');

  console.log(`GitHub에서 저장소 묶음을 받습니다: ${TARBALL}`);
  const response = await fetch(TARBALL);
  if (!response.ok) throw new Error(`묶음을 못 받았습니다 (HTTP ${response.status})`);

  const file = path.join(temp, 'tech-blog.tar.gz');
  await writeFile(file, Buffer.from(await response.arrayBuffer()));

  /*
    글 폴더만 풉니다 — 저장소 전체를 풀면 쓰지도 않을 파일 수천 개가 따라옵니다.

    **경로에 별표를 쓰지 않습니다.** GNU tar(리눅스)는 `--wildcards` 없이는 별표를
    파일 이름으로 읽어 「아카이브에 없다」로 죽고, BSD tar(맥)는 그냥 맞춰 줍니다 —
    맥에서 되던 것이 CI에서만 섰습니다. 묶음의 첫 칸 이름은 브랜치로 정해져 있으므로
    (`tech-blog-main`) 그대로 적으면 두 tar에서 다 돕니다.
  */
  await run('tar', [
    '-xzf',
    file,
    '-C',
    temp,
    '--strip-components=3',
    'tech-blog-main/src/content/posts',
  ]);
  return path.join(temp, 'posts');
}

/** YAML 파서가 날짜를 Date로 바꿔 주는 경우가 있어 하루치 문자열로 되돌립니다. */
function formatDate(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

async function main() {
  const dir = await postsDir();
  const names = (await readdir(dir)).filter(
    (name) => name.startsWith(PREFIX) && name.endsWith('.md'),
  );
  if (names.length === 0) throw new Error(`${dir}에 파이썬 글이 없습니다`);

  const today = new Date().toISOString().slice(0, 10);
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  for (const name of names) {
    const slug = name.slice(0, -3);
    const { data, body } = frontmatterOf(await readFile(path.join(dir, name), 'utf8'), slug);
    if (!data.title || !data.description) throw new Error(`${slug}: title·description이 없습니다`);

    const out = [
      '---',
      `title: ${quote(data.title)}`,
      `description: ${quote(data.description)}`,
      `sourceSlug: ${quote(slug)}`,
      `sourceUrl: ${quote(`${SITE}/posts/${slug}/`)}`,
      `pubDate: ${quote(formatDate(data.pubDate) ?? today)}`,
      // 같은 날 여러 편이 나가므로 하루 안의 차례가 따로 있습니다. 정렬이 이 값을 씁니다.
      `archiveOrder: ${Number(data.archiveOrder ?? 0)}`,
      `syncedAt: ${quote(today)}`,
      '---',
      '',
      rewrite(body).trimStart(),
    ].join('\n');

    await writeFile(path.join(OUT, name), out);
  }

  console.log(`받아 온 파이썬 글 ${names.length}편`);
}

await main();
