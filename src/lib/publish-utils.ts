import type { ContentEntryRow } from "./database.types";

export type PublishAction = "publish" | "unpublish" | "archive";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mediaPattern = /^cms-media:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|png|webp)$/i;

export interface PublishRequest {
  action: PublishAction;
  contentId: string;
}

export function parsePublishRequest(value: unknown): PublishRequest | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if (
    (record.action !== "publish" && record.action !== "unpublish" && record.action !== "archive") ||
    typeof record.content_id !== "string" ||
    !uuidPattern.test(record.content_id)
  ) return undefined;

  return { action: record.action, contentId: record.content_id };
}

export function getMediaReferences(values: unknown[]) {
  const references = new Map<string, string>();
  const invalid: string[] = [];

  function visit(value: unknown) {
    if (typeof value === "string") {
      for (const match of value.matchAll(/cms-media:\/\/[^\s)"'<]+/gi)) {
        const reference = match[0];
        const parsed = mediaPattern.exec(reference);
        if (!parsed) {
          invalid.push(reference);
        } else {
          references.set(parsed[1].toLowerCase(), parsed[2].toLowerCase());
        }
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  }

  values.forEach(visit);
  return { references, invalid };
}

export function validatePublishEntry(entry: ContentEntryRow) {
  if (!entry.title.trim()) return "Add a title before publishing.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) || entry.slug.length > 120) {
    return "Use a lowercase URL slug with letters, numbers, and single hyphens.";
  }
  if (!entry.excerpt.trim()) return "Add an excerpt before publishing so archives and search metadata are complete.";
  if (!entry.body_markdown.trim()) return "Add content before publishing.";
  if (entry.body_markdown.length > 1_000_000) return "Content must be 1 MB or smaller.";
  if (/!\[\s*\]\(\s*cms-media:\/\//i.test(entry.body_markdown)) {
    return "Add descriptive alt text to every inserted CMS image before publishing.";
  }
  if (!entry.metadata || typeof entry.metadata !== "object" || Array.isArray(entry.metadata)) {
    return "Structured metadata must be a JSON object.";
  }

  for (const [label, value] of [
    ["Cover image", entry.cover_image_url],
    ["Thumbnail", entry.thumbnail_url],
    ["Social image", entry.og_image_url],
  ] as const) {
    if (value && !isSupportedMediaSource(value)) {
      return `${label} must use a site-relative path, HTTPS URL, or linked CMS image.`;
    }
  }
  return undefined;
}

function isSupportedMediaSource(value: string) {
  return (value.startsWith("/") && !value.startsWith("//")) ||
    /^https:\/\//i.test(value) ||
    mediaPattern.test(value);
}
