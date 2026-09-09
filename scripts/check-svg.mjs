/**
 * 본문 SVG를 기계로 검사합니다.
 *
 * `SVG-STYLE.md`의 점검 목록 가운데 **기계가 확실히 아는 것만** 봅니다 — XML 유효성,
 * 캔버스 밖으로 나간 상자와 글자, 금지된 색 조합, 워터마크, marker 단위입니다.
 *
 * **글자 겹침은 안 봅니다.** 글꼴마다 폭이 달라 어림이 어긋나고, 코드 블록은
 * 「흰 줄을 깔고 키워드만 덧그리는」 방식이 규칙으로 허용돼 있어 일부러 겹칩니다.
 * 겹침과 읽힘은 눈으로 본다.
 *
 *   node scripts/check-svg.mjs                     public/assets/posts 전부
 *   node scripts/check-svg.mjs a.svg b.svg         고른 것만
 */
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const DIR = 'public/assets/posts';

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

async function check(file) {
  const svg = await readFile(file, 'utf8');
  const bad = [];

  try {
    await run('xmllint', ['--noout', file]);
  } catch (error) {
    return [`XML이 깨졌습니다 — ${String(error.stderr ?? error).split('\n')[0]}`];
  }

  const box = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  if (!box) return ['viewBox가 없습니다'];
  const [W, H] = [Number(box[1]), Number(box[2])];
  if (W !== 880) bad.push(`너비가 ${W}입니다 — 본문 그림은 880입니다`);

  /*
    바닥에 붙는 브랜드 워터마크. **낱말 하나로 찾지 않는다** — 「시리즈」만 보고 잡았더니
    「Claude 3.5 / 4 시리즈」 같은 멀쩡한 라벨이 걸렸고, 그것을 고치라는 말로 읽혔다.
    브랜드 이름이 구분자나 저작권 기호를 달고 있을 때만 워터마크다.
  */
  if (/PALDYN\s*[·—–-]|PALDYN\s+\S+\s*(시리즈|완전 정복)|©\s*PALDYN/.test(svg)) {
    bad.push('바닥 워터마크가 있습니다 — SVG-STYLE.md에서 금지합니다');
  }
  // 배경과 구별 안 되는 코드 박스
  if (/fill="#070b14"/.test(svg) || /stroke="#1e2433"/.test(svg)) {
    bad.push('코드 박스가 #070b14/#1e2433입니다 — 배경 #0a0a0a와 구별이 안 됩니다');
  }
  // 화살촉 크기가 stroke에 딸려 커지는 자리
  for (const m of svg.matchAll(/<marker\b[^>]*>/g)) {
    if (!/markerUnits="userSpaceOnUse"/.test(m[0])) {
      bad.push('marker에 markerUnits="userSpaceOnUse"가 없습니다 — 화살촉이 거대해집니다');
      break;
    }
  }

  // 캔버스를 벗어난 상자. 글자 폭은 글꼴마다 달라 어림이 안 맞으므로 상자만 봅니다.
  for (const m of svg.matchAll(/<rect\b[^>]*>/g)) {
    const x = Number(attr(m[0], 'x') ?? NaN);
    const y = Number(attr(m[0], 'y') ?? NaN);
    const w = Number(attr(m[0], 'width') ?? 0);
    const h = Number(attr(m[0], 'height') ?? 0);
    if (Number.isNaN(x) || Number.isNaN(y)) continue;
    if (x < -0.5 || y < -0.5 || x + w > W + 0.5 || y + h > H + 0.5) {
      bad.push(`상자가 캔버스를 벗어납니다 — x=${x} y=${y} ${w}×${h} (캔버스 ${W}×${H})`);
    }
  }

  // 캔버스 아래로 내려간 글자. y 하나는 글꼴과 무관하게 믿을 수 있습니다.
  for (const m of svg.matchAll(/<text\b[^>]*>/g)) {
    const y = Number(attr(m[0], 'y') ?? NaN);
    // 위쪽은 안 봅니다 — `<g transform>` 안의 글자는 y가 0이어도 제자리에 섭니다.
    if (!Number.isNaN(y) && y > H - 4) {
      bad.push(`글자가 캔버스 아래로 내려갑니다 — y=${y} (캔버스 높이 ${H})`);
    }
  }

  return bad;
}

const args = process.argv.slice(2);
const files = args.length
  ? args
  : (await readdir(DIR)).filter((f) => f.endsWith('.svg')).map((f) => path.join(DIR, f));

let broken = 0;
for (const file of files) {
  const bad = await check(file);
  if (bad.length === 0) continue;
  broken += 1;
  console.log(`\n${file}`);
  for (const line of [...new Set(bad)].slice(0, 6)) console.log(`  · ${line}`);
}
console.log(`\n${files.length}장 가운데 ${broken}장에 문제가 있습니다.`);
process.exit(broken > 0 && args.length > 0 ? 1 : 0);
