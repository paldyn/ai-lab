import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, Moon, Search, Sun, X } from 'lucide-react';

type Theme = 'light' | 'dark';

export function Layout({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    if (location.hash) {
      window.requestAnimationFrame(() => {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.hash, location.pathname]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem('paldyn-ai-theme', nextTheme);
  };

  const logoBase = import.meta.env.BASE_URL;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="site-header">
        <div className="site-wrap flex h-[68px] items-center justify-between gap-6">
          <Link to="/" className="brand-lockup" aria-label="Paldyn AI Lab 홈">
            <span className="relative h-7 w-7 shrink-0">
              <img
                src={`${logoBase}assets/logo-symbol-dark.png`}
                alt=""
                className="theme-logo theme-logo-light"
              />
              <img
                src={`${logoBase}assets/logo-symbol-light.png`}
                alt=""
                className="theme-logo theme-logo-dark"
              />
            </span>
            <span className="brand-name">PALDYN</span>
            <span className="h-4 w-px bg-[var(--border)]" aria-hidden="true" />
            <span className="brand-suffix">AI LAB</span>
          </Link>

          <nav className="primary-nav hidden lg:flex" aria-label="주요 메뉴">
            <NavLink to="/" exact>홈</NavLink>
            <NavLink to="/news">뉴스</NavLink>
            <NavLink to="/research">리서치</NavLink>
          </nav>

          <div className="flex items-center gap-1.5">
            <Link to="/research" className="icon-button" aria-label="글 검색으로 이동" title="검색">
              <Search size={17} strokeWidth={1.7} />
            </Link>
            <button type="button" className="icon-button" onClick={toggleTheme} aria-label="테마 전환" title="테마 전환">
              {theme === 'dark' ? <Sun size={17} strokeWidth={1.7} /> : <Moon size={17} strokeWidth={1.7} />}
            </button>
            <button
              type="button"
              className="icon-button lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="메뉴 열기"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="mobile-nav" aria-label="모바일 메뉴">
            <div className="site-wrap grid grid-cols-2 gap-x-5">
              <NavLink to="/" exact className="mobile-nav-link">홈</NavLink>
              <NavLink to="/news" className="mobile-nav-link">뉴스</NavLink>
              <NavLink to="/research" className="mobile-nav-link">리서치</NavLink>
            </div>
          </nav>
        )}
      </header>

      <main key={location.pathname} className="page-transition">
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
