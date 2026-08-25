import { useCallback, useEffect, useRef, useState } from 'react';

/*
  목차가 지금 절을 짚고, 눌러서 옮기는 일.

  **글과 자격증이 함께 씁니다.** 자격증 상세도 절이 다섯이라 목차가 필요한데,
  같은 동작을 다시 쓰면 한쪽만 고쳐지는 자리가 생깁니다 — 판정선(`readingLine`)이
  CSS의 `--heading-anchor-offset`과 어긋났던 사고가 정확히 그런 종류였습니다.
*/

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** 목차로 이동하는 시간. 가까우면 짧게, 멀어도 이 위를 넘지 않습니다. */
const GLIDE_MIN_MS = 160;
const GLIDE_MAX_MS = 320;

/**
 * 목차로 뛰어든 헤딩이 멈추는 자리(`--heading-anchor-offset`, styles.css)를 읽어
 * 판정선으로 씁니다. 이 위로 올라간 헤딩을 '지나갔다'로 칩니다.
 *
 * 상수로 박아 두었다가 어긋난 적이 있습니다 — CSS는 96px인데 여기는 88px이라,
 * 목차 3번을 누르면 그 헤딩이 96px에 서고 88 이하가 아니라서 '아직 안 지나간 것'이
 * 되어 2번이 짚혔습니다. 값을 한 곳에서만 정하게 두면 다시 갈리지 않습니다.
 *
 * 2px은 소수점 여유입니다. 브라우저가 96.4px에 세우는 일이 있어 딱 같은 값으로
 * 비교하면 같은 증상이 그대로 돌아옵니다.
 */
function readingLine(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--heading-anchor-offset');
  const px = Number.parseFloat(raw);
  return (Number.isFinite(px) ? px : 96) + 2;
}

/**
 * 목차에서 지금 보고 있는 절을 짚어 줍니다.
 *
 * **머리 위를 지나간 헤딩 중 마지막**이 지금 절입니다. 스크롤이 멈춘 자리에서
 * 위로 가장 가까운 제목이 곧 읽고 있는 절이라는 뜻이고, 절이 화면보다 길든
 * 짧든 답이 하나로 정해집니다.
 *
 * 예전에는 IntersectionObserver로 '화면 상단 88px~30% 띠에 들어온 헤딩'을
 * 찾고, 띠가 비면 지나간 것 중 마지막으로 되돌리는 두 갈래였습니다. 그런데
 * 자리를 다시 계산하는 곳이 **관찰자 콜백 하나뿐**이라, 콜백이 안 오는 동안은
 * 마운트 때 계산한 첫 절에 그대로 굳었습니다. 긴 절을 읽는 내내 경계를 넘는
 * 헤딩이 없으면 콜백이 안 오고, 관찰자를 아예 안 돌려주는 환경도 있습니다.
 * 헤딩은 글 하나에 열 개 안팎이라 스크롤마다 재도 충분히 쌉니다 — 관찰자로
 * 아끼려던 비용보다 '안 따라온다'는 고장이 훨씬 비쌉니다.
 *
 * 목차를 눌러 이동하는 일도 여기서 맡습니다. 짚는 자리와 옮기는 동작이 서로를
 * 보고 움직여야 해서(이동 중에는 짚기를 멈춥니다) 나눠 두면 상태가 둘로 갈립니다.
 */
export function useActiveHeading(ids: string[]): {
  active: string | undefined;
  goTo: (id: string) => void;
} {
  const [active, setActive] = useState<string | undefined>(undefined);

  /*
    목차를 눌러 이동하는 동안에는 스크롤이 짚는 절을 무시합니다. 잠그지 않으면
    내려가는 내내 지나치는 절마다 강조가 옮겨 다니다 맨 끝에야 제자리를 잡습니다.
  */
  const locked = useRef(false);
  const glide = useRef(0);

  useEffect(() => {
    if (ids.length === 0) return undefined;

    let frame = 0;
    // 프레임마다 읽으면 스크롤 중에 스타일 재계산이 걸립니다. 한 번 재 두고
    // 창 크기가 바뀔 때만 다시 잽니다(반응형에서 값이 달라질 수 있습니다).
    let line = readingLine();

    const pick = () => {
      frame = 0;
      if (locked.current) return;
      // 아무것도 안 지났으면 첫 절입니다 — 글 맨 위가 곧 첫 절입니다.
      let current = ids[0];
      for (const id of ids) {
        const node = document.getElementById(id);
        if (node && node.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };

    // 스크롤은 프레임보다 자주 옵니다. rAF로 한 프레임에 한 번만 재게 묶습니다.
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(pick);
    };

    const onResize = () => {
      line = readingLine();
      schedule();
    };

    // 이동하는 도중 직접 굴리면 즉시 손을 뗍니다 — 화면을 두고 다투지 않습니다.
    const release = () => {
      if (!locked.current) return;
      cancelAnimationFrame(glide.current);
      locked.current = false;
      schedule();
    };

    pick();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchstart', release, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      cancelAnimationFrame(glide.current);
      locked.current = false;
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchstart', release);
    };
  }, [ids]);

  /**
   * 목차 항목으로 이동합니다.
   *
   * 브라우저 기본(`html { scroll-behavior: smooth }`)을 쓰지 않고 직접 굴립니다.
   * 그쪽은 이동 거리에 비례해 길어져서, 글 아래쪽 절을 누르면 한참 내려간 뒤에야
   * 강조가 따라붙는 것처럼 보였습니다. 여기서는 누르는 즉시 강조를 옮기고 이동은
   * 320ms 안에 끝냅니다. techblog.paldyn.com의 목차와 같은 방식입니다.
   */
  const goTo = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    locked.current = true;
    setActive(id);

    // 헤딩에 걸어 둔 scroll-margin-top(고정 헤더 높이 + 여백)을 그대로 씁니다.
    const offset = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;

    cancelAnimationFrame(glide.current);
    const start = window.scrollY;
    const limit = document.documentElement.scrollHeight - window.innerHeight;
    const distance = Math.max(0, Math.min(top, limit)) - start;

    const settle = () => {
      locked.current = false;
      // 주소는 도착한 뒤에 바꿉니다. 히스토리에 쌓지 않아 뒤로 가기가 글을 빠져나갑니다.
      window.history.replaceState(null, '', `#${id}`);
    };

    /*
      굴리지 않고 바로 놓는 세 경우입니다.

      `document.hidden`이 여기 있는 이유가 중요합니다. 숨은 탭에서는
      requestAnimationFrame이 멎습니다 — 그대로 두면 `step`이 한 번도 안 불려
      스크롤도 안 되고 `locked`가 영영 안 풀려, 탭을 다시 열었을 때 목차가
      한 항목에 얼어붙은 채로 남습니다.
    */
    const still =
      document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still || Math.abs(distance) < 2) {
      window.scrollTo({ top: start + distance, behavior: 'instant' });
      settle();
      return;
    }

    const duration = Math.min(GLIDE_MAX_MS, Math.max(GLIDE_MIN_MS, Math.abs(distance) * 0.25));
    const began = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - began) / duration);
      window.scrollTo({ top: start + distance * easeOut(progress), behavior: 'instant' });
      if (progress < 1) glide.current = requestAnimationFrame(step);
      else settle();
    };
    glide.current = requestAnimationFrame(step);
  }, []);

  return { active, goTo };
}
