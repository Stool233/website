import { defineCollection, z } from "astro:content";
import { file, glob } from "astro/loaders";
import { topicIds } from "./blog-config";
import { isArticleUrl, isReadingDate } from "./utils/reading";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    date: z
      .string()
      .or(z.date())
      .transform((val) =>
        new Date(val).toLocaleDateString("en-us", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      ),
    draft: z.boolean().optional().default(false),
    tags: z.array(z.enum(topicIds)).min(1).max(3)
      .refine((tags) => new Set(tags).size === tags.length, "Use each topic only once"),
    pinned: z.boolean().default(false),
    image: z
      .object({
        src: z.string(),
        alt: z.string().optional(),
      })
      .optional(),
  }),
});

const reading = defineCollection({
  loader: file("src/content/reading.json"),
  schema: z.object({
    title: z.string().trim().min(1),
    url: z.string().url().refine(isArticleUrl, "Use an HTTP or HTTPS article URL without credentials"),
    author: z.string().trim().min(1).optional(),
    savedAt: z.string().refine(isReadingDate, "Use a valid YYYY-MM-DD date"),
    note: z.string().trim().min(1).max(1000),
    tags: z.array(z.enum(topicIds)).max(3).default([])
      .refine((tags) => new Set(tags).size === tags.length, "Use each topic only once"),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, reading };
