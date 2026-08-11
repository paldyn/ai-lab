/**
 * 팝업을 닫을 때 트리거로 포커스를 되돌리는 도우미.
 *
 * 되돌리는 것 자체는 옳습니다. 팝업을 닫으면 키보드 사용자는 원래 있던 자리로
 * 돌아가야 합니다. 문제는 Esc로 닫을 때입니다. 브라우저의 :focus-visible 판정은
 * '가장 최근 사용자 입력이 키보드였는가'만 보므로, 마우스로 연 팝업이라도
 * Esc(키 입력) 직후의 프로그램적 focus()는 포커스 링을 띄웁니다. 카드를 마우스로
 * 눌렀을 뿐인데 카드 전체에 주황 테두리가 남던 증상이 이것입니다.
 *
 * 그래서 '어떻게 열었는가'를 여는 순간에 기록합니다. 트리거가 그 시점에
 * :focus-visible이었다면 키보드로 연 것이고, 그때는 닫을 때도 링이 보여야 합니다.
 * 아니었다면 링만 숨긴 채 포커스를 되돌립니다.
 *
 * 판정은 여는 순간으로 끝나지 않습니다. 마우스로 열었더라도 팝업 안에서 Tab으로
 * 옮겨 다녔다면 그 사람은 이미 키보드로 보고 있고, 돌아온 자리가 어디인지
 * 보여 줘야 합니다(WCAG 2.4.7 Focus Visible). 그래서 열려 있는 동안 키 입력을
 * 지켜보다가 하나라도 있으면 '키보드'로 올립니다. 닫는 Esc만 빼고 셉니다 —
 * 그것까지 세면 억제할 경우가 하나도 남지 않습니다.
 *
 * 닫는 시점에 팝업 안 포커스가 :focus-visible인지 보는 방법은 쓸 수 없습니다.
 * Chrome은 페이지에서 키가 한 번이라도 눌린 뒤로는 그 표시를 계속 들고 있고,
 * 팝업 안 첫 포커스는 프로그램이 옮긴 것이라 '마우스로 받았다'는 표시가 없어
 * 마우스로만 연 경우에도 참이 됩니다. 실제로 그렇게 나오는 것을 확인했습니다.
 *
 * DOM은 함수를 부를 때만 만집니다. 이 저장소는 renderToString으로 프리렌더하므로
 * 모듈 최상위에서 document를 읽으면 빌드가 섭니다. effect 안에서만 부르세요.
 */

/** 링을 숨기는 동안 트리거에 붙는 표시. src/styles.css가 이 속성을 보고 링 선언을 끕니다. */
const RING_OFF_ATTR = 'data-focus-ring-off';

/** 혼자 눌려서는 아무것도 하지 않는 키. 이것만으로 '키보드를 쓴다'고 보지 않습니다. */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock', 'ScrollLock']);

/**
 * `focusVisible`은 Firefox가 먼저 구현한 옵션이라 lib.dom.d.ts의 FocusOptions에 아직
 * 없습니다. any로 뭉개지 않고 이 옵션 하나만 더한 좁은 타입을 따로 둡니다.
 */
interface FocusVisibleOptions extends FocusOptions {
  focusVisible?: boolean;
}

export interface FocusOrigin {
  /** 팝업이 열릴 때 포커스를 쥐고 있던 요소. 대개 팝업을 연 트리거입니다. */
  readonly element: HTMLElement | null;
  /** 지금까지 본 바로 키보드를 쓰는 중인가. 열려 있는 동안 갱신됩니다. */
  keyboard: boolean;
  /** 그 갱신을 멈춥니다. `restoreFocus`가 대신 부르므로 직접 부를 일은 없습니다. */
  stopWatching(): void;
}

function isFocusVisible(element: HTMLElement | null): boolean {
  if (!element) return false;

  try {
    return element.matches(':focus-visible');
  } catch {
    // :focus-visible을 모르는 엔진은 SyntaxError를 던집니다. 그런 브라우저에는
    // 애초에 이 링이 없으므로 '키보드로 열었다'로 보아 아무것도 하지 않습니다.
    return true;
  }
}

/** 이 키 입력을 '키보드로 쓰는 중'의 근거로 볼 것인가. */
function isKeyboardIntent(event: KeyboardEvent): boolean {
  // 팝업을 닫는 키. 이것 하나만 눌린 경우가 바로 억제해야 할 경우입니다.
  if (event.key === 'Escape') return false;
  // 조합키를 짚고 있는 것만으로는 아직 아무 데도 가지 않았습니다.
  if (MODIFIER_KEYS.has(event.key)) return false;
  // Cmd+Tab처럼 페이지가 아니라 브라우저·OS로 가는 단축키도 셈에서 뺍니다.
  return !event.metaKey && !event.ctrlKey && !event.altKey;
}

