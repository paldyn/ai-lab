#!/usr/bin/env node
/**
 * AI 가이드의 **나이**를 봅니다. `npm test`와 일부러 갈라 두었습니다.
 *
 * 신선도를 `npm test`에 걸면 1년 중 어느 날 반드시 서고, 그때 값을 채우는 것보다
 * **임계를 올리거나 검사를 지우는 쪽이 언제나 더 쌉니다.** 게다가 매일 도는 글 루틴
 * 셋·시험 노트 루틴·뉴스 수집 루틴이 전부 같은 `npm test`를 지나므로, 플레이북과
 * 무관한 커밋이 막히는 아침이 옵니다. 그래서 **이 스크립트는 빌드를 안 세웁니다.**
 * 루틴만 돌리고, 넘치면 화면 쪽 `playbookNavVisible`이 서랍을 nav에서 내립니다.
 *
 * 네트워크를 안 씁니다 — URL이 살아 있는지는 `check-doc-urls.mjs`가 따로 봅니다.
 * `npm test`를 네트워크에 묶으면 egress가 막힌 날 글 루틴이 통째로 섭니다.
 *
 *     node scripts/check-playbook.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CLAIMS = path.join(ROOT, 'src/data/playbookClaims.ts');
const LOGS = path.join(ROOT, 'src/data/playbook-checks');

const LOG_GAP_DAYS = 14;
const EXPIRED_RATIO = 0.25;
/*
  **값이 있는** 현장 통설의 상한입니다. 상한의 목적은 「매주 다시 열어야 하는 URL
  수」를 묶는 것이라, 값이 없는 주장은 재확인할 것이 없으므로 안 셉니다 —
  `playbookClaims.test.ts`의 요금·한도 예산이 이미 같은 선을 긋고 있습니다.

  **팁이 들어오면서 갈라야 했습니다**(2026-09-17). 팁 예순셋 중 스물아홉이 현장이라
  옛 셈법으로는 29/10이었는데, 그 스물아홉은 전부 `value: null`이라 다시 열
  URL을 하나도 안 만듭니다. 대신 팁 쪽의 품질은 아래 `FIELD_TIP_RATIO`가 봅니다.
*/
const FIELD_MAX = 10;

/*
  **팁에서 현장이 공식을 넘지 않는다.** 현장 통설은 넷(URL·게시일·교차 확인·반례)을
  다 갖춰도 여전히 가장 약한 등급이라, 이 서랍이 「사람들이 그러더라」로 뒤덮이면
  값을 공식 페이지에서 읽어 오는 나머지 장치가 장식이 됩니다.

  수가 아니라 **비율**로 겁니다 — 팁은 계속 쌓이는 것이고 절대 상한을 걸면 쌓이는
  족족 임계를 올리게 됩니다. 나이 쪽 상한(18개월)은 팁에도 그대로 걸립니다.
*/
const FIELD_TIP_RATIO = 1.0;
const FIELD_MONTHS = 18;
const VALUED_PRICE_LIMIT_MAX = 8;

const THRESHOLD = {
  price: { soft: 30, hard: 60 },
  limit: { soft: 21, hard: 45 },
  model: { soft: 45, hard: 90 },
  concept: null,
};

const DAY = 24 * 60 * 60 * 1000;
const daysBetween = (from, to) =>
  Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY);
const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

/*
  타입을 걷어내고 읽습니다. 이 스크립트는 vite를 안 거치므로 `.ts`를 import 할 수
  없고, 값 목록이 단순한 객체 배열이라 정규식으로 충분합니다.
*/
function parseClaims() {
  const src = readFileSync(CLAIMS, 'utf8');
  const body = src.slice(src.indexOf('export const playbookClaims'));
  return [...body.matchAll(/\{\s*\n\s*id: '([a-z0-9-]+)'[\s\S]*?\n  \}/g)].map((m) => {
    const block = m[0];
    const pick = (key) => block.match(new RegExp(`${key}: '([^']*)'`))?.[1] ?? null;
    return {
      id: m[1],
      tier: pick('tier'),
      volatility: pick('volatility'),
      hasValue: !/value: null/.test(block),
      topic: pick('topic'),
      postedAt: block.match(/postedAt: '([\d-]+)'/)?.[1] ?? null,
    };
  });
}

