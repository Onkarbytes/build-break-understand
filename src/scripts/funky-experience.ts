import { resolveExperienceMode } from "../lib/experience-mode";
import type { FunkySceneController } from "./funky-scene";

type PracticeLens = "build" | "break" | "understand";
const lensDescriptions: Record<PracticeLens, string> = {
  build: "Build: the model represents its components coming together.",
  break: "Break: the model represents its components separating.",
  understand: "Understand: the model represents its parts finding an intentional order.",
};

const root = document.documentElement;
const stage = document.querySelector<HTMLElement>("[data-funky-scene]");
const status = document.querySelector<HTMLElement>("[data-funky-scene-status]");

if (stage) {
  let active = resolveExperienceMode(root.dataset.presentation) === "funky";
  let inView = false;
  let loading = false;
  let failed = false;
  let controller: FunkySceneController | null = null;

  function currentLens(): PracticeLens {
    const value = root.dataset.mode;
    return value === "build" || value === "break" ? value : "understand";
  }

  function updateFallbackStatus() {
    if (active && !loading && !controller && stage?.dataset.webgl === "fallback" && status) {
      status.textContent = `${lensDescriptions[currentLens()]} The static diagram is available because WebGL is unavailable.`;
    }
  }

  function reportLoadFailure(error: unknown) {
    failed = true;
    stage?.setAttribute("data-webgl", "fallback");
    console.warn("Funky Mode could not start its 3D view; the static diagram remains available.", error);
    if (status) {
      status.textContent = "The 3D view could not start. The static diagram and practice controls are still available.";
    }
  }

  function syncScene() {
    if (!active) {
      controller?.dispose();
      controller = null;
      return;
    }

    if (!inView || document.hidden) {
      controller?.setActive(false);
      return;
    }

    if (controller) {
      controller.setPractice(currentLens());
      controller.setActive(true);
      return;
    }

    if (loading || failed) return;
    loading = true;
    if (status) status.textContent = "Loading the interactive model. The static diagram remains available.";

    void import("./funky-scene")
      .then(({ mountFunkyScene }) => {
        loading = false;
        if (!active || !inView || document.hidden || !stage) return;
        controller = mountFunkyScene(stage);
        if (!controller) {
          failed = true;
          updateFallbackStatus();
          return;
        }
        controller?.setPractice(currentLens());
        controller?.setActive(true);
      })
      .catch(reportLoadFailure);
  }

  const visibilityObserver = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      syncScene();
    }, { rootMargin: "120px" })
    : null;

  if (visibilityObserver) {
    visibilityObserver.observe(stage);
  } else {
    inView = true;
  }

  const lensObserver = new MutationObserver(() => {
    if (controller) {
      controller.setPractice(currentLens());
    } else {
      updateFallbackStatus();
    }
  });
  lensObserver.observe(root, { attributes: true, attributeFilter: ["data-mode"] });

  window.addEventListener("bbu:presentation-change", () => {
    active = resolveExperienceMode(root.dataset.presentation) === "funky";
    syncScene();
  });
  document.addEventListener("visibilitychange", syncScene);
  window.addEventListener("pagehide", () => {
    visibilityObserver?.disconnect();
    lensObserver.disconnect();
    controller?.dispose();
    controller = null;
  }, { once: true });

  syncScene();
}
