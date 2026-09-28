import { claimsForProduct } from './data/playbook';
import { playbookClaims } from './data/playbookClaims';
import { guideProducts } from './data/guideProducts';
import { shownModels } from './data/guideModels';
import { tipGroupsOf } from './data/guideTipGroups';
import { guideVendors } from './data/guideVendors';
import { prerenderRoutes } from './routes';
import { describe, expect, it } from 'vitest';
import { certPrepNotes } from './data/certPrep';
import { pythonNotes } from './data/mirror';
import { articles } from './data/articles';
import { render } from './entry-server';

/**
 * **프리렌더된 HTML에 본문이 실제로 들어 있는가.**
 *
 * `renderToString`은 동기라 페이지의 `useEffect`가 SSR에서 안 돕니다. 그래서
 * `render()`가 **주소 모양마다 본문을 미리 캐시에 넣어 줘야** 하고, 그 줄이 빠지면
 * 그 서랍의 HTML에 본문 대신 「본문을 불러오는 중입니다」 한 줄만 들어갑니다.
 *
 * **조용히 깨지는 고장입니다.** 파일은 생기고(프리렌더 목록에는 들어 있으니까),
 * 브라우저에서는 hydrate 뒤 청크를 받아 와 정상으로 보입니다. 안 보이는 것은
 * 검색 엔진과 자바스크립트를 못 쓰는 환경뿐입니다.
 *
 * 2026-09-16에 **옮겨 온 파이썬 글 265편 전부**와 가이드 노트가 이 상태로 나가고
 * 있던 것을 찾았습니다. 링크·경로·사이트맵을 보는 검사는 여럿이었는데 **산출물의
 * 내용을 보는 검사가 하나도 없었습니다.** 이 파일이 그 자리입니다.
 *
 * 서랍을 새로 팔 때 `entry-server.tsx`에 한 줄, 여기에 한 줄을 같이 답니다.
 */
const LOADING = '본문을 불러오는 중입니다';

/** 본문이 실렸다는 표시. 모든 서랍이 같은 산문 컨테이너를 씁니다. */
const hasBody = (html: string) => html.includes('article-prose') && !html.includes(LOADING);

/** React가 글자를 HTML에 넣을 때와 같은 꼴로 바꿉니다. */
const esc = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

/**
 * 클래스 **토큰**으로 셉니다. 문자열 포함으로 세면 `gl-tip`이 `gl-tips`·`gl-tip-do`에도
 * 걸려 수가 부풉니다 — 그래서 `class="…"`를 잡아 공백으로 가른 낱말과 견줍니다.
 */
const classCount = (html: string, token: string) =>
  [...html.matchAll(/class="([^"]*)"/g)].filter((m) => m[1].split(/\s+/).includes(token)).length;

/** 원장만. 레일과 사이트 머리·꼬리에 같은 낱말이 있어도 안 섞이게 합니다. */
const ledgerOf = (html: string) => {
  const start = html.indexOf('<article class="gl-ledger"');
  return start < 0 ? '' : html.slice(start, html.indexOf('</article>', start) + 10);
};

