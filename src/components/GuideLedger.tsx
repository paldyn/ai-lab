import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Link } from 'react-router';
import {
  ArrowDown,
  ArrowUpRight,
  CircleCheck,
  CircleHelp,
  Clock,
  Compass,
  Cpu,
  CreditCard,
  Gauge,
  GitFork,
  Repeat,
  Scissors,
  Send,
  SlidersHorizontal,
  Tag,
  Target,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import { ageText } from './ClaimRow';
import { GuideMark } from './GuideMark';
import {
  ageLayout,
  claimsForProduct,
  isPlanClaim,
  valueCell,
  type ValueCell,
} from '../data/playbook';
import { modelMark, shownModels } from '../data/guideModels';
import { assetUrl } from '../data/sources';
import { guideProducts } from '../data/guideProducts';
import { tipAxes, tipGroupsOf } from '../data/guideTipGroups';
import { guideVendorById } from '../data/guideVendors';
import type {
  AnthropicLatency,
  Claim,
  ModelInfo,
  OpenAiReasoning,
  OpenAiSpeed,
  PlanFacet,
  Product,
  Role,
  TipAim,
  TipGroupId,
} from '../types/playbook';

/**
 * 원장 — **제품 하나를 타임라인으로 읽는 한 칸**(2026-09-28, 일곱 번째 원장).
 *
 * 헤어라인 목록으로 펼친 원장은 읽히기는 했지만 「별론데, 좀 더 색다르게」였습니다. 방향
 * 넷(타임라인 · 카드 · 체크리스트 · 에디토리얼)을 실제 데이터 목업으로 그려 보였고, 고른
 * 것이 **타임라인에 요금만 카드**입니다.
 *
 * - **팁 탭은 줄기 위의 여정입니다.** 순간 넷은 나란한 넷이 아니라 차례라(사용량 절감은
 *   세션이 지나는 시간, 품질 향상은 고치는 값이 커지는 순서), 그 차례를 제품색 줄기와 마디로
 *   그립니다. 팁은 줄기에서 뻗은 가지 끝에 매달리고, 스크롤하면 줄기가 읽는 자리까지 찹니다.
 * - **모델은 바탕 위의 칸입니다**(2026-09-29, 체크리스트의 모양). 모델마다 칸 하나에 마크 판 ·
 *   이름 · 쓰임 · 수가 한 줄로 서고, 절 머리는 요금 절과 같은 마디 + 띠이며 띠가 열 이름을
 *   겸합니다.
 * - **요금제는 카드입니다.** 요금 페이지처럼 요금제마다 큰 가격을 단 카드를 나란히 세웁니다.
 *
 * **빈 절은 안 그립니다.** 팁이 없는 축, 모델도 요금도 없는 참고 탭, 같은 갈래의 다른
 * 제품이 없는 경우 전부 그 절이 통째로 안 섭니다.
 */

/* ── 코드와 키 ──────────────────────────────────────────────────── */

/** 백틱 안이 키 조합이면 캡마다 `<kbd>`로 그립니다(`Shift+Tab`, `Esc`, `Ctrl+G`). */
const KEY_COMBO = /^(Shift|Ctrl|Cmd|Alt|Option|Esc|Tab|Enter)(\+[A-Za-z]+)*$/;

/**
 * 원고의 백틱을 코드 조각으로 그립니다. 마크다운이 아니라 **백틱 한 겹만** 봅니다.
 *
 * 키 조합은 코드가 아니라 누르는 것이라 `<kbd>`입니다 — 「`Shift+Tab`으로 계획 모드에
 * 들어간다」에서 명령어와 단축키가 같은 모양이면 무엇을 치고 무엇을 누르는지가 안 갈립니다.
 *
 * **괄호에 바로 붙은 코드는 판을 괄호 쪽으로 당깁니다**(`is-paren`). 판의 안쪽 여백 때문에
 * 「강도(`effort`)」가 「강도( effort )」로 읽혔습니다.
 */
export function withCode(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (!(part.length > 2 && part.startsWith('`') && part.endsWith('`'))) {
      return <Fragment key={i}>{part}</Fragment>;
    }
    const inner = part.slice(1, -1);
    if (KEY_COMBO.test(inner)) {
      return (
        <span key={i} className="gl-keys">
          {inner.split('+').map((key, k) => (
            <Fragment key={k}>
              {k > 0 && <span className="gl-keys-plus">+</span>}
              <kbd className="gl-kbd">{key}</kbd>
            </Fragment>
          ))}
        </span>
      );
    }
    const paren = (parts[i - 1] ?? '').endsWith('(') && (parts[i + 1] ?? '').startsWith(')');
    return (
      <code key={i} className={`guide-tip-code${paren ? ' is-paren' : ''}`}>
        {inner}
      </code>
    );
  });
}

/* ── 팁 ─────────────────────────────────────────────────────────── */

/**
 * 출처 라벨을 첫 「 — 」에서 발행처와 문서 이름으로 가릅니다. **보이는 글자는 라벨
 * 그대로입니다** — 발행처만 남기면 한 탭에서 「Claude Code Docs」가 여덟 번 서는데
 * 가는 페이지는 셋이라 어느 문서인지 안 갈립니다. 발행처는 굵게, 가운데서 안 끊깁니다.
 */
function SourceLabel({ label }: { label: string }) {
  const at = label.indexOf(' — ');
  if (at < 0) return <span className="gl-src-pub">{label}</span>;
  return (
    <>
      <span className="gl-src-pub">{label.slice(0, at)}</span>
      {' — '}
      <span className="gl-src-page">{label.slice(at + 3)}</span>
    </>
  );
}

/**
 * 팁 한 편 — **줄기에서 뻗은 가지 끝에 매달린 한 덩이**. 상자가 없습니다. 가지와 그 끝의
 * 점은 CSS가 그리고(`::before`·`::after`), 줄기가 그 높이까지 차면 점이 켜집니다.
 *
 * **나이를 안 답니다.** 팁은 `concept`라 유효기간이 없습니다. 나이는 늙는 것, 곧 모델과
 * 요금의 값에만 섭니다.
 */
function TipItem({ claim }: { claim: Claim }) {
  return (
    <li className="gl-tip" id={`tip-${claim.id}`}>
      <p className="gl-tip-do">{withCode(claim.statement)}</p>
      <p className="gl-tip-why">
        {claim.detail && (
          <>
            {withCode(claim.detail)}{' '}
          </>
        )}
        <a className="gl-tip-src" href={claim.source.url} target="_blank" rel="noreferrer">
          <SourceLabel label={claim.source.label} />
          <ArrowUpRight size={12} aria-hidden="true" />
        </a>
      </p>
    </li>
  );
}

