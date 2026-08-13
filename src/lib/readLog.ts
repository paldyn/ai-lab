import { useSyncExternalStore } from 'react';

/**
 * **무엇을 읽었는지 기억합니다.**
 *
 * 글 342편에 뉴스 401건이라 목록만 보고는 읽은 것과 안 읽은 것이 안 갈립니다.
 * 계정이 없는 정적 사이트이므로 기록은 **그 브라우저 안에만** 남습니다 —
 * 기기가 바뀌면 따로 세고, 사이트 데이터를 지우면 함께 사라집니다.
 * 서버로 아무것도 보내지 않습니다.
 *
 * **프리렌더와 하이드레이션을 어긋나게 하면 안 됩니다.** 프리렌더된 HTML은
 * 아무것도 안 읽은 상태이므로, 첫 렌더도 그 상태여야 합니다. `useSyncExternalStore`가
 * 그 일을 합니다 — 서버 스냅숏은 늘 0이고, 하이드레이션이 끝난 뒤에 실제 값으로
 * 한 번 더 그립니다.
 */
const KEY = 'paldyn:read:v1';

/** 글과 뉴스를 한 저장소에 두되 열쇠 앞에 갈래를 붙여 섞이지 않게 합니다. */
export type ReadKind = 'article' | 'news';

const keyOf = (kind: ReadKind, id: string) => `${kind}:${id}`;

let entries: Set<string> | null = null;
/** 바뀔 때마다 오릅니다. 0은 '아직 안 읽어 왔다'는 뜻이라 서버 스냅숏으로도 씁니다. */
let version = 0;
const listeners = new Set<() => void>();

function load(): Set<string> {
  if (entries) return entries;

  entries = new Set<string>();
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      for (const item of parsed) if (typeof item === 'string') entries.add(item);
    }
  } catch {
    // 사생활 보호 모드나 용량 초과로 못 읽는 브라우저가 있습니다. 빈 채로 갑니다.
  }
  version = 1;
  return entries;
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...(entries ?? [])]));
  } catch {
    // 못 적어도 이번 세션 동안은 화면에 반영됩니다.
  }
}

function announce(): void {
  version += 1;
  for (const listener of listeners) listener();
}

export function markRead(kind: ReadKind, id: string): void {
  if (typeof localStorage === 'undefined') return;

  const set = load();
  const key = keyOf(kind, id);
  if (set.has(key)) return;

  set.add(key);
  save();
  announce();
}

export function clearRead(): void {
  if (typeof localStorage === 'undefined') return;

  entries = new Set<string>();
  save();
  announce();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const clientVersion = () => {
  if (typeof localStorage === 'undefined') return 0;
  load();
  return version;
};

const serverVersion = () => 0;

/**
 * 읽은 것을 가리는 함수. **하이드레이션 전에는 늘 `false`를 돌려줍니다** —
 * 그래야 프리렌더된 화면과 첫 렌더가 같습니다.
 *
 * 반환값은 버전이 오를 때마다 새로 만들어지므로, 이 훅을 쓰는 컴포넌트는
 * 무엇을 읽을 때마다 다시 그려집니다.
 */
export function useReadCheck(): (kind: ReadKind, id: string) => boolean {
  const current = useSyncExternalStore(subscribe, clientVersion, serverVersion);
  if (current === 0) return () => false;
  return (kind, id) => (entries ?? new Set<string>()).has(keyOf(kind, id));
}

/** 읽은 것이 몇 개인지. 「안 읽은 것만 보기」 칩을 세울지 정하는 데 씁니다. */
export function useReadCount(): number {
  const current = useSyncExternalStore(subscribe, clientVersion, serverVersion);
  return current === 0 ? 0 : (entries?.size ?? 0);
}
