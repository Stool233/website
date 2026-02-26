import { useState, useEffect } from "react";
import siteConfig from "../site-config";

interface Props {
  pathname: string;
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-ink-tertiary dark:text-ink-dark-tertiary hover:text-ink dark:hover:text-ink-dark hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary transition-all duration-200"
      aria-label="Toggle theme"
    >
      {dark ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

export default function Header({ pathname }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = siteConfig.headerNavLinks;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-surface/80 dark:bg-surface-dark/80 border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="max-w-3xl mx-auto h-16 px-6 flex items-center justify-between">
        <a
          href="/"
          className="font-semibold text-lg text-ink dark:text-ink-dark hover:text-ink dark:hover:text-ink-dark transition-colors lowercase"
        >
          {siteConfig.title}
        </a>

        {/* Mobile menu button */}
        <button
          className="sm:hidden p-2 rounded-lg text-ink-tertiary dark:text-ink-dark-tertiary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                pathname.includes(link.href)
                  ? "bg-surface-tertiary dark:bg-surface-dark-tertiary text-ink dark:text-ink-dark"
                  : "text-ink-secondary dark:text-ink-dark-secondary hover:text-ink dark:hover:text-ink-dark hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary"
              }`}
            >
              {link.text}
            </a>
          ))}
          <a
            href="/rss.xml"
            className="p-2 rounded-lg text-ink-tertiary dark:text-ink-dark-tertiary hover:text-ink dark:hover:text-ink-dark hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary transition-all duration-200"
            aria-label="RSS Feed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
            </svg>
          </a>
          <ThemeToggle />
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="sm:hidden absolute top-16 left-0 right-0 bg-surface/95 dark:bg-surface-dark/95 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-700/50 px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname.includes(link.href)
                    ? "bg-surface-tertiary dark:bg-surface-dark-tertiary text-ink dark:text-ink-dark"
                    : "text-ink-secondary dark:text-ink-dark-secondary hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary"
                }`}
              >
                {link.text}
              </a>
            ))}
            <div className="flex items-center gap-2 px-3 py-2">
              <a
                href="/rss.xml"
                className="p-2 rounded-lg text-ink-tertiary dark:text-ink-dark-tertiary hover:text-ink dark:hover:text-ink-dark transition-colors"
                aria-label="RSS Feed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
                </svg>
              </a>
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