function parseLogs() {
  return readdirSync(LOGS)
    .filter((name) => /^\d{4}-\d{2}-\d{2}\.ts$/.test(name))
    .map((name) => ({
      date: name.replace('.ts', ''),
      ids: [...readFileSync(path.join(LOGS, name), 'utf8').matchAll(/claimId: '([a-z0-9-]+)'/g)].map(
        (m) => m[1],
      ),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const claims = parseClaims();
const logs = parseLogs();

const lastChecked = new Map();
for (const log of logs) {
  for (const id of log.ids) {
    if (!lastChecked.has(id) || lastChecked.get(id) < log.date) lastChecked.set(id, log.date);
  }
}

/*
  **빈 서랍은 넘친 것이 아닙니다.** 2026-09-16에 기업 층을 넣으려고 통째로 비웠고,
  그 상태에서 「확인 로그가 하나도 없습니다」로 매일 빨간불을 켜면 그 경고가
  의미를 잃습니다. 반쯤 찬 상태만 잡습니다 — 주장이 있는데 로그가 없는 것이
  진짜 위험이기 때문입니다.
*/
if (claims.length === 0 && logs.length === 0) {
  console.log('  서랍이 비어 있습니다 — 뼈대를 다시 잡는 중입니다.');
  console.log('\n넘친 것 없습니다.');
  process.exit(0);
}

const problems = [];
const notes = [];

// 1. 확인 로그가 오래 비었는가
const last = logs.at(-1);
if (!last) {
  problems.push('확인 로그가 하나도 없습니다');
} else {
  const gap = daysBetween(last.date, today);
  notes.push(`마지막 확인 ${last.date} (${gap}일 전)`);
  if (gap > LOG_GAP_DAYS) problems.push(`확인 로그가 ${gap}일 비었습니다 (한계 ${LOG_GAP_DAYS}일)`);
}

// 2. 만료 비율
// 「모름」은 만료가 아닙니다 — 값을 안 내보내고 있으니 독자를 속이지 않습니다.
const expired = claims.filter((c) => {
  if (!c.hasValue) return false;
  const at = lastChecked.get(c.id);
  if (!at) return true;
  const limit = THRESHOLD[c.volatility];
  return limit ? daysBetween(at, today) >= limit.hard : false;
});
const ratio = claims.length > 0 ? expired.length / claims.length : 0;
notes.push(`주장 ${claims.length}건 · 만료 ${expired.length}건 (${Math.round(ratio * 100)}%)`);
if (ratio > EXPIRED_RATIO) {
  problems.push(
    `만료가 ${Math.round(ratio * 100)}%입니다 (한계 ${EXPIRED_RATIO * 100}%) — ${expired.map((c) => c.id).join(', ')}`,
  );
}

// 3. 현장 통설의 수와 나이
const field = claims.filter((c) => c.tier === 'field');
const valuedField = field.filter((c) => c.hasValue);
notes.push(`현장 통설 ${field.length}건 · 그중 값이 있는 것 ${valuedField.length}건 (상한 ${FIELD_MAX})`);
if (valuedField.length > FIELD_MAX) {
  problems.push(`값이 있는 현장 통설이 ${valuedField.length}건입니다 (상한 ${FIELD_MAX})`);
}

// 3-2. 팁에서 현장이 공식을 넘지 않는가
const tips = claims.filter((c) => c.topic === 'habit');
const fieldTips = tips.filter((c) => c.tier === 'field').length;
const vendorTips = tips.filter((c) => c.tier === 'vendor').length;
notes.push(`팁 ${tips.length}건 (공식 ${vendorTips} · 현장 ${fieldTips})`);
if (vendorTips > 0 && fieldTips > vendorTips * FIELD_TIP_RATIO) {
  problems.push(
    `팁에서 현장(${fieldTips})이 공식(${vendorTips})을 넘었습니다 — 공식 문서에서 더 긷거나 약한 현장 팁을 내립니다`,
  );
}

for (const c of field) {
  if (!c.postedAt) continue;
  const months = daysBetween(c.postedAt, today) / 30.4;
  if (months > FIELD_MONTHS) {
    problems.push(`${c.id}: 원 게시물이 ${Math.round(months)}개월 됐습니다 — 재확인해 실측으로 올리거나 지웁니다`);
  }
}

// 4. 값이 있는 요금·한도 주장의 첫 달 예산
const valued = claims.filter((c) => c.hasValue && (c.volatility === 'price' || c.volatility === 'limit'));
notes.push(`값이 있는 요금·한도 ${valued.length}건 (예산 ${VALUED_PRICE_LIMIT_MAX})`);
if (valued.length > VALUED_PRICE_LIMIT_MAX) {
  problems.push(`값이 있는 요금·한도가 ${valued.length}건입니다 (예산 ${VALUED_PRICE_LIMIT_MAX})`);
}

/*
  5. 한 번도 확인 안 된 주장.

  **값이 있는 것만 셉니다**(2026-09-17). 이 경고가 잡으려는 것은 「한 번도 안 열어
  본 페이지의 숫자가 화면에 서 있다」이고, `value: null`인 주장은 화면에 숫자를 안
  내보내므로 그 위험이 없습니다.

  팁에서는 아예 못 채우는 조건이기도 했습니다 — 현장 팁의 출처는 커뮤니티 글인데
  로그의 `excerpt`는 그날 본 **원문 한 줄**이라, 로그를 쓰려면 커뮤니티 글을 인용해야
  합니다. 그건 이 저장소가 금지한 것입니다(「커뮤니티 글은 인용하지 않고 주장만 한
  줄로 다시 쓴다」). 못 채우는 경고는 경고가 아니라 소음이고, 소음이 된 경고는
  옆에 선 진짜 경고까지 같이 안 보이게 만듭니다.
*/
const never = claims.filter((c) => c.hasValue && !lastChecked.has(c.id));
if (never.length > 0) {
  problems.push(
    `값이 있는데 확인 기록이 없는 주장 ${never.length}건: ${never.map((c) => c.id).join(', ')}`,
  );
}

for (const note of notes) console.log(`  ${note}`);

if (problems.length === 0) {
  console.log('\n넘친 것 없습니다.');
  process.exit(0);
}

console.log('');
for (const problem of problems) console.log(`  ⚠ ${problem}`);
console.log(
  '\n막혔으면 공식 페이지를 다시 열어 로그를 쓰거나, 못 열겠으면 value를 null로 내립니다.' +
    '\n모른다고 적는 것은 언제나 통과합니다. 틀린 값만 막힙니다.',
);
process.exit(1);
