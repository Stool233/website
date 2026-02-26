import { useState, useEffect, useCallback } from "react";

interface Heading {
  depth: number;
  slug: string;
  text: string;
}

interface Props {
  headings: Heading[];
}

export default function TableOfContents({ headings }: Props) {
  const [activeId, setActiveId] = useState<string>("");

  const filteredHeadings = headings.filter((h) => h.depth <= 2);

  const updateActiveHeading = useCallback(() => {
    const scrollY = window.scrollY;
    let current = "";

    for (let i = filteredHeadings.length - 1; i >= 0; i--) {
      const el = document.getElementById(filteredHeadings[i].slug);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (scrollY >= top - 120) {
          current = filteredHeadings[i].slug;
          break;
        }
      }
    }

    setActiveId(current || filteredHeadings[0]?.slug || "");
  }, [filteredHeadings]);

  useEffect(() => {
    updateActiveHeading();

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActiveHeading();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [updateActiveHeading]);

  const handleClick = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    const target = document.getElementById(slug);
    if (target) {
      window.scrollTo({ top: target.offsetTop - 100, behavior: "smooth" });
      history.pushState(null, "", `#${slug}`);
      setActiveId(slug);
    }
  };

  if (filteredHeadings.length === 0) return null;

  return (
    <nav className="rounded-xl bg-surface-secondary/50 dark:bg-surface-dark-secondary/50 backdrop-blur-sm p-5">
      <h2 className="text-xs font-semibold mb-4 text-ink-tertiary dark:text-ink-dark-tertiary uppercase tracking-wider">
        Contents
      </h2>
      <ul className="list-none p-0 m-0 space-y-0.5">
        {filteredHeadings.map((heading) => (
          <li key={heading.slug}>
            <a
              href={`#${heading.slug}`}
              onClick={(e) => handleClick(e, heading.slug)}
              title={heading.text}
              className={`block text-sm py-1.5 px-3 rounded-md transition-all duration-200 no-underline truncate ${
                heading.depth === 2 ? "pl-6" : ""
              } ${
                activeId === heading.slug
                  ? "bg-surface-tertiary dark:bg-surface-dark-tertiary text-ink dark:text-ink-dark font-medium border-l-2 border-ink-tertiary dark:border-ink-dark-tertiary"
                  : "text-ink-tertiary dark:text-ink-dark-tertiary hover:text-ink dark:hover:text-ink-dark hover:bg-surface-tertiary dark:hover:bg-surface-dark-tertiary"
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
