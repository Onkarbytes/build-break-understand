import assert from "node:assert/strict";
import test from "node:test";
import { detectImageType, mediaExtension, slugifyTitle } from "../src/lib/cms-utils.ts";
import { countMarkdownWords, formatReadingTime, parseMarkdownImport } from "../src/lib/content-utils.ts";
import { getMediaReferences, parsePublishRequest, validatePublishEntry } from "../src/lib/publish-utils.ts";

const contentId = "123e4567-e89b-42d3-a456-426614174000";

function entry(overrides = {}) {
  return {
    id: contentId,
    content_type: "article",
    title: "A useful article",
    slug: "a-useful-article",
    excerpt: "An introduction.",
    body_markdown: "An article body.",
    cover_image_url: null,
    thumbnail_url: null,
    tags: [],
    category: null,
    seo_title: null,
    seo_description: null,
    og_image_url: null,
    status: "draft",
    featured: false,
    published_at: null,
    position: 0,
    metadata: {},
    created_by: contentId,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

test("slugifies titles without producing invalid separators", () => {
  assert.equal(slugifyTitle("  Café / Zero Trust  "), "cafe-zero-trust");
  assert.equal(slugifyTitle("---"), "");
});

test("counts readable Markdown text and formats short reading estimates", () => {
  assert.equal(countMarkdownWords("# A *small* [article](https://example.com)\n\n```js\nconst ignored = true;\n```"), 3);
  assert.equal(formatReadingTime(0), "0 sec");
  assert.equal(formatReadingTime(1), "1 sec");
  assert.equal(formatReadingTime(220), "1 min");
  assert.equal(formatReadingTime(221), "2 min");
});

test("imports Markdown body and recognized YAML frontmatter", () => {
  const imported = parseMarkdownImport(`---
title: "A field note"
type: research
summary: A concise summary
category: Web security
tags:
  - markdown
  - research
methodology: Static analysis
metadata:
  disclosureStatus: unpublished
---
# Finding

**Keep this Markdown intact.**
`, "field-note.md");

  assert.equal(imported.title, "A field note");
  assert.equal(imported.slug, "a-field-note");
  assert.equal(imported.contentType, "research");
  assert.equal(imported.excerpt, "A concise summary");
  assert.deepEqual(imported.tags, ["markdown", "research"]);
  assert.deepEqual(imported.metadata, {
    disclosureStatus: "unpublished",
    methodology: "Static analysis",
  });
  assert.match(imported.body, /^# Finding/m);
  assert.match(imported.body, /\*\*Keep this Markdown intact\.\*\*/);
});

test("rejects malformed or unsupported Markdown frontmatter", () => {
  assert.throws(() => parseMarkdownImport("---\ntype: fake\n---\nBody", "note.md"), /Unsupported content type/);
  assert.throws(() => parseMarkdownImport("---\ntitle: [bad\n---\nBody", "note.md"), /frontmatter is invalid/);
});

test("recognizes supported image signatures and rejects other files", () => {
  assert.equal(detectImageType(new Uint8Array([0xff, 0xd8, 0xff])), "image/jpeg");
  assert.equal(detectImageType(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
  assert.equal(detectImageType(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])), "image/webp");
  assert.equal(detectImageType(new Uint8Array([0, 1, 2])), undefined);
  assert.equal(mediaExtension("image/jpeg"), "jpg");
});

test("accepts only well-formed publishing actions", () => {
  assert.deepEqual(parsePublishRequest({ action: "publish", content_id: contentId }), {
    action: "publish",
    contentId,
  });
  assert.equal(parsePublishRequest({ action: "delete", content_id: contentId }), undefined);
  assert.equal(parsePublishRequest({ action: "publish", content_id: "not-a-uuid" }), undefined);
  assert.equal(parsePublishRequest([]), undefined);
});

test("collects CMS media references recursively and flags malformed tokens", () => {
  const { references, invalid } = getMediaReferences([
    `![diagram](cms-media://${contentId}.png)`,
    { ogImage: `cms-media://${contentId}.png` },
  ]);
  assert.deepEqual([...references], [[contentId, "png"]]);
  assert.deepEqual(invalid, []);

  assert.deepEqual(getMediaReferences(["cms-media://not-an-image"]).invalid, ["cms-media://not-an-image"]);
});

test("requires complete, safe content before publication", () => {
  assert.equal(validatePublishEntry(entry()), undefined);
  assert.match(validatePublishEntry(entry({ excerpt: "  " })) ?? "", /excerpt/i);
  assert.match(validatePublishEntry(entry({ slug: "../draft" })) ?? "", /slug/i);
  assert.match(validatePublishEntry(entry({ cover_image_url: "javascript:alert(1)" })) ?? "", /Cover image/i);
  assert.match(validatePublishEntry(entry({ metadata: [] })) ?? "", /metadata/i);
  assert.match(validatePublishEntry(entry({ body_markdown: `![ ](cms-media://${contentId}.png)` })) ?? "", /alt text/i);
});
