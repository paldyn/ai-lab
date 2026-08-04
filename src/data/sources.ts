export type NewsSource = 'OpenAI' | 'Anthropic' | 'Google DeepMind';
export type ModelFamily = 'Claude' | 'Gemini' | 'GPT';

export interface SourceMeta {
  id: NewsSource;
  /** 화면에 노출하는 짧은 이름. Google DeepMind는 'Google'로 줄여 표기합니다. */
  displayName: string;
  /** 출처를 명확히 밝혀야 하는 자리에 쓰는 정식 명칭. */
  fullName: string;
  /** 텍스트에 쓰는 색. 두 테마 모두 WCAG AA(4.5:1) 이상을 만족합니다. */
  accent: string;
  /** 테두리, 점, 그라디언트 등 비텍스트 요소에 쓰는 원본 브랜드 색. */
  mark: string;
  logo: string;
  /** 로고를 단색으로 처리해 테마에 따라 반전시킬지 여부. */
  monochrome: boolean;
  order: number;
}

const table: Record<NewsSource, SourceMeta> = {
  Anthropic: {
    id: 'Anthropic',
    displayName: 'Anthropic',
    fullName: 'Anthropic',
    accent: 'var(--source-anthropic-text)',
    mark: 'var(--source-anthropic)',
    logo: 'assets/anthropic.svg',
    monochrome: true,
    order: 0,
  },
  OpenAI: {
    id: 'OpenAI',
    displayName: 'OpenAI',
    fullName: 'OpenAI',
    accent: 'var(--source-openai-text)',
    mark: 'var(--source-openai)',
    logo: 'assets/openai.svg',
    monochrome: true,
    order: 1,
  },
  'Google DeepMind': {
    id: 'Google DeepMind',
    displayName: 'Google',
    fullName: 'Google DeepMind',
    accent: 'var(--source-google-text)',
    mark: 'var(--source-google)',
    logo: 'assets/google.svg',
    monochrome: false,
    order: 2,
  },
};

export const sources = table;

export const sourceList: SourceMeta[] = Object.values(table).sort((a, b) => a.order - b.order);

export function getSource(id: NewsSource): SourceMeta {
  return table[id];
}

/** BASE_URL을 붙인 public 자산 경로. 하위 경로 배포에서도 그대로 동작합니다. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
