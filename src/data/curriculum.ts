/**
 * 수학 글을 읽는 순서. 트랙이 셋이고 슬러그 접두사가 트랙을 정합니다.
 * 이름은 frontmatter의 `level` 값과 같은 어휘를 씁니다 — **초급 / 중급 / 고급**.
 *
 * - `math-basics-` 초급 48편 — **1번부터 순서대로 읽는 과정입니다.** 앞 글이 뒤 글의
 *   전제가 되게 배치했으므로 막혔을 때 한 편만 꺼내 보는 사전이 아닙니다.
 *   2026-08-05에 뒤집었습니다. 그전에는 23편짜리 사전이었고 순서를 두지 않았는데,
 *   계산을 할 줄 안다고 전제하지 않는다고 적어 놓고 첫 글이 유리수에서 시작하는
 *   빈 자리가 있었습니다. 지금은 등호와 연산 우선순위부터 세웁니다.
 * - `math-` 중급 80편 — 세로 축입니다. 1번부터 아무 선행 없이 시작합니다.
 *   순서의 기준은 교과서의 논리 전개가 아니라 AI 시스템의 데이터 흐름입니다.
 * - `math-adv-` 고급 63편 — 중급을 마친 뒤 읽습니다. 논문의 이론 절을 스스로 읽는 것이 목표입니다.
 *
 * 단원 경계에 절단점을 두어 중간에 멈춰도 완결된 묶음이 남게 했습니다.
 * 중급은 8·17·31·39·43·51·58편, 고급은 10·27·36·46·49·59·63편입니다.
 *
 * 자동 작성 루틴이 이 파일을 직접 읽습니다. **쓰는 순서는 `mathWritingOrder`가 정하고,
 * 목록에 보이는 순서는 `curriculumOrder()`가 정합니다. 둘은 서로 역순입니다** —
 * 이유는 `curriculumOrder()`에 적었습니다.
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
 * 초급 트랙 48편. **배열의 자리가 곧 1~48번이고 그 번호대로 읽습니다** —
 * 앞 글이 세운 것을 뒤 글이 전제로 받으므로 중간부터 꺼내 보는 목록이 아닙니다.
 *
 * 계단은 −1단계부터 9단계까지 열하나이고 편수는 3·5·7·3·5·3·3·7·5·4·3입니다.
 * −1단계 셋은 학년 밖입니다 — 개발자가 막히는 첫 자리가 계산이 아니라 표기
 * 관습이라는 판단에서 나왔고, 코드와 대조하는 것을 허용하는 유일한 세 편입니다.
 * 0단계 다섯은 뒤 글들이 빌려 쓰기만 하던 것(넓이 그림·피타고라스·닮음)을 갚습니다.
 *
 * 2026-08-05에 23편에서 다시 썼습니다. 열아홉 편은 슬러그가 그대로 살아남았고,
 * `math-basics-symbolic-and-axis-checking`은 `-symbolic-checking`으로 이름을 바꿨으며,
 * 셋(자가진단·비와 정규화·수열과 극한)은 지웠습니다. 자가진단은 트랙이 순서 있는
 * 과정이 되면서 대상이 없어졌고 — 읽는 사람이 자기 수준을 판정할 필요가 없습니다,
 * 나머지 둘은 내용이 12번과 27~29번으로 갈라져 들어갔습니다.
 */
