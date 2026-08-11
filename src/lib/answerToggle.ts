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
export function watchAnswerToggle(root: HTMLElement): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const summary = target.closest('details.answer > summary');
    if (!summary) return;

    // 키보드로 연 것(Enter·Space)은 그대로 둡니다.
    if (event.detail === 0) return;
    if (target.closest('.answer-chip')) return;

    event.preventDefault();
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
