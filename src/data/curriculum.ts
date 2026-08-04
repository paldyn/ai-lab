/**
 * 수학 글을 읽는 순서.
 *
 * 수학은 앞 글이 뒤 글의 전제가 되므로 최신순으로 늘어놓으면 읽는 길이 끊깁니다.
 * frontmatter에 order가 없으면 이 목록의 인덱스를 순서로 씁니다.
 * 여기 없는 슬러그는 목록 맨 뒤로 갑니다.
 *
 * 순서의 기준은 수학 교과서의 논리 전개가 아니라 AI 시스템의 데이터 흐름입니다.
 * 개념은 그것이 처음 필요해지는 자리에서 도입하되, 뒤 글이 쓰는 도구는 앞 글이
 * 반드시 먼저 정의하도록 의존성을 맞췄습니다.
 *
 * 단원 경계에 '절단점'을 두었습니다. 거기서 멈춰도 그때까지가 완결된 묶음입니다
 * — 8편이면 임베딩 검색의 기하가, 43편이면 어텐션 한 줄이, 51편이면 학습 루프가
 * 닫힙니다. 이전 계획이 144편 중 10편에서 멈춘 것은 분량보다 보상이 늦게 왔기
 * 때문이라, 중간에 그만두어도 남는 것이 있게 짰습니다.
 *
 * 자동 작성 루틴의 계획 슬러그 목록과 같은 순서입니다.
 * 새 주제를 추가할 때는 루틴 프롬프트와 이 목록 양쪽에 넣습니다.
 */
export const mathCurriculum: string[] = [
  // 1단원 · 수식을 읽는 법
  'math-attention-formula-anatomy',
  'math-notation-conventions',
  'math-sigma-index-and-einsum',

  // 2단원 · 벡터: 임베딩 공간의 기하
  'math-vector-as-meaning',
  'math-norms-and-distance',
  'math-dot-product-and-cosine',
  'math-orthogonality-and-projection',
  'math-span-basis-and-coordinates',

  // 3단원 · 행렬: 선형사상과 분해
  'math-matrix-as-linear-map',
  'math-matmul-and-shape-arithmetic',
  'math-rotation-and-2d-linear-maps',
  'math-eigenvalues',
  'math-matrix-powers-and-power-iteration',
  'math-spectral-theorem-and-quadratic-forms',
  'math-svd-and-rank',
  'math-low-rank-approximation-and-lora',
  'math-matrix-norms',

  // 4단원 · 확률: 모델의 출력은 분포다
  'math-exp-and-log',
  'math-probability-rules-and-chain-rule',
  'math-random-variables-and-expectation',
  'math-variance-and-sampling-error',
  'math-gaussian-and-clt',
  'math-covariance-and-multivariate-gaussian',
  'math-softmax-derivation',
  'math-sampling-from-categorical',

  // 5단원 · 정보: 손실 한 줄이 곧 정보량이다
  'math-entropy-and-perplexity',
  'math-maximum-likelihood',
  'math-cross-entropy-and-nll',
  'math-jensen-inequality',
  'math-kl-divergence',
  'math-mutual-information',

  // 6단원 · 미분: 역전파는 연쇄법칙 한 줄이다
  'math-derivative-and-gradient',
  'math-chain-rule',
  'math-jacobian',
  'math-vjp-and-jvp',
  'math-matrix-calculus',
  'math-softmax-cross-entropy-gradient',
  'math-activation-derivatives',
  'math-gradient-checking',

  // 7단원 · 어텐션의 수학
  'math-scaling-by-sqrt-dk',
  'math-softmax-jacobian-and-attention-gradient',
  'math-log-sum-exp-and-online-softmax',
  'math-positional-encoding-math',

  // 8단원 · 최적화: 손실 지형을 내려가기
  'math-loss-landscape-and-convexity',
  'math-taylor-hessian-and-curvature',
  'math-gradient-descent-and-lr-bound',
  'math-momentum-and-ema',
  'math-adam-from-moments',
  'math-sgd-noise-batch-and-schedule',
  'math-weight-init-variance',
  'math-newton-and-second-order',

  // 9단원 · 정렬: 제약이 걸린 최적화
  'math-expected-reward-objective',
  'math-log-derivative-trick',
  'math-baseline-and-advantage',
  'math-bradley-terry-preference',
  'math-lagrange-and-kkt',
  'math-kl-constrained-optimum-and-dpo',
  'math-importance-ratio-and-clipping',

  // 10단원 · 생성: 노이즈를 푸는 미분방정식
  'math-reparameterization-and-forward-process',
  'math-elbo',
  'math-score-matching',
  'math-sde-ode-and-discretization',
  'math-guidance-as-extrapolation',
  'math-flow-matching-and-optimal-transport',

  // 11단원 · 고차원과 검색
  'math-high-dimensional-geometry',
  'math-random-projection-and-jl',
  'math-lsh-collision-probability',
  'math-anisotropy-and-whitening',
  'math-kernels-and-gram-matrices',

  // 12단원 · 유한한 기계의 수학
  'math-floating-point-and-cancellation',
  'math-numerical-stability-patterns',
  'math-quantization-error',
  'math-asymptotics-and-flops',

  // 13단원 · 측정: 모든 점수에는 오차막대가 있다
  'math-estimator-and-standard-error',
  'math-bootstrap',
  'math-paired-test-and-multiple-comparisons',
  'math-monte-carlo-and-passk',
  'math-elo-and-arena-ranking',
  'math-calibration-and-ece',
  'math-power-law-and-scaling-curves',
];


/** 목록에서의 위치. 없으면 undefined라 맨 뒤로 갑니다. */
export function curriculumOrder(slug: string): number | undefined {
  const index = mathCurriculum.indexOf(slug);
  return index === -1 ? undefined : index;
}
