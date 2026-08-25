import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * 제목이 화면 위로 사라진 뒤 머리에 붙는 띠.
 *
 * 글을 읽다 「이 글 제목이 뭐였더라」 싶을 때 맨 위로 되돌아가야 했습니다. 목차
 * 사이드바가 절 이름은 알려 주지만 **제목은 어디에도 남지 않고**, 그나마도
 * 1024px 아래에서는 목차가 본문 위로 접혀 따라오지 않습니다.
 *
 * 그래서 제목을 위에 남깁니다. 사이트 헤더(70px) 바로 아래에 붙고, 큰 제목이
 * 화면에서 나갈 때 나타났다가 되돌아오면 사라집니다.
 *
 * **자리를 차지하지 않도록 `fixed`로 둡니다.** `sticky`로 두면 흐름 안에 남아
 * 글 맨 위에서도 48px을 먹습니다 — 정작 그때는 진짜 제목이 바로 아래 있어 띠가
 * 필요 없는 자리입니다.
 */
interface Props {
  /** 이것이 화면에서 나가면 띠가 선다. 보통 글의 큰 제목이다. */
  watch: RefObject<HTMLElement | null>;
  /** 진행 막대가 재는 대상. 본문이 늦게 오면 그동안 막대는 0이다. */
  progressOf: RefObject<HTMLElement | null>;
  label: string;
  accent: string;
  title: string;
  /** 지금 읽고 있는 절. 목차가 접히는 좁은 화면에서는 이것이 유일한 표시다. */
  section?: string;
}

export function ArticleTitleBar({ watch, progressOf, label, accent, title, section }: Props) {
  const [shown, setShown] = useState(false);
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const target = watch.current;
    if (!target || typeof IntersectionObserver !== 'function') return undefined;

    const observer = new IntersectionObserver((entries) => setShown(!entries[0].isIntersecting), {
      // 제목의 마지막 한 줄이 헤더 아래로 사라지는 순간을 경계로 삼습니다.
      rootMargin: '-70px 0px 0px 0px',
    });
    observer.observe(target);

    return () => observer.disconnect();
  }, [watch]);

  useEffect(() => {
    /*
      진행은 **본문 기준**입니다. 문서 전체로 재면 머리말과 아래 목록·푸터까지
      들어가 본문 끝에서도 막대가 다 안 차고, 그러면 남은 분량을 잘못 알려 줍니다.
    */
    const measure = () => {
      frame.current = 0;
      const prose = progressOf.current;
      if (!prose) return;

      const box = prose.getBoundingClientRect();
      const passed = -box.top;
      const span = box.height - window.innerHeight;
      if (span <= 0) {
        setProgress(passed > 0 ? 1 : 0);
        return;
      }
      setProgress(Math.min(1, Math.max(0, passed / span)));
    };
    const schedule = () => {
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [progressOf]);

  return (
    <div className={`article-titlebar${shown ? ' is-shown' : ''}`} aria-hidden={!shown}>
      <div className="site-wrap article-titlebar-row">
        <span className="article-titlebar-label" style={{ color: accent }}>
          {label}
        </span>
        {/*
          좁은 화면에서는 제목과 절을 위아래로 쌓습니다. 한 줄에 나란히 두면 둘 다
          잘려 어느 쪽도 못 읽습니다 — 430pt에서 제목만으로도 이미 꽉 찹니다.
          넓은 화면에서는 자리가 남으므로 한 줄로 펴고 절을 오른쪽 끝에 붙입니다.
        */}
        <span className="article-titlebar-stack">
          <button type="button" className="article-titlebar-title" onClick={() => window.scrollTo({ top: 0 })}>
            {title}
          </button>
          {section && <span className="article-titlebar-section">{section}</span>}
        </span>
      </div>
      <div className="article-titlebar-progress" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
