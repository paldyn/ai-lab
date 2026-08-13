export interface ZoomedImage {
  src: string;
  alt: string;
}

/**
 * 본문 그림을 눌러 크게 보게 합니다.
 *
 * 본문은 React가 `innerHTML`로 쥐고 있어 그림 하나하나에 핸들러를 걸 수 없습니다.
 * 클릭은 위로 올라오므로 본문 요소에서 한 번만 받습니다 — 답 토글이 쓰는 방식과
 * 같고(`answerToggle.ts`), 본문을 다시 그려도 이 리스너는 그대로 남습니다.
 *
 * **링크 안의 그림은 건드리지 않습니다.** 그쪽은 누르면 갈 곳이 이미 있습니다.
 */
export function watchImageZoom(root: HTMLElement, onOpen: (image: ZoomedImage) => void): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || target.closest('a')) return;

    event.preventDefault();
    onOpen({ src: target.currentSrc || target.src, alt: target.alt });
  };

  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
