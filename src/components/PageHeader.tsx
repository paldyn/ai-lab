import type { ReactNode } from 'react';

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
  /** 제목 아래 한 줄. 되돌아가기 링크 같은 것. */
  note?: ReactNode;
  /** 헤더 안 맨 아래. 뉴스의 분류 탭이 여기 들어갑니다. */
  children?: ReactNode;
}

/**
 * 뉴스·학습·리서치가 각각 다른 머리말을 쓰고 있어 페이지를 옮길 때마다
 * 리듬이 끊겼습니다. 구조를 하나로 맞추고, 배경에 홈과 같은 결의 격자를
 * 옅게 깔아 톤을 잇습니다.
 */
export function PageHeader({ kicker, title, description, stats, note, children }: PageHeaderProps) {
  return (
    <section className="page-header">
      <div className="page-header-field" aria-hidden="true" />

      <div className="site-wrap page-header-inner">
        <div className="page-header-main">
          <div className="page-header-copy">
            <p className="section-kicker">{kicker}</p>
            <h1>{title}</h1>
            <p className="page-header-description">{description}</p>
            {note}
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

        {children}
      </div>
    </section>
  );
}
