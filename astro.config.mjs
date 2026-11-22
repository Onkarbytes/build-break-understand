import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { loadEnv } from "vite";

const mode = process.env.NODE_ENV ?? (process.argv.includes("build") ? "production" : "development");
for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ""))) {
  if (process.env[key] === undefined) process.env[key] = value;
}

const publicSiteUrl = process.env.PUBLIC_SITE_URL;
let site;
const legacyHtmlPaths = new Set([
  "/about",
  "/work",
  "/research",
  "/writing",
  "/now",
  "/contact",
  "/project",
  "/investigation",
  "/article",
]);
const templatePaths = new Set(["/project", "/investigation", "/article"]);

if (publicSiteUrl) {
  const parsedUrl = new URL(publicSiteUrl);
  if (!["https:", "http:"].includes(parsedUrl.protocol) || parsedUrl.pathname !== "/" || parsedUrl.search || parsedUrl.hash) {
    throw new Error("PUBLIC_SITE_URL must be an absolute site origin without a path, query, or fragment.");
  }
  site = parsedUrl.origin;
}

export default defineConfig({
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  ...(site ? { site } : {}),
  integrations: site
    ? [
        sitemap({
          filter: (page) => {
            const pathname = new URL(page).pathname;
            return !templatePaths.has(pathname) && !pathname.startsWith("/admin");
          },
          serialize(item) {
            const page = new URL(item.url);
            if (legacyHtmlPaths.has(page.pathname)) {
              page.pathname = `${page.pathname}.html`;
              item.url = page.href;
            }
            return item;
          },
        }),
      ]
    : [],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
});
