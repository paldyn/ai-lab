import { assetUrl } from '../data/sources';
import { certMark } from '../data/certs';

/**
 * 시행처 마크. 자격증 카드 왼쪽과 상세 머리말에 섭니다.
 *
 * **카드에서 시행처를 알려 주는 것이 이 마크뿐입니다.** 글자로 적던 「한국데이터산업진흥원 /
 * 중급」 줄을 걷어냈으므로 `alt`에 시행처 이름을 그대로 넣습니다 — 화면을 못 보는
 * 사람에게는 이 자리가 유일한 출처 표시입니다.
 *
 * 어두운 로고(Kdata·AICE)는 다크 테마에서만 흰 판을 깔아 세웁니다. 반전을 걸면
 * 색이 통째로 뒤집혀 다른 로고가 되기 때문입니다.
 */
export function CertMark({ issuer }: { issuer: string }) {
  const mark = certMark(issuer);

  return (
    <span className={`cert-mark${mark.plate ? ' is-plated' : ''}`} title={mark.label}>
      {mark.logo ? (
        <img src={assetUrl(mark.logo)} alt={mark.label} />
      ) : (
        <span className="cert-mark-text">{mark.text}</span>
      )}
    </span>
  );
}
