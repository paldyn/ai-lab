import { playbookIndex } from 'virtual:playbook-index';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';

/**
 * 활용 가이드의 첫 화면.
 *
 * **지금은 골격뿐입니다.** 도구 카드와 사실 대조표는 `playbookTools.ts`·
 * `playbookClaims.ts`가 생기는 2~3일 차에 올라옵니다. 이 화면이 지금 하는 일은
 * 주소와 프리렌더가 산다는 것을 보이는 것뿐입니다 — `PLAYBOOK-PLAN.md`의 1일 차.
 *
 * **nav 다섯째 칸은 아직 안 켭니다.** 최소선(도구 6장 + 주장 40건 + 노트 8편)을
 * 넘긴 날에 켭니다. 그전까지 이 주소는 살아 있되 메뉴에는 안 섭니다 —
 * 글 0편인 칸이 466·400·44 옆에 같은 무게로 서면 안 됩니다.
 */
export function PlaybookPage() {
  return (
    <>
      <Seo
        title="가이드"
        description="AI 도구를 잘 쓰고 아껴 쓰는 법. 공식 지침과 현장 통설과 우리가 직접 잰 것을 갈라 담습니다."
        path="/playbook"
      />
      <PageHeader
        kicker="PALDYN GUIDE"
        title="활용 가이드"
        description="어느 도구를 언제 쓰고 어떻게 아껴 쓰는지를 담습니다. 값마다 어디서 온 것이고 언제 확인한 것인지를 함께 적습니다."
      />
      <section className="site-wrap section-space">
        <p className="text-sm text-[var(--text-dim)]">
          {playbookIndex.length > 0
            ? `노트 ${playbookIndex.length}편`
            : '아직 준비 중입니다.'}
        </p>
      </section>
    </>
  );
}
