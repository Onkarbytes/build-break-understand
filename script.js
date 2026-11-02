const root = document.documentElement;
const themeToggle = document.querySelector("[data-theme-toggle]");
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const themeColors = {
  light: "#f2efe5",
  dark: "#171c1a",
};

function resolveTheme(choice) {
  return choice === "system" ? (systemTheme.matches ? "dark" : "light") : choice;
}

function updateTheme(choice, { animate = true, trigger = themeToggle } = {}) {
  const nextTheme = resolveTheme(choice);
  const themeChanged = root.dataset.theme !== nextTheme;

  root.dataset.themeChoice = choice;

  try {
    localStorage.setItem("onkar-appearance", choice);
  } catch (error) {
    console.warn("Appearance preference could not be saved for the next visit.", error);
  }

  const applyTheme = () => {
    root.dataset.theme = nextTheme;
    if (themeColor) themeColor.content = themeColors[nextTheme];
    updateThemeControl();
  };

  if (!animate || !themeChanged || !document.startViewTransition) {
    applyTheme();
    return;
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyTheme();
    return;
  }

  const bounds = (trigger ?? themeToggle)?.getBoundingClientRect();
  if (bounds) {
    const originX = bounds.left + bounds.width / 2;
    const originY = bounds.top + bounds.height / 2;
    root.style.setProperty("--theme-origin", `${originX}px ${originY}px`);
  }

  document.startViewTransition(applyTheme);
}

function updateThemeControl() {
  if (!themeToggle) return;
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  const action = nextTheme === "dark" ? "Switch to night mode" : "Switch to light mode";
  themeToggle.setAttribute("aria-label", action);
  themeToggle.title = action;
}

themeToggle?.addEventListener("click", () => {
  updateTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

systemTheme.addEventListener("change", () => {
  if (root.dataset.themeChoice === "system") {
    updateTheme("system", { animate: false });
  }
});

updateThemeControl();
root.classList.add("theme-ready");

const menuToggle = document.querySelector("[data-menu-toggle]");
const menuLabel = document.querySelector("[data-menu-label]");
const navDialog = document.querySelector("[data-nav-dialog]");
const navClose = document.querySelector("[data-nav-close]");
const navLinks = [...document.querySelectorAll(".nav-index [data-site-link]")];

function setMenuState(isOpen) {
  root.classList.toggle("navigation-open", isOpen);
  menuToggle?.setAttribute("aria-expanded", String(isOpen));
  if (menuLabel) menuLabel.textContent = isOpen ? "Close" : "Explore";
}

function closeMenu() {
  if (navDialog?.open) navDialog.close();
}

navDialog?.addEventListener("close", () => setMenuState(false));
navDialog?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeMenu();
});
navDialog?.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  closeMenu();
});
navDialog?.addEventListener("click", (event) => {
  if (event.target === navDialog) closeMenu();
});

menuToggle?.addEventListener("click", () => {
  if (!navDialog) return;
  if (navDialog.open) {
    closeMenu();
  } else {
    navDialog.showModal();
    setMenuState(true);
  }
});

navClose?.addEventListener("click", closeMenu);

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    closeMenu();
  });
});

const practiceLens = document.querySelector(".practice-lens");
const modeButtons = [...document.querySelectorAll("[data-mode-select]")];
const modeIndicator = document.querySelector("[data-mode-indicator]");
const modeCopy = document.querySelector("[data-mode-copy]");
const navMode = document.querySelector("[data-nav-mode]");

const modeDetails = {
  build: {
    indicator: "MODEL / CONNECT / ITERATE",
    copy: "Start with a model. Change one thing. See what moves.",
  },
  break: {
    indicator: "QUESTION / STRESS / OBSERVE",
    copy: "Look for the assumption. Notice where the picture changes.",
  },
  understand: {
    indicator: "OBSERVE / TRACE / RECORD",
    copy: "A trace is only useful when you can explain what it changed.",
  },
};

