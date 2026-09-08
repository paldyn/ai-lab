/**
 * 파이썬 읽는 순서.
 *
 * **글은 여기서 쓰지 않습니다.** 파이썬은 `paldyn/tech-blog`(techblog.paldyn.com)가
 * 265편으로 이미 다루고 있어, 같은 것을 다시 쓰면 두 도메인에 같은 글이 서고 고칠 때도
 * 두 번 고쳐야 합니다. 그래서 원본은 techblog 하나로 두고 **AI를 하려는 사람에게 필요한
 * 것만 골라 순서를 매긴 목록**을 여기 둡니다.
 *
 * 화면에 나가는 본문은 `scripts/sync-techblog.mjs`가 빌드 전에 원본 마크다운을 끌어와
 * `src/content/mirror/`에 옮겨 둔 것입니다. 우리 레이아웃으로 그리되 `rel=canonical`은
 * 원문을 가리키고, 글 머리에 출처를 밝힙니다.
 *
 * 목록을 고치면 `npm run sync:techblog`를 다시 돌립니다.
 */
export interface PythonTrackSection {
  id: string;
  title: string;
  /** 이 묶음을 왜 이 순서에 두는지. 트랙 페이지에 그대로 나갑니다. */
  note: string;
  /** techblog의 슬러그. 순서가 곧 읽는 순서입니다. */
  slugs: string[];
}

export const pythonTrack: PythonTrackSection[] = [
  {
    id: 'basics',
    title: '문법의 최소한',
    note: 'AI 코드를 읽으려면 이만큼은 손에 익어야 합니다. 파이썬을 처음 여는 사람이 여기서 시작합니다.',
    slugs: [
      'python-hello-world',
      'python-input-print',
      'python-numbers-int-float-complex',
      'python-string-essentials',
      'python-list-basics',
      'python-dict-basics',
      'python-tuple',
      'python-set-frozenset',
      'python-if-elif-else',
      'python-for-loop',
      'python-while-loop',
      'python-function-def',
      'python-args-kwargs',
      'python-lambda',
      'python-list-comprehension',
      'python-exception-basics',
      'python-with-context',
      'python-class-basics',
      'python-modules-import-basics',
    ],
  },
  {
    id: 'data',
    title: '데이터를 다루는 도구',
    note: 'AI 코드의 대부분이 이 넷 위에 서 있습니다 — NumPy 배열, pandas 표, matplotlib 그림, 그리고 그것을 굴리는 주피터입니다.',
    slugs: [
      'python-numpy-basics',
      'python-pandas-dataframe',
      'python-pandas-groupby',
      'python-pandas-merge',
      'python-time-series-pandas',
      'python-data-cleaning-tips',
      'python-matplotlib-basics',
      'python-csv-module',
      'python-json-module',
      'python-jupyter-notebook',
      'python-scikit-learn-intro',
    ],
  },
  {
    id: 'env',
    title: '환경과 패키지',
    note: '남의 코드를 돌려 보려다 여기서 막힙니다. 버전을 고르고, 가상환경을 만들고, 무엇이 깔렸는지 못 박는 일입니다.',
    slugs: [
      'python-install-pyenv',
      'python-virtualenv-venv',
      'python-pip-basics',
      'python-uv-package-manager',
      'python-pyproject-toml',
      'python-version-pinning',
    ],
  },
  {
    id: 'quality',
    title: '고쳐 쓸 수 있는 코드',
    note: '실험 스크립트가 오래 살아남으면 이것들이 필요해집니다. 타입, 데이터 클래스, 로그, 테스트입니다.',
    slugs: [
      'python-typing-overview',
      'python-function-annotations',
      'python-dataclass',
      'python-pathlib',
      'python-logging-module',
      'python-pytest-basics',
    ],
  },
  {
    id: 'speed',
    title: '느릴 때 여는 문',
    note: '데이터 전처리가 오래 걸리기 시작하면 봅니다. 파이썬이 왜 느린지, 어디까지 병렬로 돌릴 수 있는지입니다.',
    slugs: [
      'python-gil',
      'python-thread-pool-executor',
      'python-multiprocessing-basics',
      'python-asyncio-basics',
    ],
  },
];

/** 목록에 적힌 techblog 슬러그 전부. 동기화 스크립트가 이 값을 읽습니다. */
export const pythonTrackSlugs = pythonTrack.flatMap((section) => section.slugs);

/** 주소에 쓰는 슬러그. `python-` 접두사를 떼어 `/learn/python/numpy-basics`가 됩니다. */
export function trackSlugOf(sourceSlug: string): string {
  return sourceSlug.replace(/^python-/, '');
}