export const mathFoundation: string[] = [
  // −1단계 · 수학을 읽고 쓰는 법
  'math-basics-what-equals-means',
  'math-basics-reading-order-of-expressions',
  'math-basics-working-by-hand',

  // 0단계 · 자연수와 도형
  'math-basics-natural-numbers-and-place-value',
  'math-basics-divisors-and-prime-factorization',
  'math-basics-area-and-volume',
  'math-basics-pythagorean-theorem',
  'math-basics-similarity-and-proportion',

  // 1단계 · 수와 계산
  'math-basics-symbol-glossary',
  'math-basics-numbers-and-number-line',
  'math-basics-fractions',
  'math-basics-decimals-percent-ratio',
  'math-basics-powers-and-roots',
  'math-basics-variables-and-expressions',
  'math-basics-expanding-and-factoring',

  // 2단계 · 방정식과 부등식
  'math-basics-linear-equations',
  'math-basics-inequalities-and-signs',
  'math-basics-algebra-manipulation',

  // 3단계 · 함수
  'math-basics-functions-and-graphs',
  'math-basics-graph-transformations',
  'math-basics-exponential-function',
  'math-basics-logarithms',
  'math-basics-quadratic-and-parabola',

  // 4단계 · 좌표와 도형
  'math-basics-coordinate-plane-and-lines',
  'math-basics-trigonometry-and-unit-circle',
  'math-basics-complex-numbers-and-euler',

  // 5단계 · 수열과 극한
  'math-basics-sequences-and-sigma',
  'math-basics-limits',
  'math-basics-geometric-series',

  // 6단계 · 미적분
  'math-basics-average-rate-of-change',
  'math-basics-what-is-a-derivative',
  'math-basics-derivative-rules',
  'math-basics-integral-as-area',
  'math-basics-fundamental-theorem-of-calculus',
  'math-basics-taylor-first-steps',
  'math-basics-ode-first-steps',

  // 7단계 · 확률과 통계
  'math-basics-probability-and-sample-space',
  'math-basics-conditional-probability-and-expectation',
  'math-basics-counting-and-binomial',
  'math-basics-descriptive-statistics',
  'math-basics-hypothesis-testing-logic',

  // 8단계 · 선형대수 준비
  'math-basics-matrix-notation',
  'math-basics-linear-systems-and-elimination',
  'math-basics-determinant-and-inverse',
  'math-basics-surfaces-and-contours',

  // 9단계 · 읽기와 검산
  'math-basics-reading-proofs',
  'math-basics-orders-of-magnitude-and-error',
  'math-basics-symbolic-checking',
];

/** 고급 트랙. 이 안에서는 순서를 지킵니다 — 뒤 글이 앞 단원을 이름으로 참조합니다. */
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
 * 초급·고급 글이 **중급 몇 번을 받치는가.** `MATH-PLAN.md` 각 표의 대응 칸을 옮긴
 * 것이고, 값은 그 칸에 적힌 순서 그대로라 첫 번호가 대표입니다.
 *
 * 이 데이터가 있는 이유는 **원고가 중급을 링크하지 못하기 때문**입니다. 쓰는 순서가
 * 초급 → 중급 → 고급이라 초급 원고를 쓰는 시점에 중급 `.md`가 아직 없고, 없는 글을
 * 링크하면 `src/routes.test.ts`의 내부 링크 검사가 섭니다. 그래서 원고 안에서는
 * 「중급 12번 · 고윳값과 고유벡터」처럼 번호와 제목만 적고, **눌러서 이동하는 것은
 * 이 데이터가 그립니다.** 대응이 바뀌면 원고가 아니라 여기를 고칩니다.
 *
 * 슬러그가 아니라 번호를 담는 것은 원고·계획이 중급을 부르는 단위가 번호이기
 * 때문입니다 — 「중급 12번」이라고 적힌 문장과 이 값이 같은 것을 가리켜야 합니다.
 * 번호는 1부터이며 `mathCurriculum`의 자리와 대응합니다.
 *
 * 고급 여섯 편(마르코프 연쇄·랑주뱅·등변 신경망·구면조화함수·DP 회계·밴딧)은
 * 계획의 대응 칸이 중급을 하나도 부르지 않아 뺐습니다. 없는 것과 빈 것을 굳이
 * 구별하지 않습니다 — 어느 쪽이든 배지가 안 그려집니다. **초급은 48편 전부가 대응을
 * 갖습니다** — 초급 글의 존재 이유가 중급 어딘가를 받치는 것이라 빈 편이 있으면
 * 그 편은 트랙에 있을 이유가 없습니다.
 */