function setMode(mode) {
  const details = modeDetails[mode];
  if (!details) return;

  root.dataset.mode = mode;
  modeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.modeSelect === mode));
  });

  if (modeIndicator) modeIndicator.textContent = details.indicator;
  if (modeCopy) modeCopy.textContent = details.copy;
  if (navMode) {
    const modeName = mode.charAt(0).toUpperCase() + mode.slice(1);
    navMode.textContent = `Current lens / ${modeName}`;
  }

  practiceLens?.setAttribute("data-active-mode", mode);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.modeSelect));
});

const traceToggle = document.querySelector("[data-trace-toggle]");
const systemFigure = document.querySelector(".system-figure");
const traceState = document.querySelector("[data-trace-state]");
const traceLabel = document.querySelector("[data-trace-label]");

traceToggle?.addEventListener("click", () => {
  const isAlternate = traceToggle.getAttribute("aria-pressed") !== "true";
  traceToggle.setAttribute("aria-pressed", String(isAlternate));
  systemFigure?.setAttribute("data-trace", isAlternate ? "alternate" : "direct");

  if (traceState) {
    traceState.textContent = isAlternate
      ? "The alternate route branches at the boundary; compare where the path leads."
      : "Follow a request through a boundary and into a system.";
  }

  if (traceLabel) {
    traceLabel.textContent = isAlternate ? "Return to the direct path" : "Trace an alternate path";
  }
});

const mapNodes = [...document.querySelectorAll("[data-map-node]")];
const nodeNotes = {
  input: "Input is where a model meets something it did not create.",
  boundary: "A boundary marks where one set of assumptions hands off to another.",
  system: "The path through the system is the part to trace, not just guess at.",
  branch: "An alternate path helps make a hidden assumption easier to notice.",
  exit: "A handoff is another boundary, even when the drawing makes it look like a dot.",
  output: "An output is a clue about the path, not the whole explanation.",
};

function inspectNode(node) {
  const selection = node.dataset.mapNode;
  systemFigure?.setAttribute("data-node", selection);
  mapNodes.forEach((item) => {
    item.setAttribute("aria-pressed", String(item === node));
  });
  if (traceState) traceState.textContent = nodeNotes[selection];
}

mapNodes.forEach((node) => {
  node.addEventListener("click", () => inspectNode(node));
  node.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    inspectNode(node);
  });
});

const content = window.portfolioContent;