/**
 * 이 서랍이 파는 두 가지. **가르는 질문 하나입니다 — 이 팁을 따르면 덜 쓰나, 더 나아지나.**
 *
 * **이름은 목적을 굳은 한자어 짝으로 적습니다**(2026-09-28). 「아껴 쓰기」·「정확히
 * 시키기」가 가볍다는 말에 바꿨습니다. 「사용량」은 API 토큰·구독 메시지 한도·Codex
 * 크레딧을 한 낱말로 덮고 옆 탭 「요금제와 사용 한도」와 한 계열로 읽힙니다. 「비용
 * 절감」은 정액 구독자에게 틀린 말이고, 「정확도 향상」은 이 사이트에서 ML 지표로
 * 읽혀 안 썼습니다. 리드는 안 답니다 — 합니다체 설명이 한다체 팁 위에 끼어 부딪혔습니다.
 */
const READ_AIMS: Array<{ aim: TipAim; title: string; icon: LucideIcon }> = [
  { aim: 'save', title: '사용량 절감', icon: TrendingDown },
  { aim: 'well', title: '품질 향상', icon: Target },
];

/**
 * 순간마다 마디에 서는 아이콘. **데이터가 아니라 그림의 일이라 여기 둡니다** — 순간의 뜻은
 * `guideTipGroups.ts`가 들고, 무엇으로 그릴지는 원장이 정합니다.
 */
const SITUATION_ICON: Record<TipGroupId, LucideIcon> = {
  load: SlidersHorizontal,
  model: Gauge,
  feed: GitFork,
  cut: Scissors,
  standing: Repeat,
  brief: Send,
  steer: Compass,
  verdict: CircleCheck,
};

/** 그 축의 팁을 순간마다 묶습니다. 빈 순간은 안 만듭니다. */
function groupTips(aim: TipAim, tips: Claim[]) {
  return tipGroupsOf(aim)
    .map((group) => ({ group, rows: tips.filter((c) => c.group === group.id) }))
    .filter((g) => g.rows.length > 0);
}

/** 작은 줄기 — 팁이 든 순간 중 몇째 마디인가. 순간 머리가 위에 붙어 큰 줄기가 안 보일 때도 자리가 남습니다. */
function MiniStem({ at, of }: { at: number; of: number }) {
  return (
    <span className="gl-mini" aria-hidden="true">
      {Array.from({ length: of }, (_, j) => (
        <i key={j} className={`${j <= at ? 'is-on' : ''}${j === at ? ' is-here' : ''}`} />
      ))}
    </span>
  );
}

/**
 * 팁 탭 하나 — **줄기 하나에 순간 마디가 차례로 서는 타임라인.**
 *
 * - 줄기 머리에 축이 무엇을 따라 흐르는지 적습니다(`tipAxes`). 안 적으면 위에서 아래로
 *   가는 것이 「중요한 순」으로 읽힙니다.
 * - 순간 머리(마디 + 띠)는 탭 줄 바로 아래에 붙어 따라옵니다. 읽는 동안 지금 어느 순간인지
 *   늘 보입니다.
 * - **첫 마디는 처음부터 켜진 채 나갑니다**(프리렌더 HTML에도). 줄기가 차는 것은 그 뒤
 *   스크롤이 맡습니다(`useTimeline`).
 * - **순간이 하나뿐이어도 마디를 세웁니다.** 헤어라인 목록에서는 라벨이 탭 이름을 되풀이해
 *   걷었지만, 줄기 위에서는 마디가 없으면 가지가 매달릴 데가 없습니다. 작은 줄기만 뺍니다.
 */