export const mathSupport: Record<string, number[]> = {
  // 초급 48편 (배열 순서 = 1~48번)
  'math-basics-what-equals-means': [1, 2],
  'math-basics-reading-order-of-expressions': [1, 2, 3],
  'math-basics-working-by-hand': [1, 39],
  'math-basics-natural-numbers-and-place-value': [70, 73],
  'math-basics-divisors-and-prime-factorization': [15, 16],
  'math-basics-area-and-volume': [9, 34],
  'math-basics-pythagorean-theorem': [5, 6, 7],
  'math-basics-similarity-and-proportion': [4, 6, 11],
  'math-basics-symbol-glossary': [1, 2, 3, 17],
  'math-basics-numbers-and-number-line': [4, 5, 17],
  'math-basics-fractions': [24, 58],
  // 지운 `math-basics-ratio-and-normalization`의 본론(∝ 표기, 합으로 나눠 전체를 1로
  // 맞추기)이 여기로 왔으므로 그 대응도 그대로 받습니다.
  'math-basics-decimals-percent-ratio': [19, 24, 21, 49, 57, 61],
  'math-basics-powers-and-roots': [18, 40, 73],
  'math-basics-variables-and-expressions': [2, 3],
  'math-basics-expanding-and-factoring': [6, 14],
  'math-basics-linear-equations': [8, 56],
  'math-basics-inequalities-and-signs': [6, 29, 46],
  'math-basics-algebra-manipulation': [5, 6, 22, 28, 29, 46],
  'math-basics-functions-and-graphs': [18, 24, 25],
  'math-basics-graph-transformations': [18, 22, 24],
  'math-basics-exponential-function': [18, 47],
  'math-basics-logarithms': [18, 26, 28],
  'math-basics-quadratic-and-parabola': [12, 14, 44, 45, 46],
  'math-basics-coordinate-plane-and-lines': [5, 6, 7, 9, 67],
  'math-basics-trigonometry-and-unit-circle': [6, 11, 43],
  'math-basics-complex-numbers-and-euler': [43],
  // 지운 `math-basics-sequences-limits-and-series`의 대응을 27·28·29번이 나눠 받습니다.
  'math-basics-sequences-and-sigma': [3, 13, 20],
  'math-basics-limits': [32, 47, 73],
  'math-basics-geometric-series': [13, 47],
  'math-basics-average-rate-of-change': [32, 46],
  'math-basics-what-is-a-derivative': [32, 33],
  'math-basics-derivative-rules': [29, 32, 33, 34, 35, 36, 37, 38],
  'math-basics-integral-as-area': [20, 22, 53],
  'math-basics-fundamental-theorem-of-calculus': [20, 53, 62],
  'math-basics-taylor-first-steps': [39, 45, 46, 71],
  'math-basics-ode-first-steps': [62],
  'math-basics-probability-and-sample-space': [19, 25],
  'math-basics-conditional-probability-and-expectation': [19, 20],
  'math-basics-counting-and-binomial': [19, 20, 44, 67, 77],
  'math-basics-descriptive-statistics': [21, 74, 75, 79],
  'math-basics-hypothesis-testing-logic': [76, 74],
  'math-basics-matrix-notation': [9, 10, 12],
  'math-basics-linear-systems-and-elimination': [7, 8, 15],
  'math-basics-determinant-and-inverse': [12, 7, 15, 34],
  // 옛 초급 적분 글이 갖고 있던 '다중적분을 한 축씩 읽기'가 45번으로 왔으므로
  // 중급 65번(고차원 기하)도 33번이 아니라 여기가 받습니다.
  'math-basics-surfaces-and-contours': [32, 14, 23, 44, 45, 65],
  'math-basics-reading-proofs': [6, 29, 30, 43, 54],
  'math-basics-orders-of-magnitude-and-error': [39, 70, 71, 72, 73],
  'math-basics-symbolic-checking': [3, 37, 10, 39],

  // 고급 57편
  'math-adv-metric-normed-and-fixed-points': [5, 17, 46],
  'math-adv-hilbert-spaces-and-spectral-theorem': [7, 14, 15, 17],
  'math-adv-lebesgue-integral-and-convergence': [20, 22, 53, 74],
  'math-adv-radon-nikodym-and-density-ratio': [30, 58],
  'math-adv-conditional-expectation-and-martingales': [54],
  'math-adv-sketching-and-matrix-concentration': [15, 16, 66],
  'math-adv-krylov-lanczos-and-spectral-density': [12, 13, 15, 45, 51],
  'math-adv-concentration-inequalities': [66, 21, 74],
  'math-adv-uniform-convergence-and-pac-bayes': [44, 49],
  'math-adv-benign-overfitting-and-double-descent': [44, 49, 80],
  'math-adv-convex-analysis-and-subgradients': [29, 38, 44, 46],
  'math-adv-fenchel-and-lagrangian-duality': [56, 57],
  'math-adv-proximal-and-mirror-descent': [46, 48, 56, 57],
  'math-adv-stochastic-approximation-and-sgd-sde': [46, 47, 49],
  'math-adv-preconditioning-and-second-order-theory': [51],
  'math-adv-riemannian-optimization': [7, 11, 51],
  'math-adv-loss-landscape-and-mode-connectivity': [44, 45],
  'math-adv-rkhs-representer-and-gaussian-processes': [23, 69],
  'math-adv-mercer-and-random-features': [69],
  'math-adv-mmd-and-kernel-two-sample-tests': [68, 75, 76],
  'math-adv-signal-propagation-and-nngp': [50],
  'math-adv-neural-tangent-kernel': [46, 50],
  'math-adv-feature-learning-and-mup': [50],
  'math-adv-f-divergences-and-variational-representations': [30, 31],
  'math-adv-exponential-family-and-max-entropy': [24, 26, 56, 57],
  'math-adv-fisher-information-and-natural-gradient': [26, 30, 51, 58],
  'math-adv-rate-distortion-mdl-and-compression': [26, 28, 31],
  'math-adv-brownian-motion-and-ito': [62],
  'math-adv-fokker-planck-and-time-reversal': [61, 62],
  'math-adv-girsanov-and-path-measures': [62, 63],
  'math-adv-continuity-equation-and-neural-ode': [64, 34, 62],
  'math-adv-optimal-transport-duality-and-brenier': [64],
  'math-adv-entropic-ot-and-sinkhorn': [64],
  'math-adv-wasserstein-gradient-flow-and-mean-field': [62, 64],
  'math-adv-energy-based-models-and-stein': [61],
  'math-adv-variational-inference-theory': [53, 59, 60],
  'math-adv-automatic-differentiation-theory': [33, 34, 35],
  'math-adv-attention-as-kernel-and-associative-memory': [40, 41, 42, 43, 69],
  'math-adv-in-context-learning-theory': [41],
  'math-adv-expressivity-and-circuit-complexity': [73],
  'math-adv-fourier-analysis-and-spectral-bias': [43],
  'math-adv-orthogonal-polynomials-and-hippo': [7],
  'math-adv-toeplitz-circulant-and-state-space-models': [13, 42, 73],
  'math-adv-spectral-graph-theory': [12, 14],
  'math-adv-groups-actions-and-representations': [8, 11, 15],
  'math-adv-compressed-sensing-and-superposition': [65, 66],
  'math-adv-representation-geometry-and-intrinsic-dimension': [65, 68],
  'math-adv-backward-error-analysis': [70, 71],
  'math-adv-io-complexity-and-lower-bounds': [42, 73],
  'math-adv-sequential-testing-and-e-values': [74, 76],
  'math-adv-conformal-prediction': [74, 79],
  'math-adv-causal-inference-and-interventions': [76, 79],
  'math-adv-heavy-tails-and-extreme-values': [21, 74, 80],
  'math-adv-scaling-law-theory': [50, 80],
  'math-adv-mdp-bellman-and-trust-region': [52, 54, 58],
  'math-adv-minimax-games-and-equilibria': [57, 58],
  'math-adv-social-choice-and-preference-aggregation': [55, 78],
};

