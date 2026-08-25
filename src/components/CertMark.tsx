import { assetUrl } from '../data/sources';
import { certMark } from '../data/certs';

/**
 * 시행처 마크. 자격증 카드 왼쪽과 상세 머리말에 섭니다.
 *
 * **카드에서 시행처를 알려 주는 것이 이 마크뿐입니다.** 글자로 적던 「한국데이터산업진흥원 /
 * 중급」 줄을 걷어냈으므로 `alt`에 시행처 이름을 그대로 넣습니다 — 화면을 못 보는
 * 사람에게는 이 자리가 유일한 출처 표시입니다.
 *
 * 로고 파일이 없는 시행처는 글자 마크로 섭니다. 비슷하게 그린 상표를 넣지 않습니다.
 */
export function CertMark({ issuer }: { issuer: string }) {
  const mark = certMark(issuer);

  return (
    <span className="cert-mark" title={mark.label}>
      {mark.logo ? (
        <img src={assetUrl(mark.logo)} alt={mark.label} />
      ) : (
        <span className="cert-mark-text" aria-hidden="true">
          {mark.text}
          {/* 글자 마크는 보이는 그대로 읽히지만 줄임말이라 전체 이름을 함께 답니다. */}
          <span className="sr-only">{mark.label}</span>
        </span>
      )}
    </span>
  );
}
