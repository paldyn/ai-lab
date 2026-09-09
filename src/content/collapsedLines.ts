/**
 * 한 문단 안에서 줄바꿈이 사라지는 자리를 찾습니다.
 *
 * 마크다운은 문단 안의 홑 줄바꿈을 **공백 하나로 만듭니다.** 그래서 나란히 놓으려고
 * 줄을 나눠 적은 것이 화면에서는 한 줄로 이어 붙습니다.
 *
 * ```md
 * **기존 AI**: 개발자가 규칙을 만든다 → 규칙으로 예측한다
 * **ML**: 데이터를 넣는다 → 알고리즘이 규칙을 찾는다
 * ```
 *
 * 위는 화면에 「기존 AI: … 예측한다 ML: 데이터를 …」 한 줄로 나갑니다.
 * 원고에서는 두 줄로 보이므로 **눈으로는 잡히지 않습니다** — 렌더된 화면을 봐야
 * 보입니다. 2026-09-09에 글 466편에서 다섯 자리를 찾았습니다.
 *
 * 고치는 법은 둘입니다. **나열이면 목록으로 바꾸고**(`- ` 또는 `1. `), 문단 안에
 * 두어야 하면 앞 줄 끝에 **역슬래시**를 붙입니다 — 시험 노트의 객관식 보기가 쓰는
 * 그 방식입니다. 줄 끝 공백 두 개도 같은 일을 하지만 눈에 안 보여 편집기가 지웁니다.
 */

const FENCE = /^\s*```/;
const MATH = /^\s*\$\$\s*$/;
/** 문단을 끊는 줄 — 표·인용·헤딩·이미지는 그 자체로 한 줄이 됩니다. */
const BLOCK = /^\s*(#{1,6} |\||>|<|!\[)/;
/**
 * 목록 항목의 머리. 문단을 끊지만 **그 자리에서 새 문단이 시작합니다** — 다음 줄이
 * 들여쓰여 이어지면 같은 항목 안의 한 문단이라 줄바꿈이 똑같이 사라집니다.
 */
const ITEM = /^\s*([-*+] |\d+[.)] )/;
/**
 * `**라벨**:` 로 시작하는 줄. 나란히 놓으려고 나눈 줄의 가장 흔한 꼴입니다.
 * 콜론이 강조 안에 든 `**라벨:**` 도 같은 자리라 함께 봅니다.
 */
const LABEL = /^\*\*[^*\n]{1,30}(\*\*\s*[:：]|[:：]\*\*)\s*\S/;
/**
 * `① 수식` 처럼 동그라미 번호 **뒤에 공백이 오는** 줄. 조사가 바로 붙는
 * `①은`·`④는`은 풀이를 가리키는 보통 문장이라 뺍니다.
 */
const CIRCLED = /^[①-⑳]\s/;

/** 앞 줄이 하드 브레이크로 끝나면 줄바꿈이 그대로 삽니다. */
const hardBreak = (line: string) => line.endsWith('\\') || line.endsWith('  ');

export type CollapsedLine = { line: number; prev: string; text: string };

export function collapsedLines(source: string): CollapsedLine[] {
  const lines = source.split('\n');
  const found: CollapsedLine[] = [];
  let inFence = false;
  let inMath = false;
  let paragraph = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (FENCE.test(line)) {
      inFence = !inFence;
      paragraph = false;
      continue;
    }
    if (inFence) continue;
    if (MATH.test(line)) {
      inMath = !inMath;
      paragraph = false;
      continue;
    }
    if (inMath) continue;
    if (line.trim() === '' || BLOCK.test(line)) {
      paragraph = false;
      continue;
    }
    if (ITEM.test(line)) {
      paragraph = true;
      continue;
    }

    const text = line.trim();
    if (paragraph && (LABEL.test(text) || CIRCLED.test(text)) && !hardBreak(lines[i - 1])) {
      found.push({ line: i + 1, prev: lines[i - 1].trim(), text });
    }
    paragraph = true;
  }

  return found;
}
