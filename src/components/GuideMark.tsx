import type { CSSProperties } from 'react';
import { assetUrl } from '../data/sources';

/**
 * AI 가이드의 심볼 로고.
 *
 * **단색 로고에는 브랜드 색을 입힙니다.** 처음에는 다크 테마에서 `filter: invert(1)`로
 * 뒤집었는데, 그러면 로고가 브랜드 색이 아니라 **그냥 흰색**이 됩니다 — 포인트 색을
 * 카드에 넣어 놓고 정작 가장 눈에 띄는 로고가 무채색이었습니다.
 *
 * 그래서 `mask-image`로 모양만 떠서 그 자리를 포인트 색으로 칠합니다. 파일은 그대로
 * 두고 색만 CSS가 정하므로 테마가 바뀌어도 한 벌이면 됩니다.
 *
 * **여러 색이 든 로고는 손대지 않습니다**(Google, Antigravity). 마스크를 씌우면
 * 그라디언트와 네 색이 한 색으로 납작해집니다. 자격증 마크에서 반전을 안 건 것과
 * 같은 이유입니다.
 *
 * `<img>`를 DOM에 남겨 두는 것은 **`mask-image`를 못 쓰는 환경의 대비**입니다.
 * 마스크가 먹는 곳에서만 그 이미지를 숨깁니다 — 못 쓰는 곳에서는 로고가 원래 색으로
 * 그대로 보이고, 빈 네모가 남지 않습니다.
 *
 * `alt`가 비어 있고 `aria-hidden`입니다. 이 마크 옆에는 언제나 이름이 글자로 함께
 * 서므로, 로고까지 읽으면 같은 이름을 두 번 읽게 됩니다.
 */
export function GuideMark({
  logo,
  monochrome,
  accent,
  className,
}: {
  logo: string;
  monochrome: boolean;
  /** 단색 로고에 입힐 색. 안 주면 글자색을 따라갑니다. */
  accent?: string;
  className: string;
}) {
  const url = assetUrl(logo);

  return (
    <span
      className={monochrome ? `${className} is-tinted` : className}
      aria-hidden="true"
      style={
        monochrome
          ? ({ '--guide-mark': `url("${url}")`, '--guide-mark-color': accent } as CSSProperties)
          : undefined
      }
    >
      <img src={url} alt="" />
    </span>
  );
}
