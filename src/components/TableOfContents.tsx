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
    <nav className="rounded-lg p-4">
      <h2 className="text-base font-semibold mb-3 text-sky-600 dark:text-white">
        Table of Contents
      </h2>
      <ul className="list-none p-0 m-0">
        {filteredHeadings.map((heading) => (
          <li key={heading.slug} className="mb-1.5 leading-tight">
            <a
              href={`#${heading.slug}`}
              onClick={(e) => handleClick(e, heading.slug)}
              title={heading.text}
              className={`block text-sm py-1 px-2 rounded transition-all duration-200 no-underline truncate border-l-[3px] ${
                activeId === heading.slug
                  ? "text-sky-600 font-medium bg-blue-600/10 border-sky-600"
                  : "text-gray-600 dark:text-neutral-500 hover:text-sky-600 hover:bg-gray-200/20 hover:translate-x-0.5 border-transparent"
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
