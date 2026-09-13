import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { learnGroupById, learnTabById } from '../data/learnGroups';
import { LearnRail } from './LearnRail';

describe('LearnRail', () => {
  it('AI 탭에는 내부 묶음 제목 없이 카테고리 링크만 표시한다', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <LearnRail tab="ai" active="ai" />
      </MemoryRouter>,
    );

    for (const groupId of learnTabById.ai.groupIds) {
      const group = learnGroupById[groupId];
      expect(markup).not.toContain(group.name);
      for (const categoryId of group.categoryIds) {
        expect(markup).toContain(`href="/learn/${categoryId}"`);
      }
    }
  });
});
