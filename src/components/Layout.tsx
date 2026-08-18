import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { ArrowUp, Menu, Moon, Search, Sun, X } from 'lucide-react';
import { getArticleBySlug } from '../data/articles';
import { categoryById } from '../data/categories';
import { assetUrl } from '../data/sources';
import type { SectionId } from '../types/article';
import { SearchOverlay } from './SearchOverlay';
import { SiteUpdateGuard } from './SiteUpdateGuard';

const THEME_STORAGE_KEY = 'paldyn-ai-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

type Theme = 'light' | 'dark';

/**
 * 테마 규칙
 * 저장된 값이 있으면 그것을 쓰고, 없으면 OS 설정을 따릅니다.
 * 첫 적용은 index.html의 인라인 스크립트가 페인트 전에 끝내고,
 * 여기서는 상태를 React로 복제하지 않고 DOM을 직접 읽고 씁니다.
 * 서버 렌더 결과와 클라이언트 첫 렌더가 항상 같아야 하기 때문입니다.
 * (아이콘은 두 개를 모두 그려 두고 CSS가 골라 보여줍니다.)
 */
const systemTheme = (): Theme => (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light');

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
}

function toggleTheme() {
  const next: Theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);

  try {
    // 고른 값이 OS 설정과 같아지면 저장값을 지웁니다. 그래야 이후 OS를 바꿨을 때
    // 다시 따라갑니다. 별도의 '시스템' 버튼 없이 토글만으로 되돌아올 수 있습니다.
    if (next === systemTheme()) localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // 프라이빗 모드 등 저장이 막힌 환경에서는 이번 세션에만 적용합니다.
  }
}

/** 입력 중에는 단축키를 가로채지 않습니다. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * 글을 읽는 동안에도 그 글이 속한 섹션을 네비게이션에 켜 둡니다.
 *
 * 글 주소는 `/articles/<slug>` 하나라 경로만 보면 어느 칸도 안 켜지고, 글에 들어가는
 * 순간 '지금 어디에 있는가'가 사라집니다. 대신 카테고리에서 섹션을 꺼내 켭니다 —
 * 학습 글이면 학습이, 리서치 글이면 리서치가 켜집니다.
 *
 * 주소 구조로 푸는 방법도 있지만(글을 `/learn/<slug>` 아래로 옮기는 식) 그러면
 * 카테고리를 옮길 때마다 글 주소가 바뀝니다. 방금 186편을 다시 나눈 참이라
 * 그 비용이 실제로 크다는 것을 확인했습니다.
 */
function sectionOf(pathname: string): SectionId | undefined {
  const prefix = '/articles/';
  if (!pathname.startsWith(prefix)) return undefined;
  const article = getArticleBySlug(pathname.slice(prefix.length));
  return article ? categoryById[article.categoryId].section : undefined;
}

/**
 * 화면 한 칸의 단위. 학습은 분야를(/learn/<분야>), 뉴스는 탭을(/news/<탭>) 주소로
 * 고르지만 둘 다 다른 페이지로 가는 게 아니라 같은 목록을 거르는 일입니다. 한 칸으로
 * 묶어 두면 분야나 탭을 바꿔도 main을 다시 마운트하지 않습니다. 다시 마운트하면
 * 방금 누른 탭 버튼이 통째로 갈려 포커스가 body로 튕겨 나가고(좌우 화살표로 탭을
 * 잇달아 옮길 수 없게 됩니다), 아래 스크롤 effect가 돌아 읽던 자리가 맨 위로
 * 돌아가며, 진입 애니메이션이 다시 돕니다. 주소와 프리렌더는 그대로입니다.
 */
function viewKey(pathname: string): string {
  for (const section of ['/learn', '/news']) {
    if (pathname === section || pathname.startsWith(`${section}/`)) return section;
  }
  return pathname;
}

