import type { NewsDetail } from '../data/news';

/**
 * 모달 본문(points·commentary)은 목록에 필요 없고 항목당 분량이 요약의 서너 배입니다.
 * 뉴스가 브리핑에서 아카이브로 커지면서 이것까지 초기 번들에 넣으면 홈을 여는
 * 모든 방문자가 읽지도 않을 본문을 내려받게 됩니다.
 *
 * 그래서 발행 월로 잘라 두고 모달을 열 때 그 달치만 받아 옵니다. 한 달치가
 * 통째로 오니 같은 달의 다른 소식을 이어 볼 때는 추가 요청이 없습니다.
 */
type DetailModule = { details: Record<string, NewsDetail> };

const monthLoaders = import.meta.glob<DetailModule>('../data/news-details/*.ts');

/** 같은 달을 두 번 받지 않도록 Promise 자체를 기억해 둡니다. */
const cache = new Map<string, Promise<Record<string, NewsDetail>>>();

function loadMonth(month: string): Promise<Record<string, NewsDetail>> {
  const cached = cache.get(month);
  if (cached) return cached;

  const loader = monthLoaders[`../data/news-details/${month}.ts`];
  // 아직 본문을 쓰지 않은 달이 있을 수 있습니다. 그때는 모달이 요약만 보여 줍니다.
  const pending = loader
    ? loader().then((mod) => mod.details ?? {}).catch(() => ({}))
    : Promise.resolve({});

  cache.set(month, pending);
  return pending;
}

export async function loadNewsDetail(id: string, publishedAt: string): Promise<NewsDetail | null> {
  const details = await loadMonth(publishedAt.slice(0, 7));
  return details[id] ?? null;
}
