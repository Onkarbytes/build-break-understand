import { parseDocument } from "yaml";
import type { CmsContentType } from "./database.types";
import { slugifyTitle } from "./cms-utils.ts";

const contentTypes = new Set<CmsContentType>(["article", "project", "research", "experiment", "now"]);
const frontmatterKeys = new Set([
  "title", "slug", "content_type", "contentType", "type", "excerpt", "summary", "description",
  "category", "tags", "cover_image_url", "coverImageUrl", "cover_image_alt", "coverImageAlt",
  "seo_title", "seoTitle", "seo_description", "seoDescription", "metadata",
]);

export function countMarkdownWords(markdown: string) {
  const prose = markdown
    .replace(/(```|~~~)[^\n]*\n[\s\S]*?\n\1/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, " $1 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/<[^>]*>/g, " ")
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s?|[-+*]\s+|\d+[.)]\s+)/gm, " ")
    .replace(/[*_~`]/g, " ");
  return prose.match(/[\p{L}\p{N}]+(?:[’'][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function formatReadingTime(wordCount: number) {
  const seconds = Math.ceil(Math.max(0, wordCount) * 60 / 220);
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

export interface MarkdownImport {
  title: string;
  slug: string;
  excerpt: string;
  contentType?: CmsContentType;
  category: string;
  tags: string[];
  coverImageUrl: string;
  coverImageAlt: string;
  seoTitle: string;
  seoDescription: string;
  metadata: Record<string, unknown>;
  body: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date));
}

function optionalText(frontmatter: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = frontmatter[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new Error(`Markdown frontmatter field "${key}" must be a plain value.`);
    }
    return String(value);
  }
  return "";
}

export function parseMarkdownImport(markdown: string, filename: string): MarkdownImport {
  const source = markdown.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const frontmatterMatch = source.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  let frontmatter: Record<string, unknown> = {};
  let body = source;

  if (frontmatterMatch) {
    const document = parseDocument(frontmatterMatch[1], { uniqueKeys: true });
    if (document.errors.length) {
      throw new Error(`Markdown frontmatter is invalid: ${document.errors[0].message}`);
    }
    const parsed: unknown = document.toJS({ maxAliasCount: 20 });
    if (parsed !== null && !isRecord(parsed)) {
      throw new Error("Markdown frontmatter must be a YAML object.");
    }
    frontmatter = (parsed ?? {}) as Record<string, unknown>;
    body = source.slice(frontmatterMatch[0].length);
  }

  const declaredType = optionalText(frontmatter, "content_type", "contentType", "type").toLowerCase();
  if (declaredType && !contentTypes.has(declaredType as CmsContentType)) {
    throw new Error(`Unsupported content type "${declaredType}" in Markdown frontmatter.`);
  }

  const title = optionalText(frontmatter, "title") ||
    filename.replace(/\.(?:md|markdown)$/i, "").replace(/[-_]+/g, " ").trim();
  const explicitSlug = optionalText(frontmatter, "slug");
  const tagsValue = frontmatter.tags;
  let tags: string[] = [];
  if (typeof tagsValue === "string") {
    tags = tagsValue.split(",").map((tag) => tag.trim()).filter(Boolean);
  } else if (tagsValue !== undefined && tagsValue !== null) {
    if (!Array.isArray(tagsValue) || tagsValue.some((tag) => typeof tag !== "string")) {
      throw new Error('Markdown frontmatter field "tags" must be a string or a list of strings.');
    }
    tags = tagsValue.map((tag) => tag.trim()).filter(Boolean);
  }

  let metadata: Record<string, unknown> = {};
  if (frontmatter.metadata !== undefined) {
    if (!isRecord(frontmatter.metadata)) throw new Error('Markdown frontmatter field "metadata" must be an object.');
    metadata = { ...frontmatter.metadata };
  }
  for (const [key, value] of Object.entries(frontmatter)) {
    if (!frontmatterKeys.has(key)) metadata[key] = value;
  }

  return {
    title,
    slug: explicitSlug || slugifyTitle(title),
    excerpt: optionalText(frontmatter, "excerpt", "summary", "description"),
    contentType: declaredType ? declaredType as CmsContentType : undefined,
    category: optionalText(frontmatter, "category"),
    tags,
    coverImageUrl: optionalText(frontmatter, "cover_image_url", "coverImageUrl"),
    coverImageAlt: optionalText(frontmatter, "cover_image_alt", "coverImageAlt"),
    seoTitle: optionalText(frontmatter, "seo_title", "seoTitle"),
    seoDescription: optionalText(frontmatter, "seo_description", "seoDescription"),
    metadata,
    body,
  };
}
