import type { CmsContentType } from "./database.types";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const allowedTypes = new Set<CmsContentType>(["article", "project", "research", "experiment", "now"]);
const mediaPattern = /^cms-media:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;

export function slugifyTitle(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

export function validateContentFields(input: {
  contentType: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  tags: string;
  category: string;
  seoTitle: string;
  seoDescription: string;
  metadata: string;
}) {
  const errors: string[] = [];
  if (!allowedTypes.has(input.contentType as CmsContentType)) errors.push("Choose a supported content type.");
  if (!input.title.trim() || input.title.trim().length > 200) errors.push("Title is required and must be 200 characters or fewer.");
  if (!slugPattern.test(input.slug) || input.slug.length > 120) errors.push("Use a lowercase URL slug with letters, numbers, and single hyphens.");
  if (input.excerpt.length > 500) errors.push("Excerpt must be 500 characters or fewer.");
  if (input.body.length > 1_000_000) errors.push("Content must be 1 MB or smaller.");
  if (input.category.length > 100) errors.push("Category must be 100 characters or fewer.");
  if (input.seoTitle.length > 200) errors.push("SEO title must be 200 characters or fewer.");
  if (input.seoDescription.length > 320) errors.push("SEO description must be 320 characters or fewer.");
  if (input.tags.split(",").some((tag) => tag.trim().length > 64)) errors.push("Each tag must be 64 characters or fewer.");

  let metadata: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(input.metadata || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      errors.push("Structured metadata must be a JSON object.");
    } else {
      metadata = parsed as Record<string, unknown>;
      if (JSON.stringify(metadata).length > 32_000) errors.push("Structured metadata must be 32 KB or smaller.");
    }
  } catch {
    errors.push("Structured metadata must be valid JSON.");
  }

  if (/cms-media:\/\//i.test(input.body)) {
    const references = input.body.match(/cms-media:\/\/[^\s)>"']+/gi) ?? [];
    if (references.some((reference) => !mediaPattern.test(reference.replace(/[.,;]+$/, "")))) {
      errors.push("An inserted media reference is invalid. Remove it and insert the asset again.");
    }
  }

  return {
    errors,
    metadata,
    tags: [...new Set(input.tags.split(",").map((tag) => tag.trim()).filter(Boolean))],
  };
}

export function detectImageType(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg" as const;
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return "image/png" as const;
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp" as const;
  return undefined;
}

export function mediaExtension(mimeType: "image/jpeg" | "image/png" | "image/webp") {
  return mimeType === "image/jpeg" ? "jpg" : mimeType.slice("image/".length);
}
