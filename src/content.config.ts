import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { topicIds } from "./blog-config";

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

export const collections = { blog };
