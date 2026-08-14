import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * 배포된 뒤에도 새로 올라온 것을 볼 수 있게 하는 장치. **화면에는 아무것도 안 그립니다.**
 *
 * 예전에는 왼쪽 아래에 「새 글이 올라왔습니다 · 새로고침」 알림을 띄웠는데,
 * 읽는 도중에 끼어드는 것에 비해 얻는 것이 적어 걷어냈습니다. 남은 것은 조용한
 * 쪽입니다 — 경로를 옮기는 순간 새 배포가 있으면 문서를 통째로 다시 받습니다.
 *
 * **그 자동 새로고침은 편의가 아니라 고장 방지입니다.** 낡은 번들은 새 글의 본문
 * 청크를 매니페스트에 아예 갖고 있지 않아(src/lib/articleBody.ts) 새 글로 이동하면
 * 404 화면이 됩니다. 화면이 어차피 갈리는 자리라 읽던 것을 날리지도 않습니다.
 *
 * 글 목록은 virtual:article-index로, 뉴스는 data/news.ts로 빌드 때 번들에 통째로
 * 박힙니다. 그래서 탭을 열어 둔 채 새 배포가 나가면 클라이언트 라우팅으로는 새
 * 내용이 영영 안 보입니다. 매일 글과 뉴스가 올라오는 사이트라 실제로 겪는
 * 일입니다. 새로 받는 것 말고는 길이 없으므로, 언제 새로 받을지만 정합니다.
 *
 * dev에서는 아무것도 하지 않습니다 — dev 서버에는 version.json이 없고,
 * .md가 바뀌면 plugins/article-index.ts가 이미 full-reload를 쏩니다.
 * 실제 동작은 `npm run build && npm run preview`로 확인합니다.
 */
const ENABLED = import.meta.env.PROD;

/**
 * 확인 주기.
 * 배포는 하루 한 번(20:00 UTC 수집 루틴 + Actions)입니다. 주기 확인이 맡아야 하는
 * 것은 '화면을 켜 둔 채 아무 조작도 안 하는 탭'뿐이고, 그 사람에게 5분과 30분의
 * 차이는 없습니다. 종일 열어 두어도 48번, 한 번에 100바이트대입니다. 조작이 있는
 * 탭의 반응성은 아래 두 트리거(다시 보이기·경로 이동)가 담당합니다.
 */
const POLL_INTERVAL = 30 * 60 * 1000;

/** 세 트리거가 겹칠 때 같은 확인을 되풀이하지 않는 최소 간격. */
const MIN_GAP = 5 * 60 * 1000;

/** 이 배포 때문에 이미 한 번 새로고침했다는 표시. */
const RELOADED_KEY = 'paldyn-ai-reloaded-build';

const VERSION_URL = `${import.meta.env.BASE_URL}version.json`;

function parseBuildId(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const data = value as Record<string, unknown>;
  return typeof data.buildId === 'string' ? data.buildId : null;
}

/**
 * 이 배포로 새로고침한 적이 있는지 기록하고, 처음일 때만 true를 돌려줍니다.
 * 되풀이 방지용입니다 — 새로고침했는데도 옛 HTML이 다시 오면(공유 캐시가
 * max-age 안의 응답을 내주는 경우) 자동 새로고침이 무한히 돕니다.
 *
 * 저장이 막힌 환경(쿠키·저장소를 막은 브라우저)에서는 아예 걸지 않습니다.
 * 기억할 수 없으면 되풀이를 막을 방법도 없어서, 막으려던 그 상황에서만 보호가
 * 사라집니다. 그때는 다음 경로 이동에서 다시 시도합니다.
 */
function claimReload(buildId: string): boolean {
  try {
    if (sessionStorage.getItem(RELOADED_KEY) === buildId) return false;
    sessionStorage.setItem(RELOADED_KEY, buildId);
    return true;
  } catch {
    return false;
  }
}

export function SiteUpdateGuard() {
  const { pathname } = useLocation();

  /** 마지막으로 확인한 새 배포의 id. 경로 이동 때 이 배포로 새로 받습니다. */
  const found = useRef<string | null>(null);

  const checkedAt = useRef(0);
  const inflight = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const check = useCallback(async () => {
    if (!ENABLED || found.current || inflight.current) return;
    if (!navigator.onLine) return;

    const now = Date.now();
    if (now - checkedAt.current < MIN_GAP) return;
    checkedAt.current = now;

    const controller = new AbortController();
    inflight.current = controller;

    try {
      /*
        GitHub Pages는 응답 헤더를 우리가 정할 수 없습니다 — 실제로 모든 파일이
        max-age=600이고 앞에 CDN이 있습니다. 그래서 캐시는 요청 쪽에서 피합니다.
        no-store가 브라우저 HTTP 캐시를 건너뛰고, 매번 다른 쿼리가 공유 캐시의
        키를 갈라 놓습니다. 서로 다른 계층이라 둘 다 겁니다.
      */
      const res = await fetch(`${VERSION_URL}?t=${now}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) return;

      const buildId = parseBuildId(await res.json());
      if (!buildId || buildId === __BUILD_ID__) return;

      found.current = buildId;
    } catch {
      // 오프라인, version.json이 없는 옛 배포(404), 깨진 JSON 전부 그냥 넘깁니다.
      // 재시도를 앞당기지 않고 다음 정상 트리거를 기다립니다.
    } finally {
      inflight.current = null;
    }
  }, []);

  // 첫 마운트에서는 확인하지 않습니다 — 방금 받은 문서는 정의상 최신입니다.
  useEffect(() => {
    if (!ENABLED) return;

    /*
      탭이 다시 보이는 순간이 이 사이트에서 가장 값싸고 정확한 신호입니다
      (종일 열어 두고 오가는 것이 실제 사용 패턴입니다). 숨어 있는 동안에는
      주기 확인도 요청을 건너뜁니다 — 타이머는 그대로 두는데, 어차피 브라우저가
      숨은 탭의 타이머를 크게 늦추므로 주기를 정확히 지킬 이유가 없습니다.
    */
    const run = () => {
      if (document.visibilityState === 'visible') void check();
    };

    document.addEventListener('visibilitychange', run);
    const timer = window.setInterval(run, POLL_INTERVAL);

    return () => {
      document.removeEventListener('visibilitychange', run);
      window.clearInterval(timer);
      inflight.current?.abort();
    };
  }, [check]);

  useEffect(() => {
    if (!ENABLED) return;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (!found.current) {
      void check();
      return;
    }

    /*
      경로가 바뀌는 순간이 문서를 통째로 다시 받기에 가장 안전한 자리입니다.
      화면이 어차피 갈리므로 읽던 것을 날리지 않고, 라우터가 이미 새 주소를 밀어
      넣은 뒤라 그 경로의 프리렌더된 HTML을 그대로 받습니다.

      낡은 번들은 새 글의 본문 청크를 매니페스트에 아예 갖고 있지 않아
      (src/lib/articleBody.ts) 새 글로 이동하면 404 화면이 됩니다. 그건 '목록이
      좀 늦다'가 아니라 고장이고, 이 자리에서만 막을 수 있습니다.
    */
    if (claimReload(found.current)) window.location.reload();
  }, [pathname, check]);

  // 화면에 그리는 것은 없습니다.
  return null;
}