/**
 * 트랙 셋을 한 자리에 모아 둡니다. 순서는 읽는 순서이자 번호 순서입니다 —
 * 배열의 자리가 곧 「초급 9번」의 9입니다.
 */
const TRACKS = [
  { level: '초급', tier: 1, slugs: mathFoundation },
  { level: '중급', tier: 2, slugs: mathCurriculum },
  { level: '고급', tier: 3, slugs: mathAdvanced },
] as const;

export interface TrackPlace {
  level: (typeof TRACKS)[number]['level'];
  /**
   * 트랙의 차례. 초급 1, 중급 2, 고급 3입니다.
   *
   * 카드 코드가 트랙을 구별하는 데 씁니다. 번호만 쓰면 셋 다 1번부터 시작해
   * `M-01`이 초급 1번에도 중급 1번에도 붙습니다.
   */
  tier: (typeof TRACKS)[number]['tier'];
  /** 트랙 안의 번호. 1부터 셉니다. */
  number: number;
  /** 그 트랙의 총 편수. 「9 / 48」처럼 쓰려고 함께 냅니다. */
  total: number;
}

/**
 * 이 글이 트랙의 몇 번인가. 수학이 아니면 undefined입니다.
 *
 * 카드에 붙는 번호가 이것입니다. 예전에는 슬러그 해시를 100으로 나눈 나머지를
 * 썼는데, 수학은 「16번 · 일차방정식」처럼 **본문이 번호로 서로를 가리키는**
 * 트랙이라 읽는 사람이 그 숫자를 번호로 읽습니다. 초급 7번인 피타고라스 정리에
 * `M-96`이 붙어 있었습니다.
 */
