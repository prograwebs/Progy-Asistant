import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");

async function importTypeScript(file) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

test("keeps Node as the standard runtime and adds provisional Cloudflare support", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.dev, "next dev -p 4173");
  assert.equal(pkg.scripts.build, "next build");
  assert.equal(pkg.scripts.start, "next start -p 4173");
  assert.equal(pkg.scripts["build:worker"], "opennextjs-cloudflare build");
  assert.match(pkg.scripts["test:worker"], /wrangler deploy --dry-run/);
  assert.match(pkg.scripts.deploy, /opennextjs-cloudflare deploy -- --keep-vars/);
  assert.match(pkg.scripts.upload, /opennextjs-cloudflare upload -- --keep-vars/);
  assert.equal(pkg.dependencies["@opennextjs/cloudflare"], "1.20.2");
  assert.equal(pkg.devDependencies.wrangler, "4.121.0");
  for (const dependency of ["vinext", "vite", "@cloudflare/vite-plugin", "drizzle-orm", "drizzle-kit"]) {
    assert.equal(pkg.dependencies?.[dependency] ?? pkg.devDependencies?.[dependency], undefined, `${dependency} must not ship in Progy`);
  }
});

test("keeps the required OpenNext configuration and excludes legacy Sites scaffolding", () => {
  const wrangler = read("wrangler.jsonc");
  const openNext = read("open-next.config.ts");
  const nextConfig = read("next.config.ts");
  const workspace = read("pnpm-workspace.yaml");
  const gitignore = read(".gitignore");

  assert.match(wrangler, /"main": "\.open-next\/worker\.js"/);
  assert.match(wrangler, /"name": "progy-asistant"/);
  assert.match(wrangler, /"compatibility_date": "2026-08-11"/);
  assert.match(wrangler, /"nodejs_compat"/);
  assert.match(wrangler, /"global_fetch_strictly_public"/);
  assert.match(wrangler, /"binding": "NEXT_INC_CACHE_R2_BUCKET"/);
  assert.match(wrangler, /"bucket_name": "progy-negocios-opennext-cache"/);
  assert.match(wrangler, /"binding": "WORKER_SELF_REFERENCE"[\s\S]*"service": "progy-asistant"/);
  assert.doesNotMatch(wrangler, /"images"|"binding": "IMAGES"/);
  assert.match(openNext, /incrementalCache: r2IncrementalCache/);
  assert.match(nextConfig, /initOpenNextCloudflareForDev\(\)/);
  assert.match(nextConfig, /output:\s*["']standalone["']/);
  for (const dependency of ["esbuild", "sharp", "unrs-resolver", "workerd"]) {
    assert.match(workspace, new RegExp(`^  ${dependency}: true$`, "m"));
  }
  assert.match(gitignore, /^\.open-next$/m);
  assert.match(gitignore, /^\.wrangler$/m);
  assert.match(gitignore, /^\.dev\.vars\*$/m);

  for (const file of [
    ".openai/hosting.json",
    "vite.config.ts",
    "build/sites-vite-plugin.ts",
    "worker/index.ts",
    "scripts/sites-env.sh",
    "app/chatgpt-auth.ts",
    "app/api/openai/realtime/route.ts",
  ]) {
    assert.equal(existsSync(path.join(root, file)), false, `${file} should be removed`);
  }
});

test("keeps required public and legal routes for deployment", () => {
  for (const file of [
    "app/page.tsx",
    "app/acceso/page.tsx",
    "app/panel/page.tsx",
    "app/privacidad/page.tsx",
    "app/terminos/page.tsx",
    "app/eliminar-datos/page.tsx",
    "app/api/health/route.ts",
  ]) {
    assert.equal(existsSync(path.join(root, file)), true, `${file} is required for release`);
  }
});

test("activates the standalone onboarding flow for new businesses", () => {
  const dashboard = read("components/dashboard/ProgyDashboard.tsx");
  assert.doesNotMatch(dashboard, /BusinessOnboarding/);
  assert.match(dashboard, /OnboardingRedirect/);
  assert.match(dashboard, /\/onboarding\/business/);
  for (const route of [
    "app/onboarding/page.tsx",
    "app/onboarding/layout.tsx",
    "app/onboarding/business/page.tsx",
    "app/onboarding/demo/page.tsx",
    "app/onboarding/connect/page.tsx",
  ]) {
    assert.equal(existsSync(path.join(root, route)), true, `${route} is required for onboarding`);
  }
});

test("onboarding production flow has durable state, versioned templates, and a server gate", async () => {
  const migration = read("supabase/migrations/20260818000000_onboarding_flow.sql");
  const categories = read("supabase/migrations/20260818000001_seed_business_categories.sql");
  const features = read("supabase/migrations/20260818000002_seed_feature_definitions.sql");
  const api = read("app/api/onboarding/route.ts");
  const service = read("lib/onboarding/service.ts");
  const workspace = read("app/api/workspace/route.ts");

  assert.match(migration, /CREATE TABLE public\.business_onboarding/);
  assert.match(migration, /can_view_business\(business_onboarding\.business_id\)/);
  assert.match(migration, /can_manage_business\(business_onboarding\.business_id\)/);
  assert.match(migration, /template_key text/);
  assert.match(migration, /is_demo boolean DEFAULT false NOT NULL/);
  assert.match(categories, /INSERT INTO public\.business_categories/);
  assert.match(categories, /ON CONFLICT \(code\) DO UPDATE/);
  assert.match(features, /INSERT INTO public\.feature_definitions/);
  assert.match(features, /answer_questions/);
  assert.match(features, /ON CONFLICT \(code\) DO UPDATE/);
  for (const action of ["createBusiness", "saveDemo", "channelSkipped", "channelConnected", "activate"]) {
    assert.match(api, new RegExp(action));
  }
  assert.match(service, /listElevenLabsVoices/);
  assert.match(service, /activation_status: "active"/);
  assert.match(service, /readiness\.ready/);
  assert.match(workspace, /calculateReadiness/);

  const templates = await importTypeScript("lib/onboarding/templates.ts");
  const values = templates.listOnboardingTemplates();
  assert.equal(values.length, 6);
  for (const template of values) {
    assert.equal(template.version, "v1");
    assert.ok(template.features.length > 0);
    assert.equal(template.scenarios.length, 2);
    assert.ok(template.catalog.every((item) => item.key));
    assert.ok(template.knowledge.every((item) => item.answer.length > 0));
  }
});

test("onboarding records WhatsApp only after server-side verification", () => {
  const api = read("app/api/onboarding/route.ts");
  const connect = read("components/onboarding/steps/ConnectStep.tsx");
  assert.match(api, /markChannelConnected/);
  assert.match(connect, /action: "channelConnected"/);
  assert.match(connect, /NEXT_PUBLIC_WHATSAPP_ENABLED/);
  assert.match(connect, /action: "channelSkipped"/);
});

test("onboarding resumes from durable state and protects authenticated routes", () => {
  const paths = read("lib/onboarding/paths.ts");
  const routing = read("lib/onboarding/routing.ts");
  const access = read("app/acceso/page.tsx");
  const panel = read("app/panel/page.tsx");
  const draft = read("components/onboarding/useOnboardingDraft.ts");
  const auth = read("lib/auth/supabase.ts");
  const onboardingLayout = read("app/onboarding/layout.tsx");

  assert.match(paths, /business_created/);
  assert.match(paths, /demo_completed/);
  assert.match(paths, /channel_skipped/);
  assert.match(paths, /channel_connected/);
  assert.match(routing, /business_onboarding\?business_id/);
  assert.match(routing, /order=created_at\.desc/);
  assert.match(routing, /\?\? candidates\[0\]/);
  assert.match(access, /if \(await getSupabaseUser\(\)\) redirect\("\/panel"\)/);
  assert.match(panel, /resolveUserRoute/);
  assert.match(draft, /initialDraft\?\.businessId/);
  assert.match(draft, /businessId: ""/);
  assert.match(read("components/dashboard/ProgyDashboard.tsx"), /window\.location\.replace\("\/acceso\?mode=login"\)/);
  assert.match(read("components/onboarding/OnboardingSidebar.tsx"), /window\.location\.replace\("\/acceso\?mode=login"\)/);
  const privateGuard = read("components/auth/PrivateSessionGuard.tsx");
  assert.match(privateGuard, /\/api\/auth\/me/);
  assert.match(privateGuard, /window\.location\.replace\("\/acceso\?mode=login"\)/);
  assert.match(privateGuard, /pageshow/);
  assert.doesNotMatch(auth, /preview-user/);
  assert.match(onboardingLayout, /if \(!user\) redirect\("\/acceso\?mode=login"\)/);
  assert.doesNotMatch(onboardingLayout, /NODE_ENV/);
  assert.match(panel, /if \(!user\) redirect\("\/acceso\?mode=login"\)/);
  assert.doesNotMatch(panel, /preview-user|NODE_ENV/);
  assert.doesNotMatch(read("app/api/workspace/route.ts"), /preview-business/);
});

test("production template keeps secrets server-side and WhatsApp gated", () => {
  const env = read(".env.example");
  assert.match(env, /^OPENAI_API_KEY=/m);
  assert.match(env, /^ELEVENLABS_API_KEY=/m);
  assert.match(env, /^META_APP_SECRET=/m);
  assert.doesNotMatch(env, /^NEXT_PUBLIC_META_APP_SECRET=/m);
  assert.match(env, /^NEXT_PUBLIC_WHATSAPP_ENABLED=false$/m);
  assert.doesNotMatch(env, /OPENAI_REALTIME_/);
});

test("keeps WhatsApp configuration consistent across client and server", () => {
  const config = read("lib/whatsapp/config.ts");
  const constants = read("lib/whatsapp/constants.ts");
  const signup = read("components/dashboard/metaSignup.ts");
  const connect = read("app/api/whatsapp/connect/route.ts");
  const register = read("app/api/whatsapp/register/route.ts");
  const metaClient = read("lib/whatsapp/meta-client.ts");
  const coexistenceMigration = read("supabase/migrations/20260823120000_whatsapp_coexistence.sql");
  const templates = read("app/api/whatsapp/templates/route.ts");
  const send = read("app/api/whatsapp/send-text/route.ts");
  const messages = read("app/api/whatsapp/messages/route.ts");
  const inbox = read("components/dashboard/conversations/ConversationInbox.tsx");
  const inboxHook = read("components/dashboard/conversations/useConversationInbox.ts");
  const composer = read("components/dashboard/conversations/ConversationComposer.tsx");
  const thread = read("components/dashboard/conversations/ConversationThread.tsx");

  assert.match(config, /NEXT_PUBLIC_WHATSAPP_ENABLED === "true"/);
  assert.match(constants, /DEFAULT_META_GRAPH_VERSION = "v25\.0"/);
  assert.match(signup, /NEXT_PUBLIC_META_GRAPH_VERSION/);
  for (const source of [connect, register, templates, send, messages]) {
    assert.match(source, /getWhatsAppConfig\(\)\.enabled/);
    assert.doesNotMatch(source, /v26\.0/);
  }
  assert.doesNotMatch(send, /registerPhoneNumber|META_WHATSAPP_REG_PIN/);
  assert.match(signup, /allowedOrigins\.has\(event\.origin\)/);
  assert.match(signup, /whatsapp_business_app_onboarding/);
  assert.match(signup, /FINISH_ONLY_WABA/);
  assert.match(metaClient, /subscribed_apps/);
  assert.match(metaClient, /phoneNumberId}\/register/);
  assert.match(metaClient, /smb_app_data/);
  assert.match(register, /\^\\d\{6\}\$/);
  assert.match(register, /onboarding_flow === "business_app"/);
  assert.match(connect, /flow/);
  assert.match(connect, /is_on_biz_app/);
  assert.match(connect, /requestedPhoneNumberId/);
  assert.match(connect, /selected phone is not accessible/);
  assert.match(connect, /La conexión no se guardó/);
  assert.match(coexistenceMigration, /whatsapp_contacts/);
  assert.match(messages, /export async function GET/);
  assert.match(messages, /export async function POST/);
  assert.match(messages, /canManageBusiness/);
  assert.match(messages, /saveOutboundMessage/);
  assert.doesNotMatch(messages, /access_token\s*:/);
  assert.match(inboxHook, /\/api\/whatsapp\/messages/);
  assert.match(inbox, /Actualizar conversaciones/);
  assert.match(composer, /Enviar respuesta manual/);
  assert.match(read("app/api/whatsapp/stream/route.ts"), /postgres_changes/);
  assert.match(read("app/api/whatsapp/stream/route.ts"), /whatsapp_messages/);
  assert.match(read("app/api/whatsapp/stream/route.ts"), /conversations/);
  assert.match(inboxHook, /EventSource/);
  assert.match(inboxHook, /whatsapp-update/);
  assert.match(inboxHook, /showLoading: false/);
  assert.match(inboxHook, /optimistic-/);
  assert.match(thread, /loading && !messages\.length/);
  assert.match(read("supabase/migrations/20260823150000_whatsapp_realtime.sql"), /supabase_realtime/);
  assert.doesNotMatch(signup, /endsWith\("facebook\.com"\)/);
});

test("keeps WhatsApp webhook processing signed, scoped and idempotent", () => {
  const admin = read("lib/supabase-admin.ts");
  const webhook = read("app/api/whatsapp/webhook/route.ts");
  const inbound = read("lib/whatsapp/inbound.ts");
  const store = read("lib/whatsapp/webhook-store.ts");
  const openai = read("lib/ai/openai.ts");
  const env = read(".env.example");
  const migration = read("supabase/migrations/20260820_whatsapp_messages.sql");
  const connectionsMigration = read("supabase/migrations/20260821_whatsapp_connection.sql");
  const coexistenceMigration = read("supabase/migrations/20260823120000_whatsapp_coexistence.sql");

  assert.match(admin, /headers\.set\("Prefer", prefer\)/);
  assert.match(admin, /SupabaseAdminRequestError/);
  assert.match(admin, /response\.status === 409/);
  assert.doesNotMatch(admin, /\.\.\.options,\s*headers/);
  assert.match(webhook, /createHmac\("sha256"/);
  assert.match(webhook, /x-hub-signature-256/);
  assert.match(webhook, /hub\.verify_token/);
  assert.doesNotMatch(webhook, /\bafter\s*\(/);
  assert.match(webhook, /await processWhatsAppWebhook\(payload\)/);
  assert.match(webhook, /result\.failed > 0/);
  assert.match(webhook, /status: 500/);
  assert.match(inbound, /phone_number_id/);
  assert.match(inbound, /executeAssistantDecision/);
  assert.match(inbound, /sendWhatsAppText/);
  assert.match(inbound, /Progy WhatsApp Meta response rejected/);
  assert.match(inbound, /replyLength/);
  assert.match(inbound, /failed/);
  assert.match(inbound, /failureStage/);
  assert.match(store, /resolution=ignore-duplicates/);
  assert.match(store, /INBOUND_PROCESSING_STALE_MS/);
  assert.match(store, /status=eq\./);
  assert.match(store, /updated_at/);
  assert.match(env, /^OPENAI_ASSISTANT_MODEL=gpt-4o-mini$/m);
  assert.match(env, /^OPENAI_CATALOG_MODEL=gpt-4o-mini$/m);
  assert.match(openai, /OPENAI_ASSISTANT_MODEL \|\| "gpt-4o-mini"/);
  assert.match(openai, /OPENAI_CATALOG_MODEL \|\| "gpt-4o-mini"/);
  assert.match(openai, /reasoningForModel/);
  assert.match(openai, /startsWith\("gpt-5"\)/);
  assert.match(openai, /entry\.role === "assistant" \? "output_text" : "input_text"/);
  assert.match(migration, /provider_message_id text not null unique/);
  assert.match(migration, /enable row level security/);
  assert.match(connectionsMigration, /whatsapp_subscribed_at|webhook_subscribed_at/);
  assert.match(connectionsMigration, /access_token text not null/);
  assert.match(coexistenceMigration, /history_sync_status/);
  assert.match(coexistenceMigration, /contacts_sync_status/);
  assert.match(read("supabase/migrations/20260824120000_expand_usage_kinds.sql"), /openai_input_tokens/);
  assert.match(inbound, /smb_message_echoes/);
  assert.match(inbound, /smb_app_state_sync/);
  assert.match(inbound, /history/);
});

test("forwards PostgREST Prefer headers used by WhatsApp claims", async () => {
  const admin = await importTypeScript("lib/supabase-admin.ts");
  const previousFetch = globalThis.fetch;
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SECRET_KEY;
  let capturedHeaders;

  process.env.SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test";
  globalThis.fetch = async (_input, init) => {
    capturedHeaders = new Headers(init?.headers);
    return new Response("[]", { status: 200 });
  };

  try {
    await admin.supabaseAdminRequest("whatsapp_messages", {
      method: "POST",
      body: "{}",
      prefer: "resolution=ignore-duplicates,return=representation",
    });
    assert.equal(
      capturedHeaders.get("Prefer"),
      "resolution=ignore-duplicates,return=representation",
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousKey;
  }
});

test("pins the patched Next.js stack and uses pnpm exclusively", () => {
  const pkg = JSON.parse(read("package.json"));
  const ci = read(".github/workflows/progy-ci.yml");
  const eslint = read("eslint.config.mjs");

  assert.equal(pkg.packageManager, "pnpm@11.10.0");
  assert.equal(pkg.dependencies.next, "16.3.0");
  assert.equal(pkg.devDependencies["eslint-config-next"], "16.3.0");
  assert.equal(existsSync(path.join(root, "package-lock.json")), false);
  assert.match(ci, /pnpm install --frozen-lockfile/);
  assert.doesNotMatch(ci, /(^|\s)npm (ci|run)/m);
  assert.match(eslint, /"\.open-next\/\*\*"/);
  assert.match(eslint, /"dist\/\*\*"/);
});

test("keeps private routes out of search indexes and API responses out of caches", () => {
  const layout = read("app/layout.tsx");
  const robots = read("app/robots.ts");
  const nextConfig = read("next.config.ts");

  assert.doesNotMatch(layout, /codex-preview/);
  for (const route of ["/panel", "/acceso", "/auth/", "/api/"]) {
    assert.match(robots, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(nextConfig, /X-Robots-Tag/);
  assert.match(nextConfig, /noindex, nofollow, noarchive, nosnippet/);
  assert.match(nextConfig, /private, no-store, max-age=0/);
  assert.doesNotMatch(nextConfig, /sitemap:/);
});

test("does not expose Supabase or PostgREST error details", async () => {
  const errors = await importTypeScript("lib/http/errors.ts");
  const fallback = "No pudimos completar la operación.";
  const providerPayloads = [
    { code: "42P01", message: 'relation "businesses" does not exist', details: "table public.businesses", hint: "Run migration" },
    { code: "23505", message: "duplicate key value", details: "constraint businesses_slug_key" },
    { error: { code: "PGRST204", message: "Could not find column secret_column" } },
  ];

  for (const payload of providerPayloads) {
    assert.equal(errors.safeErrorMessage(payload, fallback), fallback);
  }
  assert.equal(errors.publicDataError(500, "GET"), "El servicio de datos no está disponible en este momento.");
  assert.equal(errors.publicDataError(403, "PATCH"), "No tienes permiso para realizar esta operación.");

  const dataClient = read("lib/supabase-data.ts");
  const workspace = read("app/api/workspace/route.ts");
  assert.doesNotMatch(dataClient, /safeErrorMessage/);
  assert.doesNotMatch(workspace, /error instanceof Error \? error\.message/);
  assert.match(dataClient, /operation:[\s\S]*status:[\s\S]*code:[\s\S]*correlationId[,:]/);
});

test("seeds onboarding reference data and refuses an empty category configuration", () => {
  const migration = read("supabase/migrations/20260822070000_seed_workspace_reference_data.sql");
  const onboarding = read("components/dashboard/BusinessOnboarding.tsx");
  const errors = read("lib/http/errors.ts");
  for (const code of [
    "restaurant",
    "clinic",
    "hotel",
    "hardware_store",
    "beauty_salon",
    "retail_store",
    "professional_services",
    "other",
    "answer_questions",
    "take_orders",
    "schedule_appointments",
    "create_reservations",
    "create_quotes",
    "capture_leads",
    "transfer_human",
  ]) {
    assert.match(migration, new RegExp(`['\\"]${code}['\\"]`));
  }
  assert.match(migration, /on conflict \(code\) do update/);
  assert.match(onboarding, /categories\[0\]\?\.code \|\| ""/);
  assert.match(onboarding, /disabled=\{busy \|\| !categoryCode\}/);
  assert.match(errors, /business_create_schema/);
});

test("recovers transient PostgREST JWT failures without exposing provider text", async () => {
  const retry = await importTypeScript("lib/http/postgrest-retry.ts");
  let attempts = 0;
  const recovered = await retry.retryTransientPostgrestJwt(async () => {
    attempts += 1;
    const temporaryFailure = attempts <= 2;
    return {
      value: temporaryFailure ? "temporary" : "ready",
      status: temporaryFailure ? 401 : 200,
      code: temporaryFailure ? "PGRST303" : null,
    };
  }, [0, 0]);
  assert.equal(recovered, "ready");
  assert.equal(attempts, 3);

  attempts = 0;
  const persistent = await retry.retryTransientPostgrestJwt(async () => {
    attempts += 1;
    return { value: "still-unauthorized", status: 401, code: "PGRST303" };
  }, [0, 0]);
  assert.equal(persistent, "still-unauthorized");
  assert.equal(attempts, 3);

  attempts = 0;
  const unrelated = await retry.retryTransientPostgrestJwt(async () => {
    attempts += 1;
    return { value: "unauthorized", status: 401, code: "PGRST301" };
  }, [0, 0]);
  assert.equal(unrelated, "unauthorized");
  assert.equal(attempts, 1);

  const dataClient = read("lib/supabase-data.ts");
  const workspaceApi = read("app/api/workspace/route.ts");
  const workspaceClient = read("components/dashboard/useWorkspace.ts");
  const accessClient = read("app/acceso/AccessClient.tsx");
  assert.match(dataClient, /session_refresh_required/);
  assert.match(workspaceApi, /error\.publicCode/);
  assert.match(workspaceClient, /response\.status === 401 && result\.code === "session_refresh_required"/);
  assert.doesNotMatch(workspaceClient, /jwt issued at future|\/jwt\|token\|session/);
  assert.match(accessClient, /window\.location\.replace\("\/panel"\)/);
});

test("uses one configurable payload limit for uploads and binary responses", async () => {
  const limits = await importTypeScript("lib/config/limits.ts");
  assert.equal(limits.resolveMaxPayloadMegabytes(undefined), 4);
  assert.equal(limits.resolveMaxPayloadMegabytes("invalid"), 4);
  assert.equal(limits.resolveMaxPayloadMegabytes("0"), 4);
  assert.equal(limits.resolveMaxPayloadMegabytes("4.25"), 4.25);
  assert.equal(limits.exceedsPayloadLimit(limits.MAX_PAYLOAD_BYTES), false);
  assert.equal(limits.exceedsPayloadLimit(limits.MAX_PAYLOAD_BYTES + 1), true);
  assert.equal(limits.exceedsBase64SourceLimit(limits.MAX_BASE64_SOURCE_BYTES), false);
  assert.equal(limits.exceedsBase64SourceLimit(limits.MAX_BASE64_SOURCE_BYTES + 1), true);

  const env = read(".env.example");
  const assistant = read("app/api/assistant/turn/route.ts");
  const catalogApi = read("app/api/catalog/import/route.ts");
  const catalogClient = read("components/dashboard/CatalogImport.tsx");
  const voiceClient = read("components/dashboard/VoiceTestStudio.tsx");
  const preview = read("app/api/elevenlabs/preview/route.ts");
  assert.match(env, /^NEXT_PUBLIC_PROGY_MAX_PAYLOAD_MB=4$/m);
  for (const source of [assistant, catalogApi, catalogClient, voiceClient, preview]) {
    assert.match(source, /MAX_PAYLOAD_MB|exceedsPayloadLimit|exceedsBase64SourceLimit/);
    assert.doesNotMatch(source, /(8|12) \* 1024 \* 1024|máximo 12 MB/);
  }
});
