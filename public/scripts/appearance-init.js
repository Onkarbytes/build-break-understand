(() => {
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let choice = "system";

  try {
    const savedChoice = localStorage.getItem("onkar-appearance");
    if (["system", "light", "dark"].includes(savedChoice)) choice = savedChoice;
  } catch (error) {
    console.warn("Appearance preference could not be read; using the system setting.", error);
  }

  root.dataset.themeChoice = choice;
  root.dataset.theme = choice === "system"
    ? (systemTheme.matches ? "dark" : "light")
    : choice;

  if (themeColor) {
    themeColor.content = root.dataset.theme === "dark" ? "#171c1a" : "#f2efe5";
  }
})();
