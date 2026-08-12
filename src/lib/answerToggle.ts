/**
 * 연습 문제의 답은 **「답」 칩을 눌러야만** 펼쳐집니다.
 *
 * `<details>`는 `<summary>` 어디를 눌러도 열립니다. 그런데 여기서 summary는 문제
 * 한 줄 전체라, 문제를 읽다가 글자를 짚기만 해도 답이 튀어나왔습니다. 답을 감춰
 * 둔 이유가 사라집니다.
 *
 * 그래서 칩 밖에서 온 클릭은 기본 동작을 막습니다.
 *
 * **CSS로 하지 않았습니다.** `summary { pointer-events: none }`으로 막으면 칩만
 * 남길 수는 있지만, 그 줄의 글자를 마우스로 끌어 잡을 수 없게 됩니다. 문제 줄에는
 * 수식이 들어 있어 그대로 복사해 가는 일이 잦습니다.
 *
 * 키보드는 건드리지 않습니다. summary에 포커스를 두고 Enter나 Space를 누르면
 * 클릭 이벤트가 하나 오는데, 그때는 `detail`이 0입니다(마우스 클릭은 1 이상).
 * 그 값으로 갈라 키보드로 여는 길은 그대로 열어 둡니다.
 *
 * 스크립트가 아직 안 붙었을 때는 예전처럼 줄 전체가 눌립니다 — 최악이 '너무 잘
 * 열린다'라서 이대로 둡니다.
 */
/** 본문에 붙는 표시. 이것이 있을 때만 일괄 단추가 보입니다. */
const ALL_ATTR = 'data-answer-all';

/**
 * **한 번 펼친 답은 다시 누르기 전까지 접히지 않습니다.**
 *
 * 본문은 React가 `innerHTML`로 쥐고 있어서 다시 그릴 때마다 `<details>`가 통째로
 * 새 노드로 갈립니다. 새 노드는 닫힌 채로 오므로, 펼쳐 둔 답이 읽는 도중에 저 혼자
 * 접혔습니다. 노드에 얹어 둔 것은 그 순간 전부 사라지므로 **펼친 자리를 본문 밖에**
 * 적어 두고, 본문이 갈릴 때마다 그대로 되돌립니다.
 *
 * 무엇을 되돌릴지는 **사용자가 누른 것만** 셉니다(`intent`). 스스로 닫힌 것은
 * 되돌릴 대상이고, 눌러서 닫은 것은 닫힌 채로 두어야 하니 둘을 갈라야 합니다.
 * 가르는 기준은 **직전에 진짜 입력이 있었는가**입니다 — 포인터나 키를 누른 지
 * 얼마 안 돼 닫혔으면 사람이 닫은 것이고, 아니면 우리가 모르는 무언가가 닫은 것입니다.
 *
 * 자리는 본문 안 `details.answer`의 **차례**로 잡습니다. 본문 HTML은 원고에서
 * 결정적으로 만들어지므로 다시 그려도 차례가 같습니다.
 */
const intents = new Map<string, Set<number>>();

/** 사람이 누른 직후로 치는 시간. 이 안에 닫히면 사람이 닫은 것으로 봅니다. */
const GESTURE_MS = 700;

const answersIn = (root: HTMLElement) => [
  ...root.querySelectorAll<HTMLDetailsElement>('details.answer'),
];

/**
 * 연습 묶음마다 **답을 한꺼번에 여닫는 단추**가 있습니다.
 *
 * 문제가 열 개면 답을 다 보려고 열 번 눌러야 했습니다. 채점할 때는 그게 전부라
 * 묶음 위에 단추를 하나 둡니다. 하나라도 닫혀 있으면 전부 펼치고, 다 펼쳐져
 * 있으면 전부 접습니다.
 *
 * 단추 자체는 본문 HTML에 **빈 채로** 들어 있습니다(plugins/markdown.ts).
 * 무엇이라 적을지는 CSS가 `:has()`로 정하고, 누르는 동작은 이 위임 클릭이 받습니다 —
 * JS로 단추를 만들어 끼웠더니 82ms에 붙었다가 다시 그리기와 함께 사라졌습니다.
 */
function toggleAll(button: Element): void {
  const list = button.nextElementSibling;
  const answers = [...(list?.querySelectorAll<HTMLDetailsElement>('details.answer') ?? [])];
  if (answers.length === 0) return;

  // 하나라도 닫혀 있으면 펼치는 쪽입니다.
  const opening = answers.some((answer) => !answer.open);
  for (const answer of answers) answer.open = opening;
}

/**
 * **마우스로 누른 뒤에는 포커스를 놓습니다.**
 *
 * 단추를 누르면 그 단추가 포커스를 쥡니다. 그 상태에서 스페이스바를 치면 브라우저는
 * 페이지를 내리는 대신 **포커스된 단추를 한 번 더 누릅니다** — 「답 모두 보기」로
 * 다 펼쳐 놓고 스페이스로 내려 읽으려는 순간 답이 통째로 도로 접힙니다.
 * 답 칩(`summary`)도 같습니다. 그 하나가 닫힙니다.
 *
 * 키보드로 누른 것(`detail === 0`)은 그대로 둡니다. 그쪽은 포커스가 남아야 다음
 * Tab이 이어지고, 스페이스로 다시 여닫는 것도 의도한 동작입니다.
 */
