import { ClaimRow } from '../components/ClaimRow';
import { FreshnessMeter } from '../components/FreshnessMeter';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { claimState, toolFreshness, todayInSeoul } from '../data/playbook';
import { playbookClaims } from '../data/playbookClaims';
import { playbookTools } from '../data/playbookTools';
import type { Tool } from '../types/playbook';

/**
 * 도구 한 장.
 *
 * **지표가 편수가 아니라 값의 신선도입니다.** 이 서랍이 파는 것은 글 수가 아니라
 * 「지금 이 값을 믿어도 되는가」입니다.
 */
function ToolCard({ tool, today }: { tool: Tool; today: string }) {
  return (
    <article className="playbook-card">
      <p className="playbook-card-mark" aria-hidden="true">
        {tool.mark}
      </p>
      <div className="playbook-card-main">
        <h3 className="playbook-card-title">{tool.name}</h3>
        <p className="playbook-card-meta">
          {tool.vendor ? `${tool.vendor} · ${tool.surface}` : tool.surface}
        </p>
        <p className="playbook-card-blurb">{tool.blurb}</p>
      </div>
      <FreshnessMeter fresh={toolFreshness(tool.id, today)} />
    </article>
  );
}

/**
 * 활용 가이드의 첫 화면 — 도구 카드와 전체 사실 대조표.
 *
 * **nav 다섯째 칸은 최소선(도구 여섯 · 주장 마흔 · 노트 여덟)을 넘긴 날에 켭니다.**
 * 지금 이 주소는 살아 있되 메뉴에는 안 섭니다.
 */
export function PlaybookPage() {
  /*
    그리는 시점에 오늘을 읽습니다. 모듈이 읽힐 때 정하면 프리렌더된 HTML에 빌드일이
    박혀, 배포가 멎은 동안 값이 영영 신선해 보입니다.
  */
  const today = todayInSeoul();

  return (
    <>
      <Seo
        title="가이드"
        description="터미널 코딩 에이전트를 어떤 모델과 강도로 돌리고, 세션을 언제 새로 파고, 언제 압축할지. 공식 지침과 현장 통설과 우리가 직접 잰 것을 갈라 담습니다."
        path="/playbook"
      />
      <PageHeader
        kicker="PALDYN GUIDE"
        title="활용 가이드"
        description="코딩 에이전트를 어떤 모델과 강도로 돌리고, 세션을 언제 새로 파고, 언제 압축할지를 담습니다. 값마다 어디서 온 것이고 언제 확인한 것인지를 함께 적습니다."
      />

      <section className="site-wrap section-space">
        <div className="playbook-grid">
          {playbookTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} today={today} />
          ))}
        </div>
      </section>

      <section className="site-wrap section-space">
        <h2 className="playbook-section-title">사실 대조표</h2>
        <p className="playbook-section-note">
          값마다 어디서 왔고 언제 확인한 것인지가 함께 섭니다. 유효기간이 지난 값은 흐려지지 않고
          사라집니다 — 읽히는 숫자는 믿게 되기 때문입니다.
        </p>
        <div className="claim-list">
          {playbookClaims.map((claim) => (
            <ClaimRow key={claim.id} state={claimState(claim, today)} />
          ))}
        </div>
      </section>
    </>
  );
}
