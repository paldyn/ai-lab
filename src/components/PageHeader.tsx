export interface PageStat {
  label: string;
  value: string;
}

interface PageHeaderProps {
  kicker: string;
  title: string;
  description: string;
  /** 오른쪽에 세우는 지표. 페이지마다 규모나 갱신 시점을 다르게 붙입니다. */
  stats?: PageStat[];
}

/**
 * 뉴스·학습·리서치가 각각 다른 머리말을 쓰고 있어 페이지를 옮길 때마다
 * 리듬이 끊겼습니다. 구조를 하나로 맞추고, 배경에 홈과 같은 결의 격자를
 * 옅게 깔아 톤을 잇습니다.
 *
 * 안에 무엇을 더 넣을 수 있게 열어 두지 않습니다. 한때 뉴스의 분류 탭이
 * 여기 들어와 그 페이지만 아래 여백이 0이 됐고, 세 페이지의 머리말 높이가
 * 서로 달라졌습니다. 탭처럼 페이지 고유한 것은 머리말 밖에 둡니다.
 */
export function PageHeader({ kicker, title, description, stats }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div className="page-header-field" aria-hidden="true" />

      <div className="site-wrap page-header-inner">
        <div className="page-header-main">
          <div className="page-header-copy">
            <p className="section-kicker">{kicker}</p>
            <h1>{title}</h1>
            <p className="page-header-description">{description}</p>
          </div>

          {stats && stats.length > 0 && (
            <dl className="page-header-stats">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <dd>{stat.value}</dd>
                  <dt>{stat.label}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
