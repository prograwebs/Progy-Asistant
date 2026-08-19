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

test("onboarding never treats browser WhatsApp confirmation as server verification", () => {
  const api = read("app/api/onboarding/route.ts");
  const connect = read("components/onboarding/steps/ConnectStep.tsx");
  assert.match(api, /El canal todavía no tiene una confirmación server-side disponible/);
  assert.doesNotMatch(connect, /action: "channelConnected"/);
  assert.match(connect, /NEXT_PUBLIC_WHATSAPP_ENABLED/);
  assert.match(connect, /action: "channelSkipped"/);
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