describe('프리렌더 — 본문이 HTML에 들어간다', () => {
  it('학습 글', async () => {
    const { html } = await render(`/articles/${articles[0].slug}`);
    expect(hasBody(html), articles[0].slug).toBe(true);
  });

  it('시험 노트', async () => {
    const note = certPrepNotes[0];
    const { html } = await render(note.path);
    expect(hasBody(html), note.path).toBe(true);
  });

  /*
    여기가 265편이 껍데기로 나가던 자리입니다. 캐시 키가 주소의 슬러그가 아니라
    **원본 슬러그**라 `render()`가 한 번 되짚어 줘야 합니다 — 그 되짚기가 없었습니다.
  */
  it('옮겨 온 파이썬 글', async () => {
    const note = pythonNotes[0];
    const { html } = await render(note.path);
    expect(hasBody(html), note.path).toBe(true);
  });

  /*
    **제품 화면은 주소가 진짜 라우트이고, 원장째 HTML에 실립니다.** 원장이 순수 클라이언트
    상태였으면 프리렌더된 HTML에 본문이 안 들어갑니다 — 파이썬 265편이 그 이유로 빈
    껍데기였던 그 자리입니다. 제품 이름은 서랍 배너(h1 「AI 가이드」) 아래 h2(`gl-title`)에 섭니다.
  */
  it('제품 화면이 원장째 HTML에 실리고 제품 이름이 원장 머리에 선다', async () => {
    const missing: string[] = [];
    for (const product of guideProducts) {
      const { html } = await render(`/playbook/${product.vendorId}/${product.id}`);
      const title = /<h2 class="gl-title"[^>]*>([\s\S]*?)<\/h2>/.exec(html)?.[1] ?? '';
      if (!title.includes(esc(product.name)) || !html.includes(esc(product.oneLine))) {
        missing.push(`${product.vendorId}/${product.id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  /*
    **원장은 가이드의 열 주소에서 한 번도 안 빕니다.** 첫 주소도 제품 아홉도 전부 제품
    화면을 그리므로 탭 내용(`gl-panel`)이 하나라도 서는지 봅니다 — 제목 하나만 찾으면
    제품 화면이 통째로 비어도 통과합니다.
  */
  it('원장이 어느 주소에서도 안 빈다', async () => {
    const routes = ['/playbook', ...guideProducts.map((p) => `/playbook/${p.vendorId}/${p.id}`)];
    const empty: string[] = [];
    for (const route of routes) {
      const { html } = await render(route);
      if (classCount(html, 'gl-title') !== 1 || classCount(ledgerOf(html), 'gl-panel') === 0) {
        empty.push(route);
      }
    }
    expect(empty).toEqual([]);
  });

  /*
    **기업은 갈 곳이 아닙니다**(2026-09-28). 기업 화면은 360px에 링크 1개인 빈 요약이라
    걷었고, 옛 주소는 대표 제품으로 넘기기만 합니다. 프리렌더 목록에 되살아나면 그
    주소가 사이트맵에 올라 빈 껍데기(넘김) HTML이 색인되므로 여기서 막습니다 — 학습의
    옛 묶음 주소를 `learnGroups.test.ts`가 막는 것과 같은 자리입니다.
  */
  it('기업 주소는 프리렌더하지 않는다', () => {
    const vendorOnly = guideVendors.map((v) => `/playbook/${v.id}`);
    expect(prerenderRoutes.filter((route) => vendorOnly.includes(route))).toEqual([]);
  });

  /*
    **레일의 기업 줄은 누를 수 없는 머리글입니다.** 링크로 되살아나면 기업 주소를
    가리키게 되고, 그 주소는 넘김뿐이라 누른 줄이 아니라 아래 대표 제품 줄이 켜집니다.
    머리글이 서는 것 자체는 지킵니다 — Codex·Antigravity는 이름에 회사가 없어 그
    머리글이 회사를 알려 주는 자리입니다.
  */
  it('레일의 기업 줄은 링크가 아닌 머리글로 선다', async () => {
    const { html } = await render('/playbook');
    expect(html).not.toMatch(/<a[^>]*class="guide-rail-vendor/);
    for (const vendor of guideVendors) {
      expect(html).not.toContain(`href="/playbook/${vendor.id}"`);
      expect(html).toContain(`id="guide-rail-${vendor.id}"`);
      expect(html).toContain(`aria-labelledby="guide-rail-${vendor.id}"`);
    }
  });

  /*
    **팁은 접히지 않고 데이터대로 다 섭니다**(2026-09-28 개편). 옛 원장은 팁 문장이
    `<details>` 두 겹 아래라 첫 화면에 한 줄도 없었고, 다 읽는 데 19번 눌러야 했습니다.
    원장 안에 `<details>`가 되살아나거나, 팁이 한 편이라도 빠지면 빨갛게 섭니다.
    수는 손으로 적지 않고 데이터에서 셉니다 — 루틴이 하루 팁 넷을 더합니다.
  */
  it('팁이 접히지 않고 데이터대로 다 선다', async () => {
    const wrong: string[] = [];
    for (const product of guideProducts) {
      const ledger = ledgerOf((await render(`/playbook/${product.vendorId}/${product.id}`)).html);
      const tips = claimsForProduct(product.id).filter((c) => c.topic === 'habit');
      const drawn = classCount(ledger, 'gl-tip');
      const details = ledger.split('<details').length - 1;
      const missingId = tips.find((c) => !ledger.includes(`id="tip-${c.id}"`));
      if (drawn !== tips.length || details !== 0 || missingId) {
        wrong.push(`${product.id}: 팁 ${drawn}/${tips.length} · details ${details}${missingId ? ` · ${missingId.id} 없음` : ''}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  /*
    **탭·순간 라벨·표의 줄이 데이터대로 서는가.** 빈 탭을 안 세우는 규칙(팁이 없는 축,
    모델도 요금도 없는 참고 탭)과 같은 갈래가 없으면 다른 제품 절이 안 서는 규칙, 그리고
    **순간이 하나뿐이면 라벨을 안 세우는** 규칙을 제품마다 데이터에서 세어 봅니다. 모델
    0인 제품, 팁 한 편인 제품이 섞여 있어 고정 수로는 못 잽니다.

    **탭은 하나만 열려 있고 나머지 내용도 HTML에 다 실립니다**(`hidden`). 첫 탭이
    열려 있어야 서버와 클라이언트의 첫 그림이 같습니다.
  */
  it('탭·순간·표의 줄이 데이터대로 선다', async () => {
    const wrong: string[] = [];
    for (const product of guideProducts) {
      const ledger = ledgerOf((await render(`/playbook/${product.vendorId}/${product.id}`)).html);
      const claims = claimsForProduct(product.id);
      const tips = claims.filter((c) => c.topic === 'habit');
      const plans = claims.filter(
        (c) =>
          c.topic !== 'context' &&
          c.topic !== 'habit' &&
          !(c.topic === 'price' && c.subject.kind === 'model'),
      );
      const models = shownModels(product.models);
      const groupsPerAim = (['save', 'well'] as const).map(
        (aim) => tipGroupsOf(aim).filter((g) => tips.some((c) => c.aim === aim && c.group === g.id)).length,
      );
      const peers = guideProducts.filter((p) => p.role === product.role && p.id !== product.id);
      const panels =
        groupsPerAim.filter((n) => n > 0).length + (models.length > 0 || plans.length > 0 ? 1 : 0);
      const expected = {
        tab: panels,
        panel: panels,
        open: panels > 0 ? 1 : 0,
        peers: peers.length > 0 ? 1 : 0,
        situation: groupsPerAim.reduce((sum, n) => sum + (n >= 2 ? n : 0), 0),
        model: models.length,
        plan: plans.length,
      };
      const panelTags = [...ledger.matchAll(/<section[^>]*class="gl-panel"[^>]*>/g)].map((m) => m[0]);
      const got = {
        tab: classCount(ledger, 'gl-tab'),
        panel: panelTags.length,
        open: panelTags.filter((tag) => !/\shidden(=|\s|>)/.test(tag)).length,
        peers: classCount(ledger, 'gl-peers-sect'),
        situation: classCount(ledger, 'gl-situation'),
        model: classCount(ledger, 'gl-model'),
        plan: classCount(ledger, 'gl-plan'),
      };
      if (JSON.stringify(got) !== JSON.stringify(expected)) {
        wrong.push(`${product.id}: ${JSON.stringify(got)} ≠ ${JSON.stringify(expected)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  /*
    **모델 이름이 링크이고, 쓰임 문장은 글자입니다**(2026-09-28). 「링크가 모델 텍스트에
    있어야지 그 밑 문구가 아니라」에 답한 자리입니다. 이름 링크는 모델 줄마다 하나이고
    쓰임 문장이 실린 페이지(없으면 이름을 본 페이지)로 갑니다. 쓰임이 링크로 되살아나면
    한 줄에 링크가 둘이 되어 다시 「어디가 링크인가」가 됩니다.
  */
  it('모델 이름이 링크이고 쓰임 문장은 링크가 아니다', async () => {
    const wrong: string[] = [];
    for (const product of guideProducts) {
      const ledger = ledgerOf((await render(`/playbook/${product.vendorId}/${product.id}`)).html);
      const models = shownModels(product.models);
      const links = classCount(ledger, 'gl-model-link');
      const useLinks = (ledger.match(/<a [^>]*class="gl-model-use/g) ?? []).length;
      const missing = models.find(
        (m) => !ledger.includes(`class="gl-model-link" href="${esc(m.useWhen?.url ?? m.sourceUrl)}"`),
      );
      if (links !== models.length || useLinks !== 0 || missing) {
        wrong.push(`${product.id}: 이름 링크 ${links}/${models.length} · 쓰임 링크 ${useLinks}${missing ? ` · ${missing.id} 주소 틀림` : ''}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  /*
    **API를 직접 부르는 팁은 API 표면이 있는 제품에만 섭니다.** 회사 주체 팁이라 그 회사
    제품 전부에 끌려오는데, 「컨텍스트 캐시를 켠다」는 Gemini 앱·CLI 사용자가 할 수 없는
    행동입니다.
  */
  it('API 팁은 API 표면이 있는 제품에만 선다', async () => {
    const apiTips = playbookClaims.filter((c) => c.audience === 'api');
    const wrong: string[] = [];
    for (const product of guideProducts) {
      const ledger = ledgerOf((await render(`/playbook/${product.vendorId}/${product.id}`)).html);
      for (const tip of apiTips.filter((c) => c.subject.id === product.vendorId)) {
        const shown = ledger.includes(`id="tip-${tip.id}"`);
        if (shown !== (product.apiTips === true)) wrong.push(`${product.id} · ${tip.id}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  /*
    **옛 원장의 문구가 되살아나면 빨갛게.** 「멘트가 별로」라는 말에 갈아 쓴 자리들이다 —
    만드는 쪽의 말(「같은 자리」·「값을 확인하는 곳」), 우리 로그 이야기(「확인 기록
    없음」), 쿠폰처럼 읽히던 「유효기간 지남」, 「~법 / ~방법입니다」 되풀이.
  */
  it('옛 원장의 문구가 되살아나지 않는다', async () => {
    const retired = [
      '같은 자리',
      '값을 확인하는 곳',
      '확인 기록 없음',
      '유효기간 지남',
      '토큰을 아끼는 법',
      '제대로 시키는 법',
      '어느 모델로 돌리나',
      '얼마이고 한도가 어떻게 차나',
      '방법입니다',
      '기업마다 챗·업무·코딩',
      '아껴 쓰기',
      '정확히 시키기',
    ];
    const found: string[] = [];
    for (const product of guideProducts) {
      const { html } = await render(`/playbook/${product.vendorId}/${product.id}`);
      for (const phrase of retired) if (html.includes(phrase)) found.push(`${product.id} · ${phrase}`);
    }
    expect(found).toEqual([]);
  });

  /*
    **`/playbook`이 기본 제품을 그리고, canonical이 그 제품 주소를 가리키는가**(2026-09-28).

    리다이렉트가 아니라 그 자리에서 그리므로 같은 내용이 두 주소에 섭니다 — canonical이
    제품 주소를 안 가리키면 검색엔진이 둘 중 하나를 중복으로 떨어뜨리고, 어느 쪽인지는
    우리가 못 고릅니다. 이 주소는 nav와 사이트맵이 가리키므로 **HTML에 본문이 실제로
    실려 나가는지**도 봅니다(`<Navigate>`로 바꾸면 빈 껍데기가 나갑니다).
  */
  it('가이드 첫 주소가 기본 제품을 그리고 그 제품 주소를 canonical로 건다', async () => {
    const home = guideProducts.find((p) => p.id === guideVendors[0].homeProductId)!;
    const { html, head } = await render('/playbook');
    expect(html).toMatch(/<h2 class="gl-title"[^>]*>/);
    /* 서랍 배너는 다른 서랍과 같은 모양으로 선다 — 한때 걷었다가 되살렸다. */
    expect(html).toContain('page-header');
    expect(html).toMatch(/<h1>AI 가이드<\/h1>/);
    expect(html).toContain(esc(home.name));
    expect(classCount(html, 'gl-tip')).toBeGreaterThan(0);
    expect(head).toContain(`/playbook/${home.vendorId}/${home.id}"`);
    /* 걷어낸 첫 화면·기업 화면의 흔적이 되살아나면 빨갛게. */
    expect(html).not.toContain('체감');
    expect(html).not.toContain('guide-rail-note');
    expect(html).not.toContain('guide-stats');
  });
});
