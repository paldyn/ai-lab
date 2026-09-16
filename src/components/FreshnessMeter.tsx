import type { ProductFreshness } from '../data/playbook';

/**
 * 이 도구가 든 값이 지금 얼마나 믿을 만한가.
 *
 * **숫자를 어디에도 적어 두지 않습니다** — 코드가 셉니다. 적어 두면 그날부터
 * 실제와 갈립니다(뉴스 머리말의 「최근 7일」과 같은 이유).
 *
 * 값이 0개여도 같은 문장으로 섭니다. 무엇을 세는 화면인지가 처음부터 드러나야
 * 하고, **편수를 세면 466·400·44 옆에서 지는 싸움만** 합니다.
 */
export function FreshnessMeter({ fresh }: { fresh: ProductFreshness }) {
  return (
    <dl className="playbook-freshness">
      <div>
        <dt>값</dt>
        <dd>{fresh.total}개</dd>
      </div>
      <div>
        <dt>14일 안 확인</dt>
        <dd>{fresh.checkedRecently}개</dd>
      </div>
      {fresh.expired > 0 && (
        <div>
          <dt>만료</dt>
          <dd className="is-warn">{fresh.expired}개</dd>
        </div>
      )}
      {fresh.unfilled > 0 && (
        <div>
          <dt>모름</dt>
          <dd>{fresh.unfilled}개</dd>
        </div>
      )}
      {fresh.oldestAgeDays !== null && (
        <div>
          <dt>가장 오래된 것</dt>
          <dd>{fresh.oldestAgeDays}일</dd>
        </div>
      )}
    </dl>
  );
}
