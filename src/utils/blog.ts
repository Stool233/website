import { blogTopics, type BlogTopic } from "../blog-config.ts";

export interface PostSummary {
  id: string;
  data: {
    title: string;
    description?: string;
    date: string;
    tags: BlogTopic[];
    order?: number;
  };
}

export function summarizePost(post: PostSummary): PostSummary {
  const { title, description, date, tags, order } = post.data;
  return { id: post.id, data: { title, description, date, tags, ...(order === undefined ? {} : { order }) } };
}

export function sortByDate(a: PostSummary, b: PostSummary) {
  return new Date(b.data.date).getTime() - new Date(a.data.date).getTime() || a.id.localeCompare(b.id);
}

export function isOrdered(post: PostSummary) {
  return post.data.order !== undefined;
}

// Posts with an explicit `order` come first (ascending), then the rest by date.
export function sortForDisplay(a: PostSummary, b: PostSummary) {
  const orderA = a.data.order ?? Infinity;
  const orderB = b.data.order ?? Infinity;
  return (orderA === orderB ? 0 : orderA < orderB ? -1 : 1) || sortByDate(a, b);
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
