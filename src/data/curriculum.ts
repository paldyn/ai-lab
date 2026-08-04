/**
 * 수학 글을 읽는 순서. 트랙이 셋이고 슬러그 접두사가 트랙을 정합니다.
 *
 * - `math-basics-` 기초 — 본선을 읽다 막혔을 때 한 편만 꺼내 보는 사전입니다.
 *   **순서가 없습니다.** 번호를 매기면 '순서대로 읽어야 하는 것'이 되고,
 *   그것이 이전 144편 계획을 10편에서 멈추게 한 인식입니다.
 * - `math-` 본선 — 세로 축입니다. 1번부터 아무 선행 없이 시작합니다.
 *   순서의 기준은 교과서의 논리 전개가 아니라 AI 시스템의 데이터 흐름입니다.
 * - `math-adv-` 심화 — 본선을 마친 뒤 읽습니다. 논문의 이론 절을 스스로 읽는 것이 목표입니다.
 *
 * 단원 경계에 절단점을 두어 중간에 멈춰도 완결된 묶음이 남게 했습니다.
 * 본선은 8·17·31·39·43·51·58편, 심화는 10·27·36·46·49·59·63편입니다.
 *
 * 자동 작성 루틴이 이 파일을 직접 읽습니다. 순서는 본선 → 기초 → 심화입니다
 * — 기초·심화 글이 본선을 링크하므로 본선이 먼저 있어야 `npm test`가 통과합니다.
 * 각 글이 무엇을 다루는지는 `MATH-PLAN.md`에 있습니다.
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


/**
 * 기초 트랙. 값은 "본선 몇 번 앞에서 읽으면 되는가"입니다.
 * 순서가 아니라 대응이므로 배열이 아니라 목록으로 둡니다.
 */
export const mathFoundation: string[] = [
  'math-basics-self-diagnosis',
  'math-basics-symbol-glossary',
  'math-basics-functions-and-graphs',
  'math-basics-reading-proofs',
  'math-basics-algebra-manipulation',
  'math-basics-orders-of-magnitude-and-error',
  'math-basics-sequences-limits-and-series',
  'math-basics-linear-systems-and-elimination',
  'math-basics-determinant-and-inverse',
  'math-basics-trigonometry-and-unit-circle',
  'math-basics-complex-numbers-and-euler',
  'math-basics-derivative-rules',
  'math-basics-integral-as-area',
  'math-basics-taylor-first-steps',
  'math-basics-ode-first-steps',
  'math-basics-counting-and-binomial',
  'math-basics-descriptive-statistics',
  'math-basics-hypothesis-testing-logic',
  'math-basics-symbolic-and-axis-checking',
];

