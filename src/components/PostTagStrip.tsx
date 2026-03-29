interface Props {
  tags?: string[];
  maxVisible?: number;
}

export default function PostTagStrip({ tags = [], maxVisible = 2 }: Props) {
  if (tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = Math.max(tags.length - visibleTags.length, 0);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden whitespace-nowrap">
      {visibleTags.map((tag) => (
        <span
          key={tag}
          title={tag}
          className="min-w-0 max-w-full rounded-full bg-surface-tertiary px-2 py-0.5 font-medium text-ink-secondary dark:bg-surface-dark-tertiary dark:text-ink-dark-secondary"
        >
          <span className="block truncate">{tag}</span>
        </span>
      ))}

      {remainingCount > 0 && (
        <span className="flex-none rounded-full bg-surface-tertiary px-2 py-0.5 font-medium text-ink-secondary dark:bg-surface-dark-tertiary dark:text-ink-dark-secondary">
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
