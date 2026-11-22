import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveExperienceMode } from "../src/lib/experience-mode.ts";

const funkyStyles = readFileSync(new URL("../src/styles/funky-mode.css", import.meta.url), "utf8");

function ruleBody(source, selector) {
  const start = source.indexOf(selector);
  assert.notEqual(start, -1, `Missing CSS selector: ${selector}`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("}", open);
  assert.ok(open > start && close > open, `Malformed CSS rule for: ${selector}`);
  return source.slice(open + 1, close);
}

function hexColor(value) {
  const hex = value.replace("#", "");
  const expanded = hex.length === 3 ? [...hex].map((part) => part + part).join("") : hex;
  return [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16));
}

function luminance(color) {
  const [red, green, blue] = color.map((channel) => {
    const linear = channel / 255;
    return linear <= 0.04045 ? linear / 12.92 : ((linear + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("resolves the saved Funky presentation independently", () => {
  assert.equal(resolveExperienceMode("funky"), "funky");
});

test("falls back to Studio for missing or unrecognised preferences", () => {
  assert.equal(resolveExperienceMode(null), "studio");
  assert.equal(resolveExperienceMode(undefined), "studio");
  assert.equal(resolveExperienceMode("night"), "studio");
});

test("Funky Explore text maintains contrast on the acid navigation surface", () => {
  const root = ruleBody(funkyStyles, ':root[data-presentation="funky"]');
  const acid = root.match(/--funky-acid:\s*(#[\da-fA-F]{3,8})/);
  const ink = root.match(/--funky-on-bright:\s*(#[\da-fA-F]{3,8})/);
  assert.ok(acid && ink, "Funky navigation surface and foreground tokens are required.");
  assert.match(root, /--nav-accent:\s*var\(--funky-on-bright\)/);
  assert.ok(contrastRatio(hexColor(acid[1]), hexColor(ink[1])) >= 4.5);

  const supportingText = ruleBody(
    funkyStyles,
    ':root[data-presentation="funky"] .nav-dialog__header > p',
  );
  assert.match(supportingText, /color:\s*var\(--funky-on-bright\)/);

  const currentPage = ruleBody(
    funkyStyles,
    ':root[data-presentation="funky"] .nav-index__link[aria-current="page"] > span',
  );
  assert.match(currentPage, /color:\s*var\(--funky-on-bright\)/);
});
