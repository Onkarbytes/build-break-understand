# Onkar Tambake — personal portfolio and research platform

A responsive multi-page site built with static HTML, CSS, and vanilla JavaScript. No framework, package manager, or build step is required.

## Run locally

From this directory, run:

```powershell
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Routes

- `index.html` — Home and interactive system map
- `about.html` — About
- `work.html` — Work archive
- `research.html` — Research interests and investigation archive
- `writing.html` — Article index
- `now.html` — Current-information register
- `contact.html` — Contact
- `project.html?slug=...`, `investigation.html?slug=...`, `article.html?slug=...` — reusable detail routes

Every section page has its own editorial composition. Shared navigation, theme control, and footer are rendered from `site-shell.js`; the document-level appearance is set before styles render in `appearance-init.js`.

## Updating content

Edit `content.js` for projects, investigations, articles, research interests, and the Now register. Detail pages and archives render only records explicitly marked `public: true` and not in draft status. The profile does not invent an employment history, experience, credentials, achievements, contact address, or active projects. Current research topics are labelled as interests rather than completed work.

See [CONTENT.md](./CONTENT.md) for record fields, article block formats, publication states, and the secure future-CMS boundary. Do not add a frontend-only password gate or client-side write credentials.

## Publishing workflow

There is no admin login or CMS in this build. Do not add a frontend-only password gate. If an integrated editor becomes necessary, see the recommendation in [research-and-environment-audit.md](./research-and-environment-audit.md): use a real authenticated headless CMS, structured content schemas, drafts and published states, and server-side validation for preview access.

## Implementation handoff

- **Architecture:** independent root-level static HTML routes with shared shell JavaScript, an explicit content model, and reusable project/investigation/article detail templates.
- **Visual direction:** editorial field journal, documented in [DESIGN.md](./DESIGN.md).
- **Signature experience:** the home route retains BUILD, BREAK, and UNDERSTAND lenses, the interactive system map, and its direct/alternate path comparison. The icon-only sun/moon control toggles persistent light/night mode and follows the operating system until a visitor chooses a theme.
- **Interactions:** full-screen route navigation, keyboard-operable map points, linked section archives, article table of contents, reading-time calculation, code token highlighting, article category/tag filters, and expandable field notes.
- **Source research and environment audit:** [research-and-environment-audit.md](./research-and-environment-audit.md).
- **Known content gaps:** no verified employment history or responsibilities, public projects, investigations, articles, current project details, email address, or professional profile URLs were supplied. These remain clearly marked as unpublished or unavailable.
- **External resource:** display and body fonts are requested from Google Fonts, with local system fallback stacks.
- **CMS:** no CMS, login, write endpoint, or fake authentication was added. The content contract and security requirements for a future server-authenticated CMS are documented in [CONTENT.md](./CONTENT.md).
- **Original constraints:** the starting workspace contained only the previous static-site implementation and documentation, without assets, dependency manifests, or build configuration.

## Verification

- JavaScript syntax checked for all shared modules.
- Browser smoke-tested all seven primary pages and three detail templates for route titles, shell, navigation, empty states, and overflow.
- Tested persistent icon theme toggle, system-following default, mobile/desktop navigation, keyboard menu dismissal and focus return, the interactive map, practice modes, and reduced-motion behavior.
- Checked responsive widths from 320 to 1440 pixels; no horizontal overflow or browser errors were observed.
- Content integrity checks cover one page `h1`, unique IDs, valid local links, and explicit unavailable states for unpublished entries.
- No production build is required by this dependency-free static architecture. No deployment target or live production URL was supplied.
