import { blogTopics, topicHref, type BlogTopic } from "../blog-config";

export default function PostTagStrip({ tags = [] }: { tags?: BlogTopic[] }) {
  if (!tags.length) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {tags.map((tag) => (
        <a key={tag} href={topicHref(tag)}
          className="rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-medium text-ink-secondary hover:text-ink dark:bg-surface-dark-tertiary dark:text-ink-dark-secondary dark:hover:text-ink-dark transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          {blogTopics[tag].label}
        </a>
      ))}
    </div>
  );
}
