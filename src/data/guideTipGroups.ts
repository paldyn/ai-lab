import type { TipAim, TipGroupId } from '../types/playbook';

export interface TipGroup {
  id: TipGroupId;
  /** 어느 축의 묶음인가. 축마다 가르는 기준이 다릅니다. */
  aim: TipAim;
  /**
   * 그 팁들이 필요해지는 **순간**. 팁 목록 위에 작은 라벨로 섭니다.
   *
   * **「~때」 한 틀입니다**(2026-09-28). 그 전에는 「세션마다 따라붙는 것을 줄였나」·
   * 「됐다는 판정을 누가 하나」처럼 점검하는 반말 질문이었는데, 독자를 점검받는
   * 사람으로 세웠고 「하나」가 숫자 1로도 읽혔습니다. 순간으로 적으면 넷을 세로로
   * 읽었을 때 「이럴 때 이렇게 한다」가 되어 아래 팁 문장과 이어집니다.
   *
   * 절 제목은 「이름」이라는 글 쓰기 규칙의 **예외**입니다 — 이것은 절 제목이 아니라
   * 팁을 거느리는 라벨이고, 화면에서도 팁 문장보다 작고 흐리게 섭니다.
   */
  situation: string;
}

/**
 * 팁을 묶는 순간 — **축마다 넷씩이다.**
 *
 * **축이 다르면 가르는 기준도 다릅니다.** 사용량 절감은 세션이 지나는 시간(갖출 때 →
 * 고를 때 → 넣을 때 → 길어질 때)이고, 품질 향상은 고치는 값이 커지는 순서(되풀이
 * 될 때 → 처음 넘길 때 → 어긋났을 때 → 다 됐다는 답이 왔을 때)입니다. 두 축이 같은
 * 넷을 쓰던 동안 품질 향상 축의 서른둘 중 스물넷이 한 칸에 몰렸습니다(2026-09-17).
 *
 * **묶음에 「한 줄 답」을 안 답니다.** 그 문장은 출처 없는 주장이 되어 `npm test`(값)와
 * `check:playbook`(나이) 어느 쪽에도 안 걸린 채 늙습니다.
 *
 * **축마다 넷을 넘기지 않습니다.** 다섯째를 만드는 순간 「기타」가 생겨 그 안이 다시
 * 위계 없는 목록이 됩니다. 넘칠 때 할 일은 칸을 늘리는 것이 아니라 **다시 가르는**
 * 것입니다.
 */
export const guideTipGroups: TipGroup[] = [
  /* ── 사용량 절감 — 세션이 지나는 시간 ───────────────────────── */
  { id: 'load', aim: 'save', situation: '도구와 설정을 갖출 때' },
  { id: 'model', aim: 'save', situation: '모델과 추론 강도를 고를 때' },
  { id: 'feed', aim: 'save', situation: '자료를 넣거나 일을 나눌 때' },
  { id: 'cut', aim: 'save', situation: '대화가 길어지거나 일이 바뀔 때' },

  /* ── 품질 향상 — 어긋남을 어디서 잡나 (고치는 값이 커지는 순서)
     팁 본문 셋이 이 차례를 직접 말한다 — 「어긋난 채로 결과물을 다 만들고 나서
     고치는 것이 가장 비싸다」·「엉뚱한 범위로 한 번 다 돌린 뒤 다시 시키는 것이
     가장 비싼 실수」·「계획이 다 나온 뒤 되돌리는 것보다 낫다」.

     **2번과 3번을 가르는 선은 「어디에 적나」가 아니라 실행이 한 번이라도 일어났는가**
     다. 계획 모드·인터뷰·조사 계획은 본 작업 전에 방향을 맞추는 것이라 2번이고,
     도중 끼어들기·구간 고치기·되감기는 이미 나온 것을 상대하므로 3번이다.

     **2번과 4번이 둘 다 「프롬프트 한 줄」이라 헷갈릴 수 있다.** 확인 수단·자기
     점검·출처 대기는 전부 요청에 적는 문장인데 4번에 있다 — 축이 「어디에 적나」가
     아니라 「어긋남을 어디서 잡나」라서 목적을 따른다. */
  { id: 'standing', aim: 'well', situation: '같은 말을 되풀이하게 될 때' },
  { id: 'brief', aim: 'well', situation: '일을 처음 넘길 때' },
  { id: 'steer', aim: 'well', situation: '결과가 어긋났을 때' },
  /*
    **「다 됐다는 답이 왔을 때」가 아니다**(2026-09-28, 같은 날 고쳤다). 이 묶음의 팁
    대부분이 「일을 맡길 때 확인 수단을 같이 준다」처럼 **요청하는 순간**에 하는 일이라,
    답이 온 뒤의 시점을 붙이면 라벨과 팁이 한 쌍 안에서 부딪혔다. 목적(완료를 가리기)으로
    적는다.
  */
  { id: 'verdict', aim: 'well', situation: '완료를 확인하게 할 때' },
];

/** 그 축의 묶음 넷. 배열 순서가 곧 화면 순서입니다. */
export const tipGroupsOf = (aim: TipAim): TipGroup[] =>
  guideTipGroups.filter((g) => g.aim === aim);

export const tipGroupIdsOf = (aim: TipAim): TipGroupId[] =>
  tipGroupsOf(aim).map((g) => g.id);

export const tipGroupIds = guideTipGroups.map((g) => g.id);

const byId = new Map(guideTipGroups.map((g) => [g.id, g]));
export const tipGroupById = (id: string): TipGroup | undefined => byId.get(id as never);
