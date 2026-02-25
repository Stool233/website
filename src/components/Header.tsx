import { useState, useEffect } from "react";
import siteConfig from "../site-config";

interface Props {
  pathname: string;
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
    <header className="text-lg max-w-3xl mx-auto h-auto sm:h-18 px-6 flex mt-5 sm:mt-0 justify-between items-start sm:items-center relative">
      <div>
        <a
          href="/"
          className="nav-link font-medium text-xl hover:text-gray-800 dark:hover:text-white"
        >
          {siteConfig.title}
        </a>
      </div>

      {/* Mobile menu button */}
      <button
        className="sm:hidden nav-link p-1"
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

      {/* Nav links */}
      <div
        className={`${
          menuOpen ? "flex" : "hidden"
        } sm:flex gap-2 sm:gap-6 flex-col sm:flex-row absolute sm:relative top-12 sm:top-0 right-6 sm:right-0 bg-white dark:bg-black sm:bg-transparent p-4 sm:p-0 rounded-lg sm:rounded-none shadow-lg sm:shadow-none z-50`}
      >
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className={`nav-link ${
              pathname.includes(link.href)
                ? "text-sky-600"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            {link.text}
          </a>
        ))}
        <a
          href="/rss.xml"
          className="nav-link opacity-60 hover:opacity-100"
          aria-label="RSS Feed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1z" />
          </svg>
        </a>
      </div>
    </header>
  );
}