export function trackPlace(slug: string): TrackPlace | undefined {
  for (const track of TRACKS) {
    const index = track.slugs.indexOf(slug);
    if (index === -1) continue;
    return { level: track.level, tier: track.tier, number: index + 1, total: track.slugs.length };
  }
  return undefined;
}

/**
 * 같은 트랙에서 이 글의 앞뒤로 이어지는 편들. `after`는 다음 편부터 순서대로,
 * `before`는 지난 편부터 거슬러 올라가는 순서입니다.
 *
 * **트랙을 넘어가지 않습니다** — 초급 마지막 다음은 중급 1번이 아니라 없음입니다.
 * 트랙마다 전제가 다르므로 이어서 읽을 것이 아닙니다.
 *
 * **슬러그만 주고 실재 여부는 보지 않습니다** — 아직 `.md`가 없는 글을 거르는 것은
 * 부르는 쪽의 몫입니다. `curriculumLinks`와 같은 약속입니다.
 */
export function trackAround(slug: string): { before: string[]; after: string[] } {
  for (const track of TRACKS) {
    const index = track.slugs.indexOf(slug);
    if (index === -1) continue;
    return { before: track.slugs.slice(0, index).reverse(), after: track.slugs.slice(index + 1) };
  }
  return { before: [], after: [] };
}

/** 중급 번호(1부터)를 슬러그로. 범위 밖이면 undefined입니다. */
export function mainTrackSlugAt(number: number): string | undefined {
  return mathCurriculum[number - 1];
}

/** 중급 슬러그의 번호(1부터). 중급이 아니면 undefined입니다. */
export function mainTrackNumber(slug: string): number | undefined {
  const index = mathCurriculum.indexOf(slug);
  return index === -1 ? undefined : index + 1;
}

/** 한 글에서 뻗어 나가는 대응. 없는 방향은 빈 배열입니다. */
export interface CurriculumLinks {
  /** 이 글이 중급일 때, 막히면 먼저 볼 초급 */
  foundation: string[];
  /** 이 글이 중급일 때, 다 읽고 더 깊이 갈 고급 */
  advanced: string[];
  /** 이 글이 초급·고급일 때, 이 글이 받치는 중급 */
  mainTrack: string[];
}

const EMPTY_LINKS: CurriculumLinks = { foundation: [], advanced: [], mainTrack: [] };