export function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const view = viewKey(location.pathname);

  /*
    글 화면에서도 그 글이 속한 섹션을 켜 둡니다. NavLink는 경로만 보므로
    `/articles/<slug>`에서는 아무것도 안 켜집니다 — 켤 칸을 여기서 정해 줍니다.
  */
  const readingSection = useMemo(() => sectionOf(location.pathname), [location.pathname]);
  const navClass = (section: SectionId, base = '') =>
    ({ isActive }: { isActive: boolean }) =>
      [base, isActive || readingSection === section ? 'active' : ''].filter(Boolean).join(' ');

  // 경로가 바뀌면 모바일 메뉴를 닫습니다. effect에서 setState하면 렌더가 한 번 더
  // 돌기 때문에, React가 권하는 '렌더 도중 상태 조정' 방식을 씁니다.
  const [renderedPath, setRenderedPath] = useState(location.pathname);
  if (renderedPath !== location.pathname) {
    setRenderedPath(location.pathname);
    setMenuOpen(false);
  }

  // '/' 로 검색을 엽니다. 글 목록이 긴 사이트에서 흔한 규약입니다.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;

      event.preventDefault();
      setSearchOpen(true);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // 저장된 선택이 없는 동안에는 OS 테마 변경을 실시간으로 따라갑니다.
  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const follow = () => {
      if (!storedTheme()) applyTheme(media.matches ? 'dark' : 'light');
    };

    media.addEventListener('change', follow);
    return () => media.removeEventListener('change', follow);
  }, []);

  useEffect(() => {
    if (location.hash) {
      window.requestAnimationFrame(() => {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    // html에 scroll-behavior: smooth가 걸려 있어(styles.css) 'auto'는 '즉시'가 아니라
    // '부드럽게'로 읽힙니다. 페이지를 옮길 때는 미끄러지지 않고 위에서 시작해야 합니다.
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.hash, view]);

  // 한 화면 넘게 내려가야 '맨 위로'를 내놓습니다. 고정 픽셀을 기준으로 삼으면
  // 좁은 화면에서는 너무 일찍, 넓은 화면에서는 너무 늦게 뜹니다.
  // 첫 렌더 값은 프리렌더 결과와 같아야 하므로 숨김에서 시작하고, 마운트 뒤에
  // 실제 위치를 한 번 잽니다 — 뒤로 가기로 중간 위치가 복원되면 스크롤 이벤트가
  // 아예 오지 않기 때문입니다.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      setAtTop(window.scrollY < window.innerHeight);
    };
    // 스크롤은 한 번 밀 때마다 수십 번 옵니다. 프레임마다 한 번으로 묶습니다.
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    measure();
    // passive는 '이 리스너는 스크롤을 막지 않는다'는 약속이라 브라우저가 기다리지 않습니다.
    window.addEventListener('scroll', schedule, { passive: true });
    // 기준이 화면 높이라 창 크기가 바뀌면 다시 재야 합니다.
    window.addEventListener('resize', schedule, { passive: true });
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  /*
    주요 메뉴의 '학습'과 '뉴스'에 답니다. viewKey가 /learn·/news를 하위 주소까지
    한 칸으로 묶어 둔 탓에 분야나 탭 화면에서 이 링크를 눌러도 위 스크롤 effect가
    돌지 않아, 목록 중간에 선 채로 머리말만 화면 밖에 남습니다. 자리를 지키는 것은
    옆 레일이나 탭으로 목록을 바꿀 때 필요한 것이고, 헤더 메뉴는 '섹션으로 간다'는
    신호라 맨 위에서 시작해야 합니다.
  */
  const startAtTop = () => window.scrollTo({ top: 0, behavior: 'instant' });

  const goToTop = () => {
    // 여기서는 behavior를 넘기지 않습니다. html의 scroll-behavior를 그대로 따르므로
    // '동작 줄이기'를 켠 환경에서는 스타일시트가 그 값을 auto로 덮어 즉시 이동합니다.
    // 'smooth'라고 적으면 그 덮어쓰기를 건너뛰게 됩니다.
    window.scrollTo({ top: 0 });
    // 화면만 올라가고 포커스가 문서 끝에 남으면 키보드 사용자는 Tab을 눌렀을 때
    // 여전히 문서 끝에서 이어갑니다. 건너뛰기 링크와 같은 자리로 옮깁니다.
    mainRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>

      <header className="site-header">
        <div className="site-wrap flex h-[70px] items-center justify-between gap-6">
          <Link to="/" className="brand-lockup" aria-label="Paldyn AI Lab 홈">
            <span className="relative h-7 w-7 shrink-0">
              <img src={assetUrl('assets/logo-symbol-black.svg')} alt="" className="theme-logo theme-logo-light" />
              <img src={assetUrl('assets/logo-symbol-white.svg')} alt="" className="theme-logo theme-logo-dark" />
            </span>
            <span className="brand-name">PALDYN</span>
            <span className="brand-divider" aria-hidden="true">|</span>
            <span className="brand-suffix">AI LAB</span>
          </Link>

          <nav className="primary-nav hidden lg:flex" aria-label="주요 메뉴">
            <NavLink to="/" end>홈</NavLink>
            <NavLink to="/news" className={navClass('news')} onClick={startAtTop}>뉴스</NavLink>
            <NavLink to="/learn" className={navClass('learn')} onClick={startAtTop}>학습</NavLink>
            <NavLink to="/research" className={navClass('research')}>리서치</NavLink>
          </nav>

          {/* 12px은 techblog.paldyn.com의 .nav-right와 같은 값입니다. */}
          <div className="flex items-center gap-3">
            {/*
              모양은 techblog.paldyn.com의 검색 입력창과 같지만 실제로는 버튼입니다 —
              누르면 오버레이가 열립니다. `<input>`으로 두면 여기에 글자를 칠 수 있는
              것처럼 보이는데 실제로는 첫 글자가 오버레이로 넘어가야 해서, 두 곳에
                포커스가 오가고 IME 조합이 끊깁니다. 보이는 것만 맞추고 동작은 그대로 둡니다.
            */}
            <button
              type="button"
              className="nav-search-trigger"
              onClick={() => setSearchOpen(true)}
              aria-label="글과 소식 검색 열기"
              title="검색 ( / )"
            >
              <Search size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>&apos;/&apos;로 검색</span>
            </button>
            <button type="button" className="icon-button" onClick={toggleTheme} aria-label="밝은 테마와 어두운 테마 전환" title="테마 전환">
              <Sun size={16} strokeWidth={1.7} className="theme-icon theme-icon-dark" aria-hidden="true" />
              <Moon size={16} strokeWidth={1.7} className="theme-icon theme-icon-light" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav id="mobile-nav" className="mobile-nav" aria-label="모바일 메뉴">
            <div className="site-wrap grid grid-cols-2 gap-x-5">
              <NavLink to="/" end className="mobile-nav-link">홈</NavLink>
              <NavLink to="/news" className={navClass('news', 'mobile-nav-link')} onClick={startAtTop}>뉴스</NavLink>
              <NavLink to="/learn" className={navClass('learn', 'mobile-nav-link')} onClick={startAtTop}>학습</NavLink>
              <NavLink to="/research" className={navClass('research', 'mobile-nav-link')}>리서치</NavLink>
            </div>
          </nav>
        )}
      </header>

      <main id="main-content" ref={mainRef} tabIndex={-1} key={view} className="page-transition">
        {children}
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="site-wrap grid gap-10 py-12 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="font-mono text-[11px] tracking-[0.16em] text-[var(--text-muted)]">PALDYN / AI LAB</span>
              <span className="h-px w-10 bg-[var(--border)]" />
            </div>
            <p className="max-w-md text-sm leading-7 text-[var(--text-dim)]">
              AI를 이해하고 배우는 데 필요한 개념, 수학, 논문과 실험을 연결해 기록합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--text-dim)]">
            <a href="https://paldyn.com" className="footer-link">Official</a>
            <a href="https://techblog.paldyn.com" className="footer-link">Tech Blog</a>
            <span>© 2026 PALDYN</span>
          </div>
        </div>
      </footer>

      {/*
        맨 위로. 팝업이 열리면 #root에 inert가 붙어 여기까지 함께 잠기므로
        따로 닫을 조건을 두지 않습니다 — 보이는 것만 CSS에서 감춥니다.
      */}
      <button
        type="button"
        className={`icon-button to-top${atTop ? '' : ' is-shown'}`}
        onClick={goToTop}
        aria-label="맨 위로 이동"
        title="맨 위로"
      >
        <ArrowUp size={18} strokeWidth={1.7} aria-hidden="true" />
      </button>

      {/*
        새 배포 알림. 여기 두는 이유는 모든 화면에 함께 있어야 하고, 경로 이동을
        경계로 삼기 때문입니다 — Layout이 그 둘을 다 아는 유일한 자리입니다.
      */}
      <SiteUpdateGuard />

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
