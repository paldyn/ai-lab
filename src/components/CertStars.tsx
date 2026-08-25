import { Star } from 'lucide-react';
import type { CertDifficulty } from '../data/certs';

const SLOTS = [1, 2, 3, 4, 5];

/**
 * 난이도 별 다섯 개.
 *
 * **시행처가 매긴 값이 아니라 우리 판단입니다.** 그래서 상세 화면에서는 별 옆에
 * 근거 한 줄을 함께 답니다. 목록에서는 별만 세웁니다 — 열넷을 훑을 때 필요한 것은
 * 「어느 쪽이 더 센가」 하나입니다.
 *
 * 별 다섯을 그림 하나로 읽히게 `role="img"`를 답니다. 안 그러면 스크린리더가
 * 아이콘 다섯 개를 따로 읽습니다.
 */
export function CertStars({ value, size = 13 }: { value: CertDifficulty; size?: number }) {
  return (
    <span className="cert-stars" role="img" aria-label={`난이도 ${value}/5`}>
      {SLOTS.map((slot) => (
        <Star
          key={slot}
          size={size}
          strokeWidth={1.5}
          className={slot <= value ? 'is-on' : ''}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
