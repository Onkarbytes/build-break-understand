import type { Session, User } from "@supabase/supabase-js";
import type { EditorView } from "@codemirror/view";
import { getCmsClient } from "../lib/cms-client";
import { detectImageType, mediaExtension, slugifyTitle, validateContentFields } from "../lib/cms-utils";
import { countMarkdownWords, formatReadingTime, parseMarkdownImport } from "../lib/content-utils";
import type { CmsContentType, ContentEntryInsert, ContentEntryRow, MediaAssetRow } from "../lib/database.types";

const appRoot = document.querySelector<HTMLElement>("[data-cms-app]");
const loginPage = document.querySelector<HTMLElement>("[data-cms-login]");
const statusMessage = document.querySelector<HTMLElement>("[data-studio-alert]");
const labelByType: Record<CmsContentType, string> = {
  article: "Writing",
  project: "Projects",
  research: "Research",
  experiment: "Experiments",
  now: "Now updates",
};

function showMessage(message: string, kind: "success" | "error" | "info" = "info") {
  const target = statusMessage ?? document.querySelector<HTMLElement>("[data-login-message]");
  if (!target) return;
  target.textContent = message;
  target.dataset.kind = kind;
  target.hidden = false;
}

function hideMessage() {
  if (statusMessage) statusMessage.hidden = true;
  const loginMessage = document.querySelector<HTMLElement>("[data-login-message]");
  if (loginMessage) loginMessage.hidden = true;
}

function bindMarkdownImport(onImport: (file: File, content: ReturnType<typeof parseMarkdownImport>) => Promise<void>) {
  const button = appRoot?.querySelector<HTMLButtonElement>("[data-markdown-import]");
  const input = appRoot?.querySelector<HTMLInputElement>("[data-markdown-import-file]");
  if (!button || !input) return;
  button.addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      if (!/\.(?:md|markdown)$/i.test(file.name)) throw new Error("Choose a Markdown file with a .md or .markdown extension.");
      if (file.size > 1_000_000) throw new Error("Markdown files must be 1 MB or smaller.");
      const content = parseMarkdownImport(await file.text(), file.name);
      await onImport(file, content);
    } catch (error) {
      showMessage(`Markdown file could not be imported. ${escapeError(error)}`, "error");
    } finally {
      input.value = "";
    }
  });
}

function getField<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
  form: HTMLFormElement,
  name: string,
) {
  const field = form.elements.namedItem(name);
  if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) {
    throw new Error(`The editor field "${name}" is missing.`);
  }
  return field as T;
}

function escapeError(error: unknown) {
  return error instanceof Error ? error.message : "The request could not be completed. Check your connection and try again.";
}

async function getAuthorizedUser() {
  const client = getCmsClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  const session: Session | null = sessionData.session;
  if (!session) return null;

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  const user: User = userData.user;
  if (!user) return null;

  const { data: adminRecord, error: adminError } = await client
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError) throw adminError;
  if (!adminRecord) {
    await client.auth.signOut();
    return null;
  }
  return { client, user, session };
}