if (content) {
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  function safeContentUrl(value) {
    if (typeof value !== "string" || !URL.canParse(value, location.href)) return null;
    const url = new URL(value, location.href);
    return url.protocol === "https:" || url.origin === location.origin ? url.href : null;
  }

  const entryUrl = (type, slug) => {
    const routes = { project: "project.html", investigation: "investigation.html", article: "article.html" };
    return `${routes[type]}?slug=${encodeURIComponent(slug)}`;
  };

  function isPublicEntry(item, type) {
    if (item.public !== true) return false;
    if (type === "investigation") return ["published", "in-progress"].includes(item.status);
    return item.status === "published";
  }

  function renderEmpty(container, label, title, copy) {
    const state = element("div", "content-empty");
    const mark = element("span", "content-empty__mark", label);
    const message = element("div", "content-empty__copy");
    message.append(element("h2", "", title), element("p", "", copy));
    state.append(mark, message);
    if (container.hasAttribute("data-detail")) container.append(state);
    else container.replaceChildren(state);
  }

  function renderArchive(container, items, type, emptyState) {
    if (!container) return;
    const entries = items.filter((item) => isPublicEntry(item, type));
    if (!entries.length) {
      document.querySelector("[data-article-filters]")?.replaceChildren();
      const articleState = document.querySelector("[data-article-state]");
      if (articleState) articleState.textContent = "No articles have been provided yet.";
      renderEmpty(container, emptyState.label, emptyState.title, emptyState.copy);
      return;
    }

    if (type === "article") {
      const articleState = document.querySelector("[data-article-state]");
      if (articleState) articleState.textContent = "Published articles appear in the index above; each one has a dedicated, reading-focused detail page.";
    }

    const list = element("ol", "entry-list");
    entries.forEach((item) => {
      const row = element("li", "entry-row");
      const link = element("a", "entry-row__link");
      link.href = entryUrl(type, item.slug);
      const detail = element("div", "entry-row__detail");
      detail.append(element("h2", "", item.title), element("p", "", item.summary));
      const meta = element("div", "entry-row__meta");
      if (item.category) meta.append(element("span", "", item.category));
      if (item.date || item.publishedAt) {
        const date = element("time", "", item.date ?? item.publishedAt);
        date.dateTime = item.publishedAt ?? item.date;
        meta.append(date);
      }
      if (item.status) meta.append(element("span", "entry-status", item.status.replaceAll("-", " ")));
      if (type === "article") {
        meta.append(element("span", "", `${Math.max(1, Math.ceil(articleWords(item) / 220))} min read`));
        if (item.tags?.length) {
          const tags = element("span", "entry-row__tags", item.tags.join(" · "));
          meta.append(tags);
        }
      }
      const arrow = element("span", "entry-row__arrow", "Read entry");
      link.append(detail, meta, arrow);
      row.append(link);
      if (type === "article") {
        row.dataset.category = slugify(item.category ?? "uncategorized");
        row.dataset.tags = (item.tags ?? []).map(slugify).join(" ");
      }
      list.append(row);
    });
    container.replaceChildren(list);

    if (type === "article") renderArticleFilters(entries, list);
  }

  function renderArticleFilters(entries, list) {
    const container = document.querySelector("[data-article-filters]");
    if (!container) return;
    const categories = [...new Set(entries.map((item) => item.category).filter(Boolean))].sort();
    const tags = [...new Set(entries.flatMap((item) => item.tags ?? []))].sort();
    if (categories.length < 2 && tags.length < 2) {
      container.replaceChildren();
      return;
    }

    const controls = element("div", "article-filters");
    const filterOptions = [
      { label: "Category", key: "category", values: categories },
      { label: "Tag", key: "tag", values: tags },
    ];
    filterOptions.forEach(({ label, key, values }) => {
      if (values.length < 2) return;
      const wrapper = element("label", "article-filter");
      wrapper.append(element("span", "", label));
      const select = element("select");
      select.setAttribute("aria-label", `Filter articles by ${label.toLowerCase()}`);
      const plural = key === "category" ? "categories" : `${label.toLowerCase()}s`;
      const all = element("option", "", `All ${plural}`);
      all.value = "";
      select.append(all);
      values.forEach((value) => {
        const option = element("option", "", value);
        option.value = slugify(value);
        select.append(option);
      });
      wrapper.append(select);
      controls.append(wrapper);
      select.addEventListener("change", () => {
        const selected = Object.fromEntries([...controls.querySelectorAll("select")].map((control) => [
          control.getAttribute("aria-label").endsWith("category") ? "category" : "tag",
          control.value,
        ]));
        let visibleCount = 0;
        list.querySelectorAll(".entry-row").forEach((row) => {
          const categoryMatch = !selected.category || row.dataset.category === selected.category;
          const tagMatch = !selected.tag || row.dataset.tags.split(" ").includes(selected.tag);
          row.hidden = !(categoryMatch && tagMatch);
          if (!row.hidden) visibleCount += 1;
        });
        const status = controls.querySelector("[role='status']");
        if (status) status.textContent = `${visibleCount} ${visibleCount === 1 ? "article" : "articles"} shown.`;
      });
    });
    const status = element("p", "sr-only");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    controls.append(status);
    container.replaceChildren(controls);
  }

  function renderInterests(container) {
    const list = element("div", "interest-index");
    content.interests.forEach((group) => {
      const row = element("section", "interest-row");
      row.append(element("h2", "", group.area));
      const topics = element("ul", "topic-list");
      group.topics.forEach((topic) => topics.append(element("li", "", topic)));
      row.append(topics);
      list.append(row);
    });
    container.replaceChildren(list);
  }

  function renderNow(container) {
    const list = element("dl", "now-index");
    content.now.forEach((item) => {
      list.append(element("dt", "", item.area), element("dd", "", item.status));
    });
    container.replaceChildren(list);
  }

  function renderCode(target, source, language = "text") {
    const pre = element("pre", "code-frame");
    const code = element("code", `language-${language}`);
    const tokens = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?\*\/|(?:\/\/|#)[^\n]*|\b(?:const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|def|None|True|False|try|except|raise|with|as|in|is|and|or|not|null|undefined|true|false)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()/gm;
    let cursor = 0;
    for (const match of source.matchAll(tokens)) {
      const index = match.index;
      if (index > cursor) code.append(document.createTextNode(source.slice(cursor, index)));
      const value = match[0];
      let kind = "code-token--function";
      if (/^(["'`])/.test(value)) kind = "code-token--string";
      else if (/^(\/\/|#|\/\*)/.test(value)) kind = "code-token--comment";
      else if (/^\d/.test(value)) kind = "code-token--number";
      else if (/^(const|let|var|function|return|if|else|for|while|class|new|import|from|export|async|await|def|None|True|False|try|except|raise|with|as|in|is|and|or|not|null|undefined|true|false)$/.test(value)) {
        kind = "code-token--keyword";
      }
      code.append(element("span", kind, value));
      cursor = index + value.length;
    }
    if (cursor < source.length) code.append(document.createTextNode(source.slice(cursor)));
    pre.append(code);
    target.append(pre);
  }

  function addSection(parent, title, body) {
    if (!body || (Array.isArray(body) && body.length === 0)) return;
    const section = element("section", "detail-section");
    section.append(element("h2", "", title));
    if (Array.isArray(body)) {
      const list = element("ul", "detail-list");
      body.forEach((item) => {
        const entry = element("li");
        if (typeof item === "string") {
          entry.textContent = item;
        } else if (item?.url && item?.title) {
          const href = safeContentUrl(item.url);
          if (href) {
            const link = element("a", "", item.title);
            link.href = href;
            link.rel = "noopener noreferrer";
            entry.append(link);
          } else {
            entry.textContent = `${item.title} (link unavailable: use HTTPS)`;
          }
        } else if (item?.title) {
          entry.textContent = item.title;
        }
        list.append(entry);
      });
      section.append(list);
    } else if (typeof body === "string") {
      section.append(element("p", "", body));
    } else if (body.src) {
      const figure = element("figure", "detail-figure");
      const src = safeContentUrl(body.src);
      if (src) {
        const image = element("img");
        image.src = src;
        image.alt = body.alt ?? "";
        figure.append(image);
      } else {
        figure.append(element("p", "", "Image unavailable: add a valid HTTP or HTTPS image URL."));
      }
      if (body.caption) figure.append(element("figcaption", "", body.caption));
      section.append(figure);
    } else if (body.language && body.code) {
      renderCode(section, body.code, body.language);
    } else {
      section.append(element("p", "", "This section has not been published."));
    }
    parent.append(section);
  }

  function detailShell(title, summary, backHref, backText) {
    const main = document.querySelector("[data-detail]");
    main.replaceChildren();
    const intro = element("header", "detail-intro");
    intro.append(element("h1", "page-title", title), element("p", "page-lede", summary));
    const back = element("a", "text-link", `Back to ${backText}`);
    back.href = backHref;
    intro.append(back);
    main.append(intro);
    return main;
  }

  function renderProject(item) {
    const main = detailShell(item.title, item.summary, "work.html", "work");
    const meta = element("dl", "detail-meta");
    if (item.role) meta.append(element("dt", "", "Role"), element("dd", "", item.role));
    if (item.date) meta.append(element("dt", "", "Date"), element("dd", "", item.date));
    if (item.status) meta.append(element("dt", "", "Status"), element("dd", "", item.status));
    if (item.stack?.length) {
      meta.append(element("dt", "", "Technology"), element("dd", "", item.stack.join(" · ")));
    }
    main.append(meta);
    if (item.tags?.length) {
      const tags = element("ul", "tag-list");
      item.tags.forEach((tag) => tags.append(element("li", "", tag)));
      main.append(tags);
    }
    addSection(main, "Architecture", item.architecture);
    if (item.screenshots?.length) {
      item.screenshots.forEach((image) => addSection(main, image.caption || "Screenshot", image));
    }
    item.sections?.forEach((section) => addSection(main, section.title, section.body));
    addSection(main, "Lessons learned", item.lessons);
    const links = element("div", "detail-links");
    [["Source code", item.sourceCodeUrl], ["Live demo", item.demoUrl]].forEach(([label, href]) => {
      if (!href) return;
      const safeHref = safeContentUrl(href);
      if (!safeHref) {
        links.append(element("span", "detail-link-error", `${label} link unavailable: use HTTPS.`));
        return;
      }
      const link = element("a", "text-link", label);
      link.href = safeHref;
      link.rel = "noopener noreferrer";
      links.append(link);
    });
    if (links.childElementCount) main.append(links);
  }

  function renderInvestigation(item) {
    const main = detailShell(item.title, item.summary, "research.html", "research");
    const meta = element("dl", "detail-meta");
    if (item.status) meta.append(element("dt", "", "Status"), element("dd", "", item.status));
    if (item.date) meta.append(element("dt", "", "Date"), element("dd", "", item.date));
    if (item.topics?.length) meta.append(element("dt", "", "Topics"), element("dd", "", item.topics.join(" · ")));
    main.append(meta);
    addSection(main, "Methodology", item.methodology);
    addSection(main, "Technical details", item.technicalDetails);
    item.diagrams?.forEach((image) => addSection(main, image.caption || "Diagram", image));
    item.code?.forEach((block) => addSection(main, "Code", block));
    addSection(main, "Findings", item.findings);
    addSection(main, "Limitations", item.limitations);
    addSection(main, "Conclusion", item.conclusion);
    addSection(main, "References", item.references);
  }

  function articleWords(article) {
    return (article.body ?? [])
      .filter((block) => ["paragraph", "heading", "quote", "code"].includes(block.type))
      .map((block) => block.text ?? block.code ?? "")
      .join(" ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function renderArticleBlock(parent, block, headings) {
    if (block.type === "paragraph") parent.append(element("p", "", block.text));
    if (block.type === "quote") parent.append(element("blockquote", "", block.text));
    if (block.type === "heading") {
      const level = Math.min(3, Math.max(2, Number(block.level) || 2));
      const heading = element(`h${level}`, "", block.text);
      const baseId = block.id || slugify(block.text);
      const duplicates = headings.filter((item) => item.id === baseId).length;
      heading.id = duplicates ? `${baseId}-${duplicates + 1}` : baseId;
      headings.push({ title: block.text, id: heading.id, level });
      parent.append(heading);
    }
    if (block.type === "list") {
      const list = element(block.ordered ? "ol" : "ul", "detail-list");
      block.items.forEach((item) => list.append(element("li", "", item)));
      parent.append(list);
    }
    if (block.type === "code") renderCode(parent, block.code, block.language);
    if (block.type === "image") {
      const figure = element("figure", "detail-figure");
      const src = safeContentUrl(block.src);
      if (src) {
        const image = element("img");
        image.src = src;
        image.alt = block.alt ?? "";
        figure.append(image);
      } else {
        figure.append(element("p", "", "Image unavailable: add a valid HTTP or HTTPS image URL."));
      }
      if (block.caption) figure.append(element("figcaption", "", block.caption));
      parent.append(figure);
    }
  }

  function renderArticle(item) {
    const main = detailShell(item.title, item.summary, "writing.html", "writing");
    const meta = element("dl", "detail-meta");
    if (item.category) meta.append(element("dt", "", "Category"), element("dd", "", item.category));
    if (item.publishedAt) meta.append(element("dt", "", "Published"), element("dd", "", item.publishedAt));
    if (item.updatedAt) meta.append(element("dt", "", "Updated"), element("dd", "", item.updatedAt));
    meta.append(element("dt", "", "Reading time"), element("dd", "", `${Math.max(1, Math.ceil(articleWords(item) / 220))} min`));
    main.append(meta);

    const layout = element("div", "article-layout");
    const body = element("article", "article-body");
    const headings = [];
    (item.body ?? []).forEach((block) => renderArticleBlock(body, block, headings));
    if (headings.length) {
      layout.classList.add("article-layout--with-toc");
      const toc = element("nav", "article-toc");
      toc.setAttribute("aria-label", "Table of contents");
      toc.append(element("h2", "", "On this page"));
      const list = element("ol");
      headings.forEach((heading) => {
        const link = element("a", "", heading.title);
        link.href = `#${heading.id}`;
        const entry = element("li", heading.level === 3 ? "article-toc__nested" : "");
        entry.append(link);
        list.append(entry);
      });
      toc.append(list);
      layout.append(toc);
    }
    layout.append(body);
    main.append(layout);

    if (item.tags?.length) {
      const tags = element("ul", "tag-list");
      item.tags.forEach((tag) => tags.append(element("li", "", tag)));
      main.append(tags);
    }
    addSection(main, "References", item.references);
    if (item.related?.length) {
      const related = element("section", "detail-section");
      related.append(element("h2", "", "Related writing"));
      const list = element("ul", "detail-list");
      item.related.forEach((slug) => {
        const article = content.articles.find((entry) => entry.slug === slug && isPublicEntry(entry, "article"));
        if (!article) return;
        const link = element("a", "", article.title);
        link.href = entryUrl("article", slug);
        const entry = element("li");
        entry.append(link);
        list.append(entry);
      });
      if (list.childElementCount) {
        related.append(list);
        main.append(related);
      }
    }
  }

  function renderDetail() {
    const main = document.querySelector("[data-detail]");
    if (!main) return;
    const type = main.dataset.detailType;
    const map = {
      project: { items: content.projects, render: renderProject, back: ["work.html", "work"] },
      investigation: { items: content.investigations, render: renderInvestigation, back: ["research.html", "research"] },
      article: { items: content.articles, render: renderArticle, back: ["writing.html", "writing"] },
    };
    const route = map[type];
    const slug = new URLSearchParams(location.search).get("slug");
    const item = route?.items.find((entry) => entry.slug === slug && isPublicEntry(entry, type));
    if (item) {
      route.render(item);
      document.title = `${item.title} — Onkar Tambake`;
      return;
    }

    const titles = { project: "Project entry", investigation: "Investigation entry", article: "Article" };
    const mainContent = detailShell(
      titles[type] ?? "Entry",
      "This page is a reusable entry route; only verified, publicly released material appears here.",
      route?.back[0] ?? "index.html",
      route?.back[1] ?? "home",
    );
    renderEmpty(mainContent, "NOT PUBLISHED", "No public entry at this address.", "This entry is unavailable or has not been published. Return to the section index to browse what is currently public.");
  }

  renderArchive(
    document.querySelector("[data-project-list]"),
    content.projects,
    "project",
    { label: "WORKSHOP / OPEN", title: "No case studies published.", copy: "Project details will appear here when there is real work to document and public clearance to share it." },
  );
  renderArchive(
    document.querySelector("[data-investigation-list]"),
    content.investigations,
    "investigation",
    { label: "LAB / OPEN", title: "No investigations published.", copy: "Interests are listed separately from findings. An investigation will appear here only when its status and evidence can be described accurately." },
  );
  renderArchive(
    document.querySelector("[data-article-list]"),
    content.articles,
    "article",
    { label: "JOURNAL / OPEN", title: "No articles published.", copy: "When writing is ready, each piece can carry a category, tags, reading time, a contents list, code, images, references, and related articles." },
  );
  const interests = document.querySelector("[data-interest-groups]");
  if (interests) renderInterests(interests);
  const now = document.querySelector("[data-now-items]");
  if (now) renderNow(now);
  renderDetail();
}
