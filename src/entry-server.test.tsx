import { claimsForProduct } from './data/playbook';
import { guideProducts } from './data/guideProducts';
import { guideVendorIds } from './data/guideVendors';
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
    **제품 상세는 판 아래 원장에서 갈리지만 주소는 진짜 라우트입니다.** 원장이 순수
    클라이언트 상태였으면 프리렌더된 HTML에 상세가 안 들어갑니다 — 파이썬 265편이
    그 이유로 빈 껍데기였던 그 자리입니다. 여기서 실제로 그려 확인합니다.
  */
  it('제품 상세가 원장에 채워진 채로 HTML에 들어간다', async () => {
    const missing: string[] = [];
    for (const product of guideProducts) {
      const { html } = await render(`/playbook/${product.vendorId}/${product.id}`);
      if (!html.includes('guide-ledger') || !html.includes(product.oneLine)) {
        missing.push(`${product.vendorId}/${product.id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  /*
    **원장은 열셋 주소에서 한 번도 안 빕니다.** 아무것도 안 골랐을 때도, 기업만
    골랐을 때도 그 자리에 무엇인가가 섭니다 — 빈 칸을 보여 주지 않으려고 세 갈래로
    나눠 둔 것이 실제로 다 그려지는지 봅니다.

    **화면 종류마다 다른 것을 잽니다**(2026-09-17). 전에는 열셋 전부에서 요약 띠
    (`guide-stats`)를 찾았는데, 제품 화면에서 그 띠를 걷어냈습니다 — 거기는 값 줄이
    직접 서므로 개수를 또 적으면 같은 말을 두 번 합니다. 그래서 띠는 **항목을 안
    그리는 자리**(첫 화면·기업)에서만 찾고, 제품 화면에서는 **절이 실제로 섰는지**를
    봅니다. 한 줄로 뭉뚱그리면 제품 화면이 통째로 비어도 통과합니다.
  */
  it('원장이 어느 주소에서도 안 빈다', async () => {
    const summary = ['/playbook', ...guideVendorIds.map((id) => `/playbook/${id}`)];
    const detail = guideProducts.map((p) => `/playbook/${p.vendorId}/${p.id}`);
    const empty: string[] = [];

    for (const route of summary) {
      const { html } = await render(route);
      if (!html.includes('guide-ledger-title') || !html.includes('guide-stats')) empty.push(route);
    }
    for (const route of detail) {
      const { html } = await render(route);
      if (!html.includes('guide-ledger-title') || !html.includes('guide-ledger-label')) {
        empty.push(route);
      }
    }
    expect(empty).toEqual([]);
  });

  /*
    **팁이 접힌 채로, 내용은 다 들어 있는 채로 나가는가.**

    위 검사는 `guide-ledger-label`만 보는데 그 클래스는 「어디서 쓰나」 h3가 무조건
    달고 있어 **팁 블록이 통째로 사라져도 초록**입니다. 접기는 기능 전부를 「첫
    HTML에 다 실려 나가고 브라우저가 접어 둘 뿐」에 걸고 있으므로 그것을 직접 잽니다 —
    자바스크립트가 안 붙은 상태에서 접힌 내용이 비어 있으면, 그 화면은 영영 못 여는
    화면입니다.

    반례가 `<summary>` 밖에 남는 것과, 거르개가 열 줄 넘는 화면에만 서는 것도
    같은 자리에서 봅니다. 셋 다 **눈으로는 못 세는** 수입니다.
  */
  it('제품 화면의 첫 HTML에 팁이 접힌 채로 다 실린다', async () => {
    const wrong: string[] = [];
    for (const product of guideProducts) {
      const tips = claimsForProduct(product.id).filter((c) => c.topic === 'habit');
      if (tips.length === 0) continue;
      const { html } = await render(`/playbook/${product.vendorId}/${product.id}`);

      const folds = html.split('guide-tip-fold').length - 1;
      if (folds !== tips.length) wrong.push(`${product.id}: 접힌 칸 ${folds} ≠ 팁 ${tips.length}`);

      const counters = tips.filter((c) => c.corroboration).length;
      const shown = html.split('>안 통하는 자리<').length - 1;
      if (shown !== counters) wrong.push(`${product.id}: 반례 ${shown} ≠ ${counters}`);

      /*
        **화면이 축 둘로 갈립니다**(2026-09-17) — 아끼기와 잘 쓰기. 그래서 아래 둘은
        **절마다 따로** 셉니다. 합쳐 세면 팁 열짜리 화면이 7 + 3으로 갈려 어느 절도
        거르개를 안 세우는데 검사는 「열이니 서야 한다」로 읽습니다.
      */
      const aims = ['save', 'well'] as const;

      /*
        **묶음은 화면의 축이고 빈 묶음은 안 섭니다.** 그래서 선 묶음의 수는
        「그 절에 팁이 있는 질문의 수」를 두 절에 걸쳐 더한 것과 같아야 합니다 —
        적으면 팁이 갈 곳을 잃은 것이고, 많으면 줄 0개짜리 질문이 덩그러니 선 것입니다.
      */
      const used = aims.reduce(
        (n, aim) => n + new Set(tips.filter((c) => c.aim === aim).map((c) => c.group)).size,
        0,
      );
      const drawn = html.split('guide-tip-group is-').length - 1;
      if (drawn !== used) wrong.push(`${product.id}: 묶음 ${drawn} ≠ 쓰인 질문 ${used}`);

      /* 거르개도 절마다다 — 한 절이 열 줄을 넘고 그 절에 등급이 둘 이상일 때만 선다. */
      const expected = aims.filter((aim) => {
        const rows = tips.filter((c) => c.aim === aim);
        return rows.length >= 10 && new Set(rows.map((c) => c.tier)).size > 1;
      }).length;
      const filters = html.split('guide-tip-filter').length - 1;
      if (filters !== expected) {
        wrong.push(`${product.id}: 거르개 ${filters} ≠ 서야 할 ${expected}`);
      }
    }
    expect(wrong).toEqual([]);
  });
});
