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

function updateThemeControl() {
  if (!themeToggle) return;
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  const action = nextTheme === "dark" ? "Switch to night mode" : "Switch to light mode";
  themeToggle.setAttribute("aria-label", action);
  themeToggle.title = action;
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

themeToggle?.addEventListener("click", () => {
  updateTheme(root.dataset.theme === "dark" ? "light" : "dark");
});

systemTheme.addEventListener("change", () => {
  if (root.dataset.themeChoice === "system") updateTheme("system", { animate: false });
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

navDialog?.addEventListener("close", () => {
  setMenuState(false);
  menuToggle?.focus();
});
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
navLinks.forEach((link) => link.addEventListener("click", closeMenu));

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
  if (navMode) navMode.textContent = `Current lens / ${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
  practiceLens?.setAttribute("data-active-mode", mode);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.modeSelect) setMode(button.dataset.modeSelect);
  });
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
  if (traceLabel) traceLabel.textContent = isAlternate ? "Return to the direct path" : "Trace an alternate path";
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
  const note = nodeNotes[selection];
  if (!selection || !note) return;

  systemFigure?.setAttribute("data-node", selection);
  mapNodes.forEach((item) => item.setAttribute("aria-pressed", String(item === node)));
  if (traceState) traceState.textContent = note;
}

mapNodes.forEach((node) => {
  node.addEventListener("click", () => inspectNode(node));
  node.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    inspectNode(node);
  });
});

const articleFilters = [...document.querySelectorAll("[data-article-filter]")];
const articleRows = [...document.querySelectorAll("[data-article-row]")];
const articleFilterStatus = document.querySelector("[data-article-filter-status]");

function filterArticles() {
  const selected = Object.fromEntries(articleFilters.map((filter) => [filter.dataset.articleFilter, filter.value]));
  let visibleCount = 0;

  articleRows.forEach((row) => {
    const categoryMatches = !selected.category || row.dataset.category === selected.category;
    const tagMatches = !selected.tag || row.dataset.tags?.split(" ").includes(selected.tag);
    row.hidden = !(categoryMatches && tagMatches);
    if (!row.hidden) visibleCount += 1;
  });

  if (articleFilterStatus) {
    articleFilterStatus.textContent = `${visibleCount} ${visibleCount === 1 ? "article" : "articles"} shown.`;
  }
}

articleFilters.forEach((filter) => filter.addEventListener("change", filterArticles));