async function initializeLogin() {
  if (!loginPage) return;
  const loginForm = loginPage.querySelector<HTMLFormElement>("[data-login-form]");
  const recoveryForm = loginPage.querySelector<HTMLFormElement>("[data-recovery-form]");
  const resetButton = loginPage.querySelector<HTMLButtonElement>("[data-password-reset]");
  if (!loginForm || !recoveryForm || !resetButton) return;

  const recoveryMode = new URLSearchParams(location.search).get("recovery") === "1";
  if (recoveryMode) {
    loginForm.hidden = true;
    resetButton.hidden = true;
    recoveryForm.hidden = false;
  }

  try {
    const auth = await getAuthorizedUser();
    if (auth && !recoveryMode) location.replace("/admin");
  } catch (error) {
    showMessage(escapeError(error), "error");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();
    const submit = loginForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const email = getField<HTMLInputElement>(loginForm, "email").value.trim();
      const password = getField<HTMLInputElement>(loginForm, "password").value;
      const { error } = await getCmsClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      const auth = await getAuthorizedUser();
      if (!auth) {
        showMessage("This account is not on the administrator allowlist. Ask the site owner to grant access.", "error");
        return;
      }
      location.replace("/admin");
    } catch (error) {
      showMessage(escapeError(error), "error");
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  resetButton.addEventListener("click", async () => {
    const email = getField<HTMLInputElement>(loginForm, "email").value.trim();
    if (!email) {
      showMessage("Enter your administrator email first; Supabase will send the reset link if the account is eligible.", "info");
      getField<HTMLInputElement>(loginForm, "email").focus();
      return;
    }
    resetButton.disabled = true;
    try {
      const { error } = await getCmsClient().auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/admin/login?recovery=1`,
      });
      if (error) throw error;
      showMessage("If password recovery is enabled for this account, an email with a recovery link will arrive shortly.", "success");
    } catch (error) {
      showMessage(escapeError(error), "error");
    } finally {
      resetButton.disabled = false;
    }
  });

  recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = recoveryForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.disabled = true;
    try {
      const password = getField<HTMLInputElement>(recoveryForm, "password").value;
      if (password.length < 12) throw new Error("Use at least 12 characters for the new password.");
      const { error } = await getCmsClient().auth.updateUser({ password });
      if (error) throw error;
      showMessage("Password updated. Sign in with the new password.", "success");
      await getCmsClient().auth.signOut();
      recoveryForm.hidden = true;
      loginForm.hidden = false;
      resetButton.hidden = false;
    } catch (error) {
      showMessage(escapeError(error), "error");
    } finally {
      if (submit) submit.disabled = false;
    }
  });
}

type ViewName = "overview" | "list" | "editor" | "media" | "settings";

interface DraftRecovery {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  content_type: string;
  category: string;
  tags: string;
  cover_image_url: string;
  cover_image_alt: string;
  seo_title: string;
  seo_description: string;
  metadata: string;
  savedAt: string;
}

interface LocalEditorDraft {
  id: string;
  content_type: CmsContentType;
  title: string;
  slug: string;
  excerpt: string;
  body_markdown: string;
  category: string;
  tags: string[];
  cover_image_url: string;
  cover_image_alt: string;
  seo_title: string;
  seo_description: string;
  metadata: Record<string, unknown>;
  updated_at: string;
}

const localDraftsStorageKey = "bbu-local-preview-drafts";
const activeLocalDraftStorageKey = "bbu-active-local-preview-draft";

const typeMetadataFields: Record<CmsContentType, Array<{ key: string; label: string; multiline?: boolean; list?: boolean }>> = {
  article: [
    { key: "references", label: "References", multiline: true, list: true },
    { key: "related", label: "Related article slugs", multiline: true, list: true },
  ],
  project: [
    { key: "role", label: "Role" },
    { key: "stack", label: "Technology stack", multiline: true, list: true },
    { key: "architecture", label: "Architecture", multiline: true },
    { key: "lessons", label: "Lessons learned", multiline: true, list: true },
  ],
  research: [
    { key: "topics", label: "Topics", multiline: true, list: true },
    { key: "methodology", label: "Methodology", multiline: true },
    { key: "technicalDetails", label: "Technical details", multiline: true },
    { key: "disclosureStatus", label: "Disclosure status" },
    { key: "findings", label: "Findings", multiline: true, list: true },
    { key: "limitations", label: "Limitations", multiline: true, list: true },
    { key: "conclusion", label: "Conclusion", multiline: true },
    { key: "references", label: "References", multiline: true, list: true },
  ],
  experiment: [
    { key: "hypothesis", label: "Hypothesis", multiline: true },
    { key: "scope", label: "Scope", multiline: true },
    { key: "methodology", label: "Methodology", multiline: true },
    { key: "observations", label: "Observations", multiline: true, list: true },
    { key: "limitations", label: "Limitations", multiline: true, list: true },
    { key: "references", label: "References", multiline: true, list: true },
  ],
  now: [
    { key: "area", label: "Area" },
    { key: "statusText", label: "Current update", multiline: true },
  ],
};

function formatMetadataListItem(key: string, value: unknown) {
  if (key === "references" && value && typeof value === "object" && "title" in value && "url" in value) {
    return `${String(value.title)} — ${String(value.url)}`;
  }
  return String(value);
}

function parseMetadataListItem(key: string, value: string): string | { title: string; url: string } {
  if (key === "references") {
    const reference = value.match(/^(.+?)\s+—\s+(https:\/\/\S+)$/);
    if (reference) return { title: reference[1], url: reference[2] };
  }
  return value;
}

const previewLanguages = {
  bash: () => import("@shikijs/langs/bash"),
  css: () => import("@shikijs/langs/css"),
  html: () => import("@shikijs/langs/html"),
  javascript: () => import("@shikijs/langs/javascript"),
  json: () => import("@shikijs/langs/json"),
  markdown: () => import("@shikijs/langs/markdown"),
  python: () => import("@shikijs/langs/python"),
  sql: () => import("@shikijs/langs/sql"),
  typescript: () => import("@shikijs/langs/typescript"),
  yaml: () => import("@shikijs/langs/yaml"),
};

const previewThemes = {
  "github-light": () => import("@shikijs/themes/github-light"),
  "github-dark": () => import("@shikijs/themes/github-dark"),
};

function isPreviewLanguage(language: string): language is keyof typeof previewLanguages {
  return language in previewLanguages;
}

async function createLocalPreviewHighlighter() {
  const [{ createBundledHighlighter }, { createOnigurumaEngine }, { default: wasm }] = await Promise.all([
    import("shiki/core"),
    import("shiki/engine/oniguruma"),
    import("shiki/wasm"),
  ]);
  const createHighlighter = createBundledHighlighter({
    langs: previewLanguages,
    themes: previewThemes,
    engine: () => createOnigurumaEngine(wasm),
  });
  return createHighlighter({
    themes: ["github-light", "github-dark"],
    langs: ["bash", "css", "html", "javascript", "json", "markdown", "python", "sql", "typescript", "yaml"],
  });
}

function renderTypeMetadataFields(
  container: HTMLElement | null,
  contentType: CmsContentType,
  metadata: Record<string, unknown>,
) {
  if (!container) return;
  container.replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = `${labelByType[contentType]} details`;
  container.append(heading);
  for (const field of typeMetadataFields[contentType]) {
    const label = document.createElement("label");
    label.className = "editor-field";
    const caption = document.createElement("span");
    caption.textContent = field.label;
    const control = document.createElement(field.multiline ? "textarea" : "input");
    control.dataset.metadataKey = field.key;
    if (control instanceof HTMLTextAreaElement) control.rows = 3;
    const value = metadata[field.key];
    control.value = field.list && Array.isArray(value)
      ? value.map((item) => formatMetadataListItem(field.key, item)).join("\n")
      : typeof value === "string" ? value : "";
    label.append(caption, control);
    container.append(label);
  }
}

function readTypeMetadataFields(
  rawMetadata: string,
  container: HTMLElement | null,
  contentType: CmsContentType,
): Record<string, unknown> {
  const parsed: unknown = JSON.parse(rawMetadata || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Structured metadata must be a JSON object.");
  }
  const metadata = parsed as Record<string, unknown>;
  const coverAlt = container?.closest<HTMLFormElement>("form")
    ?.querySelector<HTMLInputElement>("[name='cover_image_alt']")?.value.trim();
  if (coverAlt) metadata.coverImageAlt = coverAlt;
  else delete metadata.coverImageAlt;
  for (const control of container?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-metadata-key]") ?? []) {
    const field = typeMetadataFields[contentType].find((candidate) => candidate.key === control.dataset.metadataKey);
    if (!field) continue;
    const value = control.value.trim();
    metadata[field.key] = field.list
      ? value.split("\n").map((line) => parseMetadataListItem(field.key, line.trim())).filter((line) => line)
      : value;
    if (!value) delete metadata[field.key];
  }
  return metadata;
}

function readLocalEditorDrafts(): LocalEditorDraft[] {
  const serialized = localStorage.getItem(localDraftsStorageKey);
  if (!serialized) return [];
  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed)) throw new Error("Local drafts could not be read because their saved format is invalid.");
  return parsed.filter((item): item is LocalEditorDraft =>
    Boolean(item && typeof item === "object" &&
      typeof item.id === "string" &&
      ["article", "project", "research", "experiment", "now"].includes(item.content_type) &&
      typeof item.title === "string" &&
      typeof item.slug === "string" &&
      typeof item.body_markdown === "string" &&
      item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)),
  ).map((draft) => ({ ...draft, cover_image_alt: draft.cover_image_alt ?? "" }));
}

function writeLocalEditorDrafts(drafts: LocalEditorDraft[]) {
  localStorage.setItem(localDraftsStorageKey, JSON.stringify(drafts));
}

async function initializeLocalEditor(app: HTMLElement): Promise<{
  createDraft: () => Promise<void>;
  navigate: (target: string) => void;
}> {
  const form = app.querySelector<HTMLFormElement>("[data-entry-form]");
  const editorMount = app.querySelector<HTMLElement>("[data-markdown-editor]");
  const previewDialog = document.querySelector<HTMLDialogElement>("[data-preview-dialog]");
  const createDialog = document.querySelector<HTMLDialogElement>("[data-create-dialog]");
  const createForm = createDialog?.querySelector<HTMLFormElement>("[data-create-form]");
  const createStatus = createDialog?.querySelector<HTMLElement>("[data-create-status]");
  const saveState = app.querySelector<HTMLElement>("[data-save-state]");
  const livePreview = app.querySelector<HTMLElement>("[data-live-preview]");
  const typeMetadata = app.querySelector<HTMLElement>("[data-type-metadata]");
  const localBanner = app.querySelector<HTMLElement>("[data-local-preview-banner]");
  if (!form || !editorMount || !createForm || !createDialog || !livePreview) {
    throw new Error("The local editor could not start because required editor controls are missing.");
  }
  const markdownMount: HTMLElement = editorMount;

  if (localBanner) localBanner.hidden = false;
  const setStatus = (message: string, state: "saved" | "saving" | "error") => {
    if (!saveState) return;
    saveState.textContent = message;
    saveState.dataset.state = state;
  };
  for (const selector of ["[data-save]", "[data-publish]", "[data-unpublish]", "[data-archive]", "[data-duplicate]", "[data-delete]"]) {
    const button = app.querySelector<HTMLButtonElement>(selector);
    if (!button) continue;
    button.disabled = true;
    button.title = "This action requires an authenticated administrator and a configured CMS. Local preview content is never sent to Supabase.";
    button.setAttribute("aria-describedby", "local-preview-message");
  }
  const discardButton = app.querySelector<HTMLButtonElement>("[data-local-discard]");
  if (discardButton) discardButton.hidden = false;
  const identityLabel = app.querySelector<HTMLElement>("[data-admin-email]");
  if (identityLabel) identityLabel.textContent = "Local preview";
  const logoutButton = app.querySelector<HTMLButtonElement>("[data-logout]");
  if (logoutButton) logoutButton.hidden = true;
  const publishingNote = app.querySelector<HTMLElement>("[data-publishing-note]");
  if (publishingNote) {
    publishingNote.textContent = "Local drafts stay in this browser and never enter the production build. CMS saving, media uploads, and publishing require an authorized administrator session.";
  }
  const editorHelp = app.querySelector<HTMLElement>("[data-editor-help]");
  if (editorHelp) editorHelp.textContent = "Markdown · Ctrl/⌘ + S saves this local draft";
  const openMediaButton = app.querySelector<HTMLButtonElement>("[data-open-media]");
  if (openMediaButton) {
    openMediaButton.disabled = true;
    openMediaButton.title = "Media upload requires an authenticated administrator and Supabase Storage.";
  }
  const uploadInput = app.querySelector<HTMLInputElement>("[data-upload]");
  if (uploadInput) uploadInput.disabled = true;

  let drafts: LocalEditorDraft[] = [];
  try {
    drafts = readLocalEditorDrafts();
  } catch (error) {
    showMessage(`Local drafts could not be loaded. ${escapeError(error)}`, "error");
  }
  let activeDraft: LocalEditorDraft | null = null;
  let editor: EditorView | null = null;
  let saveTimer: number | undefined;
  let previewSequence = 0;
  let highlighterPromise: ReturnType<typeof createLocalPreviewHighlighter> | undefined;
  let creatingLocalDraft = false;

  const titleField = getField<HTMLInputElement>(form, "title");
  const slugField = getField<HTMLInputElement>(form, "slug");
  const excerptField = getField<HTMLTextAreaElement>(form, "excerpt");
  const contentTypeField = getField<HTMLSelectElement>(form, "content_type");
  const categoryField = getField<HTMLInputElement>(form, "category");
  const tagsField = getField<HTMLInputElement>(form, "tags");
  const coverField = getField<HTMLInputElement>(form, "cover_image_url");
  const coverAltField = getField<HTMLInputElement>(form, "cover_image_alt");
  const seoTitleField = getField<HTMLInputElement>(form, "seo_title");
  const seoDescriptionField = getField<HTMLTextAreaElement>(form, "seo_description");
  const metadataField = getField<HTMLTextAreaElement>(form, "metadata");
  form.dataset.local = "true";
  let slugEdited = false;

  function setEditorMode(nextMode: "split" | "edit" | "preview") {
    form?.setAttribute("data-editor-mode", nextMode);
    app.querySelectorAll<HTMLButtonElement>("[data-editor-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.editorMode === nextMode));
    });
  }

  function parseMetadata(): Record<string, unknown> {
    const parsed: unknown = JSON.parse(metadataField.value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Structured metadata must be a JSON object.");
    }
    return parsed as Record<string, unknown>;
  }

  function renderTypeMetadata(metadata: Record<string, unknown>) {
    renderTypeMetadataFields(typeMetadata, contentTypeField.value as CmsContentType, metadata);
  }

  function syncMetadataControls() {
    const metadata = readTypeMetadataFields(metadataField.value, typeMetadata, contentTypeField.value as CmsContentType);
    metadataField.value = JSON.stringify(metadata, null, 2);
    return metadata;
  }

  function getLocalDraftFromForm(): LocalEditorDraft {
    if (!activeDraft || !editor) throw new Error("Open a local draft before editing.");
    const metadata = syncMetadataControls();
    return {
      ...activeDraft,
      content_type: contentTypeField.value as CmsContentType,
      title: titleField.value,
      slug: slugField.value,
      excerpt: excerptField.value,
      body_markdown: editor.state.doc.toString(),
      category: categoryField.value,
      tags: tagsField.value.split(",").map((tag) => tag.trim()).filter(Boolean),
      cover_image_url: coverField.value,
      cover_image_alt: coverAltField.value,
      seo_title: seoTitleField.value,
      seo_description: seoDescriptionField.value,
      metadata,
      updated_at: new Date().toISOString(),
    };
  }

  function renderLocalRows() {
    const recentRows = app.querySelector<HTMLTableSectionElement>("[data-recent-rows]");
    const listRows = app.querySelector<HTMLTableSectionElement>("[data-content-rows]");
    const selectedType = new URLSearchParams(location.search).get("view");
    const searchTerm = app.querySelector<HTMLInputElement>("[data-search]")?.value.trim().toLocaleLowerCase() ?? "";
    const statusFilter = app.querySelector<HTMLSelectElement>("[data-status-filter]")?.value ?? "";
    const sort = app.querySelector<HTMLSelectElement>("[data-sort]")?.value ?? "updated";
    const visibleDrafts = drafts.filter((draft) =>
      !["article", "project", "research", "experiment", "now"].includes(selectedType ?? "") ||
      draft.content_type === selectedType,
    ).filter((draft) =>
      (!searchTerm || `${draft.title} ${draft.excerpt} ${draft.tags.join(" ")}`.toLocaleLowerCase().includes(searchTerm)) &&
      (!statusFilter || statusFilter === "draft"),
    ).sort((first, second) =>
      sort === "title" ? first.title.localeCompare(second.title) :
      Date.parse(second.updated_at) - Date.parse(first.updated_at),
    );
    for (const [tbody, values] of [[recentRows, drafts.slice(0, 6)], [listRows, visibleDrafts]] as const) {
      if (!tbody) continue;
      tbody.replaceChildren();
      for (const draft of values) {
        const row = document.createElement("tr");
        const name = document.createElement("td");
        const edit = document.createElement("button");
        edit.type = "button";
        edit.dataset.localEdit = draft.id;
        edit.textContent = draft.title || "Untitled local draft";
        name.append(edit);
        row.append(name);
        if (tbody === recentRows) {
          const type = document.createElement("td");
          type.textContent = labelByType[draft.content_type];
          row.append(type);
        }
        const status = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = "status-label";
        badge.dataset.status = "draft";
        badge.textContent = "Local draft";
        status.append(badge);
        row.append(status);
        if (tbody === listRows) {
          const category = document.createElement("td");
          category.textContent = draft.category || "—";
          row.append(category);
        }
        const updated = document.createElement("td");
        updated.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(draft.updated_at));
        row.append(updated);
        const actions = document.createElement("td");
        const actionGroup = document.createElement("div");
        actionGroup.className = "table-actions";
        const open = document.createElement("button");
        open.type = "button";
        open.dataset.localEdit = draft.id;
        open.textContent = "Edit";
        actionGroup.append(open);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.localDelete = draft.id;
        remove.textContent = "Delete";
        remove.setAttribute("aria-label", `Delete local draft ${draft.title || "Untitled local draft"}`);
        actionGroup.append(remove);
        actions.append(actionGroup);
        row.append(actions);
        tbody.append(row);
      }
    }
    const overviewEmpty = app.querySelector<HTMLElement>("[data-overview-empty]");
    if (overviewEmpty) overviewEmpty.hidden = drafts.length > 0;
    const listEmpty = app.querySelector<HTMLElement>("[data-list-empty]");
    if (listEmpty) {
      listEmpty.hidden = visibleDrafts.length > 0;
      const heading = listEmpty.querySelector("h2");
      const copy = listEmpty.querySelector("p");
      if (heading) heading.textContent = "No local drafts in this section.";
      if (copy) copy.textContent = "Create a local preview draft to explore the editor. It stays in this browser and is not published.";
    }
    const total = app.querySelector<HTMLElement>("[data-stat-drafts]");
    if (total) total.textContent = String(drafts.length);
    const published = app.querySelector<HTMLElement>("[data-stat-published]");
    if (published) published.textContent = "0";
    for (const type of ["article", "project", "research", "experiment", "now"] as const) {
      const count = app.querySelector<HTMLElement>(`[data-stat-${type}]`);
      if (count) count.textContent = String(drafts.filter((draft) => draft.content_type === type).length);
    }
  }

  function escapePreviewText(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[character] ?? character);
  }

  async function renderLocalPreview() {
    if (!activeDraft || !editor) return;
    const sequence = ++previewSequence;
    const draftId = activeDraft.id;
    const activeEditor = editor;
    const [{ default: DOMPurify }, { marked }] = await Promise.all([
      import("dompurify"),
      import("marked"),
    ]);
    if (sequence !== previewSequence || activeDraft?.id !== draftId || editor !== activeEditor) return;
    const draft = getLocalDraftFromForm();
    const parsedHtml = await marked.parse(draft.body_markdown, { async: true, gfm: true, breaks: false });
    if (sequence !== previewSequence || activeDraft?.id !== draftId || editor !== activeEditor) return;
    const content = app.querySelector<HTMLElement>("[data-live-preview]");
    if (!content) return;
    const metaRows: Array<[string, string]> = [];
    const beforeBodySections: string[] = [];
    const afterBodySections: string[] = [];
    const renderTextSection = (heading: string, value: unknown) =>
      `<section class="detail-section"><h2>${escapePreviewText(heading)}</h2><p>${escapePreviewText(String(value))}</p></section>`;
    const renderListSection = (heading: string, values: unknown[]) =>
      `<section class="detail-section"><h2>${escapePreviewText(heading)}</h2><ul class="detail-list">${values.map((item) => {
        if (item && typeof item === "object" && "title" in item && "url" in item &&
          typeof item.title === "string" && typeof item.url === "string" && /^https:\/\/\S+$/i.test(item.url)) {
          return `<li><a href="${escapePreviewText(item.url)}" target="_blank" rel="noopener noreferrer">${escapePreviewText(item.title)}</a></li>`;
        }
        return `<li>${escapePreviewText(String(item))}</li>`;
      }).join("")}</ul></section>`;

    if (draft.content_type === "project") {
      metaRows.push(["Status", "Local draft · not published"]);
      if (draft.metadata.role) metaRows.push(["Role", String(draft.metadata.role)]);
      if (Array.isArray(draft.metadata.stack)) metaRows.push(["Technology", draft.metadata.stack.map(String).join(" · ")]);
      if (draft.metadata.architecture) beforeBodySections.push(renderTextSection("Architecture", draft.metadata.architecture));
      if (Array.isArray(draft.metadata.lessons) && draft.metadata.lessons.length) {
        afterBodySections.push(renderListSection("Lessons learned", draft.metadata.lessons));
      }
    } else if (draft.content_type === "research") {
      metaRows.push(["Status", "Local draft · not published"]);
      if (Array.isArray(draft.metadata.topics) && draft.metadata.topics.length) {
        metaRows.push(["Topics", draft.metadata.topics.map(String).join(" · ")]);
      }
      if (draft.metadata.disclosureStatus) metaRows.push(["Disclosure status", String(draft.metadata.disclosureStatus)]);
      for (const [key, heading] of [["methodology", "Methodology"], ["technicalDetails", "Technical details"]] as const) {
        if (draft.metadata[key]) beforeBodySections.push(renderTextSection(heading, draft.metadata[key]));
      }
      for (const [key, heading] of [["findings", "Findings"], ["limitations", "Limitations"], ["references", "References"]] as const) {
        const values = draft.metadata[key];
        if (Array.isArray(values) && values.length) {
          afterBodySections.push(renderListSection(heading, values));
        }
      }
      if (draft.metadata.conclusion) afterBodySections.push(renderTextSection("Conclusion", draft.metadata.conclusion));
    } else if (draft.content_type === "experiment") {
      metaRows.push(["Status", "Local draft · not published"]);
      if (draft.category) metaRows.push(["Area", draft.category]);
      for (const [key, heading] of [["hypothesis", "Hypothesis"], ["scope", "Scope"], ["methodology", "Methodology"]] as const) {
        if (draft.metadata[key]) beforeBodySections.push(renderTextSection(heading, draft.metadata[key]));
      }
      for (const [key, heading] of [["observations", "Observations"], ["limitations", "Limitations"], ["references", "References"]] as const) {
        const values = draft.metadata[key];
        if (Array.isArray(values) && values.length) {
          afterBodySections.push(renderListSection(heading, values));
        }
      }
    } else if (draft.content_type === "now") {
      metaRows.push(["Status", "Local draft · not published"]);
      if (draft.metadata.area) metaRows.push(["Area", String(draft.metadata.area)]);
    } else {
      if (draft.category) metaRows.push(["Category", draft.category]);
      metaRows.push(["Reading time", formatReadingTime(countMarkdownWords(draft.body_markdown))]);
      if (Array.isArray(draft.metadata.references) && draft.metadata.references.length) {
        afterBodySections.push(renderListSection("References", draft.metadata.references));
      }
      if (Array.isArray(draft.metadata.related) && draft.metadata.related.length) {
        afterBodySections.push(renderListSection("Related writing", draft.metadata.related));
      }
    }
    const title = escapePreviewText(draft.title || "Untitled");
    const excerpt = escapePreviewText(draft.excerpt || "Your excerpt will appear here.");
    const tagMarkup = draft.tags.length
      ? `<ul class="tag-list" aria-label="Tags">${draft.tags.map((tag) => `<li>${escapePreviewText(tag)}</li>`).join("")}</ul>`
      : "";
    const metaMarkup = metaRows.length
      ? `<dl class="detail-meta">${metaRows.map(([label, value]) => `<dt>${escapePreviewText(label)}</dt><dd>${escapePreviewText(value)}</dd>`).join("")}</dl>`
      : "";
    const heroImage = draft.cover_image_url
      ? `<figure class="detail-figure"><img src="${escapePreviewText(draft.cover_image_url)}" alt="${escapePreviewText(draft.cover_image_alt)}" loading="lazy" decoding="async" /></figure>`
      : "";
    const nowMarkup = draft.content_type === "now"
      ? `<div class="route-body">
          <section aria-labelledby="local-now-record-title">
            <div class="section-heading"><h2 id="local-now-record-title">Current record</h2><p class="section-heading__note">Local preview · not published</p></div>
            <dl class="now-index">
              ${draft.metadata.area ? `<dt>${escapePreviewText(String(draft.metadata.area))}</dt>` : ""}
              ${draft.metadata.statusText ? `<dd>${escapePreviewText(String(draft.metadata.statusText))}</dd>` : ""}
            </dl>
          </section>
          ${heroImage}
        </div>`
      : "";
    const routeClass = draft.content_type === "now"
      ? "route-page--now"
      : `route-page--detail${draft.content_type === "article" ? " route-page--article" : ""}`;
    content.innerHTML = DOMPurify.sanitize(
      `<main class="route-page ${routeClass}">
        <header class="detail-intro page-grid"><div><p class="studio-eyebrow">${escapePreviewText(labelByType[draft.content_type])} / LOCAL PREVIEW</p><h1 class="page-title">${title}</h1><p class="page-lede">${excerpt}</p></div></header>
        ${draft.content_type === "now" ? nowMarkup : `${metaMarkup}${tagMarkup}${heroImage}`}
        ${beforeBodySections.join("")}
        <article class="article-body detail-section">${parsedHtml}</article>
        ${afterBodySections.join("")}
        ${draft.content_type === "now" ? tagMarkup : ""}
      </main>`,
      { ADD_ATTR: ["target"], FORBID_TAGS: ["style", "script", "iframe", "object", "embed", "form"] },
    );
    try {
      highlighterPromise ??= createLocalPreviewHighlighter();
      const highlighter = await highlighterPromise;
      const theme = document.documentElement.dataset.theme === "dark" ? "github-dark" : "github-light";
      for (const code of content.querySelectorAll<HTMLElement>("pre > code")) {
        const language = code.className.match(/language-([\w+#.-]+)/)?.[1]?.toLowerCase();
        if (!language || !isPreviewLanguage(language)) continue;
        const highlighted = highlighter.codeToHtml(code.textContent ?? "", { lang: language, theme });
        const fragment = document.createElement("template");
        fragment.innerHTML = DOMPurify.sanitize(highlighted);
        code.parentElement?.replaceWith(fragment.content);
      }

    } catch (error) {
      showMessage(`Code highlighting is unavailable; the Markdown preview remains readable. ${escapeError(error)}`, "error");
    }
    if (sequence !== previewSequence || activeDraft?.id !== draftId || editor !== activeEditor) return;
    const previewTitle = previewDialog?.querySelector<HTMLElement>("#preview-title");
    const previewExcerpt = previewDialog?.querySelector<HTMLElement>("[data-preview-excerpt]");
    const previewBody = previewDialog?.querySelector<HTMLElement>("[data-preview-body]");
    const previewMeta = previewDialog?.querySelector<HTMLElement>("[data-preview-meta]");
    if (previewTitle) previewTitle.textContent = draft.title || "Untitled";
    if (previewExcerpt) previewExcerpt.textContent = draft.excerpt;
    if (previewBody) previewBody.innerHTML = DOMPurify.sanitize(parsedHtml);
    if (previewMeta) {
      previewMeta.replaceChildren();
      for (const [label, value] of metaRows) {
        const term = document.createElement("dt");
        term.textContent = label;
        const description = document.createElement("dd");
        description.textContent = value;
        previewMeta.append(term, description);
      }
      previewMeta.hidden = metaRows.length === 0;
    }
  }

  const themeObserver = new MutationObserver(() => {
    if (activeDraft && editor) {
      void renderLocalPreview().catch((error) => {
        showMessage(`Live preview could not follow the theme change. ${escapeError(error)}`, "error");
      });
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  function persistActiveDraft(): boolean {
    if (!activeDraft) return false;
    try {
      const updated = getLocalDraftFromForm();
      drafts = [updated, ...drafts.filter((draft) => draft.id !== updated.id)];
      writeLocalEditorDrafts(drafts);
      renderLocalRows();
      setStatus("Local draft · saved", "saved");
      void renderLocalPreview().catch((error) => {
        showMessage(`Live preview could not be updated. ${escapeError(error)}`, "error");
      });
      return true;
    } catch (error) {
      setStatus("Local save failed", "error");
      showMessage(`Local draft could not be saved in this browser. ${escapeError(error)}`, "error");
      return false;
    }
  }

  function scheduleLocalSave() {
    if (!activeDraft) return;
    setStatus("Local draft · unsaved changes", "saving");
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persistActiveDraft, 400);
    void renderLocalPreview().catch((error) => {
      showMessage(`Live preview could not be updated. ${escapeError(error)}`, "error");
    });
  }

  async function openLocalDraft(draft: LocalEditorDraft) {
    previewSequence += 1;
    activeDraft = draft;
    try {
      localStorage.setItem(activeLocalDraftStorageKey, draft.id);
    } catch (error) {
      showMessage(`This browser cannot remember the active local draft. ${escapeError(error)}`, "error");
    }
    titleField.value = draft.title;
    slugField.value = draft.slug;
    slugEdited = true;
    excerptField.value = draft.excerpt;
    contentTypeField.value = draft.content_type;
    categoryField.value = draft.category;
    tagsField.value = draft.tags.join(", ");
    coverField.value = draft.cover_image_url;
    coverAltField.value = draft.cover_image_alt;
    seoTitleField.value = draft.seo_title;
    seoDescriptionField.value = draft.seo_description;
    metadataField.value = JSON.stringify(draft.metadata, null, 2);
    renderTypeMetadata(draft.metadata);
    editor?.destroy();
    editor = null;
    markdownMount.replaceChildren();
    markdownMount.textContent = "Loading Markdown editor…";
    const panel = app.querySelector<HTMLElement>('[data-panel="editor"]');
    for (const section of app.querySelectorAll<HTMLElement>("[data-panel]")) section.hidden = section !== panel;
    const route = document.querySelector("[data-editor-type]") as HTMLElement | null;
    if (route) route.textContent = labelByType[draft.content_type];
    setStatus("Opening local draft…", "saving");
    const editorModules = await Promise.all([
      import("codemirror"),
      import("@codemirror/commands"),
      import("@codemirror/lang-markdown"),
      import("@codemirror/state"),
      import("@codemirror/view"),
    ]).catch((error: unknown) => {
      markdownMount.textContent = "The Markdown editor could not load. Reload the page and try opening this draft again.";
      setStatus("Editor unavailable", "error");
      throw error;
    });
    const [{ basicSetup }, { indentWithTab, insertNewlineAndIndent, insertTab }, { markdown }, { EditorState }, { EditorView, keymap }] = editorModules;
    markdownMount.replaceChildren();
    editor = new EditorView({
      state: EditorState.create({
        doc: draft.body_markdown,
        extensions: [
          basicSetup,
          markdown(),
          EditorView.lineWrapping,
          keymap.of([
            indentWithTab,
            { key: "Mod-s", run: () => { persistActiveDraft(); return true; } },
            { key: "Enter", run: insertNewlineAndIndent },
            { key: "Tab", run: insertTab },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const text = update.state.doc.toString();
              const words = countMarkdownWords(text);
              const output = app.querySelector<HTMLElement>("[data-word-count]");
              if (output) output.textContent = `${words.toLocaleString()} ${words === 1 ? "word" : "words"} · ${formatReadingTime(words)} read`;
              scheduleLocalSave();
            }
          }),
          EditorView.theme({
            "&": { color: "var(--ink)", backgroundColor: "var(--paper-bright)" },
            ".cm-gutters": { backgroundColor: "var(--paper-shade)", color: "var(--muted)", border: "none" },
            ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--signal) 6%, transparent)" },
            ".cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--signal) 28%, transparent) !important" },
          }),
        ],
      }),
      parent: markdownMount,
    });
    const wordCount = countMarkdownWords(draft.body_markdown);
    const wordCountOutput = app.querySelector<HTMLElement>("[data-word-count]");
    if (wordCountOutput) {
      wordCountOutput.textContent = `${wordCount.toLocaleString()} ${wordCount === 1 ? "word" : "words"} · ${formatReadingTime(wordCount)} read`;
    }
    setStatus("Local draft · saved", "saved");
    const discard = app.querySelector<HTMLButtonElement>("[data-local-discard]");
    if (discard) discard.hidden = false;
    setEditorMode("split");
    await renderLocalPreview();
    titleField.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderLocalListRoute(target: string) {
    const type = ["article", "project", "research", "experiment", "now"].includes(target)
      ? target as CmsContentType
      : undefined;
    const panel = target === "media" || target === "settings" ? target : type ? "list" : "overview";
    for (const section of app.querySelectorAll<HTMLElement>("[data-panel]")) {
      section.hidden = section.dataset.panel !== panel;
    }
    for (const link of app.querySelectorAll<HTMLAnchorElement>("[data-studio-view]")) {
      const active = link.dataset.studioView === target ||
        (panel === "list" && link.dataset.studioView === type);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (panel === "media") {
      const heading = app.querySelector<HTMLElement>("[data-panel='media'] h1");
      const description = app.querySelector<HTMLElement>("[data-panel='media'] .workspace-lede");
      const uploadLabel = app.querySelector<HTMLElement>("[data-panel='media'] .upload-button");
      const empty = app.querySelector<HTMLElement>("[data-media-empty]");
      if (heading) heading.textContent = "Media library unavailable.";
      if (description) description.textContent = "Media uploads need an authenticated CMS connection. In local preview, add an HTTPS or site-relative image URL in the editor.";
      if (uploadLabel) uploadLabel.title = "Supabase Storage requires an authenticated CMS connection.";
      if (empty) empty.hidden = false;
    } else if (panel === "settings") {
      const status = app.querySelector<HTMLElement>("[data-mfa-status]");
      const enroll = app.querySelector<HTMLButtonElement>("[data-mfa-enroll]");
      if (status) status.textContent = "Account security settings require Supabase configuration and an authorized administrator session.";
      if (enroll) enroll.disabled = true;
    } else if (panel === "list" && type) {
      const heading = app.querySelector<HTMLElement>("[data-list-title]");
      const eyebrow = app.querySelector<HTMLElement>("[data-list-eyebrow]");
      const description = app.querySelector<HTMLElement>("[data-list-description]");
      if (heading) heading.textContent = `${labelByType[type]}.`;
      if (eyebrow) eyebrow.textContent = `LOCAL DRAFTS / ${labelByType[type].toUpperCase()}`;
      if (description) description.textContent = "Browser-local drafts are private to this device and are never published.";
    }
    renderLocalRows();
  }

  function navigateLocalView(target: string) {
    const url = new URL(location.href);
    if (target === "overview") url.searchParams.delete("view");
    else url.searchParams.set("view", target);
    history.replaceState(null, "", url);
    renderLocalListRoute(target);
  }

  app.querySelectorAll<HTMLButtonElement>("[data-editor-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.editorMode;
      if (mode === "split" || mode === "edit" || mode === "preview") setEditorMode(mode);
    });
  });
  for (const selector of ["[name='title']", "[name='slug']", "[name='excerpt']", "[name='content_type']", "[name='category']", "[name='tags']", "[name='cover_image_url']", "[name='cover_image_alt']", "[name='seo_title']", "[name='seo_description']", "[name='metadata']"]) {
    form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)
      ?.addEventListener("input", () => {
        if (selector === "[name='title']" && !slugEdited) slugField.value = slugifyTitle(titleField.value);
        if (selector === "[name='content_type']") renderTypeMetadata(parseMetadata());
        if (selector === "[name='metadata']") {
          try { renderTypeMetadata(parseMetadata()); } catch { /* The visible save state reports invalid metadata. */ }
        }
        scheduleLocalSave();
      });
    form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)
      ?.addEventListener("change", () => {
        if (selector === "[name='content_type']") {
          try {
            metadataField.value = JSON.stringify(syncMetadataControls(), null, 2);
            renderTypeMetadata(parseMetadata());
          } catch (error) {
            showMessage(`Type-specific metadata could not be updated. ${escapeError(error)}`, "error");
          }
        }
        scheduleLocalSave();
      });
  }
  typeMetadata?.addEventListener("input", () => {
    try {
      syncMetadataControls();
      scheduleLocalSave();
    } catch (error) {
      setStatus("Metadata needs valid JSON", "error");
      showMessage(`Metadata could not be updated. ${escapeError(error)}`, "error");
    }
  });
  form.querySelector<HTMLButtonElement>("[data-slug-refresh]")?.addEventListener("click", () => {
    slugField.value = slugifyTitle(titleField.value);
    slugEdited = false;
    scheduleLocalSave();
  });
  app.querySelectorAll<HTMLButtonElement>("[data-format]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!editor) return;
      const format = button.dataset.format ?? "";
      const selection = editor.state.selection.main;
      const selected = editor.state.doc.sliceString(selection.from, selection.to);
      const wrap = (before: string, after = before, placeholder = "text") => {
        const text = selected || placeholder;
        editor?.dispatch({
          changes: { from: selection.from, to: selection.to, insert: `${before}${text}${after}` },
          selection: { anchor: selection.from + before.length, head: selection.from + before.length + text.length },
        });
      };
      const block = (prefix: string, fallback: string) => {
        const text = (selected || fallback).split("\n").map((line) => `${prefix}${line}`).join("\n");
        editor?.dispatch({ changes: { from: selection.from, to: selection.to, insert: text } });
      };
      if (format === "bold") wrap("**", "**", "strong text");
      else if (format === "italic") wrap("*", "*", "emphasis");
      else if (format === "heading") block("## ", "Section heading");
      else if (format === "quote") block("> ", "Quoted text");
      else if (format === "unordered") block("- ", "List item");
      else if (format === "ordered") block("1. ", "List item");
      else if (format === "inline-code") wrap("`", "`", "code");
      else if (format === "code") wrap("```typescript\n", "\n```", "const value = true;");
      else if (format === "link") {
        const url = window.prompt("Link URL (HTTPS or mailto):");
        if (!url || (!/^https:\/\//i.test(url) && !/^mailto:/i.test(url))) return;
        wrap("[", `](${url})`, "link text");
      } else if (format === "image") {
        const url = window.prompt("Image URL (HTTPS or site-relative):");
        if (!url || (!/^https:\/\//i.test(url) && (!url.startsWith("/") || url.startsWith("//")))) return;
        const alt = window.prompt("Describe the image for screen readers:", "Image description");
        if (!alt?.trim()) return;
        wrap(`![${alt.trim()}](`, ")", url);
      } else if (format === "table") {
        editor.dispatch({ changes: { from: selection.from, to: selection.to, insert: "| Column | Column |\n| --- | --- |\n| Value | Value |\n" } });
      } else if (format === "rule") {
        editor.dispatch({ changes: { from: selection.from, to: selection.to, insert: "\n---\n" } });
      }
      editor?.focus();
    });
  });
  bindMarkdownImport(async (file, imported) => {
    if (!editor) throw new Error("Open a draft before importing Markdown.");
    if (editor.state.doc.length && !window.confirm(`Replace this draft with “${file.name}” and its frontmatter?`)) return;
    titleField.value = imported.title;
    slugField.value = imported.slug;
    slugEdited = true;
    excerptField.value = imported.excerpt;
    if (imported.contentType) contentTypeField.value = imported.contentType;
    categoryField.value = imported.category;
    tagsField.value = imported.tags.join(", ");
    coverField.value = imported.coverImageUrl;
    coverAltField.value = imported.coverImageAlt;
    seoTitleField.value = imported.seoTitle;
    seoDescriptionField.value = imported.seoDescription;
    metadataField.value = JSON.stringify(imported.metadata, null, 2);
    renderTypeMetadata(imported.metadata);
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: imported.body } });
    scheduleLocalSave();
    showMessage(`Imported ${file.name} into this local draft. Review the preview before publishing.`, "success");
  });
  app.querySelector<HTMLButtonElement>("[data-preview]")?.addEventListener("click", () => {
    void renderLocalPreview().then(() => previewDialog?.showModal()).catch((error) => {
      showMessage(`Preview could not be opened. ${escapeError(error)}`, "error");
    });
  });
  previewDialog?.querySelector<HTMLButtonElement>("[data-preview-close]")?.addEventListener("click", () => previewDialog.close());
  app.querySelector<HTMLButtonElement>("[data-back-to-list]")?.addEventListener("click", () => {
    if (saveTimer) window.clearTimeout(saveTimer);
    if (activeDraft && !persistActiveDraft()) return;
    previewSequence += 1;
    try {
      localStorage.removeItem(activeLocalDraftStorageKey);
    } catch (error) {
      showMessage(`The draft is saved locally, but this browser could not clear its active-editor marker. ${escapeError(error)}`, "info");
    }
    activeDraft = null;
    editor?.destroy();
    editor = null;
    renderLocalListRoute(new URLSearchParams(location.search).get("view") ?? "overview");
  });
  for (const selector of ["[data-search]", "[data-status-filter]", "[data-sort]"]) {
    app.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.addEventListener("input", renderLocalRows);
    app.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.addEventListener("change", renderLocalRows);
  }
  discardButton?.addEventListener("click", () => {
    if (!activeDraft || !window.confirm("Discard this local draft from this browser? This cannot be undone.")) return;
    const nextDrafts = drafts.filter((draft) => draft.id !== activeDraft?.id);
    try {
      if (saveTimer) window.clearTimeout(saveTimer);
      previewSequence += 1;
      writeLocalEditorDrafts(nextDrafts);
      drafts = nextDrafts;
      try {
        localStorage.removeItem(activeLocalDraftStorageKey);
      } catch (error) {
        showMessage(`The draft was removed, but this browser could not clear its active-editor marker. ${escapeError(error)}`, "info");
      }
      activeDraft = null;
      editor?.destroy();
      editor = null;
      renderLocalListRoute(new URLSearchParams(location.search).get("view") ?? "overview");
      showMessage("Local draft discarded from this browser.", "success");
    } catch (error) {
      showMessage(`Local draft could not be discarded. ${escapeError(error)}`, "error");
    }
  });
  app.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const remove = target.closest<HTMLElement>("[data-local-delete]");
    const draftToRemove = remove && drafts.find((item) => item.id === remove.dataset.localDelete);
    if (draftToRemove) {
      if (!window.confirm(`Delete “${draftToRemove.title || "Untitled local draft"}” from this browser? This does not affect published content.`)) return;
      try {
        const nextDrafts = drafts.filter((item) => item.id !== draftToRemove.id);
        writeLocalEditorDrafts(nextDrafts);
        drafts = nextDrafts;
        let markerCleanupFailed = false;
        if (activeDraft?.id === draftToRemove.id) {
          if (saveTimer) window.clearTimeout(saveTimer);
          activeDraft = null;
          editor?.destroy();
          editor = null;
          try {
            localStorage.removeItem(activeLocalDraftStorageKey);
          } catch {
            markerCleanupFailed = true;
          }
          renderLocalListRoute(new URLSearchParams(location.search).get("view") ?? "overview");
        }
        renderLocalRows();
        showMessage(
          markerCleanupFailed
            ? "Local draft deleted, but this browser could not clear its active-editor marker."
            : "Local draft deleted from this browser.",
          markerCleanupFailed ? "info" : "success",
        );
      } catch (error) {
        showMessage(`Local draft could not be deleted. ${escapeError(error)}`, "error");
      }
      return;
    }
    const edit = target.closest<HTMLElement>("[data-local-edit]");
    const draft = edit && drafts.find((item) => item.id === edit.dataset.localEdit);
    if (draft) void openLocalDraft(draft).catch((error) => showMessage(`Local draft could not be opened. ${escapeError(error)}`, "error"));
  });

  contentTypeField.addEventListener("change", () => {
    try {
      metadataField.value = JSON.stringify(syncMetadataControls(), null, 2);
      renderTypeMetadata(parseMetadata());
    } catch (error) {
      showMessage(`Type-specific metadata could not be updated. ${escapeError(error)}`, "error");
    }
  });

  const createLocalDraft = async () => {
    if (creatingLocalDraft) return;
    creatingLocalDraft = true;
    const submit = createForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) {
      submit.disabled = true;
      submit.textContent = "Creating local draft…";
    }
    if (createStatus) {
      createStatus.textContent = "Creating a browser-local draft…";
      createStatus.dataset.kind = "info";
      createStatus.hidden = false;
    }
    try {
      const input = new FormData(createForm);
      const title = String(input.get("title") ?? "").trim();
      const slug = String(input.get("slug") ?? "").trim();
      if (!title) throw new Error("Enter a title to create a draft.");
      if (!slug) throw new Error("Add a title that produces a valid URL slug.");
      const now = new Date().toISOString();
      const draft: LocalEditorDraft = {
        id: `local-${crypto.randomUUID()}`,
        content_type: String(input.get("content_type")) as CmsContentType,
        title,
        slug,
        excerpt: "",
        body_markdown: "",
        category: "",
        tags: [],
        cover_image_url: "",
        cover_image_alt: "",
        seo_title: "",
        seo_description: "",
        metadata: {},
        updated_at: now,
      };
      const nextDrafts = [draft, ...drafts];
      writeLocalEditorDrafts(nextDrafts);
      drafts = nextDrafts;
      localStorage.setItem(activeLocalDraftStorageKey, draft.id);
      renderLocalRows();
      createDialog.close();
      createForm.reset();
      await openLocalDraft(draft);
      showMessage("Local preview draft created. It is saved only in this browser.", "success");
    } catch (error) {
      if (createStatus) {
        createStatus.textContent = `Local draft could not be created. ${escapeError(error)}`;
        createStatus.dataset.kind = "error";
        createStatus.hidden = false;
      } else {
        showMessage(`Local draft could not be created. ${escapeError(error)}`, "error");
      }
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = "Create draft";
      }
      creatingLocalDraft = false;
    }
  };

  renderLocalRows();
  const initialView = new URLSearchParams(location.search).get("view") ?? "overview";
  renderLocalListRoute(initialView);
  let activeId: string | null = null;
  try {
    activeId = localStorage.getItem(activeLocalDraftStorageKey);
  } catch (error) {
    showMessage(`The active local draft could not be recovered. ${escapeError(error)}`, "error");
  }
  const recovery = drafts.find((draft) => draft.id === activeId);
  if (recovery) {
    await openLocalDraft(recovery);
    showMessage("Recovered your last local preview draft from this browser.", "info");
  }
  return { createDraft: createLocalDraft, navigate: navigateLocalView };
}

function parseDraftRecovery(value: string): DraftRecovery | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const record = parsed as Record<string, unknown>;
  if (
    typeof record.title !== "string" ||
    typeof record.slug !== "string" ||
    typeof record.excerpt !== "string" ||
    typeof record.body !== "string" ||
    typeof record.content_type !== "string" ||
    typeof record.category !== "string" ||
    typeof record.tags !== "string" ||
    typeof record.cover_image_url !== "string" ||
    typeof record.cover_image_alt !== "string" ||
    typeof record.seo_title !== "string" ||
    typeof record.seo_description !== "string" ||
    typeof record.metadata !== "string" ||
    typeof record.savedAt !== "string" ||
    !Number.isFinite(Date.parse(record.savedAt))
  ) return undefined;
  return {
    title: record.title,
    slug: record.slug,
    excerpt: record.excerpt,
    body: record.body,
    content_type: record.content_type,
    category: record.category,
    tags: record.tags,
    cover_image_url: record.cover_image_url,
    cover_image_alt: record.cover_image_alt,
    seo_title: record.seo_title,
    seo_description: record.seo_description,
    metadata: record.metadata,
    savedAt: record.savedAt,
  };
}

async function initializeStudio() {
  if (!appRoot) return;
  const app: HTMLElement = appRoot;
  const createDialog = document.querySelector<HTMLDialogElement>("[data-create-dialog]");
  const previewDialog = document.querySelector<HTMLDialogElement>("[data-preview-dialog]");
  const createForm = createDialog?.querySelector<HTMLFormElement>("[data-create-form]");
  const createStatus = createDialog?.querySelector<HTMLElement>("[data-create-status]");
  const createTitle = createForm?.querySelector<HTMLInputElement>('input[name="title"]');
  const createSlug = createForm?.querySelector<HTMLInputElement>('input[name="slug"]');
  let createDraft: (() => Promise<void>) | undefined;
  let createSlugEdited = false;
  let creatingEntry = false;
  let navigateAuthorizedView: ((target: string) => void) | undefined;

  app.querySelectorAll<HTMLButtonElement>("[data-editor-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.editorMode;
      if (mode !== "split" && mode !== "edit" && mode !== "preview") return;
      const editorForm = app.querySelector<HTMLFormElement>("[data-entry-form]");
      if (editorForm) editorForm.dataset.editorMode = mode;
      app.querySelectorAll<HTMLButtonElement>("[data-editor-mode]").forEach((control) => {
        control.setAttribute("aria-pressed", String(control.dataset.editorMode === mode));
      });
    });
  });

  function showUnavailableView(target: string) {
    const type = ["article", "project", "research", "experiment", "now"].includes(target)
      ? target as CmsContentType
      : undefined;
    const panel = target === "media" || target === "settings"
      ? target
      : type ? "list" : "overview";
    for (const section of app.querySelectorAll<HTMLElement>("[data-panel]")) {
      section.hidden = section.dataset.panel !== panel;
    }
    for (const link of app.querySelectorAll<HTMLAnchorElement>("[data-studio-view]")) {
      const active = link.dataset.studioView === target ||
        (panel === "list" && link.dataset.studioView === type);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (panel === "media") {
      const empty = app.querySelector<HTMLElement>("[data-media-empty]");
      if (empty) {
        empty.hidden = false;
        const heading = empty.querySelector("h2");
        const description = empty.querySelector("p");
        if (heading) heading.textContent = "Media library unavailable.";
        if (description) description.textContent = "Configure Supabase and sign in as an authorized administrator to view or upload media.";
      }
    }
    if (panel === "settings") {
      const status = app.querySelector<HTMLElement>("[data-mfa-status]");
      const enroll = app.querySelector<HTMLButtonElement>("[data-mfa-enroll]");
      if (status) status.textContent = "Account security settings require Supabase configuration and an authorized administrator session.";
      if (enroll) enroll.disabled = true;
    }
    if (panel === "list") {
      if (!type) return;
      const label = labelByType[type];
      const title = app.querySelector<HTMLElement>("[data-list-title]");
      const eyebrow = app.querySelector<HTMLElement>("[data-list-eyebrow]");
      const description = app.querySelector<HTMLElement>("[data-list-description]");
      const empty = app.querySelector<HTMLElement>("[data-list-empty]");
      if (title) title.textContent = `${label}.`;
      if (eyebrow) eyebrow.textContent = `CONTENT / ${label.toUpperCase()}`;
      if (description) description.textContent = "Content is unavailable until Supabase is configured and an administrator is signed in.";
      if (empty) {
        empty.hidden = false;
        const heading = empty.querySelector("h2");
        const emptyDescription = empty.querySelector("p");
        if (heading) heading.textContent = "Content unavailable.";
        if (emptyDescription) emptyDescription.textContent = "Configure Supabase and sign in as an authorized administrator to browse entries.";
      }
    }
  }

  function updateStudioUrl(target: string) {
    const url = new URL(location.href);
    if (target === "overview") url.searchParams.delete("view");
    else url.searchParams.set("view", target);
    history.replaceState(null, "", url);
  }

  app.querySelectorAll<HTMLAnchorElement>("[data-studio-view]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const target = link.dataset.studioView ?? "overview";
      if (navigateAuthorizedView) {
        navigateAuthorizedView(target);
      } else {
        updateStudioUrl(target);
        showUnavailableView(target);
      }
    });
  });
  app.querySelectorAll<HTMLButtonElement>("[data-new-entry]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!createDialog) {
        showMessage("The draft form is unavailable. Reload the page; if this persists, contact the site owner.", "error");
        return;
      }
      if (createStatus) createStatus.hidden = true;
      createDialog.showModal();
      createTitle?.focus();
    });
  });
  createDialog?.querySelectorAll<HTMLButtonElement>("[data-create-close]").forEach((button) => {
    button.addEventListener("click", () => createDialog.close());
  });
  createSlug?.addEventListener("input", () => { createSlugEdited = true; });
  createTitle?.addEventListener("input", () => {
    if (createSlug && !createSlugEdited) createSlug.value = slugifyTitle(createTitle.value);
  });
  createForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (creatingEntry) return;
    if (!createDraft) {
      if (createStatus) {
        createStatus.textContent = "Draft creation is unavailable until Supabase is configured and an authorized administrator is signed in.";
        createStatus.dataset.kind = "error";
        createStatus.hidden = false;
      } else {
        showMessage("Draft creation is unavailable until Supabase is configured and an authorized administrator is signed in.", "error");
      }
      return;
    }
    void createDraft().then(() => {
      if (!createDialog?.open) createSlugEdited = false;
    });
  });

  if (!import.meta.env.PUBLIC_SUPABASE_URL || !import.meta.env.PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const local = await initializeLocalEditor(app);
      createDraft = local.createDraft;
      navigateAuthorizedView = local.navigate;
    } catch (error) {
      showUnavailableView(new URLSearchParams(location.search).get("view") ?? "overview");
      showMessage(`Local preview could not start. ${escapeError(error)}`, "error");
    }
    return;
  }

  let auth: Awaited<ReturnType<typeof getAuthorizedUser>>;
  try {
    auth = await getAuthorizedUser();
  } catch (error) {
    showMessage(`${escapeError(error)} Admin access is unavailable until Supabase is configured.`, "error");
    try {
      const local = await initializeLocalEditor(app);
      createDraft = local.createDraft;
      navigateAuthorizedView = local.navigate;
    } catch (localError) {
      showUnavailableView(new URLSearchParams(location.search).get("view") ?? "overview");
      showMessage(`Local preview could not start. ${escapeError(localError)}`, "error");
    }
    return;
  }
  if (!auth) {
    try {
      const local = await initializeLocalEditor(app);
      createDraft = local.createDraft;
      navigateAuthorizedView = local.navigate;
    } catch (error) {
      showMessage(`Local preview could not start. ${escapeError(error)}`, "error");
    }
    return;
  }

  const { client, user } = auth;
  const emailLabel = app.querySelector<HTMLElement>("[data-admin-email]");
  if (emailLabel) emailLabel.textContent = user.email ?? "Administrator";

  let entries: ContentEntryRow[] = [];
  let mediaAssets: MediaAssetRow[] = [];
  let currentEntry: ContentEntryRow | null = null;
  let editorLoadSequence = 0;
  let editor: EditorView | null = null;
  let editorDirty = false;
  let revision = 0;
  let saveTimer: number | undefined;
  let saving = false;
  let view: ViewName = "overview";
  let currentFilter: CmsContentType | undefined;

  const form = app.querySelector<HTMLFormElement>("[data-entry-form]");
  const editorMount = app.querySelector<HTMLElement>("[data-markdown-editor]");
  const typeMetadata = app.querySelector<HTMLElement>("[data-type-metadata]");
  const saveState = app.querySelector<HTMLElement>("[data-save-state]");
  const listRows = app.querySelector<HTMLTableSectionElement>("[data-content-rows]");
  const recentRows = app.querySelector<HTMLTableSectionElement>("[data-recent-rows]");

  function setSaveState(value: string, state: "saved" | "saving" | "error" = "saved") {
    if (!saveState) return;
    saveState.textContent = value;
    saveState.dataset.state = state;
  }

  function setView(nextView: ViewName, type?: CmsContentType) {
    view = nextView;
    currentFilter = type;
    for (const panel of app.querySelectorAll<HTMLElement>("[data-panel]")) panel.hidden = panel.dataset.panel !== nextView;
    for (const link of app.querySelectorAll<HTMLAnchorElement>("[data-studio-view]")) {
      const active = (nextView === "overview" && link.dataset.studioView === "overview") ||
        (nextView === "media" && link.dataset.studioView === "media") ||
        (nextView === "settings" && link.dataset.studioView === "settings") ||
        (nextView === "list" && link.dataset.studioView === type);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
    if (nextView === "list") {
      const title = type ? labelByType[type] : "Content library";
      const heading = app.querySelector<HTMLElement>("[data-list-title]");
      const eyebrow = app.querySelector<HTMLElement>("[data-list-eyebrow]");
      const description = app.querySelector<HTMLElement>("[data-list-description]");
      if (heading) heading.textContent = `${title}.`;
      if (eyebrow) eyebrow.textContent = `CONTENT / ${title.toUpperCase()}`;
      if (description) description.textContent = type ? `Manage ${title.toLowerCase()} entries and their publication state.` : "Search, filter, and continue a piece of work.";
      renderList();
    }
    if (nextView === "media") renderMedia();
    if (nextView === "settings") void refreshMfaState();
  }

  function currentViewFromUrl() {
    const params = new URLSearchParams(location.search);
    const requested = params.get("view") ?? "overview";
    if (requested === "media" || requested === "settings") {
      setView(requested);
      return;
    }
    if (["article", "project", "research", "experiment", "now"].includes(requested)) {
      setView("list", requested as CmsContentType);
      return;
    }
    setView("overview");
  }

  function updateUrl(nextView: string) {
    updateStudioUrl(nextView);
  }

  function dateLabel(value: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
  }

  function createActionButton(label: string, action: string, id: string) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.entryAction = action;
    button.dataset.entryId = id;
    return button;
  }

  function makeRow(entry: ContentEntryRow, recent: boolean) {
    const row = document.createElement("tr");
    const titleCell = document.createElement("td");
    const openButton = createActionButton(entry.title, "edit", entry.id);
    titleCell.append(openButton);
    row.append(titleCell);

    if (recent) {
      const typeCell = document.createElement("td");
      typeCell.textContent = labelByType[entry.content_type];
      row.append(typeCell);
    }

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = "status-label";
    status.dataset.status = entry.status;
    status.textContent = entry.status;
    statusCell.append(status);
    row.append(statusCell);

    if (!recent) {
      const categoryCell = document.createElement("td");
      categoryCell.textContent = entry.category ?? "—";
      row.append(categoryCell);
    }

    const dateCell = document.createElement("td");
    dateCell.textContent = dateLabel(entry.updated_at);
    row.append(dateCell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "table-actions";
    if (entry.status === "published") actions.append(createActionButton("Preview", "preview", entry.id));
    actions.append(openButton.cloneNode(true));
    if (!recent) {
      const deleteButton = createActionButton("Delete", "delete", entry.id);
      deleteButton.setAttribute("aria-label", `Delete ${entry.title}`);
      actions.append(deleteButton);
    }
    actionsCell.append(actions);
    row.append(actionsCell);
    return row;
  }

  function renderList() {
    if (!listRows) return;
    listRows.replaceChildren();
    const search = (app.querySelector<HTMLInputElement>("[data-search]")?.value ?? "").trim().toLowerCase();
    const statusFilter = app.querySelector<HTMLSelectElement>("[data-status-filter]")?.value ?? "";
    const sort = app.querySelector<HTMLSelectElement>("[data-sort]")?.value ?? "updated";
    const filtered = entries
      .filter((entry) => !currentFilter || entry.content_type === currentFilter)
      .filter((entry) => !statusFilter || entry.status === statusFilter)
      .filter((entry) => !search || [entry.title, entry.excerpt, entry.slug, entry.category ?? "", ...entry.tags].join(" ").toLowerCase().includes(search))
      .sort((a, b) => sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "published"
          ? (b.published_at ?? "").localeCompare(a.published_at ?? "")
          : b.updated_at.localeCompare(a.updated_at));
    for (const entry of filtered) listRows.append(makeRow(entry, false));
    const empty = app.querySelector<HTMLElement>("[data-list-empty]");
    if (empty) empty.hidden = filtered.length !== 0;
  }

  function updateStats() {
    const counts: Record<CmsContentType | "published" | "drafts", number> = {
      article: 0, project: 0, research: 0, experiment: 0, now: 0, published: 0, drafts: 0,
    };
    for (const entry of entries) {
      counts[entry.content_type] += 1;
      if (entry.status === "published") counts.published += 1;
      if (entry.status === "draft") counts.drafts += 1;
    }
    for (const key of ["published", "drafts", "article", "project", "research", "experiment"] as const) {
      const output = app.querySelector<HTMLElement>(`[data-stat-${key === "drafts" ? "drafts" : key}]`);
      if (output) output.textContent = String(counts[key]);
    }
    const empty = app.querySelector<HTMLElement>("[data-overview-empty]");
    if (empty) empty.hidden = entries.length !== 0;
    if (recentRows) {
      recentRows.replaceChildren();
      entries.slice(0, 6).forEach((entry) => recentRows.append(makeRow(entry, true)));
    }
    renderList();
  }

  async function loadEntries() {
    const { data, error } = await client.from("content_entries").select("*").order("updated_at", { ascending: false });
    if (error) throw error;
    entries = data;
    updateStats();
  }

  async function deleteEntry(entry: ContentEntryRow, button?: HTMLButtonElement) {
    if (!window.confirm(`Permanently delete “${entry.title}”? This cannot be undone.`)) return;
    if (button) button.disabled = true;
    try {
      const { error } = await client.from("content_entries").delete().eq("id", entry.id);
      if (error) throw error;
      entries = entries.filter((item) => item.id !== entry.id);
      let recoveryCleanupFailed = false;
      try {
        localStorage.removeItem(`bbu-draft-recovery:${entry.id}`);
      } catch {
        recoveryCleanupFailed = true;
      }
      if (currentEntry?.id === entry.id) {
        editor?.destroy();
        editor = null;
        currentEntry = null;
        editorDirty = false;
        setView("list", currentFilter);
      }
      updateStats();
      showMessage(
        recoveryCleanupFailed
          ? "Entry deleted, but its local recovery copy could not be cleared from this browser."
          : "Entry deleted.",
        recoveryCleanupFailed ? "info" : "success",
      );
    } catch (error) {
      showMessage(`Entry was not deleted. ${escapeError(error)}`, "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function readFormFields() {
    if (!form) throw new Error("The content editor is unavailable.");
    const title = getField<HTMLInputElement>(form, "title").value.trim();
    const slug = getField<HTMLInputElement>(form, "slug").value.trim();
    const excerpt = getField<HTMLTextAreaElement>(form, "excerpt").value.trim();
    const body = editor?.state.doc.toString() ?? "";
    const contentType = getField<HTMLSelectElement>(form, "content_type").value;
    const category = getField<HTMLInputElement>(form, "category").value.trim();
    const tagsInput = getField<HTMLInputElement>(form, "tags").value;
    const seoTitle = getField<HTMLInputElement>(form, "seo_title").value.trim();
    const seoDescription = getField<HTMLTextAreaElement>(form, "seo_description").value.trim();
    const metadataInput = getField<HTMLTextAreaElement>(form, "metadata").value;
    const metadata = readTypeMetadataFields(metadataInput, typeMetadata, contentType as CmsContentType);
    const validation = validateContentFields({
      contentType, title, slug, excerpt, body, tags: tagsInput, category, seoTitle, seoDescription,
      metadata: JSON.stringify(metadata),
    });
    return {
      validation,
      payload: {
        content_type: contentType as CmsContentType,
        title,
        slug,
        excerpt,
        body_markdown: body,
        category: category || null,
        tags: validation.tags,
        seo_title: seoTitle || null,
        seo_description: seoDescription || null,
        cover_image_url: getField<HTMLInputElement>(form, "cover_image_url").value.trim() || null,
        metadata: validation.metadata,
      } satisfies ContentEntryInsert,
    };
  }

  function cacheUnsavedDraft() {
    if (!currentEntry || !form) return;
    const snapshot = {
      title: getField<HTMLInputElement>(form, "title").value,
      slug: getField<HTMLInputElement>(form, "slug").value,
      excerpt: getField<HTMLTextAreaElement>(form, "excerpt").value,
      body: editor?.state.doc.toString() ?? "",
      content_type: getField<HTMLSelectElement>(form, "content_type").value,
      category: getField<HTMLInputElement>(form, "category").value,
      tags: getField<HTMLInputElement>(form, "tags").value,
      cover_image_url: getField<HTMLInputElement>(form, "cover_image_url").value,
      cover_image_alt: getField<HTMLInputElement>(form, "cover_image_alt").value,
      seo_title: getField<HTMLInputElement>(form, "seo_title").value,
      seo_description: getField<HTMLTextAreaElement>(form, "seo_description").value,
      metadata: getField<HTMLTextAreaElement>(form, "metadata").value,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(`bbu-draft-recovery:${currentEntry.id}`, JSON.stringify(snapshot));
    } catch {
      showMessage("This browser could not store a recovery copy. Keep the editor open until the connection returns.", "error");
    }
  }

  function markDirty() {
    if (!currentEntry) return;
    editorDirty = true;
    revision += 1;
    setSaveState("Unsaved changes", "saving");
    cacheUnsavedDraft();
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => void saveEntry(), 1400);
  }

  async function saveEntry() {
    if (!currentEntry || !form || saving) return false;
    const entryId = currentEntry.id;
    const currentRevision = revision;
    let fields: ReturnType<typeof readFormFields>;
    try {
      fields = readFormFields();
    } catch (error) {
      showMessage(escapeError(error), "error");
      return false;
    }
    if (fields.validation.errors.length) {
      showMessage(fields.validation.errors.join(" "), "error");
      setSaveState("Needs attention", "error");
      return false;
    }

    saving = true;
    setSaveState("Saving…", "saving");
    try {
      const { error } = await client.from("content_entries").update(fields.payload).eq("id", entryId);
      if (error) throw error;
      const { data, error: refreshError } = await client.from("content_entries").select("*").eq("id", entryId).single();
      if (refreshError) throw refreshError;
      entries = entries.map((entry) => entry.id === data.id ? data : entry);
      if (currentEntry?.id === entryId) currentEntry = data;
      if (currentEntry?.id === entryId && revision === currentRevision) {
        editorDirty = false;
        try {
          localStorage.removeItem(`bbu-draft-recovery:${entryId}`);
        } catch {
          showMessage("The saved entry is safe, but this browser could not clear its local recovery copy.", "info");
        }
        setSaveState("Saved", "saved");
      }
      updateStats();
      return true;
    } catch (error) {
      if (currentEntry?.id === entryId) setSaveState("Save failed · recovery copy kept", "error");
      showMessage(`Your text is still in the editor and a local recovery copy was kept. ${escapeError(error)}`, "error");
      return false;
    } finally {
      saving = false;
      if (currentEntry?.id === entryId && revision !== currentRevision) {
        if (saveTimer) window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => void saveEntry(), 300);
      }
    }
  }

  function updateWordCount() {
    const text = editor?.state.doc.toString() ?? "";
    const words = countMarkdownWords(text);
    const output = app.querySelector<HTMLElement>("[data-word-count]");
    if (output) output.textContent = `${words.toLocaleString()} ${words === 1 ? "word" : "words"} · ${formatReadingTime(words)} read`;
  }

  function formatSelection(format: string) {
    if (!editor) return;
    const selection = editor.state.selection.main;
    const selected = editor.state.doc.sliceString(selection.from, selection.to);
    const wrapper = (before: string, after = before, placeholder = "text") => {
      const value = selected || placeholder;
      editor?.dispatch({
        changes: { from: selection.from, to: selection.to, insert: `${before}${value}${after}` },
        selection: { anchor: selection.from + before.length, head: selection.from + before.length + value.length },
      });
    };
    const block = (prefix: string, fallback: string) => {
      const value = (selected || fallback).split("\n").map((line) => `${prefix}${line}`).join("\n");
      const lineStart = editor?.state.doc.lineAt(selection.from).from ?? selection.from;
      const insert = selection.from === selection.to && lineStart > 0 ? `\n${value}` : value;
      editor?.dispatch({ changes: { from: selection.from, to: selection.to, insert }, selection: { anchor: selection.from + insert.length } });
    };
    switch (format) {
      case "bold": wrapper("**", "**", "strong text"); break;
      case "italic": wrapper("*", "*", "emphasis"); break;
      case "heading": block("## ", "Section heading"); break;
      case "quote": block("> ", "Quoted text"); break;
      case "unordered": block("- ", "List item"); break;
      case "ordered": block("1. ", "List item"); break;
      case "inline-code": wrapper("`", "`", "code"); break;
      case "code": wrapper("```\n", "\n```", "code"); break;
      case "link": {
        const url = window.prompt("Link URL (HTTPS or mailto):");
        if (!url || (!/^https:\/\//i.test(url) && !/^mailto:/i.test(url))) return;
        wrapper("[", `](${url})`, "link text");
        break;
      }
      case "table":
        editor.dispatch({ changes: { from: selection.from, to: selection.to, insert: "| Column | Column |\n| --- | --- |\n| Value | Value |\n" } });
        break;
    }
    editor.focus();
  }

  async function openEditor(entry: ContentEntryRow) {
    if (!form || !editorMount) return false;
    if (editorDirty && !window.confirm("You have unsaved changes. Leave this entry? A local recovery copy was kept.")) return false;
    const requestSequence = ++editorLoadSequence;
    currentEntry = entry;
    editorDirty = false;
    revision = 0;
    form.hidden = false;
    getField<HTMLInputElement>(form, "title").value = entry.title;
    getField<HTMLInputElement>(form, "slug").value = entry.slug;
    getField<HTMLTextAreaElement>(form, "excerpt").value = entry.excerpt;
    getField<HTMLSelectElement>(form, "content_type").value = entry.content_type;
    getField<HTMLInputElement>(form, "category").value = entry.category ?? "";
    getField<HTMLInputElement>(form, "tags").value = entry.tags.join(", ");
    getField<HTMLInputElement>(form, "cover_image_url").value = entry.cover_image_url ?? "";
    getField<HTMLInputElement>(form, "cover_image_alt").value =
      typeof entry.metadata.coverImageAlt === "string" ? entry.metadata.coverImageAlt : "";
    getField<HTMLInputElement>(form, "seo_title").value = entry.seo_title ?? "";
    getField<HTMLTextAreaElement>(form, "seo_description").value = entry.seo_description ?? "";
    getField<HTMLTextAreaElement>(form, "metadata").value = JSON.stringify(entry.metadata, null, 2);
    renderTypeMetadataFields(typeMetadata, entry.content_type, entry.metadata);
    form.dataset.local = "false";
    form.dataset.editorMode = "split";
    app.querySelectorAll<HTMLButtonElement>("[data-editor-mode]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.editorMode === "split"));
    });

    editor?.destroy();
    editor = null;
    editorMount.replaceChildren();
    editorMount.textContent = "Loading Markdown editor…";
    editorMount.setAttribute("aria-busy", "true");

    const pendingEditorModules = Promise.all([
      import("codemirror"),
      import("@codemirror/commands"),
      import("@codemirror/lang-markdown"),
      import("@codemirror/state"),
      import("@codemirror/view"),
    ]);
    let editorModules: Awaited<typeof pendingEditorModules>;
    try {
      editorModules = await pendingEditorModules;
    } catch (error) {
      if (requestSequence === editorLoadSequence) {
        editorMount.removeAttribute("aria-busy");
        editorMount.textContent = "The Markdown editor could not be loaded.";
      }
      throw error;
    }
    if (requestSequence !== editorLoadSequence || currentEntry?.id !== entry.id) return false;
    const [{ basicSetup }, { indentWithTab, insertTab, insertNewlineAndIndent }, { markdown }, { EditorState }, { EditorView, keymap }] = editorModules;
    editorMount.replaceChildren();
    editor = new EditorView({
      state: EditorState.create({
        doc: entry.body_markdown,
        extensions: [
          basicSetup,
          markdown(),
          EditorView.lineWrapping,
          keymap.of([
            indentWithTab,
            { key: "Mod-s", run: () => { void saveEntry(); return true; } },
            { key: "Enter", run: insertNewlineAndIndent },
            { key: "Tab", run: insertTab },
          ]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              updateWordCount();
              markDirty();
            }
          }),
          EditorView.theme({
            "&": { color: "var(--ink)", backgroundColor: "var(--paper-bright)" },
            ".cm-gutters": { backgroundColor: "var(--paper-shade)", color: "var(--muted)", border: "none" },
            ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--signal) 6%, transparent)" },
            ".cm-selectionBackground, ::selection": { backgroundColor: "color-mix(in srgb, var(--signal) 28%, transparent) !important" },
          }),
        ],
      }),
      parent: editorMount,
    });
    editorMount.removeAttribute("aria-busy");
    updateWordCount();
    setSaveState(entry.status === "published" ? "Published" : "Saved", "saved");
    const publish = app.querySelector<HTMLButtonElement>("[data-publish]");
    const unpublish = app.querySelector<HTMLButtonElement>("[data-unpublish]");
    if (publish) publish.hidden = entry.status === "published";
    if (unpublish) unpublish.hidden = entry.status !== "published";
    const duplicate = app.querySelector<HTMLButtonElement>("[data-duplicate]");
    if (duplicate) duplicate.hidden = entry.status !== "draft";
    let pending: string | null;
    try {
      pending = localStorage.getItem(`bbu-draft-recovery:${entry.id}`);
    } catch {
      pending = null;
      showMessage("Browser recovery storage is unavailable. The saved database draft is still available.", "error");
    }
    if (pending) {
      const snapshot = parseDraftRecovery(pending);
      if (!snapshot) {
        showMessage("A local recovery copy could not be read. It was left untouched; the saved database draft is still available.", "error");
      } else if (Date.parse(snapshot.savedAt) <= Date.parse(entry.updated_at)) {
        try {
          localStorage.removeItem(`bbu-draft-recovery:${entry.id}`);
        } catch {
          showMessage("The database draft is current, but its stale browser recovery copy could not be cleared.", "info");
        }
      } else if (window.confirm("A newer local recovery copy was found. Restore it into the editor?")) {
        const { body, savedAt: _savedAt, ...fields } = snapshot;
        for (const [name, value] of Object.entries(fields)) {
          const element = form.elements.namedItem(name);
          if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
            element.value = value;
          }
          try {
            const restoredMetadata: unknown = JSON.parse(getField<HTMLTextAreaElement>(form, "metadata").value || "{}");
            if (restoredMetadata && typeof restoredMetadata === "object" && !Array.isArray(restoredMetadata)) {
              renderTypeMetadataFields(typeMetadata, snapshot.content_type as CmsContentType, restoredMetadata as Record<string, unknown>);
            }
          } catch (error) {
            showMessage(`The recovery copy was restored, but its structured fields need attention. ${escapeError(error)}`, "error");
          }
        }
        editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: body } });
        markDirty();
        showMessage("Recovered unsaved browser text. Save it before navigating away.", "info");
      }
    }
    setView("editor");
    updateUrl("article");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  async function duplicateCurrent() {
    if (!currentEntry) return;
    if (editorDirty && !(await saveEntry())) return;
    const insert: ContentEntryInsert = {
      content_type: currentEntry.content_type,
      title: `Copy of ${currentEntry.title}`.slice(0, 200),
      slug: `${currentEntry.slug}-copy`.slice(0, 120),
      excerpt: currentEntry.excerpt,
      body_markdown: currentEntry.body_markdown,
      cover_image_url: currentEntry.cover_image_url,
      thumbnail_url: currentEntry.thumbnail_url,
      tags: currentEntry.tags,
      category: currentEntry.category,
      seo_title: null,
      seo_description: currentEntry.seo_description,
      og_image_url: null,
      metadata: currentEntry.metadata,
    };
    const { data, error } = await client.from("content_entries").insert(insert).select("*").single();
    if (error) throw error;
    entries.unshift(data);
    updateStats();
    await openEditor(data);
    showMessage("Duplicate draft created. Its slug is unique only after you update it if the database reports a conflict.", "success");
  }

  async function publish(action: "publish" | "unpublish" | "archive") {
    if (!currentEntry) return;
    if (editorDirty && !(await saveEntry())) return;
    const verb = action === "publish" ? "publish" : action === "unpublish" ? "unpublish" : "archive";
    if (!window.confirm(`Continue and ${verb} “${currentEntry.title}”? A successful request triggers the public static-site build.`)) return;

    const button = app.querySelector<HTMLButtonElement>(`[data-${action}]`);
    if (button) button.disabled = true;
    setSaveState(`${action === "publish" ? "Publishing" : action === "unpublish" ? "Unpublishing" : "Archiving"}…`, "saving");
    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error("Your session expired. Sign in again before publishing.");
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({ action, content_id: currentEntry.id }),
      });
      const result = await response.json() as { error?: string; status?: string };
      if (!response.ok) throw new Error(result.error ?? `Publishing request failed with status ${response.status}.`);
      await loadEntries();
      const updated = entries.find((entry) => entry.id === currentEntry?.id);
      if (updated) await openEditor(updated);
      setSaveState("Build accepted", "saved");
      showMessage(result.status ?? "Cloudflare accepted the static-site build request.", "success");
    } catch (error) {
      setSaveState("Publishing failed", "error");
      showMessage(`${escapeError(error)} Your saved content remains in Supabase; confirm its status before retrying.`, "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function renderPrivatePreview(entry: ContentEntryRow) {
    const [{ default: DOMPurify }, { marked }] = await Promise.all([
      import("dompurify"),
      import("marked"),
    ]);
    const { data: links, error: linkError } = await client
      .from("content_media")
      .select("media_id")
      .eq("content_id", entry.id);
    if (linkError) throw linkError;
    let body = editor?.state.doc.toString() ?? entry.body_markdown;
    for (const link of links ?? []) {
      let asset = mediaAssets.find((item) => item.id === link.media_id);
      if (!asset) {
        const { data, error } = await client.from("media_assets").select("*").eq("id", link.media_id).maybeSingle();
        if (error) throw error;
        asset = data ?? undefined;
      }
      if (!asset) continue;
      const { data: signed, error } = await client.storage.from("draft-media").createSignedUrl(asset.storage_path, 15 * 60);
      if (error) throw error;
      const token = `cms-media://${asset.id}.${mediaExtension(asset.mime_type)}`;
      body = body.replaceAll(token, signed.signedUrl);
    }
    const html = await marked.parse(body, { async: true, gfm: true, breaks: false });
    const previewTitle = app.querySelector<HTMLElement>("#preview-title");
    const previewExcerpt = previewDialog?.querySelector<HTMLElement>("[data-preview-excerpt]");
    const previewBody = previewDialog?.querySelector<HTMLElement>("[data-preview-body]");
    if (previewTitle) previewTitle.textContent = getField<HTMLInputElement>(form!, "title").value;
    if (previewExcerpt) previewExcerpt.textContent = getField<HTMLTextAreaElement>(form!, "excerpt").value;
    if (previewBody) previewBody.innerHTML = DOMPurify.sanitize(html);
    previewDialog?.showModal();
  }

  async function loadMedia() {
    const { data, error } = await client.from("media_assets").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    mediaAssets = data;
    renderMedia();
  }

  async function renderMedia() {
    const grid = app.querySelector<HTMLElement>("[data-media-grid]");
    const empty = app.querySelector<HTMLElement>("[data-media-empty]");
    if (!grid) return;
    grid.replaceChildren();
    if (empty) empty.hidden = mediaAssets.length !== 0;
    for (const asset of mediaAssets) {
      const card = document.createElement("article");
      card.className = "media-item";
      const preview = document.createElement("div");
      preview.className = "media-item__preview";
      const image = document.createElement("img");
      image.alt = asset.alt_text || asset.file_name;
      const { data, error } = await client.storage.from("draft-media").createSignedUrl(asset.storage_path, 15 * 60);
      if (error) {
        image.alt = `Preview unavailable for ${asset.file_name}`;
        showMessage(`Unable to preview ${asset.file_name}: ${error.message}`, "error");
      } else {
        image.src = data.signedUrl;
      }
      preview.append(image);
      card.append(preview);
      const details = document.createElement("div");
      details.className = "media-item__details";
      const filename = document.createElement("strong");
      filename.textContent = asset.file_name;
      const size = document.createElement("small");
      size.textContent = `${(asset.byte_size / 1024).toFixed(0)} KB · ${asset.width ?? "?"} × ${asset.height ?? "?"} · ${asset.mime_type}`;
      const alt = document.createElement("input");
      alt.value = asset.alt_text;
      alt.maxLength = 500;
      alt.setAttribute("aria-label", `Alt text for ${asset.file_name}`);
      alt.placeholder = "Describe this image";
      const actions = document.createElement("div");
      actions.className = "media-item__actions";
      const reference = `cms-media://${asset.id}.${mediaExtension(asset.mime_type)}`;
      const copy = document.createElement("button");
      copy.type = "button";
      copy.textContent = "Copy Markdown";
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(`![${asset.alt_text || "Describe this image"}](${reference})`);
          showMessage("Markdown image reference copied.", "success");
        } catch (error) {
          showMessage(`The image reference could not be copied. ${escapeError(error)}`, "error");
        }
      });
      const insert = document.createElement("button");
      insert.type = "button";
      insert.textContent = "Insert into draft";
      insert.disabled = !currentEntry || view !== "media";
      insert.addEventListener("click", async () => {
        if (!currentEntry || !editor) {
          showMessage("Open a draft before inserting media.", "info");
          return;
        }
        try {
          const altText = alt.value.trim();
          if (!altText) throw new Error("Add descriptive alt text before inserting this image.");
          const { error: altError } = await client
            .from("media_assets")
            .update({ alt_text: altText })
            .eq("id", asset.id);
          if (altError) throw altError;
          const { error: linkError } = await client.from("content_media").upsert(
            { content_id: currentEntry.id, media_id: asset.id },
            { onConflict: "content_id,media_id", ignoreDuplicates: true },
          );
          if (linkError) throw linkError;
          const line = `![${altText}](${reference})\n`;
          asset.alt_text = altText;
          editor.dispatch({ changes: { from: editor.state.selection.main.from, insert: line } });
          showMessage("Image reference inserted. Add descriptive alt text before publishing.", "success");
        } catch (error) {
          showMessage(`The image could not be linked to this entry. ${escapeError(error)}`, "error");
        }
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => void deleteMedia(asset).catch((error) => showMessage(`Image could not be deleted. ${escapeError(error)}`, "error")));
      alt.addEventListener("change", async () => {
        try {
          const { error } = await client.from("media_assets").update({ alt_text: alt.value.trim() }).eq("id", asset.id);
          if (error) throw error;
          showMessage("Alt text saved.", "success");
        } catch (error) {
          showMessage(`Alt text was not saved. ${escapeError(error)}`, "error");
        }
      });
      actions.append(copy, insert, remove);
      details.append(filename, size, alt, actions);
      card.append(details);
      grid.append(card);
    }
  }

  async function deleteMedia(asset: MediaAssetRow) {
    const { data: linked, error: linksError } = await client.from("content_media").select("content_id").eq("media_id", asset.id);
    if (linksError) {
      showMessage(linksError.message, "error");
      return;
    }
    if (linked.length) {
      showMessage("This asset is attached to content. Remove its references before deleting it.", "error");
      return;
    }
    if (!window.confirm(`Permanently delete ${asset.file_name}?`)) return;
    const { error: storageError } = await client.storage.from("draft-media").remove([asset.storage_path]);
    if (storageError) throw storageError;
    const { error } = await client.from("media_assets").delete().eq("id", asset.id);
    if (error) throw error;
    mediaAssets = mediaAssets.filter((item) => item.id !== asset.id);
    renderMedia();
    showMessage("Image deleted.", "success");
  }

  async function uploadMedia(file: File) {
    if (file.size === 0 || file.size > 10 * 1024 * 1024) throw new Error("Choose an image between 1 byte and 10 MB.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = detectImageType(bytes);
    if (!type || (file.type && file.type !== type)) throw new Error("The selected file is not a valid JPG, PNG, or WebP image.");
    const extension = mediaExtension(type);
    const id = crypto.randomUUID();
    const storagePath = `${user.id}/${id}.${extension}`;
    let dimensions: { width: number; height: number } | undefined;
    try {
      const bitmap = await createImageBitmap(file);
      dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
    } catch {
      throw new Error("The browser could not decode this image. Choose a valid JPG, PNG, or WebP file.");
    }

    const { error: uploadError } = await client.storage.from("draft-media").upload(storagePath, bytes, {
      contentType: type,
      upsert: false,
      cacheControl: "3600",
    });
    if (uploadError) throw uploadError;

    const { data: asset, error: rowError } = await client
      .from("media_assets")
      .insert({
        storage_path: storagePath,
        file_name: file.name.slice(0, 255),
        mime_type: type,
        byte_size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        alt_text: "",
      })
      .select("*")
      .single();
    if (rowError) {
      const { error: cleanupError } = await client.storage.from("draft-media").remove([storagePath]);
      if (cleanupError) showMessage(`Media record failed and its uploaded object could not be removed: ${cleanupError.message}`, "error");
      throw rowError;
    }
    mediaAssets.unshift(asset);
    renderMedia();
    showMessage(`${file.name} uploaded to private media storage.`, "success");
  }

  async function refreshMfaState() {
    const state = app.querySelector<HTMLElement>("[data-mfa-status]");
    const enrollButton = app.querySelector<HTMLButtonElement>("[data-mfa-enroll]");
    if (!state || !enrollButton) return;
    try {
      const { data, error } = await client.auth.mfa.listFactors();
      if (error) throw error;
      const verified = data.totp.some((factor) => factor.status === "verified");
      state.textContent = verified ? "An authenticator is verified for this account." : "No verified authenticator is currently enrolled.";
      enrollButton.hidden = verified;
    } catch (error) {
      state.textContent = `Authenticator status unavailable: ${escapeError(error)}`;
    }
  }

  let mfaFactorId: string | undefined;
  let mfaChallengeId: string | undefined;
  const enrollButton = app.querySelector<HTMLButtonElement>("[data-mfa-enroll]");
  const mfaSetup = app.querySelector<HTMLElement>("[data-mfa-setup]");
  enrollButton?.addEventListener("click", async () => {
    try {
      const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Build Break Understand" });
      if (error) throw error;
      mfaFactorId = data.id;
      const qrContainer = app.querySelector<HTMLElement>("[data-mfa-qr-container]");
      const secret = app.querySelector<HTMLElement>("[data-mfa-secret]");
      if (qrContainer) {
        const qr = document.createElement("img");
        qr.alt = "Authenticator setup QR code";
        qr.src = data.totp.qr_code;
        qrContainer.replaceChildren(qr);
      }
      if (secret) secret.textContent = `If scanning is unavailable, enter this secret: ${data.totp.secret}`;
      if (mfaSetup) mfaSetup.hidden = false;
    } catch (error) {
      showMessage(escapeError(error), "error");
    }
  });

  app.querySelector<HTMLFormElement>("[data-mfa-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!mfaFactorId) return;
    const mfaForm = event.currentTarget as HTMLFormElement;
    try {
      const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;
      mfaChallengeId = challenge.id;
      const code = getField<HTMLInputElement>(mfaForm, "code").value;
      const { error } = await client.auth.mfa.verify({ factorId: mfaFactorId, challengeId: mfaChallengeId, code });
      if (error) throw error;
      if (mfaSetup) mfaSetup.hidden = true;
      await refreshMfaState();
      showMessage("Authenticator verified for this account.", "success");
    } catch (error) {
      showMessage(escapeError(error), "error");
    }
  });

  try {
    await loadEntries();
    await loadMedia();
  } catch (error) {
    showMessage(`Content could not be loaded. No sample data is shown. ${escapeError(error)}`, "error");
  }

  navigateAuthorizedView = (target) => {
    updateUrl(target);
    if (target === "overview") setView("overview");
    else if (target === "media" || target === "settings") setView(target);
    else if (["article", "project", "research", "experiment", "now"].includes(target)) {
      setView("list", target as CmsContentType);
    }
  };
  currentViewFromUrl();

  app.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.closest<HTMLButtonElement>("[data-entry-action]");
    if (action) {
      const entry = entries.find((item) => item.id === action.dataset.entryId);
      if (!entry) return;
      if (action.dataset.entryAction === "edit") {
        void openEditor(entry).catch((error) => showMessage(`The editor could not be opened. ${escapeError(error)}`, "error"));
      }
      if (action.dataset.entryAction === "preview") {
        void openEditor(entry)
          .then((opened) => opened ? renderPrivatePreview(entry) : undefined)
          .catch((error) => showMessage(`Private preview could not be opened. ${escapeError(error)}`, "error"));
      }
      if (action.dataset.entryAction === "delete") void deleteEntry(entry, action);
    }
  });

  createDraft = async () => {
    if (!createForm || creatingEntry) return;
    const submit = createForm.querySelector<HTMLButtonElement>('button[type="submit"]');
    const defaultSubmitLabel = submit?.textContent ?? "Create draft";
    if (submit) submit.disabled = true;
    creatingEntry = true;
    createForm.setAttribute("aria-busy", "true");
    if (submit) submit.textContent = "Creating draft…";
    if (createStatus) {
      createStatus.textContent = "Creating your draft…";
      createStatus.dataset.kind = "info";
      createStatus.hidden = false;
    }
    try {
      const input = new FormData(createForm);
      const contentType = String(input.get("content_type")) as CmsContentType;
      const title = String(input.get("title") ?? "").trim();
      const slug = String(input.get("slug") ?? "").trim();
      if (!slug) throw new Error("Add a title that produces a valid URL slug.");
      const { data, error } = await client.from("content_entries").insert({
        content_type: contentType,
        title,
        slug,
        excerpt: "",
        body_markdown: "",
        metadata: {},
      }).select("*").single();
      if (error) throw error;
      entries.unshift(data);
      createDialog?.close();
      createForm.reset();
      createSlugEdited = false;
      updateStats();
      try {
        await openEditor(data);
        showMessage("Draft created. Your changes autosave as you write.", "success");
      } catch (error) {
        showMessage(`Draft created, but the editor could not be opened. Reopen it from the content list. ${escapeError(error)}`, "error");
      }
    } catch (error) {
      if (createStatus) {
        createStatus.textContent = `Draft could not be created. ${escapeError(error)}`;
        createStatus.dataset.kind = "error";
        createStatus.hidden = false;
      } else {
        showMessage(`Draft could not be created. ${escapeError(error)}`, "error");
      }
    } finally {
      if (submit) submit.disabled = false;
      if (submit) submit.textContent = defaultSubmitLabel;
      createForm.removeAttribute("aria-busy");
      creatingEntry = false;
    }
  };

  for (const selector of ["[data-search]", "[data-status-filter]", "[data-sort]"]) {
    app.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.addEventListener("input", renderList);
    app.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.addEventListener("change", renderList);
  }

  form?.addEventListener("input", (event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "title") {
      const slug = getField<HTMLInputElement>(form, "slug");
      if (!slug.dataset.edited) slug.value = slugifyTitle(target.value);
    }
    if (target instanceof HTMLInputElement && target.name === "slug") target.dataset.edited = "true";
    markDirty();
  });
  typeMetadata?.addEventListener("input", () => {
    if (!form) return;
    try {
      const metadata = readTypeMetadataFields(
        getField<HTMLTextAreaElement>(form, "metadata").value,
        typeMetadata,
        getField<HTMLSelectElement>(form, "content_type").value as CmsContentType,
      );
      getField<HTMLTextAreaElement>(form, "metadata").value = JSON.stringify(metadata, null, 2);
      markDirty();
    } catch (error) {
      showMessage(`Structured metadata could not be updated. ${escapeError(error)}`, "error");
    }
  });
  const editorContentType = form ? getField<HTMLSelectElement>(form, "content_type") : null;
  editorContentType?.addEventListener("change", () => {
    if (!form) return;
    try {
      const metadata: unknown = JSON.parse(getField<HTMLTextAreaElement>(form, "metadata").value || "{}");
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        throw new Error("Structured metadata must be a JSON object.");
      }
      renderTypeMetadataFields(typeMetadata, getField<HTMLSelectElement>(form, "content_type").value as CmsContentType,
        metadata as Record<string, unknown>);
      markDirty();
    } catch (error) {
      showMessage(`Type-specific fields could not be updated. ${escapeError(error)}`, "error");
    }
  });
  app.querySelector<HTMLButtonElement>("[data-slug-refresh]")?.addEventListener("click", () => {
    if (!form) return;
    getField<HTMLInputElement>(form, "slug").value = slugifyTitle(getField<HTMLInputElement>(form, "title").value);
    delete getField<HTMLInputElement>(form, "slug").dataset.edited;
    markDirty();
  });
  app.querySelector<HTMLButtonElement>("[data-save]")?.addEventListener("click", () => void saveEntry());
  app.querySelector<HTMLButtonElement>("[data-preview]")?.addEventListener("click", async () => {
    if (!currentEntry) return;
    try {
      await renderPrivatePreview(currentEntry);
    } catch (error) {
      showMessage(`Private preview could not be rendered. ${escapeError(error)}`, "error");
    }
  });
  previewDialog?.querySelector<HTMLButtonElement>("[data-preview-close]")?.addEventListener("click", () => previewDialog.close());
  app.querySelector<HTMLButtonElement>("[data-publish]")?.addEventListener("click", () => void publish("publish"));
  app.querySelector<HTMLButtonElement>("[data-unpublish]")?.addEventListener("click", () => void publish("unpublish"));
  app.querySelector<HTMLButtonElement>("[data-archive]")?.addEventListener("click", () => void publish("archive"));
  app.querySelector<HTMLButtonElement>("[data-duplicate]")?.addEventListener("click", () => void duplicateCurrent().catch((error) => showMessage(escapeError(error), "error")));
  app.querySelector<HTMLButtonElement>("[data-delete]")?.addEventListener("click", async () => {
    if (currentEntry) await deleteEntry(currentEntry, app.querySelector<HTMLButtonElement>("[data-delete]") ?? undefined);
  });

  app.querySelector<HTMLButtonElement>("[data-back-to-list]")?.addEventListener("click", () => {
    if (editorDirty && !window.confirm("Leave this draft? Unsaved text is kept in a local recovery copy, but it may not have reached Supabase.")) return;
    editor?.destroy();
    editor = null;
    currentEntry = null;
    editorDirty = false;
    const type = currentFilter ?? "article";
    setView("list", type);
    updateUrl(type);
  });

  app.querySelectorAll<HTMLButtonElement>("[data-format]").forEach((button) => {
    button.addEventListener("click", () => formatSelection(button.dataset.format ?? ""));
  });
  bindMarkdownImport(async (file, imported) => {
    if (!editor || !form || !currentEntry) throw new Error("Open a content entry before importing Markdown.");
    if (editor.state.doc.length && !window.confirm(`Replace this entry with “${file.name}” and its frontmatter?`)) return;
    getField<HTMLInputElement>(form, "title").value = imported.title;
    const slug = getField<HTMLInputElement>(form, "slug");
    slug.value = imported.slug;
    slug.dataset.edited = "true";
    getField<HTMLTextAreaElement>(form, "excerpt").value = imported.excerpt;
    const contentType = getField<HTMLSelectElement>(form, "content_type");
    if (imported.contentType) contentType.value = imported.contentType;
    getField<HTMLInputElement>(form, "category").value = imported.category;
    getField<HTMLInputElement>(form, "tags").value = imported.tags.join(", ");
    getField<HTMLInputElement>(form, "cover_image_url").value = imported.coverImageUrl;
    getField<HTMLInputElement>(form, "cover_image_alt").value = imported.coverImageAlt;
    getField<HTMLInputElement>(form, "seo_title").value = imported.seoTitle;
    getField<HTMLTextAreaElement>(form, "seo_description").value = imported.seoDescription;
    getField<HTMLTextAreaElement>(form, "metadata").value = JSON.stringify(imported.metadata, null, 2);
    renderTypeMetadataFields(typeMetadata, contentType.value as CmsContentType, imported.metadata);
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: imported.body } });
    markDirty();
    showMessage(`Imported ${file.name}. Review and save the updated CMS draft when ready.`, "success");
  });
  app.querySelector<HTMLButtonElement>("[data-open-media]")?.addEventListener("click", async () => {
    if (editorDirty && !(await saveEntry())) return;
    updateUrl("media");
    setView("media");
  });
  app.querySelector<HTMLInputElement>("[data-upload]")?.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      await uploadMedia(file);
    } catch (error) {
      showMessage(`Image upload failed. ${escapeError(error)}`, "error");
    } finally {
      input.value = "";
    }
  });
  app.querySelector<HTMLButtonElement>("[data-logout]")?.addEventListener("click", async () => {
    if (editorDirty && !window.confirm("You have unsaved changes. Log out anyway? A local recovery copy has been kept.")) return;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      location.replace("/admin/login");
    } catch (error) {
      showMessage(`Could not end the session. ${escapeError(error)}`, "error");
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!editorDirty) return;
    event.preventDefault();
  });

  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) location.replace("/admin/login");
  });

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && view === "editor") {
      event.preventDefault();
      void saveEntry();
    }
  });
}

void initializeLogin();
void initializeStudio();