/** 심화 트랙. 이 안에서는 순서를 지킵니다 — 뒤 글이 앞 단원을 이름으로 참조합니다. */
export const mathAdvanced: string[] = [
  // A1 · 엄밀함의 도구 (5편)
  'math-adv-metric-normed-and-fixed-points',
  'math-adv-hilbert-spaces-and-spectral-theorem',
  'math-adv-lebesgue-integral-and-convergence',
  'math-adv-radon-nikodym-and-density-ratio',
  'math-adv-conditional-expectation-and-martingales',
  // A2 · 대규모 선형대수 (2편)
  'math-adv-sketching-and-matrix-concentration',
  'math-adv-krylov-lanczos-and-spectral-density',
  // A3 · 확률 부등식과 일반화 (3편)
  'math-adv-concentration-inequalities',
  'math-adv-uniform-convergence-and-pac-bayes',
  'math-adv-benign-overfitting-and-double-descent',
  // A4 · 볼록해석과 최적화 이론 (7편)
  'math-adv-convex-analysis-and-subgradients',
  'math-adv-fenchel-and-lagrangian-duality',
  'math-adv-proximal-and-mirror-descent',
  'math-adv-stochastic-approximation-and-sgd-sde',
  'math-adv-preconditioning-and-second-order-theory',
  'math-adv-riemannian-optimization',
  'math-adv-loss-landscape-and-mode-connectivity',
  // A5 · 커널과 무한폭 (6편)
  'math-adv-rkhs-representer-and-gaussian-processes',
  'math-adv-mercer-and-random-features',
  'math-adv-mmd-and-kernel-two-sample-tests',
  'math-adv-signal-propagation-and-nngp',
  'math-adv-neural-tangent-kernel',
  'math-adv-feature-learning-and-mup',
  // A6 · 정보와 기하 (4편)
  'math-adv-f-divergences-and-variational-representations',
  'math-adv-exponential-family-and-max-entropy',
  'math-adv-fisher-information-and-natural-gradient',
  'math-adv-rate-distortion-mdl-and-compression',
  // A7 · 확률과정과 생성의 연속시간 이론 (9편)
  'math-adv-markov-chains-mixing-and-mcmc',
  'math-adv-brownian-motion-and-ito',
  'math-adv-fokker-planck-and-time-reversal',
  'math-adv-girsanov-and-path-measures',
  'math-adv-langevin-and-log-sobolev',
  'math-adv-continuity-equation-and-neural-ode',
  'math-adv-optimal-transport-duality-and-brenier',
  'math-adv-entropic-ot-and-sinkhorn',
  'math-adv-wasserstein-gradient-flow-and-mean-field',
  // A8 · 에너지·변분·트랜스포머의 이론 (6편)
  'math-adv-energy-based-models-and-stein',
  'math-adv-variational-inference-theory',
  'math-adv-automatic-differentiation-theory',
  'math-adv-attention-as-kernel-and-associative-memory',
  'math-adv-in-context-learning-theory',
  'math-adv-expressivity-and-circuit-complexity',
  // A9 · 스펙트럴 이론의 응용: 시퀀스와 그래프 (4편)
  'math-adv-fourier-analysis-and-spectral-bias',
  'math-adv-orthogonal-polynomials-and-hippo',
  'math-adv-toeplitz-circulant-and-state-space-models',
  'math-adv-spectral-graph-theory',
  // A10 · 대칭과 등변성 (3편)
  'math-adv-groups-actions-and-representations',
  'math-adv-equivariant-networks',
  'math-adv-spherical-harmonics-and-se3',
  // A11 · 표현의 기하 (2편)
  'math-adv-compressed-sensing-and-superposition',
  'math-adv-representation-geometry-and-intrinsic-dimension',
  // A12 · 유한한 기계의 이론 (2편)
  'math-adv-backward-error-analysis',
  'math-adv-io-complexity-and-lower-bounds',
  // A13 · 측정의 보장 (6편)
  'math-adv-sequential-testing-and-e-values',
  'math-adv-conformal-prediction',
  'math-adv-causal-inference-and-interventions',
  'math-adv-heavy-tails-and-extreme-values',
  'math-adv-scaling-law-theory',
  'math-adv-differential-privacy-accounting',
  // A14 · 정렬과 의사결정의 이론 (4편)
  'math-adv-mdp-bellman-and-trust-region',
  'math-adv-bandits-and-regret',
  'math-adv-minimax-games-and-equilibria',
  'math-adv-social-choice-and-preference-aggregation',
];

/**
 * 목록에서의 위치. 본선은 0부터, 기초와 심화는 오프셋을 줘서 뒤로 보냅니다.
 * 없으면 undefined라 맨 뒤로 갑니다.
 */
export function curriculumOrder(slug: string): number | undefined {
  const main = mathCurriculum.indexOf(slug);
  if (main !== -1) return main;

  const foundation = mathFoundation.indexOf(slug);
  if (foundation !== -1) return 1000 + foundation;

  const advanced = mathAdvanced.indexOf(slug);
  if (advanced !== -1) return 3000 + advanced;

  return undefined;
}

/** 루틴이 쓰는 순서. 본선을 먼저 채워야 기초·심화의 링크가 살아납니다. */
export const mathWritingOrder: string[] = [...mathCurriculum, ...mathFoundation, ...mathAdvanced];