const releaseAfterPointer = (event: MouseEvent, element: Element) => {
  if (event.detail === 0) return;
  if (element instanceof HTMLElement) element.blur();
};

export function watchAnswerToggle(root: HTMLElement): () => void {
  const slug = root.dataset.slug ?? '';
  const intent = intents.get(slug) ?? new Set<number>();
  intents.set(slug, intent);

  /** 마지막으로 진짜 입력이 온 시각. 스스로 닫힌 것과 눌러서 닫은 것을 가릅니다. */
  let gestureAt = -Infinity;
  const markGesture = () => {
    gestureAt = performance.now();
  };
  const byHand = () => performance.now() - gestureAt < GESTURE_MS;

  /*
    되돌리는 일은 **그 자리에서 바로** 합니다.

    한 번 `requestAnimationFrame`에 걸어 두었다가 안 돌아온 적이 있습니다 — 숨은 탭이나
    안 그려지는 창에서는 프레임이 아예 안 옵니다. 그러면 되돌리기가 무한정 밀려서
    '접힌 채로 그대로'가 됩니다. 되돌리는 값은 `open` 속성 하나뿐이라 지금 바로 해도 쌉니다.

    `restoring`은 재진입을 막습니다. `open`을 바꾸면 `toggle`이 다시 오는데, 그것까지
    사람이 닫은 것으로 세면 방금 되돌린 것을 도로 지웁니다.
  */
  let restoring = false;
  const restore = () => {
    if (restoring || intent.size === 0) return;
    restoring = true;
    for (const [index, answer] of answersIn(root).entries()) {
      if (intent.has(index) && !answer.open) answer.open = true;
    }
    restoring = false;
  };

  /*
    **연달아 누르면 근처 글자가 잡히던 것.**

    같은 자리를 빠르게 두 번 누르면 브라우저는 그것을 겹클릭으로 보고 **커서 아래
    낱말을**, 세 번이면 **문단 전체를** 선택합니다. 여닫는 단추와 답 칩은 문제 줄
    한가운데 있으므로, 답을 몇 번 여닫다 보면 문제 글자가 통째로 파랗게 잡혔습니다.

    두 번째 누름부터 `mousedown`의 기본 동작을 막으면 선택이 시작되지 않습니다.
    `click`은 그대로 오므로 여닫는 동작은 달라지지 않습니다. 문제 줄의 글자는
    여전히 끌어서 잡을 수 있습니다 — 막는 것은 두 컨트롤 위에서의 겹클릭뿐입니다.
  */
  const onMouseDown = (event: MouseEvent) => {
    if (event.detail < 2) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('button.answer-all') || target.closest('.answer-chip')) {
      event.preventDefault();
    }
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const bulk = target.closest('button.answer-all');
    if (bulk) {
      toggleAll(bulk);
      releaseAfterPointer(event, bulk);
      return;
    }

    const summary = target.closest('details.answer > summary');
    if (!summary) return;

    // 키보드로 연 것(Enter·Space)은 그대로 둡니다.
    if (event.detail === 0) return;
    if (target.closest('.answer-chip')) {
      releaseAfterPointer(event, summary);
      return;
    }

    event.preventDefault();
  };

  /*
    `toggle`은 위로 올라오지 않으므로 캡처로 받습니다.
    - 열렸다  → 펼쳐 둔 자리로 적습니다.
    - 사람이 닫았다 → 그 자리를 지웁니다.
    - 저 혼자 닫혔다 → 되돌립니다.
  */
  const onToggle = (event: Event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.classList.contains('answer')) return;

    const index = answersIn(root).indexOf(details);
    if (index === -1) return;

    if (restoring) return;
    if (details.open) intent.add(index);
    else if (byHand()) intent.delete(index);
    else restore();
  };

  /*
    본문이 통째로 갈리면 새 `<details>`는 닫힌 채로 오고 `toggle`도 안 옵니다.
    그 경우는 이 관찰자가 잡습니다.
  */
  const observer = new MutationObserver((records) => {
    if (records.some((record) => record.addedNodes.length > 0)) restore();
  });
  observer.observe(root, { childList: true, subtree: true });

  root.addEventListener('mousedown', onMouseDown);
  root.addEventListener('click', onClick);
  root.addEventListener('toggle', onToggle, true);
  root.addEventListener('pointerdown', markGesture, true);
  root.addEventListener('keydown', markGesture, true);
  root.setAttribute(ALL_ATTR, '');

  // 다시 그려서 새로 붙은 경우 — 붙자마자 펼쳐 둔 자리를 되돌립니다.
  restore();

  return () => {
    observer.disconnect();
    root.removeEventListener('mousedown', onMouseDown);
    root.removeEventListener('click', onClick);
    root.removeEventListener('toggle', onToggle, true);
    root.removeEventListener('pointerdown', markGesture, true);
    root.removeEventListener('keydown', markGesture, true);
    root.removeAttribute(ALL_ATTR);
  };
}
