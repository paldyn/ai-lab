/**
 * scripts/og-image.html을 1200x630 PNG로 렌더해 public/assets/og-image.png에 저장합니다.
 * 결과 PNG는 저장소에 커밋하므로 배포 파이프라인에서는 실행하지 않습니다.
 * 카피나 디자인을 바꿨을 때만 `npm run og-image`로 다시 만듭니다.
 *
 * CHROME 환경변수로 브라우저 경로를 직접 지정할 수 있습니다.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

const candidates = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const browser = candidates.find((candidate) => existsSync(candidate));

if (!browser) {
  console.error('Chrome 계열 브라우저를 찾지 못했습니다. CHROME 환경변수로 경로를 지정해 주세요.');
  process.exit(1);
}

const output = path.join(root, 'public/assets/og-image.png');

execFileSync(
  browser,
  [
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=1200,630',
    // 웹폰트를 받아 그릴 시간을 줍니다.
    '--virtual-time-budget=6000',
    `--screenshot=${output}`,
    `file://${path.join(root, 'scripts/og-image.html')}`,
  ],
  { stdio: 'ignore' },
);

console.log(`Wrote ${path.relative(root, output)} (1200x630)`);
