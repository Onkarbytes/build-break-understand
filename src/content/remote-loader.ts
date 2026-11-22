import { createClient } from "@supabase/supabase-js";
import sanitizeHtml from "sanitize-html";
import type { Loader } from "astro/loaders";
import type { AstroIntegrationLogger } from "astro";

type CmsContentType = "article" | "project" | "research" | "experiment" | "now";

interface CmsRow {
  id: string;
  content_type: CmsContentType;
  title: string;
  slug: string;
  excerpt: string;
  body_markdown: string;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  tags: string[];
  category: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  published_at: string | null;
  updated_at: string;
  position: number;
  metadata: Record<string, unknown>;
}

const markdownMedia = /cms-media:\/\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|png|webp)\b/gi;

function publicMediaUrl(value: string | null, baseUrl: string) {
  if (!value) return undefined;
  const match = /^cms-media:\/\/([0-9a-f-]{36})\.(jpg|png|webp)$/i.exec(value);
  if (match) return `${baseUrl}/storage/v1/object/public/published-media/${match[1]}.${match[2]}`;
  if (value.startsWith("/") || /^https:\/\//i.test(value)) return value;
  throw new Error("CMS media URLs must be site-relative, HTTPS, or a supported published-media reference.");
}

function resolveMetadata(value: unknown, baseUrl: string): unknown {
  if (typeof value === "string") return publicMediaUrl(value, baseUrl) ?? value;
  if (Array.isArray(value)) return value.map((item) => resolveMetadata(item, baseUrl));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveMetadata(item, baseUrl)]),
    );
  }
  return value;
}

function toCollectionEntry(row: CmsRow, baseUrl: string) {
  const metadata = resolveMetadata(row.metadata ?? {}, baseUrl) as Record<string, unknown>;
  const body = row.body_markdown.replace(markdownMedia, (_reference, id: string, extension: string) =>
    `${baseUrl}/storage/v1/object/public/published-media/${id}.${extension.toLowerCase()}`,
  );
  const image = publicMediaUrl(row.og_image_url ?? row.cover_image_url, baseUrl);
  const data: Record<string, unknown> = {
    ...metadata,
    title: row.title,
    summary: row.excerpt,
    status: metadata.stage === "in-progress" ? "in-progress" : "published",
    public: true,
    publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    updatedAt: new Date(row.updated_at),
    date: row.published_at ? new Date(row.published_at) : undefined,
    tags: row.tags ?? [],
    category: row.category ?? undefined,
    seo: {
      description: row.seo_description ?? undefined,
      image,
    },
  };

  if (row.content_type === "now") {
    data.area = String(metadata.area ?? row.category ?? "Update");
    data.statusText = String(metadata.statusText ?? row.excerpt);
  }

  return { id: row.slug, body, data };
}

const allowedMarkdownHtml = {
  allowedTags: [
    "a", "blockquote", "br", "code", "del", "em", "h1", "h2", "h3", "h4", "h5", "h6",
    "hr", "img", "li", "ol", "p", "pre", "strong", "table", "tbody", "td", "th", "thead", "tr", "ul",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    code: ["class"],
    h1: ["id"], h2: ["id"], h3: ["id"], h4: ["id"], h5: ["id"], h6: ["id"],
    img: ["src", "alt", "title", "width", "height"],
    th: ["align"], td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "nofollow noopener noreferrer" }, true),
  },
};

function cmsRequired(logger: AstroIntegrationLogger) {
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.PUBLIC_SUPABASE_ANON_KEY;
  const required = process.env.CMS_REQUIRED === "true";

  if (!url && !key) {
    if (required) throw new Error("CMS_REQUIRED is enabled but PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are missing.");
    logger.info("Supabase CMS is not configured; loading local Astro content collections.");
    return undefined;
  }
  if (!url || !key) throw new Error("Set both PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY before building.");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("PUBLIC_SUPABASE_URL must be an absolute URL.");
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
    throw new Error("PUBLIC_SUPABASE_URL must use HTTPS outside local development.");
  }

  return { url: parsedUrl.origin, key };
}

export function createCmsLoader(
  contentType: CmsContentType,
  localLoader: Loader,
): Loader {
  return {
    name: `build-break-understand/${contentType}-cms`,
    async load(context) {
      const config = cmsRequired(context.logger);
      if (!config) {
        await localLoader.load(context);
        return;
      }

      context.store.clear();
      const supabase = createClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await supabase
        .from("content_entries")
        .select("id,content_type,title,slug,excerpt,body_markdown,cover_image_url,thumbnail_url,tags,category,seo_title,seo_description,og_image_url,published_at,updated_at,position,metadata")
        .eq("content_type", contentType)
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });

      if (error) {
        throw new Error(`Could not load published ${contentType} content from Supabase: ${error.message}`);
      }

      for (const rawRow of data ?? []) {
        const row = rawRow as unknown as CmsRow;
        const entry = toCollectionEntry(row, config.url);
        const parsedData = await context.parseData({ id: entry.id, data: entry.data });
        const rendered = await context.renderMarkdown(entry.body);
        context.store.set({
          id: entry.id,
          data: parsedData,
          body: entry.body,
          rendered: {
            ...rendered,
            html: sanitizeHtml(rendered.html, allowedMarkdownHtml),
          },
          digest: context.generateDigest({ id: entry.id, data: parsedData, body: entry.body }),
        });
      }
    },
  };
}
