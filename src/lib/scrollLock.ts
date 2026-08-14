/**
 * 팝업이 떠 있는 동안 뒤 페이지를 그 자리에 묶어 둡니다.
 *
 * **body에 `overflow: hidden`만 걸어서는 모바일에서 안 먹습니다.** 데스크톱은
 * body의 overflow가 뷰포트로 전파돼 스크롤이 멎지만, 모바일 사파리는 손가락
 * 스크롤을 그것과 별개로 처리해 뒤 목록이 그대로 굴러갑니다. 팝업 안을 다 읽고
 * 손가락을 떼지 않으면 그대로 배경이 흐르는 것이 그 때문입니다.
 *
 * 그래서 body를 아예 그 자리에 고정합니다(`position: fixed`). 고정된 요소는 문서
 * 높이에 안 들어가므로 굴릴 것 자체가 없어집니다. 대신 화면이 맨 위로 튀므로
 * 지금 스크롤만큼 위로 당겨 두었다가, 풀 때 그 값으로 되돌립니다.
 *
 * 세로 막대가 사라지면서 생기는 폭 차이는 `padding-right`로 메웁니다 — 이게 없으면
 * 가운데 정렬한 것들이 팝업을 여닫을 때마다 7~8px씩 좌우로 튑니다.
 *
 * 겹쳐 열릴 때를 대비해 깊이를 셉니다. 하나가 닫히면서 먼저 풀어 버리면 아직 떠
 * 있는 쪽의 배경이 굴러갑니다.
 */
let depth = 0;
let scrollY = 0;
let saved: Record<'position' | 'top' | 'left' | 'right' | 'overflow' | 'paddingRight', string> | null = null;

export function lockScroll(): () => void {
  depth += 1;

  if (depth === 1) {
    const { style } = document.body;
    scrollY = window.scrollY;
    saved = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      overflow: style.overflow,
      paddingRight: style.paddingRight,
    };

    // 막대가 차지하던 폭. 막대가 겹쳐 그려지는 환경(모바일·트랙패드)에서는 0입니다.
    const gutter = window.innerWidth - document.documentElement.clientWidth;

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.overflow = 'hidden';
    if (gutter > 0) style.paddingRight = `${gutter}px`;
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth -= 1;
    if (depth > 0 || !saved) return;

    const { style } = document.body;
    style.position = saved.position;
    style.top = saved.top;
    style.left = saved.left;
    style.right = saved.right;
    style.overflow = saved.overflow;
    style.paddingRight = saved.paddingRight;
    saved = null;

    // html에 scroll-behavior: smooth가 걸려 있어(styles.css) 그냥 되돌리면 원래
    // 자리까지 미끄러져 내려갑니다. 여기서는 옮기는 것이 아니라 제자리로 돌리는
    // 것이므로 즉시여야 합니다.
    window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
  };
}
