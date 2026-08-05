import { execFileSync } from 'node:child_process';

/**
 * 이 배포를 가리키는 값. 열어 둔 탭이 "지금 들고 있는 번들이 최신인가"를
 * 물어볼 때 대조하는 유일한 기준입니다.
 *
 * 시각이 아니라 커밋 해시를 쓰는 이유: `npm run build`는 client 빌드와 --ssr
 * 빌드로 프로세스가 두 번 돌고 프리렌더가 세 번째입니다. Date.now()로 만들면
 * 번들에 박힌 값과 version.json에 적힌 값이 서로 달라져, 배포하자마자 모든
 * 탭이 "새 배포가 있다"고 판단합니다. 커밋 해시는 어느 프로세스에서 불러도
 * 같고, 이 저장소는 글도 코드도 커밋으로만 배포되므로 내용이 바뀌면 반드시
 * 함께 바뀝니다.
 *
 * 같은 커밋을 workflow_dispatch로 다시 배포하면 값이 그대로인데, 내용이 같으니
 * 알릴 것도 없습니다.
 */
export function resolveBuildId(): string {
  // Actions에서는 GITHUB_SHA가 항상 있습니다. 12자면 충돌을 걱정할 길이가 아닙니다.
  const fromEnv = process.env.BUILD_ID ?? process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.trim().slice(0, 12);

  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    // git이 없거나 저장소 밖에서 빌드한 경우. 값이 고정되면 갱신 확인이 아무것도
    // 못 찾을 뿐이고, 사이트 자체는 그대로 돕니다.
    return 'dev';
  }
}
