export default function PinnedBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-dark dark:text-accent-light">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <path d="m16 3 5 5-4 1-3 5v3l-3-3-7 7 7-7-3-3h3l5-3 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Pinned
    </span>
  );
}
