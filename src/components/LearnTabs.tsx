import { Link } from 'react-router';
import { learnTabs, type LearnTabId } from '../data/learnGroups';

/**
 * 학습의 첫 갈래 — 전체 · 수학 · 언어 · AI.
 *
 * **뉴스의 분류와 같은 칩입니다**(`.filter-chip`, `news-view-tabs`). 밑줄 탭 띠로
 * 세워 봤다가 되돌렸습니다 — 뉴스에서 이미 같은 자리를 밟았고 그때 적어 둔 이유가
 * 그대로 여기서도 맞습니다: 머리말 바로 아래에 선 있는 띠를 두면 머리말 밑줄과
 * 겹쳐 선이 두 줄이 되고, 선을 지우면 이번엔 머리말 안에 든 것처럼 보입니다.
 * 칩은 본문 흐름에 놓여 어느 쪽으로도 읽히지 않습니다.
 *
 * **주소를 갖습니다.** 클라이언트 상태로 두면 다른 화면에서 특정 갈래를 열어 줄 수
 * 없고 프리렌더된 HTML이 늘 「전체」라 첫 렌더가 어긋납니다. 그래서 뉴스와 달리
 * 단추가 아니라 링크입니다 — 갈래마다 페이지가 따로 있어 눌러서 가는 것이 맞습니다.
 */
export function LearnTabs({ active }: { active: LearnTabId }) {
  return (
    <nav className="site-wrap learn-tabs" aria-label="학습 갈래">
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
    </nav>
  );
}
