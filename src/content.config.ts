import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { createCmsLoader } from "./content/remote-loader";

const isSafeMediaSource = (value: string) => {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const httpsUrl = z.url().refine(isHttpsUrl, "URL must use HTTPS.");

const baseFields = {
  title: z.string().min(1),
  summary: z.string().min(1),
  status: z.enum(["draft", "in-progress", "published"]).default("draft"),
  public: z.boolean().default(false),
  date: z.coerce.date().optional(),
  publishedAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
  seo: z.object({
    description: z.string().optional(),
    image: z.string().refine(isSafeMediaSource, "Image must be a site path or an HTTPS URL.").optional(),
  }).optional(),
};

const referenceSchema = z.union([
  z.string(),
  z.object({ title: z.string().min(1), url: httpsUrl }),
]);

const mediaSchema = z.object({
  src: z.string().refine(isSafeMediaSource, "Image must be a site path or an HTTPS URL."),
  alt: z.string().min(1),
  caption: z.string().optional(),
});

const projects = defineCollection({
  loader: createCmsLoader("project", glob({ pattern: "**/*.md", base: "./src/content/projects" })),
  schema: z.object({
    ...baseFields,
    role: z.string().optional(),
    stack: z.array(z.string()).default([]),
    architecture: z.string().optional(),
    sections: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
    screenshots: z.array(mediaSchema).default([]),
    sourceCodeUrl: httpsUrl.optional(),
    demoUrl: httpsUrl.optional(),
    lessons: z.array(z.string()).default([]),
  }),
});

const investigations = defineCollection({
  loader: createCmsLoader("research", glob({ pattern: "**/*.md", base: "./src/content/investigations" })),
  schema: z.object({
    ...baseFields,
    topics: z.array(z.string()).default([]),
    methodology: z.string().optional(),
    technicalDetails: z.string().optional(),
    diagrams: z.array(mediaSchema).default([]),
    code: z.array(z.object({ language: z.string(), code: z.string() })).default([]),
    findings: z.array(z.string()).default([]),
    limitations: z.array(z.string()).default([]),
    references: z.array(referenceSchema).default([]),
    conclusion: z.string().optional(),
    disclosureStatus: z.string().optional(),
  }),
});

const articles = defineCollection({
  loader: createCmsLoader("article", glob({ pattern: "**/*.md", base: "./src/content/articles" })),
  schema: z.object({
    ...baseFields,
    references: z.array(referenceSchema).default([]),
    related: z.array(z.string()).default([]),
  }),
});

const experiments = defineCollection({
  loader: createCmsLoader("experiment", glob({ pattern: "**/*.md", base: "./src/content/experiments" })),
  schema: z.object({
    ...baseFields,
    hypothesis: z.string().optional(),
    scope: z.string().optional(),
    methodology: z.string().optional(),
    observations: z.array(z.string()).default([]),
    limitations: z.array(z.string()).default([]),
    references: z.array(referenceSchema).default([]),
  }),
});

const nowUpdates = defineCollection({
  loader: createCmsLoader("now", glob({ pattern: "**/*.md", base: "./src/content/now" })),
  schema: z.object({
    ...baseFields,
    area: z.string().min(1),
    statusText: z.string().min(1),
  }),
});

export const collections = {
  projects,
  investigations,
  articles,
  experiments,
  now: nowUpdates,
};
