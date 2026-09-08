import { Link } from 'react-router';
import { GraduationCap } from 'lucide-react';
import { certs } from '../data/certs';
import { learnTabs, type LearnTabId } from '../data/learnGroups';

/**
 * 학습의 첫 갈래 — 전체 · 수학 · 언어 · AI, 그리고 오른쪽 끝의 자격증.
 *
 * **뉴스의 분류와 같은 칩입니다**(`.filter-chip`). 밑줄 탭 띠로 세워 봤다가 되돌렸고,
 * 그 이유는 뉴스에서 이미 적어 두었습니다 — 머리말 바로 아래에 선 있는 띠를 두면
 * 머리말 밑줄과 겹쳐 선이 두 줄이 되고, 선을 지우면 머리말 안에 든 것처럼 보입니다.
 *
 * **머리 아래에 붙어 따라옵니다**(`.section-tabs`). 목록이 466편이라 아래로 내려가면
 * 칩이 화면 밖으로 나가고, 다른 갈래로 가려면 맨 위까지 되감아야 했습니다.
 *
 * **자격증은 줄의 오른쪽 끝에 따로 섭니다.** 갈래가 아니라 다른 곳으로 가는 길이라
 * 같은 칩으로 두면 다섯 번째 갈래로 읽힙니다. 예전에는 레일 맨 아래에 선 하나로
 * 떨어져 있었는데, 레일이 갈래마다 달라지면서 어느 갈래에서도 같은 자리에 있어야
 * 하는 이 링크가 갈 곳이 없어졌습니다.
 */
export function LearnTabs({ active }: { active: LearnTabId | 'certs' }) {
  return (
    <div className="section-tabs">
      <nav className="site-wrap section-tabs-row" aria-label="학습 갈래">
        {learnTabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.to}
            className={`filter-chip ${active === tab.id ? 'active' : ''}`}
            aria-current={active === tab.id ? 'page' : undefined}
          >
            {tab.name}
          </Link>
        ))}

        <Link
          to="/learn/certs"
          className={`section-tabs-aside ${active === 'certs' ? 'is-active' : ''}`}
          aria-current={active === 'certs' ? 'page' : undefined}
        >
          <GraduationCap size={14} strokeWidth={1.7} aria-hidden="true" />
          <span>자격증</span>
          <b>{certs.length}</b>
        </Link>
      </nav>
    </div>
  );
}
