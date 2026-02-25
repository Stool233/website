import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
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
    tags: z.array(z.string()).optional(),
    image: z
      .object({
        src: z.string(),
        alt: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { blog };
