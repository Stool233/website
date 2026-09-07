import { blogTopics, type BlogTopic } from "../blog-config.ts";

export interface PostSummary {
  id: string;
  data: {
    title: string;
    description?: string;
    date: string;
    tags: BlogTopic[];
    pinned: boolean;
  };
}

export function summarizePost(post: PostSummary): PostSummary {
  const { title, description, date, tags, pinned } = post.data;
  return { id: post.id, data: { title, description, date, tags, pinned } };
}

export function sortByDate(a: PostSummary, b: PostSummary) {
  return new Date(b.data.date).getTime() - new Date(a.data.date).getTime() || a.id.localeCompare(b.id);
}

export function sortForDisplay(a: PostSummary, b: PostSummary) {
  return Number(b.data.pinned) - Number(a.data.pinned) || sortByDate(a, b);
}

export function filterPosts(posts: PostSummary[], query: string, topic?: BlogTopic) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return posts.filter((post) => {
    if (topic && !post.data.tags.includes(topic)) return false;
    const text = [post.data.title, post.data.description, post.id,
      ...post.data.tags.flatMap((tag) => [tag, blogTopics[tag].label]),
    ].join(" ").toLocaleLowerCase();
    return terms.every((term) => text.includes(term));
  }).sort(sortForDisplay);
}
