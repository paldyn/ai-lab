import { ArrowDownUp } from 'lucide-react';

/**
 * 목록의 정렬.
 *
 * **칩 하나를 눌러 돌립니다.** 고를 것이 둘이나 셋뿐이라 펼치는 패널을 두면 누르는 수만
 * 늘어납니다(태그는 1,000개가 넘어 패널이 필요했습니다). 지금 무엇으로 서 있는지가
 * 단추에 그대로 적히므로 열지 않아도 상태가 보입니다.
 *
 * 값은 화면마다 다릅니다 — 수학은 커리큘럼 순이 기본이고, 옮겨 온 글은 발행 순만 있습니다.
 * 그래서 목록을 어떻게 세울지는 쓰는 쪽이 정하고 여기서는 돌리기만 합니다.
 */
export interface SortOption<T extends string> {
  id: T;
  label: string;
}

export function SortSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SortOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  if (options.length < 2) return null;

  const index = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  );
  const next = options[(index + 1) % options.length];

  return (
    <button
      type="button"
      className="sort-select"
      onClick={() => onChange(next.id)}
      title={`정렬 — 지금은 ${options[index].label}. 누르면 ${next.label}`}
    >
      <ArrowDownUp size={12} strokeWidth={1.8} aria-hidden="true" />
      <span>{options[index].label}</span>
      <span className="sr-only">정렬 바꾸기</span>
    </button>
  );
}
