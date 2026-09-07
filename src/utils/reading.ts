import { blogTopics, type BlogTopic } from "../blog-config.ts";

export interface ReadingItem {
  id: string;
  title: string;
  url: string;
  author?: string;
  savedAt: string;
  note: string;
  tags: BlogTopic[];
}

export function isArticleUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function isReadingDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
}

export function readingSource(url: string) {
  return new URL(url).hostname.replace(/^www\./, "");
}

export function formatSavedDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  });
}

export function filterReading(items: ReadingItem[], query = "", topic?: BlogTopic) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    if (topic && !item.tags.includes(topic)) return false;
    const text = [item.title, item.author, readingSource(item.url), item.note,
      ...item.tags.map((tag) => blogTopics[tag].label),
    ].join(" ").toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  }).sort((a, b) => b.savedAt.localeCompare(a.savedAt) || a.id.localeCompare(b.id));
}
