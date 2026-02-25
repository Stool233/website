import { getCollection } from "astro:content";

type CollectionPost = {
  data: Record<string, any>;
  [key: string]: any;
};

export function sortPostsByDate(a: CollectionPost, b: CollectionPost) {
  return new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
}

export async function getPosts(tag?: string) {
  const isProd = import.meta.env.PROD;
  return (
    await getCollection("blog", (post) => {
      if (isProd && post.data.draft) return false;
      if (tag) return post.data.tags?.includes(tag);
      return true;
    })
  ).sort(sortPostsByDate);
}
