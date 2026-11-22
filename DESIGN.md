# Design system

## Surface

Personal portfolio and research platform. Mode: Experience. The home route introduces the person through an editorial statement and an explorable system diagram. Independent routes let visitors read the biography, browse public work and investigations, follow the journal, review current information, and find contact details without repeating the homepage composition.

## Visual world

An editorial field journal: the clarity of a technical publication, the trace marks of a system map, and the considered spacing of a printed essay. It is not a simulated terminal, dashboard, or résumé.

The interface uses warm paper, ink-dark text, a restrained signal red, serif display typography, plain sans-serif reading text, and monospace only for labels and measurements. Original SVG diagrams stand in for unavailable project imagery.

## Tokens

- Paper: `#f2efe5`
- Bright paper: `#fbf9f2`
- Ink: `#192522`
- Reading text: `#34433d`
- Muted text: `#58665f`
- Rule: `#cbc9bf`
- Signal: `#b6422b`
- Deep green: `#294b40`

## Typography

- Display: Instrument Serif; Georgia fallback.
- Body: DM Sans; system sans-serif fallback.
- Labels and measured data: IBM Plex Mono; system monospace fallback.
- Display text is capped at 6rem. Body copy uses a readable line height and measure.
- The fonts are requested from Google Fonts; the fallback stacks keep the site usable if that service is unavailable.

## Layout and motion

- A wide editorial grid uses a 12-column desktop composition and collapses to a single reading column on narrow screens.
- Section dividers and ruled lists carry structure; repeated cards do not.
- In Studio, the hero's system trace is the one authored entrance animation. Appearance changes use a restrained circular reveal where supported; navigation and controls use brief state transitions. Funky uses route-specific, content-integrated idle motion and short state transitions; motion pauses when offscreen, hidden, outside Funky, or reduced by preference. Neither presentation hijacks scrolling.
- The trace selector is an explanatory illustration, not a result from Onkar's project.
- Reduced-motion preferences disable authored motion.

## Experience system

The original editorial direction remains intact, with three selectable practice lenses:

- **BUILD** uses a forest-green signal and language about modeling and iteration.
- **BREAK** shifts the signal toward rust and language about questions and stress-testing.
- **UNDERSTAND** retains the original signal red and frames the work as observation and explanation.

The sun/moon icon toggles between light and night; the initial appearance follows the operating system unless a saved choice exists. The preference persists in local storage. Night has its own deep-ground palette, legible reading text, and warmer signal colors; it is not a color inversion. The practice lens intentionally returns to the route's default when the page reloads.

The header opens a full-screen, responsive native dialog that presents seven real page routes as a guided route. The hero's illustrative SVG map supports pointer and keyboard selection, and its control compares direct and alternate paths. A small expandable field note in the footer rewards exploration without hiding essential content.

Section routes have their own reading rhythm: About is a profile with visible evidence gaps; Work is a ruled project index; Research separates interests from public investigations; Writing uses a journal index and article reading layout; Now is a transparent current-state register; Contact is a quiet, high-contrast invitation. These layouts use shared typography, color, navigation, and spacing tokens rather than cloned landing-page sections.

Project, investigation, experiment, and article detail routes are data-backed Astro templates. Markdown collections are validated at build time; article pages support a linked contents list, calculated reading time, categories, tags, syntax-highlighted code, images, references, and related entries. Data schemas and the future publishing/security boundary live in `CONTENT.md`; route and build details live in `ARCHITECTURE.md`.

## Funky presentation

Funky is a second presentation for the same public routes and content, not a replacement theme. Studio remains the default and retains its existing layouts, type, colors, navigation, map, and behavior. The header's **Studio / Funky** switch stores its choice as `bbu-experience-mode`; the independent appearance choice remains under `onkar-appearance`, and the Build / Break / Understand practice lens remains `data-mode`.

Funky's visual language pairs warm paper (`#fff3dc`) and near-black (`#121018`) with acid lime (`#d3f34c`), cobalt (`#4054ed`), coral (`#ff806b`), and violet (`#ad9af0`). DM Sans carries oversized editorial headlines and navigation; Instrument Serif supplies occasional expressive contrast; IBM Plex Mono remains for measured labels. UI labels stay at least 12px and body copy at least 14px. Route openings use distinct color fields, while long-form content keeps readable measures and high-contrast text.

The homepage leads with a full-width three-part headline, then pairs the practice controls with an instrumented model plate and the explorable system trace. The plate labels its actual contents (12 modules and three practice states) and uses the same measured grid in both appearances.

The procedural sculpture uses twelve beveled, hollow hexagonal modules around a faceted core, three orbiting rings, and connecting segments. Build gathers the modules into a compact assembly, Break separates them to expose the structure, and Understand arranges them into an ordered orbit; each lens also receives a distinct material palette. A slow ring drift and assembly turn give the sculpture an idle life, while pointer movement adds a small viewing response. The static SVG fallback depicts the same twelve-part assembly. Three.js is dynamically loaded only on the homepage when Funky is active and the sculpture is near view. Rendering pauses offscreen or while the document is hidden, stops when Studio is selected, and uses the authored SVG when WebGL is unavailable. Reduced motion keeps the 3D object static and makes state changes immediate.

Other routes use authored diagrams rather than isolated model galleries: the About wordform hinges through the BBU phrase; Work, Research, and Writing use rotating records drawn from their real templates; About, Research, and Now connect only supplied interests; Writing turns a deliberately blank spread; Contact and 404 trace real routes or an explicitly unresolved destination. Each visual has an accessible caption, keyboard-operable controls where useful, a non-JavaScript content fallback, and an offscreen/visibility pause. The publishing lab keeps a single, low-amplitude motion on its release note; editing controls and session indicators remain stationary.

Funky route openings retain their individual color fields and now carry a different piece of diagrammatic linework per section: orbit rings, a cut sheet, a measured grid, an editorial frame, or an observatory ring. Homepage sections alternate quiet paper surfaces to give the long scroll a deliberate rhythm without turning content into repeated cards. Reading pages and empty states remain factual and use the same legible editorial type system.

## Accessibility

Semantic landmarks, skip link, visible keyboard focus, descriptive SVG text, labelled icon-only appearance control, an announced and keyboard-operable presentation switch, focus-managed native navigation dialog, keyboard-operable diagram points, contrast in both appearances, and reduced-motion support are required. The 3D model is decorative; its state is exposed through the existing practice controls and a live status, with a static diagram as the non-WebGL alternative.
