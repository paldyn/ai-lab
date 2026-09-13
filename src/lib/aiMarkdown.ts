import type { Root } from 'hast';
import rehypeSanitize, { type Options as SanitizeSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

/*
 * AI 답변은 신뢰할 수 없는 입력입니다. 저장소 원고용 plugins/markdown.ts는 raw HTML을
 * 허용하므로 여기서 재사용하지 않습니다. 이 파이프라인은 raw HTML을 HAST로 넘기지
 * 않고, 만들어진 노드도 아래 allowlist로 한 번 더 씻은 뒤에만 문자열로 바꿉니다.
 *
 * 이미지는 일부러 허용하지 않습니다. 답변에 외부 이미지가 섞이면 사용자가 누르지
 * 않았는데도 그 서버로 요청이 나가며 추적 픽셀이 될 수 있습니다. 글·표·코드·링크만
 * 있으면 이 패널의 쓰임에는 충분합니다.
 */
const ANSWER_SCHEMA: SanitizeSchema = {
  ancestors: {
    tbody: ['table'],
    td: ['table'],
    th: ['table'],
    thead: ['table'],
    tr: ['table'],
  },
  attributes: {
    a: ['href', 'title'],
    code: [['className', /^language-./]],
    input: [['type', 'checkbox'], ['disabled', true], 'checked'],
    li: [['className', 'task-list-item']],
    ol: ['start', ['className', 'contains-task-list']],
    td: ['align'],
    th: ['align'],
    ul: [['className', 'contains-task-list']],
  },
  protocols: {
    href: ['http', 'https', 'mailto'],
  },
  required: {
    input: { disabled: true, type: 'checkbox' },
  },
  strip: ['script', 'style'],
  tagNames: [
    'a',
    'blockquote',
    'br',
    'code',
    'del',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'input',
    'li',
    'ol',
    'p',
    'pre',
    'strong',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
  ],
};

/** sanitize가 검증한 링크에만 새 탭 속성을 더합니다. */
function rehypeSafeLinkTargets() {
  return (tree: Root) => {
    const visit = (node: Root['children'][number] | Root) => {
      if (node.type === 'element') {
        if (node.tagName === 'a' && typeof node.properties.href === 'string') {
          node.properties.target = '_blank';
          node.properties.rel = ['noopener', 'noreferrer'];
        }
        for (const child of node.children) visit(child);
        return;
      }

      if ('children' in node) {
        for (const child of node.children) visit(child);
      }
    };

    visit(tree);
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // allowDangerousHtml의 기본값(false)을 지킵니다. AI가 쓴 HTML은 렌더 대상이 아닙니다.
  .use(remarkRehype)
  .use(rehypeSanitize, ANSWER_SCHEMA)
  .use(rehypeSafeLinkTargets)
  .use(rehypeStringify);

export function renderAiMarkdown(markdown: string): string {
  return String(processor.processSync(markdown));
}
