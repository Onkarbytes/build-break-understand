import { resolveExperienceMode, type ExperienceMode } from "../lib/experience-mode";

const root = document.documentElement;
const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const status = document.querySelector<HTMLElement>("[data-presentation-status]");
const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-presentation-select]")];
const sceneStatus = document.querySelector<HTMLElement>("[data-funky-scene-status]");
const hasFunkyScene = Boolean(document.querySelector("[data-funky-scene]"));
const preferenceKey = "bbu-experience-mode";
let sceneManagerRequested = false;

function getThemeColor(presentation: ExperienceMode, theme: string | undefined) {
  if (presentation === "funky") {
    return theme === "dark" ? "#121018" : "#fff3dc";
  }
  return theme === "dark" ? "#171c1a" : "#f2efe5";
}

function updateButtons(presentation: ExperienceMode) {
  buttons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.presentationSelect === presentation));
  });
}

function loadFunkySceneManager() {
  if (root.dataset.presentation !== "funky" || !hasFunkyScene || sceneManagerRequested) return;
  sceneManagerRequested = true;
  void import("./funky-experience").catch((error: unknown) => {
    console.error("The Funky Mode 3D controller could not load; the static diagram remains available.", error);
    if (sceneStatus) {
      sceneStatus.textContent = "The 3D view could not load. The static diagram and practice controls are still available.";
    }
  });
}

function setPresentation(
  presentation: ExperienceMode,
  { persist = true, animate = true, trigger }: { persist?: boolean; animate?: boolean; trigger?: HTMLElement } = {},
) {
  const changed = root.dataset.presentation !== presentation;
  let saved = true;

  if (persist) {
    try {
      localStorage.setItem(preferenceKey, presentation);
    } catch (error) {
      saved = false;
      console.warn("Experience preference could not be saved for the next visit.", error);
    }
  }

  const applyPresentation = () => {
    root.dataset.presentation = presentation;
    if (themeColor) themeColor.content = getThemeColor(presentation, root.dataset.theme);
    updateButtons(presentation);
    window.dispatchEvent(new CustomEvent("bbu:presentation-change", { detail: { presentation } }));
    loadFunkySceneManager();
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!changed || !animate || reduceMotion || !document.startViewTransition) {
    applyPresentation();
  } else {
    const bounds = trigger?.getBoundingClientRect();
    if (bounds) {
      root.style.setProperty(
        "--presentation-origin",
        `${bounds.left + bounds.width / 2}px ${bounds.top + bounds.height / 2}px`,
      );
    }
    root.classList.add("presentation-switching");
    const transition = document.startViewTransition(applyPresentation);
    transition.finished.then(
      () => root.classList.remove("presentation-switching"),
      () => root.classList.remove("presentation-switching"),
    );
  }

  if (status && changed) {
    const label = presentation === "funky" ? "Funky" : "Studio";
    status.textContent = saved
      ? `${label} mode selected.`
      : `${label} mode selected for this visit; your browser could not save the choice.`;
  }
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    const presentation = resolveExperienceMode(button.dataset.presentationSelect);
    setPresentation(presentation, { trigger: button });
  });
});

window.addEventListener("storage", (event) => {
  if (event.key === preferenceKey) {
    setPresentation(resolveExperienceMode(event.newValue), { persist: false });
  }
});

window.addEventListener("bbu:presentation-change", loadFunkySceneManager);
updateButtons(resolveExperienceMode(root.dataset.presentation));
loadFunkySceneManager();