/**
 * 팝업이 열린 직후 effect에서 부릅니다.
 * 포커스를 팝업 안으로 옮기기 **전에** 불러야 트리거가 잡힙니다.
 * 돌려받은 값은 반드시 `restoreFocus`에 넘기세요 — 지켜보던 것을 거기서 뗍니다.
 */
export function captureFocusOrigin(): FocusOrigin {
  const element = document.activeElement as HTMLElement | null;
  const origin: FocusOrigin = {
    element,
    keyboard: isFocusVisible(element),
    stopWatching: () => {},
  };

  // 캡처 단계로 듣습니다. 팝업이 Tab을 가로채 preventDefault·stopPropagation을
  // 하더라도 눌렸다는 사실은 놓치지 않아야 합니다.
  const watch = (event: KeyboardEvent) => {
    if (isKeyboardIntent(event)) origin.keyboard = true;
  };

  document.addEventListener('keydown', watch, true);
  origin.stopWatching = () => document.removeEventListener('keydown', watch, true);

  return origin;
}

/**
 * Safari와 예전 Chrome은 focusVisible 옵션을 무시하므로 표시를 붙여 CSS로도 끕니다.
 * (지금 Chrome은 옵션을 존중합니다 — 둘 다 걸어 두면 어느 쪽이든 막힙니다.)
 * 다음 키 입력·클릭이나 포커스가 떠나는 순간 표시를 뗍니다 — 되돌린 직후 한 번만
 * 가리고, 이어지는 Tab 이동에는 링이 평소대로 보여야 하기 때문입니다.
 */
function hideRingOnce(element: HTMLElement): void {
  element.setAttribute(RING_OFF_ATTR, '');

  const clear = () => {
    element.removeAttribute(RING_OFF_ATTR);
    document.removeEventListener('keydown', clear, true);
    document.removeEventListener('pointerdown', clear, true);
    element.removeEventListener('blur', clear);
  };

  // 캡처 단계로 듣습니다. 지금 처리 중인 Esc keydown은 document의 캡처 단계를
  // 이미 지났으므로, 방금 붙인 리스너가 바로 그 이벤트에 불려 표시를 도로
  // 떼어 버리는 일이 없습니다.
  document.addEventListener('keydown', clear, true);
  document.addEventListener('pointerdown', clear, true);
  element.addEventListener('blur', clear);
}

/**
 * 팝업이 **열리며** 안쪽 요소를 자동으로 잡을 때 씁니다. 링 없이 포커스만 옮깁니다.
 *
 * 되돌릴 때와 같은 증상이 여는 쪽에도 있습니다. Esc는 키 입력이라 브라우저를
 * '키보드 모드'로 바꾸는데, 그 상태에서 **이미 포커스를 쥐고 있는 트리거를 다시
 * 클릭하면 포커스가 움직이지 않아 모드가 풀리지 않습니다.** 그래서 마우스로 다시
 * 열었는데도 팝업이 잡는 요소에 링이 붙습니다. 실제로 재 보면 그 순간 새로 만든
 * 버튼을 프로그램으로 잡아도 :focus-visible이 참입니다 — 요소가 아니라 모드가
 * 남아 있는 것이라 트리거 쪽만 고쳐서는 막히지 않습니다.
 *
 * 그러니 '어떻게 열었는가'로 고릅니다. 키보드로 열었으면(`origin.keyboard`)
 * 링이 보여야 하고 — 포커스가 팝업 안으로 들어간 것을 알려야 합니다 —
 * 마우스로 열었으면 이 함수로 조용히 잡습니다.
 */
export function focusQuietly(element: HTMLElement | null): void {
  if (!element) return;

  hideRingOnce(element);
  const options: FocusVisibleOptions = { preventScroll: true, focusVisible: false };
  element.focus(options);
}

/**
 * 팝업이 닫힐 때(대개 effect cleanup에서) 부릅니다.
 * `captureFocusOrigin()`이 잡아 둔 요소로 포커스를 되돌립니다.
 */
export function restoreFocus(origin: FocusOrigin): void {
  // 되돌릴 자리가 없어 일찍 빠져나가더라도 지켜보던 것은 먼저 뗍니다.
  origin.stopWatching();

  const element = origin.element;
  if (!element || !element.isConnected) return;

  if (origin.keyboard) {
    // 키보드를 쓰는 중이면 돌아온 자리가 어디인지 보여야 합니다.
    // 화면 밖으로 밀려 있으면 스크롤해 데려오는 기본 동작도 그대로 둡니다.
    element.focus();
    return;
  }

  hideRingOnce(element);

  // 마우스로 열었을 때는 배경이 그 자리에 그대로 있으므로 스크롤할 이유가 없습니다.
  const options: FocusVisibleOptions = { preventScroll: true, focusVisible: false };
  element.focus(options);
}
