# Portfolio research and environment audit

## Environment audit

The `D:\githubcopilot` workspace was empty and is not a Git repository. It contained no framework, routes, existing styles, assets, CMS, admin interface, deployment configuration, or dependency manifest to preserve. Node.js v24.22.1 and npm 11.19.1 are available. No dependencies were added; the portfolio is plain HTML, CSS, and JavaScript.

The integrated browser successfully opened and captured Hoverstat. Other initial browser page loads failed; accessible page content was gathered with the web fetch tool instead. The Active Theory attempt redirected to an unrelated challenge domain and was excluded. Locomotive returned HTTP 403, and Resn served an old-browser notice. These sites are listed as access-limited, not visually inspected. The requested design skill's context launcher stalled without output; its local engine binary was absent. The design decision and audit below were therefore recorded manually.

## Reference sites reviewed

The following 20 sites were opened through accessible page content. Hoverstat was also visually inspected in the integrated browser.

| Reference | What stood out | Technique adapted for this site |
|---|---|---|
| [Bruno Simon](https://bruno-simon.com) | A playful, memorable portfolio world, with an explicit behind-the-scenes explanation. | Give the site one purposeful interactive diagram, but keep navigation and reading direct rather than making the entire site a game. |
| [Brittany Chiang](https://brittanychiang.com) | Clear identity, approachable biography, and scannable work history. | Make the introduction and section hierarchy easy to understand without imitating a résumé layout or inventing experience. |
| [Rauno](https://rauno.me) | A minimal, carefully paced statement of craft. | Use restraint and strong typographic rhythm; let the copy carry the identity. |
| [Josh W. Comeau](https://www.joshwcomeau.com) | Deep technical writing presented through approachable tutorials and examples. | Keep future writing readable and make explanations more prominent than decoration. |
| [Cassie Evans](https://cassie.codes) | A candid note about the changing purpose of maintaining a personal site. | Treat a personal site as an honest, evolving practice rather than a static marketing funnel. |
| [Jhey Tompkins](https://www.jhey.dev) | Experiments are framed as things to explore and learn from. | Present research interests as questions, not as claims of completed work. |
| [Lusion](https://lusion.co) | Strong creative direction and intentional use of motion and 3D. | Use a single authored motion moment instead of adding effects everywhere. |
| [Resn](https://resn.co.nz) | The requested page returned an old-browser notice. | No visual technique adapted; the failure reinforced the need for graceful, dependency-light rendering. |
| [Increment](https://increment.com) | Engineering topics are organized as editorial content, not app features. | Use an editorial reading hierarchy for notes and research. |
| [Overreacted](https://overreacted.io) | Personal technical writing is the primary product. | Keep writing as a first-class section and avoid burying it in a generic projects grid. |
| [Dan Luu](https://danluu.com) | A direct, durable archive of technical essays. | Favor stable, linkable content and straightforward navigation as the writing grows. |
| [Spotify Engineering](https://engineering.atspotify.com) | An engineering publication connects topics to concrete technical articles. | Give future work and notes clear descriptions and meaningful metadata rather than decorative stats. |
| [Vercel Blog](https://vercel.com/blog) | A large catalog with article categories and summaries. | Structure future content so it can migrate cleanly into a CMS without coupling the visual design to one provider. |
| [Google Research](https://research.google) | Research is connected to its aims, papers, and real-world context. | Distinguish research questions from published research and link claims to evidence when available. |
| [MIT Technology Review](https://www.technologyreview.com) | Magazine-style grouping, imagery, and clear feature hierarchy. | Use section-level hierarchy and editorial pacing without adding stock imagery. |
| [Hoverstat](https://www.hoverstat.es) | An alternative-design archive; its page pairs a large visual preview with a concise explanation and credit. | Adapt the concise image-plus-context relationship and varied composition. Its visually inspected page also surfaced responsive two-column previews and generous spacing. |
| [Curated Design](https://curated.design) | Browseable fragments grouped by visual style and industry. | Keep the reference report specific and searchable rather than collecting undifferentiated screenshots. |
| [Maggie Appleton](https://maggieappleton.com) | Personal essays with clear editorial framing and subject-specific illustrations. | Use original diagrams and a personal voice when real material is available; do not rely on generic stock assets. |
| [Lee Robinson](https://leerob.com) | A compact personal bio alongside a substantial archive of notes and articles. | Let a concise introduction lead into independently browsable writing. |
| [Awwwards](https://www.awwwards.com) | A continuously updated index with categories, nominations, and project previews. | Use as a discovery source, not a template; avoid award badges and borrowed portfolio motifs. |

### Additional access-limited attempt

[Locomotive](https://locomotive.ca) returned HTTP 403 to the research fetcher. It is not counted among the 20 reviewed references.

## Visual directions supplied with the brief

These are inspiration cues supplied by the portfolio owner, not additional sites claimed as independently inspected or included in the 20-reference review.

| Direction | How it informed the evolution |
|---|---|
| Experimental typography (Akufen / landing.love) | Preserve the expressive serif identity and let the BUILD / BREAK / UNDERSTAND language carry the experience, without sacrificing reading clarity for animated type. |
| Interactive 3D (Aaron J. Cunningham) | Keep the dependency-light, original system map and make its stations explorable by pointer and keyboard instead of adding a heavy 3D scene. |
| Unconventional navigation | Replace the plain section menu with a full-screen, editorial route picker that reflects the current practice lens. |
| Colorful liquid project selector | Give each practice lens a distinct accent and supporting copy; do not imply that empty project sections contain finished work. |
| Awwwards desktop project preview | Treat the supplied desktop composition as encouragement to design navigation and project context deliberately, not as a component template. |
| Atmospheric night mode | Add a separate deep-ground palette and warm, mode-aware accents instead of mechanically inverting the light palette. |

## Multi-page layout research

These references informed the section layouts and publishing model; they are used for their information architecture, not copied visually.

| Reference | Observed pattern | Application |
|---|---|---|
| [Maggie Appleton — Now](https://maggieappleton.com/now) | A timestamped, first-person snapshot connects current work to context and plainly signals what is happening now. | Give Now its own updateable record and leave unavailable facts visible instead of implying a current activity. |
| [Dan Luu](https://danluu.com) | A long-lived technical archive makes writing browseable through a direct chronological index of titles and dates. | Treat Writing as a publication index with article metadata and a separate, readable detail route. |
| [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/latest/) | Security guidance distinguishes scope, methodology, evidence, and limitations; the source emphasizes contextual judgment over treating tests as a universal checklist. | Structure investigation records around methods, technical detail, findings, references, and conclusions, while separating interests and in-progress work from verified publications. |

## Seven visual systems considered

1. **Scientific journal pages** — Evidence and argument are separated; paper, measured type, and disciplined figure captions.
2. **Railway schematic maps** — A path can branch without pretending the system is simple; clean ground, distinct route colors, transfer nodes.
3. **Library indexes** — A large body of work can be browsed without turning every entry into a card; ruled rows, labels, and clear ordering.
4. **Long-form technical magazines** — Complex subjects remain readable; generous margins, sharp headlines, controlled imagery.
5. **Swiss typographic posters** — Hierarchy can be expressive without ornament; asymmetry, strong alignment, and a limited palette.
6. **Archival contact sheets** — Exploration can be visible through sequencing; aligned specimens, concise notes, and contextual captions.
7. **Field notebooks** — One direct artifact from engineering research: marked-up paper, observed traces, and compact labels. It informs the annotation style but is not used as a literal UI costume.

## Creative directions considered

### Editorial field journal — selected

Warm paper, ink-dark reading text, signal red for a route or active state, a high-contrast serif display face, and monospace only for actual labels. An asymmetric editorial grid introduces the owner beside an original, explicitly illustrative system map. Visitors move from identity to work, research questions, writing, and personal context. One trace selector compares two abstract paths; it is not presented as a project result. The same rules extend to text-led article pages and evidence-rich project pages. Risk: excessive restraint could feel anonymous, so the authored diagram and personal language must carry the signature.

### Living system map

Dark ground, bright route colors, connected labels, and animated path exploration. The first screen would open as a map and invite visitors to follow a question into linked notes. The form could make systems thinking immediately legible, but risks making the person disappear behind a technical visualization.

### The open research journal

Light, near-monochrome pages with a large reading column, footnotes, and publication-like navigation. Writing and citations would lead; projects would appear as reported investigations. It is strongest for a mature body of publications, but the supplied brief contains no articles or results to anchor that approach yet.

## Selected direction and implementation notes

The editorial field journal best fits both the stated identity and the available evidence. It takes the research clarity of Google Research and engineering publications, the concise visual context of Hoverstat, and the personal editorial tone of Maggie Appleton and Lee Robinson without copying their layouts or branding. No project, publication, credential, statistic, or employment claim was added.

The implementation uses an original SVG system map and a small JavaScript trace selector; it avoids 3D/WebGL, stock imagery, third-party UI libraries, and unnecessary dependencies. The interface covers work, research, writing, about, now, and contact. Because no projects or writing were provided, those sections use honest empty states. Contact details remain an explicit placeholder rather than a fabricated link.

## Content management recommendation

No CMS or administrator interface exists in the starting workspace, and none was simulated. Keep the current site static until publishing needs justify a service. For an integrated editor, use a managed headless CMS such as Sanity with authenticated roles and structured schemas for articles, projects, experiments, and the now page. Use its draft/published workflow and media library; trigger static deployment on publish. If draft preview is added, validate a short-lived signed preview token on a server-side route. Never put CMS write credentials or admin authorization in browser JavaScript.

## Verification record

Validation results and any remaining content limitations are recorded in the implementation handoff in [README.md](./README.md).
