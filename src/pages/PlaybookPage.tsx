import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { toolFreshness, todayInSeoul } from '../data/playbook';
import { playbookTools } from '../data/playbookTools';
import type { Tool } from '../types/playbook';

/**
 * 도구 한 장.
 *
 * **지표가 편수가 아니라 값의 신선도입니다.** 이 서랍이 파는 것은 글 수가 아니라
 * 「지금 이 값을 믿어도 되는가」이고, 편수를 세면 466·400·44 옆에서 지는 싸움만
 * 하게 됩니다. 값이 아직 0개여도 그 자리는 같은 문장으로 섭니다 — 무엇을 세는
 * 화면인지가 처음부터 드러나야 합니다.
 */
function ToolCard({ tool, today }: { tool: Tool; today: string }) {
  const fresh = toolFreshness(tool.id, today);

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
      <dl className="playbook-card-freshness">
        <div>
          <dt>값</dt>
          <dd>{fresh.total}개</dd>
        </div>
        <div>
          <dt>14일 안 확인</dt>
          <dd>{fresh.checkedRecently}개</dd>
        </div>
      </dl>
    </article>
  );
}

/**
 * 활용 가이드의 첫 화면.
 *
 * 도구 카드 여섯이 서고, 값과 신선도는 `playbookClaims.ts`가 채워지는 3일 차에
 * 실제 수가 됩니다(`PLAYBOOK-PLAN.md`). **nav 다섯째 칸은 최소선을 넘긴 날에 켭니다** —
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
        description="AI 도구를 잘 쓰고 아껴 쓰는 법. 공식 지침과 현장 통설과 우리가 직접 잰 것을 갈라 담습니다."
        path="/playbook"
      />
      <PageHeader
        kicker="PALDYN GUIDE"
        title="활용 가이드"
        description="어느 도구를 언제 쓰고 어떻게 아껴 쓰는지를 담습니다. 값마다 어디서 온 것이고 언제 확인한 것인지를 함께 적습니다."
      />
      <section className="site-wrap section-space">
        <div className="playbook-grid">
          {playbookTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} today={today} />
          ))}
        </div>
      </section>
    </>
  );
}
