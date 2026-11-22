import { createClient } from "@supabase/supabase-js";
import type {
  ContentEntryInsert,
  ContentEntryRow,
  ContentEntryUpdate,
  Database,
} from "../../src/lib/database.types";
import { mediaExtension } from "../../src/lib/cms-utils";
import { getMediaReferences, parsePublishRequest, validatePublishEntry } from "../../src/lib/publish-utils";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CLOUDFLARE_DEPLOY_HOOK: string;
  PUBLISH_IP_LIMITER: RateLimitBinding;
  PUBLISH_USER_LIMITER: RateLimitBinding;
}

interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface RequestContext {
  request: Request;
  env: Env;
}

type PublisherDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<Database["public"]["Tables"], "content_entries"> & {
      content_entries: {
        Row: ContentEntryRow;
        Insert: ContentEntryInsert;
        Update: ContentEntryUpdate & Pick<ContentEntryRow, "status" | "published_at">;
        Relationships: [];
      };
    };
  };
};

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function readJsonBody(request: Request) {
  const maxBytes = 2048;
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > maxBytes) throw new RequestError("The request body is too large.", 413);
  if (!request.body) throw new RequestError("A JSON request body is required.", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RequestError("The request body is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  try {
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new RequestError("The request body must be valid JSON.", 400);
  }
}

function getDeployHook(value: string) {
  let hook: URL;
  try {
    hook = new URL(value);
  } catch {
    throw new RequestError("The publishing endpoint is not configured.", 503);
  }
  if (
    hook.protocol !== "https:" ||
    hook.hostname !== "api.cloudflare.com" ||
    hook.port !== "" ||
    hook.username !== "" ||
    hook.password !== "" ||
    hook.search !== "" ||
    hook.hash !== "" ||
    !/^\/client\/v4\/pages\/webhooks\/deploy_hooks\/[A-Za-z0-9_-]+$/.test(hook.pathname)
  ) {
    throw new RequestError("The publishing endpoint configuration is invalid.", 503);
  }
  return hook;
}

async function promoteMedia(
  service: ReturnType<typeof createClient<PublisherDatabase>>,
  content: ContentEntryRow,
) {
  const { references, invalid } = getMediaReferences([
    content.body_markdown,
    content.cover_image_url,
    content.thumbnail_url,
    content.og_image_url,
    content.metadata,
  ]);
  if (invalid.length) throw new RequestError("Remove or reinsert the invalid CMS image reference before publishing.", 400);

  const { data: links, error: linksError } = await service
    .from("content_media")
    .select("media_id")
    .eq("content_id", content.id);
  if (linksError) throw linksError;

  const linkedIds = new Set((links ?? []).map(({ media_id }) => media_id.toLowerCase()));
  const unlinked = [...references.keys()].filter((id) => !linkedIds.has(id));
  if (unlinked.length) {
    throw new RequestError("Every inserted CMS image must be linked to this entry through the media library.", 400);
  }
  if (!references.size) return;

  const { data: assets, error: assetsError } = await service
    .from("media_assets")
    .select("*")
    .in("id", [...references.keys()]);
  if (assetsError) throw assetsError;
  const assetsById = new Map((assets ?? []).map((asset) => [asset.id.toLowerCase(), asset]));

  for (const [id, referencedExtension] of references) {
    const asset = assetsById.get(id);
    if (!asset) throw new RequestError("A referenced CMS image is missing from the media library.", 400);
    if (!asset.alt_text.trim()) {
      throw new RequestError(`Add descriptive alt text to ${asset.file_name} before publishing.`, 400);
    }
    const extension = mediaExtension(asset.mime_type);
    if (extension !== referencedExtension) {
      throw new RequestError(`The CMS image reference for ${asset.file_name} does not match its file type. Reinsert it from the media library.`, 400);
    }

    const publicPath = `${asset.id}.${extension}`;
    const { data: existingPublicAsset, error: publicAssetError } = await service.storage
      .from("published-media")
      .download(publicPath);
    if (existingPublicAsset) continue;
    if (publicAssetError && publicAssetError.statusCode !== "404") throw publicAssetError;

    const { data: draftAsset, error: draftAssetError } = await service.storage
      .from("draft-media")
      .download(asset.storage_path);
    if (draftAssetError) throw draftAssetError;
    const { error: uploadError } = await service.storage
      .from("published-media")
      .upload(publicPath, draftAsset, {
        cacheControl: "31536000",
        contentType: asset.mime_type,
        upsert: true,
      });
    if (uploadError) throw uploadError;
  }
}

