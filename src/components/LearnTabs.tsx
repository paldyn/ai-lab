import { Link } from 'react-router';
import { learnTabs, type LearnTabId } from '../data/learnGroups';

/**
 * 학습의 첫 갈래 — 전체 · 수학 · 언어 · AI.
 *
 * **탭으로 가른 이유는 두 번째 층이 갈래마다 다르기 때문입니다.** 수학은 난이도
 * 트랙으로, 언어는 언어별로, AI는 원리·엔지니어링 아래 카테고리 일곱으로 갈립니다.
 * 레일 하나에 다 담으면 셋이 전부 「카테고리」 한 층으로 납작해지고, 줄이 열셋이
 * 되어 1366×768에서 잘립니다.
 *
 * **주소를 갖습니다.** 클라이언트 상태로 두면 다른 화면에서 특정 갈래를 열어 줄 수
 * 없고 프리렌더된 HTML이 늘 「전체」라 첫 렌더가 어긋납니다 — 뉴스 탭과 같은 판단입니다.
 */
export function LearnTabs({ active }: { active: LearnTabId }) {
  return (
    <nav className="learn-tabs" aria-label="학습 갈래">
      {learnTabs.map((tab) => (
        <Link
          key={tab.id}
          to={tab.to}
          className={`learn-tab ${active === tab.id ? 'is-active' : ''}`}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          {tab.name}
        </Link>
      ))}
    </nav>
  );
}
