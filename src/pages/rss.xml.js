import rss from "@astrojs/rss";
import siteConfig from "../site-config";
import { getPosts } from "../utils/posts";

export const prerender = true;

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date),
      description: post.data.description,
      link: `/blog/${post.id}/`,
    })),
  });
}
