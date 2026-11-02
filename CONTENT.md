# Content model and publishing boundary

The site keeps structured records separate from page presentation in `content.js`. The current arrays are intentionally empty: no completed projects, published investigations, or articles were supplied. The About and Now pages distinguish provided interests from unpublished personal details.

## Public visibility

Each project, investigation, or article is a record with a stable `slug`, `status`, and explicit `public` flag. Projects and articles require `status: "published"`; investigations may also be shared as `"in-progress"` when explicitly public. Drafts and interest-only records never appear in archives or detail routes.

Suggested statuses:

- `draft` — never rendered publicly.
- `in-progress` — may be public only when its owner explicitly marks it public; clearly labelled as ongoing.
- `published` — released content with a verified publication date where applicable.
- `interest` — a topic of attention, not an experiment or finding.

Keep confidential, employer-owned, embargoed, or uncleared material out of public content files entirely. Do not treat the `public` flag as authentication or a substitute for access control.

## Record fields

### Project

`slug`, `title`, `summary`, `status`, `public`, `date`, `tags`, `role`, `stack`, `architecture`, `sections`, `screenshots`, `sourceCodeUrl`, `demoUrl`, and `lessons`.

Architecture and section values can be explanatory text or code blocks. Screenshot values contain `src`, descriptive `alt`, and an optional `caption`. The project detail route is `project.html?slug=<slug>`.

### Investigation

`slug`, `title`, `summary`, `status`, `public`, `date`, `topics`, `methodology`, `technicalDetails`, `diagrams`, `code`, `findings`, `limitations`, `references`, and `conclusion`.

An in-progress investigation must be labelled as such and must not imply a verified finding. References can be text or `{ title, url }` records. The investigation detail route is `investigation.html?slug=<slug>`.

### Article

`slug`, `title`, `summary`, `status`, `public`, `publishedAt`, `updatedAt`, `category`, `tags`, `body`, `references`, and `related` (article slugs).

Article body blocks use one of these shapes:

```js
{ type: "paragraph", text: "..." }
{ type: "heading", level: 2, text: "..." }
{ type: "list", ordered: false, items: ["...", "..."] }
{ type: "quote", text: "..." }
{ type: "code", language: "javascript", code: "..." }
{ type: "image", src: "...", alt: "...", caption: "..." }
```

The article route builds a linked contents list from headings, calculates approximate reading time from the body, displays category and tags, highlights common code tokens without executing code, and supports figures, references, and related articles. The detail route is `article.html?slug=<slug>`.

## CMS readiness

This model is an editorial data contract, not a CMS or administrator interface. There is no client-side login, write API, upload surface, or authorization gate. A future CMS should use server-managed authentication and roles, schema validation, draft/published states, protected media uploads, safe preview access, audit logging, and static build/revalidation hooks. Never expose CMS write credentials or rely on client-side `public` flags to secure drafts.
