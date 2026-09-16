import { assetUrl } from '../data/sources';

/**
 * AI 가이드의 심볼 로고.
 *
 * 뉴스의 출처 로고와 같은 방식입니다 — **단색 로고만 다크 테마에서 반전**시키고,
 * 여러 색이 든 로고(Google)는 그대로 둡니다. 반전을 걸면 색이 통째로 뒤집혀
 * 다른 로고가 됩니다.
 *
 * `alt`가 비어 있고 `aria-hidden`입니다. 이 마크 옆에는 언제나 회사나 제품 이름이
 * 글자로 함께 서므로, 로고까지 읽으면 같은 이름을 두 번 읽게 됩니다 — 자격증 마크가
 * `alt`에 시행처 이름을 넣은 것과 반대인데, 그쪽은 마크가 **유일한** 출처 표시였습니다.
 */
export function GuideMark({
  logo,
  monochrome,
  className,
}: {
  logo: string;
  monochrome: boolean;
  className: string;
}) {
  return (
    <span className={className} aria-hidden="true">
      <img src={assetUrl(logo)} alt="" className={monochrome ? 'is-monochrome' : ''} />
    </span>
  );
}
