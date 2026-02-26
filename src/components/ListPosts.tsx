interface Post {
  id: string;
  slug: string;
  data: Record<string, any>;
  collection: string;
}

interface Props {
  list: Post[];
  mini?: boolean;
}

function getYear(date: string | Date) {
  return new Date(date).getFullYear();
}

function isSameYear(a: string | Date | undefined, b: string | Date | undefined) {
  return a && b && getYear(a) === getYear(b);
}

function getHref(post: Post) {
  if (post.data.redirect) return post.data.redirect;
  return `/${post.collection}/${post.id}`;
}

function getTarget(post: Post) {
  return post.data.redirect ? "_blank" : "_self";
}

export default function ListPosts({ list, mini = false }: Props) {
  if (!list || list.length === 0) {
    return <div className="py-6 text-ink-tertiary dark:text-ink-dark-tertiary text-sm">nothing here yet.</div>;
  }

  if (mini) {
    return (
      <ul className="list-none p-0 space-y-1">
        {list.map((post) => (
          <li key={post.data.title}>
            <a
              href={getHref(post)}
              target={getTarget(post)}
              className="group flex items-baseline gap-4 py-2.5 px-3 -mx-3 rounded-lg hover:bg-surface-secondary dark:hover:bg-surface-dark-secondary transition-all duration-200"
            >
              <time className="text-xs text-ink-tertiary dark:text-ink-dark-tertiary tabular-nums flex-none w-24">
                {post.data.date}
              </time>
              <span className="text-sm font-medium text-ink dark:text-ink-dark group-hover:text-ink dark:group-hover:text-ink-dark transition-colors truncate">
                {post.data.title}
              </span>
            </a>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="list-none p-0 space-y-3">
      {list.map((post, index) => (
        <li key={post.data.title}>
          {/* Year separator */}
          {!isSameYear(post.data.date, list[index - 1]?.data.date) && (
            <div className="select-none relative h-16 pointer-events-none">
              <span className="text-6xl xl:text-7xl font-neucha text-ink/[0.06] dark:text-ink-dark/[0.06] absolute -left-2 xl:-left-16 -top-1">
                {getYear(post.data.date)}
              </span>
            </div>
          )}

          <a
            href={getHref(post)}
            target={getTarget(post)}
            className="group block p-5 -mx-2 rounded-xl border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/50 hover:bg-surface-secondary/50 dark:hover:bg-surface-dark-secondary/50 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5"
          >
            <h3 className="text-xl font-semibold text-ink dark:text-ink-dark group-hover:text-ink dark:group-hover:text-ink-dark transition-colors mb-2 leading-snug">
              {post.data.title}
            </h3>
            {post.data.description && (
              <p className="text-sm text-ink-secondary dark:text-ink-dark-secondary mb-3 line-clamp-2">
                {post.data.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-ink-tertiary dark:text-ink-dark-tertiary">
              <time className="tabular-nums">{post.data.date}</time>
              {post.data.tags?.map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-surface-tertiary dark:bg-surface-dark-tertiary text-ink-secondary dark:text-ink-dark-secondary font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}
