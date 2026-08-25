import { Star } from 'lucide-react';
import type { CertDifficulty } from '../data/certs';

const SLOTS = [1, 2, 3, 4, 5];

/**
 * 난이도 별 다섯 개. **반 칸까지 그립니다.**
 *
 * 시행처가 매긴 값이 아니라 우리 판단이라 목록에는 눈금 설명을 함께 두고,
 * 상세에는 자격증마다 근거 한 줄을 답니다.
 *
 * 반쪽은 빈 별 위에 채운 별을 겹쳐 두고 **왼쪽 절반만 남기고 잘라** 만듭니다.
 * 별 하나를 반만 그리는 SVG를 따로 두면 획 두께가 온전한 별과 달라지고,
 * 잘라 내는 쪽은 같은 그림을 쓰므로 언제나 맞습니다.
 *
 * 별 다섯을 그림 하나로 읽히게 `role="img"`를 답니다. 안 그러면 스크린리더가
 * 아이콘 다섯 개를 따로 읽습니다.
 */
export function CertStars({ value, size = 13 }: { value: CertDifficulty; size?: number }) {
  return (
    <span className="cert-stars" role="img" aria-label={`난이도 ${value}/5`}>
      {SLOTS.map((slot) => {
        // 이 칸이 얼마나 차는가 — 1, 0.5, 0 셋 중 하나입니다.
        const fill = Math.max(0, Math.min(1, value - slot + 1));

        return (
          <span key={slot} className="cert-star" style={{ width: size, height: size }}>
            <Star size={size} strokeWidth={1.5} aria-hidden="true" />
            {fill > 0 && (
              <span className="cert-star-fill" style={{ width: `${fill * 100}%` }}>
                <Star size={size} strokeWidth={1.5} aria-hidden="true" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
