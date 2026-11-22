import { resolveExperienceMode } from "../lib/experience-mode";

const root = document.documentElement;
const visuals = Array.from(document.querySelectorAll<HTMLElement>("[data-funky-motion]"));
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const visible = new WeakMap<HTMLElement, boolean>();
const observer = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      visible.set(entry.target as HTMLElement, entry.isIntersecting);
      updateMotionState(entry.target as HTMLElement);
    });
  }, { rootMargin: "80px" })
  : null;

function updateMotionState(visual: HTMLElement) {
  const canMove = resolveExperienceMode(root.dataset.presentation) === "funky"
    && !reducedMotion.matches
    && !document.hidden
    && (visible.get(visual) ?? true);
  visual.dataset.motionState = canMove ? "active" : "paused";
}

function updateIndex(visual: HTMLElement, nextIndex: number) {
  const items = Array.from(visual.querySelectorAll<HTMLElement>("[data-motion-item]"));
  if (items.length === 0) return;

  const index = (nextIndex + items.length) % items.length;
  visual.dataset.motionIndex = String(index);
  if (visual.dataset.motionVariant === "carousel") {
    visual.style.setProperty("--motion-carousel-rotation", `${-index * 360 / items.length}deg`);
  }
  items.forEach((item, itemIndex) => {
    const active = itemIndex === index;
    item.dataset.current = String(active);
    item.setAttribute("aria-hidden", String(!active));
    const link = item.querySelector<HTMLAnchorElement>("a");
    if (link) link.tabIndex = active ? 0 : -1;
  });

  visual.querySelectorAll<HTMLElement>("[data-motion-counter]").forEach((counter) => {
    counter.textContent = String(index + 1).padStart(2, "0");
  });

  const status = visual.querySelector<HTMLElement>("[data-motion-status]");
  if (status) {
    const itemText = items[index].textContent?.trim();
    const suffix = visual.dataset.motionVariant === "routes" ? "route" : "item";
    status.textContent = `${itemText ?? "Current"}; ${suffix} ${index + 1} of ${items.length}.`;
  }
}

function handleFocus(visual: HTMLElement, button: HTMLButtonElement) {
  const selected = button.dataset.motionFocus;
  if (!selected) return;

  visual.querySelectorAll<HTMLButtonElement>("[data-motion-focus]").forEach((candidate) => {
    candidate.setAttribute("aria-pressed", String(candidate === button));
  });
  document.querySelectorAll<HTMLElement>("[data-interest-row]").forEach((row) => {
    row.dataset.focused = String(row.dataset.interestRow === selected);
  });
  const status = visual.querySelector<HTMLElement>("[data-motion-status]");
  if (status) status.textContent = `${button.textContent?.trim() ?? "Interest"} topics highlighted in the list.`;
}

function initVisual(visual: HTMLElement) {
  const stage = visual.querySelector<HTMLElement>("[data-motion-stage]");
  const status = visual.querySelector<HTMLElement>("[data-motion-status]");
  if (!stage) return;
  visual.dataset.enhanced = "true";
  visual.querySelectorAll<HTMLButtonElement>("button[disabled]").forEach((button) => {
    button.disabled = false;
  });

  visual.querySelectorAll<HTMLButtonElement>("[data-motion-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const current = Number(visual.dataset.motionIndex ?? "0");
      const direction = Number(button.dataset.motionStep ?? "1");
      updateIndex(visual, current + direction);
    });
  });

  visual.querySelectorAll<HTMLButtonElement>("[data-motion-focus]").forEach((button) => {
    button.addEventListener("click", () => handleFocus(visual, button));
  });

  const pageButton = visual.querySelector<HTMLButtonElement>("[data-motion-page]");
  pageButton?.addEventListener("click", () => {
    const turning = visual.dataset.pageTurned !== "true";
    visual.dataset.pageTurned = String(turning);
    pageButton.setAttribute("aria-pressed", String(turning));
    if (status) {
      status.textContent = turning
        ? "Blank page turned. No articles have been published yet."
        : "The blank spread is ready for future writing.";
    }
  });

  let pointerStart: { id: number; x: number; y: number; rotation: number } | null = null;
  let rotation = 0;

  stage.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Element && event.target.closest("a, button")) return;
    if (event.pointerType === "touch" || event.pointerType === "pen" || event.button === 0) {
      pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation };
      stage.setPointerCapture(event.pointerId);
      stage.dataset.dragging = "true";
    }
  });

  stage.addEventListener("pointermove", (event) => {
    if (reducedMotion.matches) return;
    const bounds = stage.getBoundingClientRect();
    if (pointerStart?.id === event.pointerId) {
      const deltaX = event.clientX - pointerStart.x;
      rotation = pointerStart.rotation + deltaX * 0.45;
      stage.style.setProperty("--motion-rotation", `${rotation}deg`);
      stage.style.setProperty("--motion-tilt-y", `${Math.max(-7, Math.min(7, (event.clientY - pointerStart.y) * -0.08))}deg`);
      return;
    }
    if (event.pointerType === "touch") return;
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * -2;
    stage.style.setProperty("--motion-tilt-x", `${x * 4}deg`);
    stage.style.setProperty("--motion-tilt-y", `${y * 4}deg`);
  });

  const endPointer = (event: PointerEvent) => {
    if (pointerStart?.id !== event.pointerId) return;
    pointerStart = null;
    delete stage.dataset.dragging;
  };
  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);
  stage.addEventListener("pointerleave", () => {
    stage.style.removeProperty("--motion-tilt-x");
    if (!pointerStart) stage.style.removeProperty("--motion-tilt-y");
  });

  stage.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const variant = visual.dataset.motionVariant;
    if (variant === "carousel" || variant === "routes") {
      updateIndex(visual, Number(visual.dataset.motionIndex ?? "0") + direction);
    } else if (!reducedMotion.matches) {
      rotation += direction * 8;
      stage.style.setProperty("--motion-rotation", `${rotation}deg`);
    }
  });

  updateIndex(visual, Number(visual.dataset.motionIndex ?? "0"));
}

visuals.forEach((visual) => {
  initVisual(visual);
  visible.set(visual, !observer);
  observer?.observe(visual);
  updateMotionState(visual);
});

function syncAll() {
  visuals.forEach(updateMotionState);
}

window.addEventListener("bbu:presentation-change", syncAll);
document.addEventListener("visibilitychange", syncAll);
reducedMotion.addEventListener("change", syncAll);
window.addEventListener("pagehide", () => observer?.disconnect(), { once: true });
