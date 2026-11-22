(() => {
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let choice = "system";
  let presentation = "studio";

  try {
    const savedChoice = localStorage.getItem("onkar-appearance");
    if (["system", "light", "dark"].includes(savedChoice)) choice = savedChoice;
  } catch (error) {
    console.warn("Appearance preference could not be read; using the system setting.", error);
  }

  try {
    const savedPresentation = localStorage.getItem("bbu-experience-mode");
    if (savedPresentation === "funky") presentation = savedPresentation;
  } catch (error) {
    console.warn("Experience preference could not be read; using Studio mode.", error);
  }

  root.dataset.themeChoice = choice;
  root.dataset.theme = choice === "system"
    ? (systemTheme.matches ? "dark" : "light")
    : choice;
  root.dataset.presentation = presentation;

  if (themeColor) {
    if (presentation === "funky") {
      themeColor.content = root.dataset.theme === "dark" ? "#121018" : "#fff3dc";
    } else {
      themeColor.content = root.dataset.theme === "dark" ? "#171c1a" : "#f2efe5";
    }
  }
})();
