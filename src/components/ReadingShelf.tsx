import { useEffect, useState } from "react";
import { blogTopics, topicIds, type BlogTopic } from "../blog-config";
import { filterReading, formatSavedDate, readingSource, type ReadingItem } from "../utils/reading";

type Filters = { query: string; topic?: BlogTopic };

export default function ReadingShelf({ items }: { items: ReadingItem[] }) {
  const [filters, setFilters] = useState<Filters>({ query: "" });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      const params = new URL(window.location.href).searchParams;
      setFilters({ query: params.get("q") ?? "", topic: topicIds.find((id) => id === params.get("topic")) });
    };
    sync();
    setReady(true);
    window.addEventListener("popstate", sync);
    document.addEventListener("astro:page-load", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      document.removeEventListener("astro:page-load", sync);
    };
  }, []);

  function update(next: Filters) {
    setFilters(next);
    const url = new URL(window.location.href);
    if (next.query.trim()) url.searchParams.set("q", next.query);
    else url.searchParams.delete("q");
    if (next.topic) url.searchParams.set("topic", next.topic);
    else url.searchParams.delete("topic");
    window.history.replaceState(window.history.state, "", url);
  }

  function selectTopic(topic: BlogTopic) {
    update({ ...filters, topic });
    document.getElementById("reading-filters")?.scrollIntoView({ block: "start" });
  }

  if (!items.length) return (
    <div className="rounded-2xl border border-[#e3e3e0] dark:border-[#2f2f2f] bg-surface-secondary/60 dark:bg-surface-dark-secondary px-6 py-14 text-center sm:px-12">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e3e3e0] dark:border-[#363636] bg-surface dark:bg-surface-dark text-ink-secondary dark:text-ink-dark-secondary">
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      <h2 className="text-xl font-semibold text-ink dark:text-ink-dark">The shelf is taking shape.</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-secondary dark:text-ink-dark-secondary">I'll collect the articles I keep coming back to here, with a short note on what makes each one worth reading.</p>
      <a href="/blog" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink dark:text-ink-dark hover:underline underline-offset-4">Explore my writing <span aria-hidden="true">&rarr;</span></a>
    </div>
  );

  const results = filterReading(items, filters.query, filters.topic);
  const searched = filterReading(items, filters.query);
  const availableTopics = topicIds.filter((topic) => items.some((item) => item.tags.includes(topic)));

  return (
    <div>
      <div id="reading-filters" className={ready ? "mb-8 scroll-mt-24 space-y-4" : "hidden"}>
        <form role="search" onSubmit={(event) => event.preventDefault()}>
          <label htmlFor="reading-search" className="sr-only">Search saved articles</label>
          <input id="reading-search" type="search" placeholder="Search articles, authors, or notes…" value={filters.query}
            onChange={(event) => update({ ...filters, query: event.target.value })}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark-secondary px-4 py-3 text-base text-ink dark:text-ink-dark placeholder:text-ink-tertiary focus:outline focus:outline-2 focus:outline-accent" />
        </form>
        {availableTopics.length > 0 && <div role="group" aria-label="Filter saved articles by topic" className="flex flex-wrap gap-2">
          {[undefined, ...availableTopics].map((topic) => (
            <button key={topic ?? "all"} type="button" aria-pressed={filters.topic === topic}
              onClick={() => update({ ...filters, topic })}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${filters.topic === topic
                ? "border-ink bg-ink text-white dark:border-ink-dark dark:bg-ink-dark dark:text-surface-dark"
                : "border-slate-200 dark:border-slate-700 text-ink-secondary dark:text-ink-dark-secondary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary"}`}>
              {topic ? blogTopics[topic].label : "All reads"}
              <span className="text-xs opacity-70">{topic ? searched.filter((item) => item.tags.includes(topic)).length : searched.length}</span>
            </button>
          ))}
        </div>}
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-ink-secondary dark:text-ink-dark-secondary">{results.length} saved {results.length === 1 ? "article" : "articles"}</p>
        {ready && (filters.query.trim() || filters.topic) ? <button type="button" onClick={() => update({ query: "" })} className="text-sm text-accent-dark dark:text-accent-light underline underline-offset-4">Clear filters</button>
          : <span className="text-xs text-ink-tertiary dark:text-ink-dark-tertiary">Newest saves first</span>}
      </div>

      {!results.length ? <div className="py-12 text-center">
        <h2 className="text-lg font-semibold text-ink dark:text-ink-dark">No matching reads</h2>
        <p className="mt-2 text-sm text-ink-secondary dark:text-ink-dark-secondary">Try another topic or a different search.</p>
      </div> : <ol className="divide-y divide-slate-200 dark:divide-slate-700/60">
        {results.map((item) => (
          <li key={item.id} className="py-7 sm:py-8">
            <article>
              <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary dark:text-ink-dark-secondary">
                <span className="break-all font-medium">{readingSource(item.url)}</span>
                {item.author && <span>{item.author}</span>}
                <time dateTime={item.savedAt} className="sm:ml-auto">Saved {formatSavedDate(item.savedAt)}</time>
              </div>
              <h2 className="text-xl font-semibold leading-snug text-ink dark:text-ink-dark sm:text-2xl">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="group inline-flex max-w-full items-start gap-3 hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                  <span className="min-w-0 break-words">{item.title}</span>
                  <svg className="mt-1 h-5 w-5 flex-none text-ink-tertiary group-hover:text-accent-dark dark:group-hover:text-accent-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </h2>
              <div className="mt-4 rounded-r-xl border-l-2 border-accent/30 bg-surface-secondary/70 dark:bg-surface-dark-secondary px-4 py-3.5">
                <p className="mb-1.5 text-xs font-medium text-ink-tertiary dark:text-ink-dark-secondary">Why I saved it</p>
                <p className="whitespace-pre-line break-words text-sm leading-relaxed text-ink-secondary dark:text-ink-dark-secondary">{item.note}</p>
              </div>
              {item.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag) => ready ? <button key={tag} type="button" aria-label={`Filter by ${blogTopics[tag].label}`} aria-pressed={filters.topic === tag}
                  onClick={() => selectTopic(tag)}
                  className="min-h-9 rounded-full bg-surface-tertiary px-3 py-1 text-xs text-ink-secondary hover:text-ink dark:bg-surface-dark-tertiary dark:text-ink-dark-secondary dark:hover:text-ink-dark">{blogTopics[tag].label}</button>
                  : <span key={tag} className="rounded-full bg-surface-tertiary px-3 py-1 text-xs text-ink-secondary dark:bg-surface-dark-tertiary dark:text-ink-dark-secondary">{blogTopics[tag].label}</span>)}
              </div>}
            </article>
          </li>
        ))}
      </ol>}
    </div>
  );
}
