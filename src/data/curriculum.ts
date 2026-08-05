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
 * 자동 작성 루틴이 이 파일을 직접 읽습니다. **쓰는 순서는 `mathWritingOrder`가 정하고,
 * 목록에 보이는 순서는 `curriculumOrder()`가 정합니다. 둘은 일부러 다릅니다.**
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
 * 기초 트랙. **읽는 순서가 아니라 목록입니다** — 어느 편을 언제 꺼내 보는지는
 * 아래 `mathSupport`가 "본선 몇 번 앞"으로 들고 있습니다.
 *
 * 다만 배열 안의 자리가 곧 목록 화면의 순서(1000 + i)이므로,
 * 2026-08-05에 되살린 학교 수학 넷(좌표평면·직선, 이차식, 곡면·등고선, 비·비율)은
 * 앞쪽에 둡니다 — 가장 낮은 계단이 목록에서도 먼저 보이게 하려는 것입니다.
 */
export const mathFoundation: string[] = [
  'math-basics-self-diagnosis',
  'math-basics-symbol-glossary',
  'math-basics-coordinate-plane-and-lines',
  'math-basics-quadratic-and-parabola',
  'math-basics-functions-and-graphs',
  'math-basics-surfaces-and-contours',
  'math-basics-reading-proofs',
  'math-basics-algebra-manipulation',
  'math-basics-orders-of-magnitude-and-error',
  'math-basics-ratio-and-normalization',
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
 * 기초·심화 글이 **본선 몇 번을 받치는가.** `MATH-PLAN.md` 각 표의 「본선 대응」
 * 칸을 그대로 옮긴 것이고, 값은 그 칸에 적힌 순서 그대로라 첫 번호가 대표입니다.
 *
 * 이 데이터가 있는 이유는 **원고가 본선을 링크하지 못하기 때문**입니다. 쓰는 순서가
 * 기초 → 본선 → 심화라 기초 원고를 쓰는 시점에 본선 `.md`가 아직 없고, 없는 글을
 * 링크하면 `src/routes.test.ts`의 내부 링크 검사가 섭니다. 그래서 원고 안에서는
 * 「본선 12번 · 고윳값과 고유벡터」처럼 번호와 제목만 적고, **눌러서 이동하는 것은
 * 이 데이터가 그립니다.** 대응이 바뀌면 원고가 아니라 여기를 고칩니다.
 *
 * 슬러그가 아니라 번호를 담는 것은 원고·계획이 본선을 부르는 단위가 번호이기
 * 때문입니다 — 「본선 12번」이라고 적힌 문장과 이 값이 같은 것을 가리켜야 합니다.
 * 번호는 1부터이며 `mathCurriculum`의 자리와 대응합니다.
 *
 * 심화 여섯 편(마르코프 연쇄·랑주뱅·등변 신경망·구면조화함수·DP 회계·밴딧)은
 * 계획의 대응 칸이 본선을 하나도 부르지 않아 뺐습니다. 없는 것과 빈 것을 굳이
 * 구별하지 않습니다 — 어느 쪽이든 배지가 안 그려집니다.
 */
export const mathSupport: Record<string, number[]> = {
  // 기초 23편
  'math-basics-self-diagnosis': [1],
  'math-basics-symbol-glossary': [1, 2, 3, 17],
  'math-basics-coordinate-plane-and-lines': [5, 6, 7, 9, 67],
  'math-basics-quadratic-and-parabola': [12, 14, 44, 45, 46],
  'math-basics-functions-and-graphs': [18, 24, 25],
  'math-basics-surfaces-and-contours': [32, 14, 23, 44, 45],
  'math-basics-reading-proofs': [6, 29, 30, 43, 54],
  'math-basics-algebra-manipulation': [5, 6, 22, 28, 29, 46],
  'math-basics-orders-of-magnitude-and-error': [39, 70, 71, 72],
  'math-basics-ratio-and-normalization': [19, 24, 21, 49, 57, 61],
  'math-basics-sequences-limits-and-series': [32, 13, 47, 48],
  'math-basics-linear-systems-and-elimination': [7, 8, 15],
  'math-basics-determinant-and-inverse': [12, 7, 15, 34],
  'math-basics-trigonometry-and-unit-circle': [6, 11, 43],
  'math-basics-complex-numbers-and-euler': [43],
  'math-basics-derivative-rules': [29, 32, 33, 34, 35, 36, 37, 38],
  'math-basics-integral-as-area': [20, 22, 34, 53, 65],
  'math-basics-taylor-first-steps': [39, 45, 46, 71],
  'math-basics-ode-first-steps': [62],
  'math-basics-counting-and-binomial': [19, 20, 44, 67, 77],
  'math-basics-descriptive-statistics': [21, 74, 75, 79],
  'math-basics-hypothesis-testing-logic': [76, 74],
  'math-basics-symbolic-and-axis-checking': [3, 37, 10, 39],

  // 심화 57편
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

/** 본선 번호(1부터)를 슬러그로. 범위 밖이면 undefined입니다. */
export function mainTrackSlugAt(number: number): string | undefined {
  return mathCurriculum[number - 1];
}

/** 본선 슬러그의 번호(1부터). 본선이 아니면 undefined입니다. */
export function mainTrackNumber(slug: string): number | undefined {
  const index = mathCurriculum.indexOf(slug);
  return index === -1 ? undefined : index + 1;
}

/** 한 글에서 뻗어 나가는 대응. 없는 방향은 빈 배열입니다. */
export interface CurriculumLinks {
  /** 이 글이 본선일 때, 막히면 먼저 볼 기초 */
  foundation: string[];
  /** 이 글이 본선일 때, 다 읽고 더 깊이 갈 심화 */
  advanced: string[];
  /** 이 글이 기초·심화일 때, 이 글이 받치는 본선 */
  mainTrack: string[];
}

const EMPTY_LINKS: CurriculumLinks = { foundation: [], advanced: [], mainTrack: [] };

/**
 * `mathSupport`를 본선 쪽에서 읽을 수 있게 뒤집어 둡니다. 선언 순서를 그대로
 * 따르므로 기초는 `mathFoundation`, 심화는 `mathAdvanced` 차례로 붙습니다.
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
 * 아직 `.md`가 없는 글을 거르는 것은 화면(`ArticlePage`)의 몫입니다. 기초를 먼저
 * 쓰는 동안에는 본선 대응이 거의 다 비어 있고, 본선이 나가는 대로 채워집니다.
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

/** 자가진단은 처방이 본선으로 나가는 글이라 전체의 맨 마지막에 씁니다. */
const SELF_DIAGNOSIS = 'math-basics-self-diagnosis';

/**
 * 루틴이 쓰는 순서. **화면 순서와 다릅니다 — 일부러 그렇습니다.**
 * 화면은 위 `curriculumOrder()`대로 본선 → 기초 → 심화이고, 쓰는 것은 기초부터입니다.
 * 2026-08-05에 뒤집었습니다. 본선부터 쓰면 첫 배치가 전부 `level: 중급`이라
 * '기초부터'라는 약속과 어긋납니다.
 *
 * 뒤집어도 링크가 깨지지 않는 이유는 규칙 하나 때문입니다 —
 * **기초·심화 글은 본문에서 아직 쓰지 않은 글을 링크하지 않습니다.**
 * 본선을 가리킬 때는 번호와 제목만 텍스트로 적고, 눌러서 이동하는 대응 배지는
 * 이 파일의 데이터로 그리되 실제 `.md`가 있는 슬러그만 렌더합니다.
 */
export const mathWritingOrder: string[] = [
  ...mathFoundation.filter((slug) => slug !== SELF_DIAGNOSIS),
  ...mathCurriculum,
  SELF_DIAGNOSIS,
  ...mathAdvanced,
];
