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
- The hero's system trace is the one authored entrance animation. Appearance changes use a restrained circular reveal where supported; navigation and controls use brief state transitions.
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

Project, investigation, and article detail routes are data-backed templates. Article pages support a linked contents list, calculated reading time, categories, tags, code blocks with token highlighting, images, references, and related entries. Data schemas and the future publishing/security boundary live in `CONTENT.md`.

## Accessibility

Semantic landmarks, skip link, visible keyboard focus, descriptive SVG text, labelled icon-only appearance control, focus-managed native navigation dialog, keyboard-operable diagram points, contrast in both themes, and reduced-motion support are required.
