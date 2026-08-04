import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { Menu, Moon, Search, Sun, X } from 'lucide-react';
import { assetUrl } from '../data/sources';

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

export function Layout({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // 경로가 바뀌면 모바일 메뉴를 닫습니다. effect에서 setState하면 렌더가 한 번 더
  // 돌기 때문에, React가 권하는 '렌더 도중 상태 조정' 방식을 씁니다.
  const [renderedPath, setRenderedPath] = useState(location.pathname);
  if (renderedPath !== location.pathname) {
    setRenderedPath(location.pathname);
    setMenuOpen(false);
  }

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
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <a href="#main-content" className="skip-link">본문으로 건너뛰기</a>

      <header className="site-header">
        <div className="site-wrap flex h-[68px] items-center justify-between gap-6">
          <Link to="/" className="brand-lockup" aria-label="Paldyn AI Lab 홈">
            <span className="relative h-7 w-7 shrink-0">
              <img src={assetUrl('assets/logo-symbol-dark.png')} alt="" className="theme-logo theme-logo-light" />
              <img src={assetUrl('assets/logo-symbol-light.png')} alt="" className="theme-logo theme-logo-dark" />
            </span>
            <span className="brand-name">PALDYN</span>
            <span className="h-4 w-px bg-[var(--border)]" aria-hidden="true" />
            <span className="brand-suffix">AI LAB</span>
          </Link>

          <nav className="primary-nav hidden lg:flex" aria-label="주요 메뉴">
            <NavLink to="/" end>홈</NavLink>
            <NavLink to="/news">뉴스</NavLink>
            <NavLink to="/research">리서치</NavLink>
          </nav>

          <div className="flex items-center gap-1.5">
            <Link to="/research" className="icon-button" aria-label="글 검색으로 이동" title="검색">
              <Search size={17} strokeWidth={1.7} aria-hidden="true" />
            </Link>
            <button type="button" className="icon-button" onClick={toggleTheme} aria-label="밝은 테마와 어두운 테마 전환" title="테마 전환">
              <Sun size={17} strokeWidth={1.7} className="theme-icon theme-icon-dark" aria-hidden="true" />
              <Moon size={17} strokeWidth={1.7} className="theme-icon theme-icon-light" aria-hidden="true" />
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
              <NavLink to="/news" className="mobile-nav-link">뉴스</NavLink>
              <NavLink to="/research" className="mobile-nav-link">리서치</NavLink>
            </div>
          </nav>
        )}
      </header>

      <main id="main-content" key={location.pathname} className="page-transition">
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
    </div>
  );
}