async function updatePublicationState(
  service: ReturnType<typeof createClient<PublisherDatabase>>,
  contentId: string,
  action: "publish" | "unpublish" | "archive",
) {
  const { data: entry, error: entryError } = await service
    .from("content_entries")
    .select("*")
    .eq("id", contentId)
    .maybeSingle();
  if (entryError) throw entryError;
  if (!entry) throw new RequestError("This content entry no longer exists.", 404);

  if (action === "publish") {
    const validationError = validatePublishEntry(entry);
    if (validationError) throw new RequestError(validationError, 400);
    await promoteMedia(service, entry);
  }

  const values: Pick<ContentEntryRow, "status" | "published_at"> =
    action === "publish"
      ? { status: "published", published_at: entry.published_at ?? new Date().toISOString() }
      : { status: action === "unpublish" ? "draft" : "archived", published_at: entry.published_at };
  const { data, error } = await service
    .from("content_entries")
    .update(values)
    .eq("id", contentId)
    .select("id,status,published_at")
    .single();
  if (error) throw error;
  return data;
}

export async function onRequest({ request, env }: RequestContext) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST for publishing actions." }), {
      status: 405,
      headers: {
        "Allow": "POST",
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return jsonResponse({ error: "This request must come from the same site." }, 403);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type") ?? "")) {
    return jsonResponse({ error: "Send the publishing action as JSON." }, 415);
  }

  try {
    const ip = request.headers.get("CF-Connecting-IP") ?? "local";
    if (!env.PUBLISH_IP_LIMITER) throw new RequestError("Publishing rate limits are not configured.", 503);
    const ipLimit = await env.PUBLISH_IP_LIMITER.limit({ key: ip });
    if (!ipLimit.success) throw new RequestError("Too many publishing requests. Wait a minute and try again.", 429);

    const authorization = request.headers.get("Authorization");
    const token = authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/)?.[1];
    if (!token) throw new RequestError("Sign in again before publishing.", 401);

    const publishRequest = parsePublishRequest(await readJsonBody(request));
    if (!publishRequest) throw new RequestError("Choose a valid action and content entry.", 400);
    const { action, contentId } = publishRequest;

    const requiredSecrets = [
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      env.SUPABASE_SERVICE_ROLE_KEY,
      env.CLOUDFLARE_DEPLOY_HOOK,
    ];
    if (requiredSecrets.some((secret) => !secret)) {
      throw new RequestError("The publishing endpoint is not fully configured.", 503);
    }
    const deployHook = getDeployHook(env.CLOUDFLARE_DEPLOY_HOOK);

    const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError) {
      if (userError.status === 401 || userError.status === 403) {
        throw new RequestError("Your session is invalid or expired. Sign in again.", 401);
      }
      throw userError;
    }
    if (!userData.user) throw new RequestError("Your session is invalid or expired. Sign in again.", 401);

    if (!env.PUBLISH_USER_LIMITER) throw new RequestError("Publishing rate limits are not configured.", 503);
    const userLimit = await env.PUBLISH_USER_LIMITER.limit({ key: userData.user.id });
    if (!userLimit.success) throw new RequestError("Too many publishing requests for this account. Wait a minute and try again.", 429);

    const service = createClient<PublisherDatabase>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
    const { data: admin, error: adminError } = await service
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (adminError) throw adminError;
    if (!admin) throw new RequestError("This account is not authorized to publish.", 403);

    const updated = await updatePublicationState(service, contentId, action);
    let deployResponse: Response;
    try {
      deployResponse = await fetch(deployHook, {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      console.error("Cloudflare Pages deploy hook request failed after the publication state changed.", error);
      return jsonResponse({
        error: "The content status changed, but Cloudflare could not be reached to start a new build. Confirm the status, then retry the publishing action.",
        status: updated.status,
      }, 502);
    }
    if (!deployResponse.ok) {
      console.error(`Cloudflare Pages deploy hook returned HTTP ${deployResponse.status}.`);
      return jsonResponse({
        error: "The content status changed, but Cloudflare did not accept the build request. Confirm the status, then retry the publishing action.",
        status: updated.status,
      }, 502);
    }

    return jsonResponse({
      status: `Content is ${updated.status}. Cloudflare accepted the static-site build request.`,
      content_status: updated.status,
    }, 200);
  } catch (error) {
    if (error instanceof RequestError) return jsonResponse({ error: error.message }, error.status);
    console.error("Unexpected failure in the protected publishing endpoint.", error);
    return jsonResponse({ error: "Publishing failed because of a server error. Check the function logs before retrying." }, 500);
  }
}
