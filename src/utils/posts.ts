import { getCollection } from "astro:content";
import { sortByDate } from "./blog";
import type { BlogTopic } from "../blog-config";

export async function getPosts(tag?: BlogTopic) {
  const isProd = import.meta.env.PROD;
  return (
    await getCollection("blog", (post) => {
      if (isProd && post.data.draft) return false;
      if (tag) return post.data.tags?.includes(tag);
      return true;
    })
  ).sort(sortByDate);
}
