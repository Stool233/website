import { useEffect, useState } from "react";
import { blogTopics, topicIds, topicHref, type BlogTopic } from "../blog-config";
import { filterPosts, type PostSummary } from "../utils/blog";
import ListPosts from "./ListPosts";

export default function BlogExplorer({ posts, topic }: { posts: PostSummary[]; topic?: BlogTopic }) {
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setQuery(new URL(window.location.href).searchParams.get("q") ?? "");
    sync();
    setReady(true);
    window.addEventListener("popstate", sync);
    document.addEventListener("astro:page-load", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      document.removeEventListener("astro:page-load", sync);
    };
  }, []);

  function search(value: string) {
    setQuery(value);
    const url = new URL(window.location.href);
    if (value.trim()) url.searchParams.set("q", value);
    else url.searchParams.delete("q");
    window.history.replaceState(window.history.state, "", url);
  }

  const results = filterPosts(posts, query, topic);
  const pinned = results.filter((post) => post.data.pinned);
  const regular = results.filter((post) => !post.data.pinned);
  const searched = filterPosts(posts, query);
  const tabs = [
    { id: undefined, label: "All posts", count: searched.length },
    ...topicIds.map((id) => ({ id, label: blogTopics[id].label, count: searched.filter((post) => post.data.tags.includes(id)).length })),
  ];

  return (
    <div>
      <nav aria-label="Blog topics" className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <a key={tab.id ?? "all"} href={topicHref(tab.id, query)} aria-current={tab.id === topic ? "page" : undefined}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${tab.id === topic
              ? "border-ink bg-ink text-white dark:border-ink-dark dark:bg-ink-dark dark:text-surface-dark"
              : "border-slate-200 dark:border-slate-700 text-ink-secondary dark:text-ink-dark-secondary hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary"}`}>
            {tab.label}<span className="text-xs opacity-70">{tab.count}</span>
          </a>
        ))}
      </nav>

      <form role="search" onSubmit={(event) => event.preventDefault()} className={ready ? "mb-6" : "hidden"}>
        <label htmlFor="blog-search" className="sr-only">Search articles</label>
        <div className="relative">
          <svg className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-ink-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
          <input id="blog-search" type="search" value={query} onChange={(event) => search(event.target.value)} placeholder="Search titles, summaries, or topics…"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-surface dark:bg-surface-dark-secondary py-3 pl-12 pr-4 text-base text-ink dark:text-ink-dark placeholder:text-ink-tertiary focus:outline focus:outline-2 focus:outline-accent" />
        </div>
      </form>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-ink-secondary dark:text-ink-dark-secondary">
          {results.length} {results.length === 1 ? "article" : "articles"}{query.trim() ? ` matching “${query.trim()}”` : ""}
        </p>
        {query.trim() && <button type="button" onClick={() => search("")} className="text-sm text-accent-dark dark:text-accent-light underline underline-offset-4">Clear search</button>}
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-12 text-center">
          <h2 className="font-semibold text-ink dark:text-ink-dark">No articles found</h2>
          <p className="mt-2 text-sm text-ink-secondary dark:text-ink-dark-secondary">Try a different search or browse another topic.</p>
          <a href="/blog" className="mt-5 inline-block text-sm text-accent-dark dark:text-accent-light underline underline-offset-4">View all articles</a>
        </div>
      ) : (
        <>
          {pinned.length > 0 && <section aria-labelledby="pinned-heading" className="mb-10">
            <h2 id="pinned-heading" className="mb-4 text-sm font-semibold text-ink dark:text-ink-dark">Pinned</h2>
            <ListPosts list={pinned} groupByYear={false} />
          </section>}
          {regular.length > 0 && <section aria-labelledby="archive-heading">
            <h2 id="archive-heading" className="text-sm font-semibold text-ink dark:text-ink-dark">{query.trim() ? "Search results" : "Latest writing"}</h2>
            <ListPosts list={regular} />
          </section>}
        </>
      )}
    </div>
  );
}