function TipTimeline({ aim, groups }: { aim: TipAim; groups: ReturnType<typeof groupTips> }) {
  return (
    <div className="gl-tl" data-live="">
      <span className="gl-tl-track" aria-hidden="true" />
      <span className="gl-tl-fill" aria-hidden="true" />
      <p className="gl-tl-axis">
        <ArrowDown size={15} aria-hidden="true" />
        {tipAxes[aim]}
      </p>
      <ol className="gl-stops">
        {groups.map(({ group, rows }, i) => {
          const Icon = SITUATION_ICON[group.id];
          return (
            <li key={group.id} className={`gl-stop${i === 0 ? ' is-reached is-current' : ''}`}>
              <div className="gl-stop-head">
                <span className="gl-stop-node" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <div className="gl-stop-band">
                  <h3 className="gl-situation" id={`${aim}-${group.id}`}>
                    {group.situation}
                  </h3>
                  <span className="gl-stop-meta">
                    팁 {rows.length}
                    {groups.length > 1 && <MiniStem at={i} of={groups.length} />}
                  </span>
                </div>
              </div>
              <ul className="gl-tips">
                {rows.map((claim) => (
                  <TipItem key={claim.id} claim={claim} />
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
      <div className="gl-tl-end" aria-hidden="true" />
    </div>
  );
}

/* ── 모델 ───────────────────────────────────────────────────────── */

/**
 * 단가 문자열을 **입력 · 출력 · 단서** 셋으로 가릅니다 — 「줄이되 뜻을 안 버린다」의
 * 구현입니다.
 *
 * **수 둘을 갈라야 열이 둘이 됩니다.** 짝(`$2 / $12`)을 한 칸에 세우면 열을 아무리
 * 맞춰도 수 열이 컨텍스트 하나뿐입니다. 가르는 것은 화면뿐이고 두 칸이 같은 요금
 * 페이지로 갑니다.
 *
 * **단서는 자르지 않고 아래로 내립니다.** 「지금 이 값이 언제 거짓이 되는가」라 버리면
 * 두 주 뒤에 거짓말이 되고, 괄호째 옮기므로 `input + ' / ' + output (+ ' ' + rider)`가
 * 원문과 글자까지 같습니다. 안 맞는 꼴은 통째로 `input`에 남고 `raw`가 섭니다.
 */
const PRICE_PAIR = /^(\$[\d.,]+) \/ (\$[\d.,]+)(?: (\(.+\)))?$/;

export function splitPrice(
  value: string,
): { input: string; output: string | null; rider: string | null; raw: boolean } {
  const m = PRICE_PAIR.exec(value);
  if (!m) return { input: value, output: null, rider: null, raw: true };
  return { input: m[1], output: m[2], rider: m[3] ?? null, raw: false };
}

/** 컨텍스트 칸에서만 「 토큰」을 뗍니다 — 열 이름이 단위를 집니다. 데이터는 그대로입니다. */
const contextLabel = (value: string) => value.replace(/^([\d.,]+[KM]?) 토큰$/, '$1');

/**
 * 모델 줄머리 마크 — 칸 왼쪽의 판. 제 마크가 있으면 만든 회사의 판 색 위에, 없으면 계열
 * 마크를 배경색 판(`--bg`) 위에 올립니다. 만든 회사가 모델 카드에 세우는 비율(0.6)을
 * 그대로 씁니다(36px 판에 22px). **판까지 그려진 타일(OpenAI)은 판 자리를 통째로
 * 채웁니다** — 글자가 그림에 박혀 있어 줄이면 안 읽힙니다.
 */
function ModelPlate({ model }: { model: ModelInfo }) {
  if (model.mark && 'tile' in model.mark) {
    return (
      <span className="gl-plate is-tile" aria-hidden="true">
        <img src={assetUrl(model.mark.file)} alt="" />
      </span>
    );
  }
  if (model.mark) {
    return (
      <span
        className="gl-plate"
        style={{ '--guide-plate': model.mark.plate } as CSSProperties}
        aria-hidden="true"
      >
        <img src={assetUrl(model.mark.file)} alt="" />
      </span>
    );
  }
  const family = modelMark[model.vendorId];
  return (
    <span className="gl-plate" aria-hidden="true">
      <GuideMark
        logo={family.logo}
        monochrome={family.monochrome}
        accent={family.accent}
        className="guide-model-mark"
      />
    </span>
  );
}

/**
 * 값 칸 하나. 값이든 상태 낱말이든 **출처로 갈 수 있어야 합니다** — 「문서에 없음」도
 * 「재확인 필요」도 다음 할 일이 「공식 페이지를 열어 보기」입니다.
 * `data-label`은 좁은 화면에서 열 이름 대신 수 위에 붙습니다.
 */
function Cell({
  cell,
  url,
  label,
  modelName,
  text,
  className,
}: {
  cell: ValueCell;
  url: string;
  label: string;
  modelName: string;
  /** 값일 때 칸에 서는 글자. 상태 낱말이면 그 낱말이 섭니다. */
  text?: string;
  className: string;
}) {
  if (cell.kind === 'none') return <span className={`${className} is-empty`} data-label={label} />;
  const note = cell.kind === 'note';
  const soft = cell.kind === 'value' && cell.soft;
  const shown = note ? cell.text : (text ?? '');
  return (
    <span className={className} data-label={label}>
      {/*
        **이름에 모델과 열을 함께 싣습니다.** 열 이름은 절 머리 띠에 따로 서 있어 칸과 안 이어지므로
        링크 이름이 「1M」·「$2」뿐이면 링크 목록에서 무엇인지 안 갈립니다.
      */}
      <a
        className={note ? 'gl-state' : `gl-num${soft ? ' is-soft' : ''}`}
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={`${modelName} ${label} ${shown}`}
      >
        {shown}
      </a>
    </span>
  );
}

/** 모델 표의 열 하나 — 이름과, 물음표에 서는 한두 줄 풀이. */
interface ModelColumn {
  label: string;
  hint: string;
}

/**
 * 모델 표의 열 이름과 풀이(2026-09-29). 「컨텍스트/입력/출력도 무슨 의미인지 모르는 사람이
 * 있을 수 있으니」에 답한 자리입니다. **풀이는 값이 아니라 뜻이라** 주장으로 세우지 않고
 * 확인 로그도 받지 않습니다 — 수를 박지 않는 것도 그래서입니다(수는 칸이 말합니다).
 * 말투는 팁과 같은 한다체입니다.
 */
const MODEL_COLUMNS = {
  context: {
    label: '컨텍스트(토큰)',
    hint: '모델이 한 번에 붙잡고 읽을 수 있는 글의 양이다. 주고받은 대화와 넣은 파일, 모델의 답까지 모두 이 안에 들어가야 한다. 토큰은 모델이 글을 잘게 쪼개 세는 단위다.',
  },
  input: {
    label: '입력 단가',
    hint: '모델에게 보내는 글(질문·파일·지난 대화)에 매기는 값이다. API로 쓸 때 100만 토큰당 달러로 셈하고, 구독으로 쓸 때는 이 값 대신 요금제의 사용 한도가 걸린다.',
  },
  output: {
    label: '출력 단가',
    hint: '모델이 써 내는 글(답·코드·생각하는 과정)에 매기는 값이다. 입력과 같은 100만 토큰당 달러이고, 보통 입력보다 비싸다.',
  },
} satisfies Record<string, ModelColumn>;

/**
 * 열 이름 옆 물음표 — 올리거나(마우스) 누르면(손가락·키보드) 풀이가 섭니다.
 *
 * **WAI-ARIA 툴팁 꼴입니다** — 단추가 `aria-describedby`로 풀이를 가리켜, 화면 낭독기는
 * 「컨텍스트(토큰) 설명, 단추, 모델이 한 번에…」로 읽습니다. 올려서 선 풀이는 **Esc로
 * 걷히고**(`is-hushed`), 포인터를 풀이 위로 옮겨도 안 사라집니다(CSS의 다리) — WCAG
 * 1.4.13(올렸을 때 서는 내용)의 세 조건입니다. 손가락은 올리기가 없어 누르면 열리고
 * (`is-open`) 바깥을 누르면 닫힙니다 — iOS Safari는 단추를 눌러도 포커스를 안 줘서
 * `blur`만으로는 못 닫습니다.
 */
function Hint({ label, text }: { label: string; text: string }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [hushed, setHushed] = useState(false);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  /* 포인터만 올려 둔 채(포커스 없이) 누른 Esc도 받아야 해서 문서에서 듣습니다. */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      setHushed(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <span
      ref={ref}
      className={`gl-hint${open ? ' is-open' : ''}${hushed ? ' is-hushed' : ''}`}
      onMouseEnter={() => setHushed(false)}
    >
      <button
        type="button"
        className="gl-hint-btn"
        aria-label={`${label} 설명`}
        aria-describedby={id}
        onFocus={() => setHushed(false)}
        onClick={() => {
          setHushed(false);
          setOpen((v) => !v);
        }}
        onBlur={() => setOpen(false)}
      >
        <CircleHelp size={13} aria-hidden="true" />
      </button>
      <span role="tooltip" id={id} className="gl-hint-pop">
        {text}
      </span>
    </span>
  );
}

/**
 * 참고 탭의 절 머리 — 팁 탭의 순간 머리와 같은 마디 + 띠. 모델 절과 요금 절이 같은 모양을
 * 씁니다(2026-09-29). **모델 절에서는 띠가 열 이름을 겸합니다** — 띠가 아래 칸과 같은
 * 격자(`cols`)를 써서, 머리가 붙어 따라오는 동안 열 이름도 함께 보입니다.
 */
function RefHead({
  icon: Icon,
  id,
  title,
  labels = [],
  cols,
}: {
  icon: LucideIcon;
  id: string;
  title: string;
  labels?: ModelColumn[];
  cols?: string;
}) {
  return (
    <div className="gl-stop-head">
      <span className="gl-stop-node" aria-hidden="true">
        <Icon size={20} />
      </span>
      <div className={`gl-stop-band${cols ? ` ${cols}` : ''}`}>
        <h3 className="gl-facts-sub" id={id}>
          {title}
        </h3>
        {/*
          열 이름 글자는 눈에만 섭니다 — 칸마다 링크 이름이 열 이름을 싣습니다. 물음표는
          읽는 사람 모두의 것이라 숨기지 않습니다(이름 「컨텍스트(토큰) 설명」 + 설명문).
        */}
        {labels.map((l) => (
          <span key={l.label} className="gl-mlabel">
            <span aria-hidden="true">{l.label}</span>
            <Hint label={l.label} text={l.hint} />
          </span>
        ))}
      </div>
    </div>
  );
}

/** 벤더 낱말 → 화면 낱말. 표에 없는 낱말은 타입(`ModelRating`)이 막습니다. */
const REASONING_KO: Record<OpenAiReasoning, string> = {
  Average: '보통',
  High: '높음',
  Higher: '더 높음',
  Highest: '가장 높음',
};
const SPEED_KO: Record<OpenAiSpeed, string> = { Medium: '보통', Fast: '빠름', 'Very fast': '매우 빠름' };
const LATENCY_KO: Record<AnthropicLatency, string> = {
  Slower: '느림',
  Moderate: '보통',
  Fast: '빠름',
  Fastest: '가장 빠름',
};
const LATENCY_LEVEL: Record<AnthropicLatency, number> = { Slower: 1, Moderate: 2, Fast: 3, Fastest: 4 };

/** 채운 점 `level`개와 빈 점으로 `of`칸. 눈에만 섭니다 — 낱말이 같은 뜻을 싣습니다. */
function Dots({ level, of }: { level: number; of: number }) {
  return (
    <span className="gl-dots" aria-hidden="true">
      {Array.from({ length: of }, (_, i) => (
        <i key={i} className={i < level ? 'is-on' : undefined} />
      ))}
    </span>
  );
}

/**
 * 회사가 매긴 성능 자리 한 줄(2026-09-29). 이름 아래, 쓰임 위에 섭니다 — 열을 하나 더
 * 세우면 이름 열이 또 좁아집니다(641~1023px에서 이미 한 번 밟았습니다).
 *
 * **등급이 실린 페이지로 가는 링크입니다**(수 칸처럼 점선 밑줄). Anthropic은 서열과 속도가
 * 다른 페이지라 둘을 따로 겁니다. 링크 이름은 「모델 이름 + **화면 글자 그대로** + 괄호 보충」
 * 꼴입니다(수 칸과 같은 꼴) — 화면 글자가 이름에 이어진 채 들어 있어야 음성 제어로 「성능」을
 * 말해 누를 수 있습니다(WCAG 2.5.3). 점은 눈에만 서므로 단계 수는 괄호가 싣습니다.
 */
function RatingLine({ model }: { model: ModelInfo }) {
  const r = model.rating;
  if (!r) return null;
  if (r.kind === 'scale') {
    const reasoning = REASONING_KO[r.reasoning.label];
    const speed = SPEED_KO[r.speed.label];
    return (
      <p className="gl-model-rate">
        <a
          className="gl-rate"
          href={r.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${model.name} 추론 ${reasoning} · 속도 ${speed} (공식 등급: 추론 5단계 중 ${r.reasoning.level}, 속도 5단계 중 ${r.speed.level})`}
        >
          <span className="gl-rate-part">
            <span className="gl-rate-name">추론</span>
            <Dots level={r.reasoning.level} of={5} />
            <span className="gl-rate-word">{reasoning}</span>
          </span>
          <span className="gl-rate-sep" aria-hidden="true">
            ·
          </span>
          <span className="gl-rate-part">
            <span className="gl-rate-name">속도</span>
            <Dots level={r.speed.level} of={5} />
            <span className="gl-rate-word">{speed}</span>
          </span>
        </a>
      </p>
    );
  }
  if (r.kind === 'order') {
    const speed = LATENCY_KO[r.speed];
    return (
      <p className="gl-model-rate">
        <a
          className="gl-rate"
          href={r.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${model.name} 성능 ${r.of}종 중 ${r.rank}위 (공식 서열)`}
        >
          <span className="gl-rate-part">
            <span className="gl-rate-name">성능</span>
            <span className="gl-rate-word">
              {r.of}종 중 {r.rank}위
            </span>
          </span>
        </a>
        <span className="gl-rate-sep" aria-hidden="true">
          ·
        </span>
        <a
          className="gl-rate"
          href={r.speedUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`${model.name} 속도 ${speed} (공식 속도: 4단계 중 ${LATENCY_LEVEL[r.speed]})`}
        >
          <span className="gl-rate-part">
            <span className="gl-rate-name">속도</span>
            <Dots level={LATENCY_LEVEL[r.speed]} of={4} />
            <span className="gl-rate-word">{speed}</span>
          </span>
        </a>
      </p>
    );
  }
  return (
    <p className="gl-model-rate">
      <a
        className="gl-rate"
        href={r.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`${model.name} 「${r.text}」 (공식 소개)`}
      >
        <span className="gl-rate-word">「{r.text}」</span>
      </a>
    </p>
  );
}

/**
 * 고를 수 있는 모델 — **제품색이 옅게 밴 바탕 위에 모델마다 칸 하나**(2026-09-29, 방향 넷 중
 * C 「체크리스트」의 모양). 칸마다 마크 판 · 이름 · 쓰임 · 수가 한 줄에 섭니다. 줄기에 매달던
 * 모양(타임라인)에서 「고를 수 있는 모델도 C로」 바꿨습니다 — 모델은 시간의 차례가 아니라
 * 나란히 견주는 목록이라 줄기보다 칸이 맞습니다.
 *
 * **절 머리는 요금 절과 같은 마디 + 띠입니다**(같은 날, 「타이틀을 요금쪽과 폼을 맞추자」).
 * 처음에는 바탕 안에 작은 아이콘 타일과 제목을 뒀는데, 바로 아래 요금 절은 마디 + 띠라 한 탭
 * 안에서 절 이름이 두 모양으로 섰습니다. 띠가 열 이름(컨텍스트 · 입력 단가 · 출력 단가)을
 * 겸하고, 바탕은 요금 판처럼 줄기 오른쪽 글 자리에서 시작합니다.
 *
 * **열은 그 제품의 데이터가 세웁니다.** 한 줄도 주장이 없는 열은 아예 안 섭니다
 * (Gemini 앱은 이름·쓰임만 섭니다). 한 줄만 비면 열은 세우고 칸만 비웁니다.
 *
 * **나이는 하나면 캡션에, 여럿이면 줄마다**(`ageLayout`).
 */
function ModelChecklist({
  product,
  models,
  contextOf,
  priceOf,
  today,
}: {
  product: Product;
  models: ModelInfo[];
  contextOf: Map<string, Claim>;
  priceOf: Map<string, Claim>;
  today: string;
}) {
  const hasContext = models.some((m) => contextOf.has(m.id));
  const hasPrice = models.some((m) => priceOf.has(m.id));
  const hasRating = models.some((m) => m.rating);
  const rows = models.map((model) => {
    const ctx = valueCell(contextOf.get(model.id), today);
    const priceClaim = priceOf.get(model.id);
    const price = valueCell(priceClaim, today);
    const split = price.kind === 'value' ? splitPrice(price.value) : null;
    return { model, ctx, price, priceClaim, split };
  });
  const ages = ageLayout(rows.map((r) => [r.ctx, r.price]));
  /* 절 머리 띠와 칸이 같은 격자를 씁니다 — 열 이름이 칸의 수와 한 세로줄에 섭니다. */
  const cols = `gl-mcols${hasContext ? ' has-ctx' : ''}${hasPrice ? ' has-price' : ''}`;
  const labels: ModelColumn[] = [
    ...(hasContext ? [MODEL_COLUMNS.context] : []),
    ...(hasPrice ? [MODEL_COLUMNS.input, MODEL_COLUMNS.output] : []),
  ];

  return (
    <section className="gl-ref" aria-labelledby="models-title">
      <div className="gl-tl">
        <div className="gl-stop is-reached">
          <RefHead
            icon={Cpu}
            id="models-title"
            title="고를 수 있는 모델"
            labels={labels}
            cols={cols}
          />
          <div className="gl-tray">
            <ul className="gl-rows">
              {rows.map(({ model, ctx, price, priceClaim, split }, i) => {
                const rowAge = ages.perRow[i];
                return (
                  <li key={model.id} className={`gl-model ${cols}`}>
                    <ModelPlate model={model} />
                    <div className="gl-model-main">
                      {/*
                        **이름이 링크입니다.** 가는 곳은 쓰임 문장이 실린 페이지이고, 쓰임이 없는
                        모델은 이름을 본 페이지입니다 — 어느 쪽이든 그 줄에 적힌 것을 떠받칩니다.
                        이름·회사·꼬리표 사이에는 **진짜 공백**을 둡니다(복사·낭독에서 안 붙게).
                      */}
                      <p className="gl-model-name">
                        <a
                          className="gl-model-link"
                          href={model.useWhen?.url ?? model.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {model.name}
                          <ArrowUpRight size={13} aria-hidden="true" />
                        </a>
                        {model.vendorId !== product.vendorId && (
                          <>
                            {' '}
                            <span className="gl-model-vendor">
                              {guideVendorById(model.vendorId)?.name}
                            </span>
                          </>
                        )}
                        {model.current === false && (
                          <>
                            {' '}
                            <span className="gl-tag">이전 세대</span>
                          </>
                        )}
                      </p>
                      <RatingLine model={model} />
                      {model.useWhen && <p className="gl-model-use">{model.useWhen.text}</p>}
                      {(split?.rider || rowAge !== null) && (
                        <p className="gl-model-meta">
                          {split?.rider}
                          {split?.rider && rowAge !== null && ' · '}
                          {rowAge !== null && ageText(rowAge)}
                        </p>
                      )}
                    </div>
                    {labels.length > 0 && (
                      /*
                        넓은 화면에서는 칸들이 줄 격자의 열로 풀리고(`display: contents`),
                        좁은 화면에서는 이름 아래 세 칸이 됩니다.
                      */
                      <div className="gl-mspec">
                        {hasContext && (
                          <Cell
                            cell={ctx}
                            url={contextOf.get(model.id)?.source.url ?? ''}
                            label={MODEL_COLUMNS.context.label}
                            modelName={model.name}
                            text={ctx.kind === 'value' ? contextLabel(ctx.value) : undefined}
                            className="gl-num-cell"
                          />
                        )}
                        {hasPrice &&
                          (priceClaim && split && split.output ? (
                            <>
                              <Cell
                                cell={price}
                                url={priceClaim.source.url}
                                label={MODEL_COLUMNS.input.label}
                                modelName={model.name}
                                text={split.input}
                                className="gl-num-cell"
                              />
                              <Cell
                                cell={price}
                                url={priceClaim.source.url}
                                label={MODEL_COLUMNS.output.label}
                                modelName={model.name}
                                text={split.output}
                                className="gl-num-cell"
                              />
                            </>
                          ) : (
                            /* 값이 안 서거나 꼴이 안 맞으면 두 열을 함께 씁니다 — 값이 안 사라집니다. */
                            <Cell
                              cell={price}
                              url={priceClaim?.source.url ?? ''}
                              label="단가"
                              modelName={model.name}
                              text={split?.input}
                              className="gl-num-cell is-span"
                            />
                          ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      {(hasRating || hasPrice || ages.caption !== null) && (
        <p className="gl-caption">
          {[
            hasRating && '등급은 각 회사가 제 모델에 매긴 것이라 회사끼리는 못 견준다',
            hasPrice && '단가는 100만 토큰당 달러',
            ages.caption !== null && ageText(ages.caption),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </section>
  );
}

/* ── 요금 ───────────────────────────────────────────────────────── */

/** 요금 카드 안의 두 칸. 그 요금제에 그 칸의 주장이 있을 때만 섭니다(ChatGPT Pro에는 사용량이 없습니다). */
const PLAN_FACETS: Array<{ facet: PlanFacet; label: string }> = [
  { facet: 'fee', label: '월 구독료' },
  { facet: 'usage', label: '사용량' },
];

/**
 * 구독료를 **수와 꼬리**로 가릅니다 — 「월 $99.99부터」 → 「$99.99」 + 「부터」. 칸 이름이
 * 「월 구독료」라 「월 」은 뗍니다. 수는 크게 모노로, 한글 꼬리는 작게 본문 글꼴로 섭니다
 * (한글에 모노를 안 씁니다). 꼴이 안 맞으면 통째로 수 자리에 섭니다.
 */
function splitFee(value: string): { amount: string; rest: string } {
  const bare = value.replace(/^월 /, '');
  const m = /^(\$[\d.,]+)(.*)$/.exec(bare);
  return m ? { amount: m[1], rest: m[2] } : { amount: bare, rest: '' };
}

/**
 * 요금 카드의 값 한 칸. **값은 글자이고, 상태 낱말만 출처로 가는 링크입니다** — 「확인 전」의
 * 다음 할 일이 그 페이지를 열어 보는 것이라 길이 칸에 있어야 합니다. 확인된 값의 출처는
 * 카드 아래 캡션이 한 번 말합니다.
 *
 * `gl-plan` 토큰은 **주장이 든 칸에만** 답니다 — 프리렌더 검사가 그 수를 요금 주장 수와
 * 견줍니다.
 */
function PlanValue({ claim, today, big }: { claim: Claim; today: string; big?: boolean }) {
  const cell = valueCell(claim, today);
  const note = claim.planCell?.note;
  if (cell.kind === 'note') {
    return (
      <div className={`gl-plan${big ? ' is-fee' : ''}`}>
        <a
          className={big ? 'gl-pc-empty' : 'gl-state'}
          href={claim.source.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${claim.statement} ${cell.text}`}
        >
          <span>{cell.text}</span>
          {big && <ArrowUpRight size={14} aria-hidden="true" />}
        </a>
        {note && <span className="gl-pc-note">{note}</span>}
      </div>
    );
  }
  if (cell.kind !== 'value') return null;
  if (big) {
    const { amount, rest } = splitFee(cell.value);
    return (
      <div className="gl-plan is-fee">
        <span className={`gl-pc-fee${cell.soft ? ' is-soft' : ''}`}>
          <span className="gl-pc-amount">{amount}</span>
          {rest && <span className="gl-pc-rest">{rest}</span>}
        </span>
        {note && <span className="gl-pc-note">{note}</span>}
      </div>
    );
  }
  return (
    <div className="gl-plan">
      <p className={`gl-pc-usage${cell.soft ? ' is-soft' : ''}`}>{cell.value}</p>
      {note && <span className="gl-pc-note">{note}</span>}
    </div>
  );
}

/**
 * 요금제와 사용 한도 — **요금제마다 카드 하나**(2026-09-28). 요금 페이지처럼 큰 가격이 먼저
 * 읽히고, 요금제끼리 나란히 서서 견줍니다. 타임라인 원장에서 여기만 카드인 것은 사용자가
 * 고른 조합입니다(「A로 하고 요금제와 사용 한도는 B」).
 *
 * - **카드의 차례는 요금제가 데이터에 처음 나온 차례입니다** — 싼 요금제를 앞에 적습니다.
 * - **구독료 칸은 값이 있든 없든 같은 높이입니다.** 「확인 전」은 점선 틀로 그 자리를
 *   채워, 옆 카드의 큰 가격과 줄이 맞습니다.
 * - **요금제를 안 가리는 값은 넓은 카드 하나로 섭니다**(`planCell`이 없는 주장). 이름은
 *   `statement` 그대로입니다 — 「Gemini 앱 사용 한도 초기화 기준」은 Antigravity 화면에도
 *   서므로 줄이면 그 제품의 한도처럼 읽힙니다.
 * - **나이는 모델과 같은 규칙입니다**(`ageLayout`) — 하나면 캡션에, 여럿이면 카드마다.
 */
function PlanCards({ claims, today }: { claims: Claim[]; today: string }) {
  const inCards = claims.filter((c) => c.planCell);
  const common = claims.filter((c) => !c.planCell);
  const plans = [...new Set(inCards.map((c) => c.planCell!.plan))];
  const cellOf = (plan: string, facet: PlanFacet) =>
    inCards.find((c) => c.planCell!.plan === plan && c.planCell!.facet === facet);

  const ages = ageLayout([
    ...plans.map((plan) => PLAN_FACETS.map(({ facet }) => valueCell(cellOf(plan, facet), today))),
    ...common.map((c) => [valueCell(c, today)]),
  ]);
  const sources = [...new Map(claims.map((c) => [c.source.url, c.source])).values()];

  return (
    <section className="gl-ref" aria-labelledby="plans-title">
      {/* 카드는 줄기에 안 매달립니다 — 절 머리 마디에서 줄기가 끝납니다. */}
      <div className="gl-tl">
        <div className="gl-stop is-reached">
          <RefHead icon={CreditCard} id="plans-title" title="요금제와 사용 한도" />
          <div className="gl-board">
            <ul className="gl-pcs">
              {plans.map((plan, i) => (
                <li key={plan} className="gl-pc">
                  <h4 className="gl-pc-name">{plan}</h4>
                  {PLAN_FACETS.map(({ facet, label }) => {
                    const claim = cellOf(plan, facet);
                    return claim ? (
                      <div key={facet} className={`gl-pc-row is-${facet}`}>
                        <span className="gl-pc-label">{label}</span>
                        <PlanValue claim={claim} today={today} big={facet === 'fee'} />
                      </div>
                    ) : null;
                  })}
                  {ages.perRow[i] !== null && (
                    <p className="gl-pc-age">{ageText(ages.perRow[i]!)}</p>
                  )}
                </li>
              ))}
              {common.map((claim, i) => {
                const age = ages.perRow[plans.length + i];
                return (
                  <li key={claim.id} className="gl-pc is-wide">
                    {/* 요금제 카드와 같은 층(h4)에 섭니다 — 마지막 요금제 밑에 딸린 것처럼 읽히지 않게. */}
                    <h4 className="gl-pc-label">
                      <Clock size={13} aria-hidden="true" />
                      {claim.statement}
                      {age !== null && ` · ${ageText(age)}`}
                    </h4>
                    <PlanValue claim={claim} today={today} />
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      <p className="gl-caption">
        {sources.map((source, i) => (
          <Fragment key={source.url}>
            {i > 0 && ' · '}
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label}
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          </Fragment>
        ))}
        {ages.caption !== null && <> · {ageText(ages.caption)}</>}
      </p>
    </section>
  );
}

/* ── 머리 ───────────────────────────────────────────────────────── */

/** 참고 탭의 이름. 안에 든 것을 그대로 이름으로 씁니다. */
function factsTitle(hasModels: boolean, hasPlans: boolean): string | null {
  if (hasModels && hasPlans) return '모델과 요금';
  if (hasModels) return '고를 수 있는 모델';
  if (hasPlans) return '요금제와 사용 한도';
  return null;
}

/**
 * 제품 머리 — **제품색이 옅게 밴 카드**(2026-09-28). 왼쪽 위에서 번지는 제품색, 오른쪽
 * 아래에 크게 흐린 제품 마크, 제품색 타일 위의 마크가 이 화면이 어느 제품의 것인지를
 * 먼저 말합니다. 쓸 수 있는 곳은 칩으로, 공식 사이트는 제품색 알약 단추로 섭니다.
 *
 * 제품 이름은 `h2`입니다 — 페이지의 `h1`은 서랍 배너의 「AI 가이드」입니다. 회사 이름은
 * 옆 레일의 머리글이 말하므로 여기 안 적습니다. 제품을 바꾼 뒤 포커스를 받는 자리라
 * `tabIndex={-1}`입니다(`PlaybookPage`).
 *
 * **여러 색이 든 마크(Gemini·Antigravity)는 타일을 채우지 않습니다** — 제품색 판 위에 네 색
 * 마크를 올리면 색끼리 부딪힙니다. 그때 타일은 배경색 판에 제품색 테두리입니다.
 */
function GuideHead({ product }: { product: Product }) {
  return (
    <header className="gl-head">
      <GuideMark
        logo={product.logo}
        monochrome={product.monochrome}
        accent="var(--guide-accent)"
        className="gl-head-ghost"
      />
      <h2 className="gl-title" tabIndex={-1}>
        <span className={`gl-tile${product.monochrome ? '' : ' is-plain'}`} aria-hidden="true">
          {/* 타일 위 마크의 색은 CSS가 회사마다 정합니다(`--gl-tile-ink`, 다크의 Claude는 흰색). */}
          <GuideMark
            logo={product.logo}
            monochrome={product.monochrome}
            accent="var(--gl-tile-ink)"
            className="gl-mark"
          />
        </span>
        <span>{product.name}</span>
      </h2>
      <p className="gl-dek">{product.oneLine}</p>

      {product.surfaces.length > 0 && (
        <dl className="gl-facts">
          <dt>쓸 수 있는 곳</dt>
          {product.surfaces.map((s) => (
            <dd key={s}>{s}</dd>
          ))}
        </dl>
      )}

      <div className="gl-head-links">
        <a
          className="gl-head-link is-primary"
          href={product.officialUrl}
          target="_blank"
          rel="noreferrer"
        >
          공식 사이트
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
        {product.docsUrl && product.docsLabel && (
          <a className="gl-head-link" href={product.docsUrl} target="_blank" rel="noreferrer">
            {product.docsLabel}
            <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        )}
      </div>
    </header>
  );
}

/* ── 다른 제품 ──────────────────────────────────────────────────── */

const ROLE_NOUN: Record<Role, string> = { 챗: '채팅 앱', 업무: '업무 도구', 코딩: '코딩 도구' };

/**
 * 같은 갈래의 다른 회사 제품. **1024px 아래에서만 보입니다.** 데스크톱에서는 바로 옆
 * 레일이 같은 목록을 보여 주므로 두 번 말하지 않고, 레일이 위로 올라간 좁은 화면에서는
 * 긴 글을 다 읽은 뒤 레일까지 되감지 않고 옆 제품으로 가는 길이 됩니다.
 * 프리렌더 HTML에는 늘 실립니다.
 */
function PeersSection({ product }: { product: Product }) {
  const peers = guideProducts.filter((p) => p.role === product.role && p.id !== product.id);
  if (peers.length === 0) return null;
  return (
    <section className="gl-read gl-peers-sect" id="peers" aria-labelledby="peers-title">
      <div className="gl-read-head">
        <h2 id="peers-title">다른 {ROLE_NOUN[product.role]}</h2>
      </div>
      <ul className="gl-peers">
        {peers.map((peer) => (
          <li key={peer.id}>
            <GuideMark
              logo={peer.logo}
              monochrome={peer.monochrome}
              accent={peer.accent}
              className="gl-mark"
            />
            <div>
              <p className="gl-peer-name">
                <Link className="card-trigger" to={`/playbook/${peer.vendorId}/${peer.id}`}>
                  {peer.name}
                </Link>{' '}
                <span className="gl-peer-vendor">{guideVendorById(peer.vendorId)?.name}</span>
              </p>
              <p className="gl-peer-dek">{peer.oneLine}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 줄기의 움직임 ──────────────────────────────────────────────── */

/** 붙박이 nav 높이. 탭 줄이 여기에 붙어 따라옵니다(`.section-tabs`와 같은 값). */
const STICKY_TOP = 71;

/**
 * **줄기가 읽는 자리까지 찹니다.** 읽는 선은 화면 높이의 45%(탭 줄 아래 120px보다 위로는
 * 안 올라갑니다)이고, 줄기는 그 선까지 차오르며 지나친 마디와 가지를 켭니다.
 *
 * - 맨 위에서도 첫 마디까지는 늘 차 있습니다 — 첫 화면에서 줄기가 비지 않게.
 * - 바닥에 닿으면 끝까지 찹니다 — 마지막 순간은 읽는 선까지 못 올라옵니다.
 * - 지금 순간(`is-current`)은 줄기가 마지막으로 닿은 마디입니다.
 * - 순간 머리가 탭 줄 아래에 붙으면 `is-stuck`이 붙어 그 아래를 짧게 흐립니다.
 *
 * 클래스를 DOM에 직접 겁니다 — 스크롤마다 React를 다시 그리지 않으려는 것입니다. React는
 * `className`을 이전 렌더와 견주므로 여기서 건 클래스를 되돌리지 않습니다. 탭 줄 높이도
 * 재서 `--gl-tabs-h`로 넘깁니다(순간 머리가 붙는 자리).
 *
 * **문서의 `scroll-padding-top`을 붙박이 층 높이로 둡니다**(nav + 탭 줄 + 순간 머리). 키보드로
 * 링크를 옮겨 다닐 때 브라우저가 포커스를 그 층 아래로 끌어내리게 하려는 것입니다 — 안 그러면
 * 포커스가 붙박이 층 밑에 숨습니다. 원장이 사라지면 되돌립니다.
 */
function useTimeline(root: RefObject<HTMLElement | null>, active: string | undefined) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const bar = el.querySelector<HTMLElement>('.gl-tabs');
      const barH = bar?.offsetHeight ?? 0;
      el.style.setProperty('--gl-tabs-h', `${barH}px`);
      const top = STICKY_TOP + barH;
      const panel = el.querySelector<HTMLElement>('.gl-panel:not([hidden])');
      if (!panel) return;
      /* 열린 탭의 순간 머리로 잽니다 — 숨은 탭의 머리는 높이가 0입니다. */
      const headH = panel.querySelector<HTMLElement>('.gl-stop-head')?.offsetHeight ?? 0;
      document.documentElement.style.scrollPaddingTop = `${top + headH + 8}px`;

      panel.querySelectorAll<HTMLElement>('.gl-stop').forEach((stop) => {
        const head = stop.querySelector<HTMLElement>('.gl-stop-head');
        if (!head) return;
        const headTop = head.getBoundingClientRect().top;
        stop.classList.toggle(
          'is-stuck',
          headTop <= top + 0.5 && stop.getBoundingClientRect().top < top - 1,
        );
      });

      const tl = panel.querySelector<HTMLElement>('.gl-tl[data-live]');
      if (!tl) return;
      const box = tl.getBoundingClientRect();
      const track = tl.querySelector<HTMLElement>('.gl-tl-track');
      const fill = tl.querySelector<HTMLElement>('.gl-tl-fill');
      const stops = [...tl.querySelectorAll<HTMLElement>('.gl-stop')];
      if (!track || !fill || stops.length === 0) return;
      const trackTop = track.offsetTop;
      const trackBottom = trackTop + track.offsetHeight;
      const nodeY = (s: HTMLElement) =>
        s.getBoundingClientRect().top -
        box.top +
        (s.querySelector<HTMLElement>('.gl-stop-head')?.offsetHeight ?? 0) / 2;

      const line = Math.max(window.innerHeight * 0.45, top + 120);
      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      let to = Math.max(line - box.top, nodeY(stops[0]));
      if (atBottom) to = trackBottom;
      to = Math.min(to, trackBottom);
      fill.style.height = `${Math.max(0, to - trackTop)}px`;
      tl.classList.toggle('is-done', to >= trackBottom - 1);
      /* 첫 측정은 전환 없이 — 그 뒤부터 줄기가 자라는 전환을 겁니다. */
      if (!tl.classList.contains('is-ready')) {
        requestAnimationFrame(() => tl.classList.add('is-ready'));
      }

      let current = stops[0];
      for (const stop of stops) {
        const reached = nodeY(stop) <= to + 1;
        stop.classList.toggle('is-reached', reached);
        if (reached) current = stop;
        stop.querySelectorAll<HTMLElement>('.gl-tip').forEach((tip) => {
          tip.classList.toggle('is-reached', tip.getBoundingClientRect().top - box.top + 25 <= to);
        });
      }
      for (const stop of stops) stop.classList.toggle('is-current', stop === current);
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    void document.fonts?.ready.then(schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
      document.documentElement.style.scrollPaddingTop = '';
    };
  }, [root, active]);
}

/* ── 원장 ───────────────────────────────────────────────────────── */

export type GuideTab = 'save' | 'well' | 'facts';

/**
 * **원장에는 늘 제품이 옵니다**(2026-09-28). `/playbook`과 기업 주소는 `PlaybookPage`가 제품
 * 하나로 풀어서 넘깁니다.
 *
 * **머리 아래는 탭입니다** — 사용량 절감 · 품질 향상 · 모델과 요금. 셋을 한 글로 이어 두니
 * 모델 표를 보려면 팁 열셋을 지나야 했습니다. 탭은 **세 칸 세그먼트**이고 고른 칸이
 * 제품색으로 채워집니다(칸마다 아이콘과 수).
 *
 * - **모든 탭의 내용이 HTML에 실립니다.** 안 고른 탭은 `hidden`일 뿐이라 프리렌더와
 *   검색에는 전부 들어갑니다. 첫 탭이 기본이라 서버와 클라이언트의 첫 그림이 같습니다.
 * - **고른 탭은 제품을 바꿔도 남습니다**(`PlaybookPage`가 들고 있습니다). 새 제품에 그
 *   탭이 없으면(Claude에는 사용량 절감이 없습니다) 첫 탭이 섭니다.
 * - **탭 줄은 머리 아래에 붙어 따라오고, 불투명합니다** — 밑으로 들어간 마디가 비치면
 *   줄기가 두 벌로 보입니다. 긴 탭을 읽다가 옆 탭으로 바꾸면 새 탭의 첫머리로 옮깁니다.
 */
export function GuideLedger({
  product,
  today,
  tab,
  onTab,
}: {
  product: Product;
  today: string;
  /** 고른 탭. 이 제품에 없거나 아직 안 골랐으면 첫 탭이 섭니다. */
  tab: GuideTab | null;
  onTab: (tab: GuideTab) => void;
}) {
  /* 제품 자신 + 그 회사 + 이 제품이 돌리는 모델의 값. */
  const claims = claimsForProduct(product.id);
  const tips = claims.filter((c) => c.topic === 'habit');
  /* 컨텍스트 창과 모델 단가는 모델 줄이 값으로 보여 주므로 요금에서 뺍니다. */
  const plans = claims.filter(isPlanClaim);
  const contextOf = new Map(
    claims.filter((c) => c.topic === 'context').map((c) => [c.subject.id, c]),
  );
  const priceOf = new Map(
    claims
      .filter((c) => c.topic === 'price' && c.subject.kind === 'model')
      .map((c) => [c.subject.id, c]),
  );
  /* 거기서 고를 만한 최신만. 회사별로 보므로 최신이 없는 회사 것은 그대로 섭니다. */
  const models = shownModels(product.models);
  const facts = factsTitle(models.length > 0, plans.length > 0);

  /* 빈 탭은 안 세웁니다 — 팁이 없는 축, 모델도 요금도 없는 참고 탭. */
  const tipTabs = READ_AIMS.map(({ aim, title, icon }) => {
    const groups = groupTips(
      aim,
      tips.filter((c) => c.aim === aim),
    );
    const count = groups.reduce((n, g) => n + g.rows.length, 0);
    return {
      id: aim as GuideTab,
      label: title,
      icon,
      count,
      body: <TipTimeline aim={aim} groups={groups} />,
    };
  }).filter((t) => t.count > 0);
  const tabs: Array<{
    id: GuideTab;
    label: string;
    icon: LucideIcon;
    count?: number;
    body: ReactNode;
  }> = [
    ...tipTabs,
    ...(facts
      ? [
          {
            id: 'facts' as const,
            label: facts,
            icon: Tag,
            body: (
              <>
                {models.length > 0 && (
                  <ModelChecklist
                    product={product}
                    models={models}
                    contextOf={contextOf}
                    priceOf={priceOf}
                    today={today}
                  />
                )}
                {plans.length > 0 && <PlanCards claims={plans} today={today} />}
              </>
            ),
          },
        ]
      : []),
  ];
  const active = tabs.some((t) => t.id === tab) ? tab! : tabs[0]?.id;

  const ledgerRef = useRef<HTMLElement>(null);
  useTimeline(ledgerRef, active);

  /*
    탭 줄이 붙어 있을 때(원래 자리보다 아래를 읽는 중) 탭을 바꾸면 새 탭의 첫머리로
    옮깁니다. 원래 자리는 탭 줄 바로 위의 표지(`gl-tabs-anchor`)가 압니다.
  */
  const anchorRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef(false);
  useLayoutEffect(() => {
    if (!pendingScroll.current || !anchorRef.current) return;
    pendingScroll.current = false;
    const top = anchorRef.current.getBoundingClientRect().top;
    window.scrollTo({ top: window.scrollY + top - STICKY_TOP, behavior: 'instant' });
  }, [active]);

  const select = (id: GuideTab) => {
    if (id === active) return;
    pendingScroll.current = (anchorRef.current?.getBoundingClientRect().top ?? 0) < STICKY_TOP;
    onTab(id);
  };

  /* 탭 사이는 화살표·Home·End로 옮깁니다(WAI-ARIA 탭 패턴). Tab 키는 고른 탭 하나에만 멎습니다. */
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const i = tabs.findIndex((t) => t.id === active);
    const next =
      event.key === 'ArrowRight'
        ? tabs[(i + 1) % tabs.length]
        : event.key === 'ArrowLeft'
          ? tabs[(i - 1 + tabs.length) % tabs.length]
          : event.key === 'Home'
            ? tabs[0]
            : event.key === 'End'
              ? tabs[tabs.length - 1]
              : null;
    if (!next) return;
    event.preventDefault();
    select(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <article
      className="gl-ledger"
      ref={ledgerRef}
      data-vendor={product.vendorId}
      style={{ '--guide-accent': product.accent } as CSSProperties}
    >
      <GuideHead product={product} />

      {tabs.length > 0 && (
        <>
          <div className="gl-tabs-anchor" ref={anchorRef} />
          <div className="gl-tabs">
            <div
              className="gl-tabs-seg"
              role="tablist"
              aria-label={`${product.name} 가이드`}
              style={{ '--gl-tab-n': tabs.length } as CSSProperties}
            >
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    id={`tab-${t.id}`}
                    aria-controls={`panel-${t.id}`}
                    aria-selected={t.id === active}
                    tabIndex={t.id === active ? 0 : -1}
                    className={`gl-tab${t.id === active ? ' is-on' : ''}`}
                    onClick={() => select(t.id)}
                    onKeyDown={onKeyDown}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span className="gl-tab-label">{t.label}</span>
                    {t.count !== undefined && <span className="gl-tab-count">{t.count}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {tabs.map((t) => (
            <section
              key={t.id}
              className="gl-panel"
              role="tabpanel"
              /* 탭에서 Tab을 누르면 탭 내용으로 옵니다(WAI-ARIA 탭 패턴). */
              tabIndex={0}
              id={`panel-${t.id}`}
              aria-labelledby={`tab-${t.id}`}
              hidden={t.id !== active}
            >
              {t.body}
            </section>
          ))}
        </>
      )}

      <PeersSection product={product} />
    </article>
  );
}