/**
 * `mathSupport`를 중급 쪽에서 읽을 수 있게 뒤집어 둡니다. 선언 순서를 그대로
 * 따르므로 초급은 `mathFoundation`, 고급은 `mathAdvanced` 차례로 붙습니다.
 */
const incoming = new Map<string, { foundation: string[]; advanced: string[] }>();

for (const [support, numbers] of Object.entries(mathSupport)) {
  const isAdvanced = support.startsWith('math-adv-');
  for (const number of numbers) {
    const main = mainTrackSlugAt(number);
    if (!main) continue;

    let entry = incoming.get(main);
    if (!entry) {
      entry = { foundation: [], advanced: [] };
      incoming.set(main, entry);
    }
    (isAdvanced ? entry.advanced : entry.foundation).push(support);
  }
}

/**
 * 이 글과 이어지는 다른 트랙의 글들. **슬러그만 주고 실재 여부는 보지 않습니다** —
 * 아직 `.md`가 없는 글을 거르는 것은 화면(`ArticlePage`)의 몫입니다. 초급을 먼저
 * 쓰는 동안에는 중급 대응이 거의 다 비어 있고, 중급이 나가는 대로 채워집니다.
 */
export function curriculumLinks(slug: string): CurriculumLinks {
  const mainNumbers = mathSupport[slug];
  if (mainNumbers) {
    const mainTrack = mainNumbers
      .map(mainTrackSlugAt)
      .filter((target): target is string => target !== undefined);
    return { foundation: [], advanced: [], mainTrack };
  }

  const entry = incoming.get(slug);
  if (!entry) return EMPTY_LINKS;

  return { foundation: entry.foundation, advanced: entry.advanced, mainTrack: [] };
}

/**
 * 루틴이 쓰는 순서. 초급 1번부터 시작해 중급, 고급으로 갑니다.
 * 2026-08-05에 중급 → 초급에서 뒤집었습니다. 중급부터 쓰면 첫 배치가 전부
 * `level: 중급`이라 '초급부터'라는 약속과 어긋납니다.
 *
 * 뒤집어도 링크가 깨지지 않는 이유는 규칙 하나 때문입니다 —
 * **초급·고급 글은 본문에서 아직 쓰지 않은 글을 링크하지 않습니다.**
 * 중급을 가리킬 때는 번호와 제목만 텍스트로 적고, 눌러서 이동하는 대응 배지는
 * 이 파일의 데이터로 그리되 실제 `.md`가 있는 슬러그만 렌더합니다.
 */
export const mathWritingOrder: string[] = [
  ...mathFoundation,
  ...mathCurriculum,
  ...mathAdvanced,
];

const writingIndex = new Map(mathWritingOrder.map((slug, index) => [slug, index]));

/**
 * 목록에서의 위치. `ArticleExplorer`가 이 값의 **오름차순**으로 세우므로
 * 작을수록 위입니다.
 *
 * **화면 순서는 쓰는 순서의 역순입니다.** 최신 글이 맨 위여야 하는데 수학은 같은 날
 * 다섯 편씩 나가 `pubDate`만으로는 하루 안의 순서가 잡히지 않습니다. 그래서 날짜가
 * 아니라 `mathWritingOrder`의 자리를 뒤집어 씁니다 — 나중에 쓴 글일수록 값이 작습니다.
 * 결과적으로 고급 마지막 편이 맨 위, 초급 1번이 맨 아래입니다.
 *
 * 없으면 undefined이고, 그런 글은 `ArticleExplorer`가 맨 뒤로 보냅니다.
 */
export function curriculumOrder(slug: string): number | undefined {
  const index = writingIndex.get(slug);
  if (index === undefined) return undefined;

  // 마지막에 쓰는 글이 0입니다. 0은 유효한 순서이므로 호출하는 쪽이 falsy로
  // 걸러 버리면 그 글 하나만 order 없이 목록 맨 뒤로 밀립니다.
  return mathWritingOrder.length - 1 - index;
}
