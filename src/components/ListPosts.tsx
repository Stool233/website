import PostTagStrip from "./PostTagStrip";
import PinnedBadge from "./PinnedBadge";
import type { PostSummary } from "../utils/blog";

export default function ListPosts({ list, groupByYear = true }: { list: PostSummary[]; groupByYear?: boolean }) {
  return (
    <ul className="list-none p-0 space-y-3">
      {list.map((post, index) => {
        const year = new Date(post.data.date).getFullYear();
        const previousYear = index ? new Date(list[index - 1].data.date).getFullYear() : undefined;
        return (
          <li key={post.id}>
            {groupByYear && year !== previousYear && (
              <h3 className="pt-6 pb-3 text-sm font-semibold text-ink-tertiary dark:text-ink-dark-tertiary">{year}</h3>
            )}
            <article className={`rounded-xl border p-5 transition-colors ${post.data.pinned
              ? "border-accent/20 bg-accent/5"
              : "border-slate-200/70 dark:border-slate-700/50 hover:bg-surface-secondary/50 dark:hover:bg-surface-dark-secondary/50"}`}>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink-tertiary dark:text-ink-dark-tertiary">
                <time dateTime={new Date(post.data.date).toISOString()}>{post.data.date}</time>
                {post.data.pinned && <PinnedBadge />}
              </div>
              <h3 className="mb-2 text-xl font-semibold leading-snug text-ink dark:text-ink-dark">
                <a href={`/blog/${post.id}/`} className="hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">
                  {post.data.title}
                </a>
              </h3>
              {post.data.description && <p className="mb-4 text-sm leading-relaxed text-ink-secondary dark:text-ink-dark-secondary line-clamp-2">{post.data.description}</p>}
              <PostTagStrip tags={post.data.tags} />
            </article>
          </li>
        );
      })}
    </ul>
  );
}
