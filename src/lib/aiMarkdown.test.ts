import { describe, expect, it } from 'vitest';
import { renderAiMarkdown } from './aiMarkdown';

describe('AI 답변 Markdown', () => {
  it('기본 Markdown과 GFM 표를 렌더한다', () => {
    const html = renderAiMarkdown('## 요점\n\n- **첫째**\n\n| A | B |\n| - | - |\n| 1 | 2 |');

    expect(html).toContain('<h2>요점</h2>');
    expect(html).toContain('<strong>첫째</strong>');
    expect(html).toContain('<table>');
  });

  it('raw HTML과 실행 가능한 URL을 제거한다', () => {
    const html = renderAiMarkdown(
      '<script>alert(1)</script><img src="https://tracker.example/pixel" onerror="alert(2)">\n\n' +
        '[위험한 링크](javascript:alert(3))',
    );

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('onerror');
  });

  it('검증된 링크에 새 탭 보호 속성을 붙인다', () => {
    const html = renderAiMarkdown('[공식 문서](https://example.com/docs)');

    expect(html).toContain('href="https://example.com/docs"');
    expect(html).toContain('target="_blank"');
    expect(html).toMatch(/rel="(?:noopener noreferrer|noreferrer noopener)"/);
  });
});
