const LOCAL_ORIGIN = "http://localhost:4173";
const PRODUCTION_ORIGIN = "https://progy.prograwebs.com";

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export function serverConfig() {
  return {
    supabaseUrl: clean(process.env.SUPABASE_URL).replace(/\/$/, ""),
    supabaseAnonKey: clean(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY),
    openAiKey: clean(process.env.OPENAI_API_KEY),
    langfusePublicKey: clean(process.env.LANGFUSE_PUBLIC_KEY),
    langfuseSecretKey: clean(process.env.LANGFUSE_SECRET_KEY),
    langfuseHost: clean(process.env.LANGFUSE_HOST).replace(/\/$/, ""),
    elevenLabsKey: clean(process.env.ELEVENLABS_API_KEY),
    elevenLabsVoiceId: clean(process.env.ELEVENLABS_VOICE_ID),
    whatsappEnabled: process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === "true",
    metaAppId: clean(process.env.META_APP_ID || process.env.NEXT_PUBLIC_META_APP_ID),
    metaAppSecret: clean(process.env.META_APP_SECRET),
    metaConfigId: clean(process.env.NEXT_PUBLIC_META_CONFIG_ID),
    metaWhatsappVerifyToken: clean(process.env.META_WHATSAPP_VERIFY_TOKEN),
  };
}

export function progyOrigin() {
  const configured = clean(process.env.PROGY_APP_URL).replace(/\/$/, "");
  const fallback = process.env.NODE_ENV === "production" ? PRODUCTION_ORIGIN : LOCAL_ORIGIN;
  if (!configured) return fallback;

  try {
    return new URL(configured).origin;
  } catch {
    return fallback;
  }
}

export function progyAuthCallbackUrl() {
  return `${progyOrigin()}/auth/callback`;
}

export function integrationConfig() {
  const config = serverConfig();
  return {
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
    openAiKey: config.openAiKey,
    langfusePublicKey: config.langfusePublicKey,
    langfuseSecretKey: config.langfuseSecretKey,
    langfuseHost: config.langfuseHost,
    elevenLabsKey: config.elevenLabsKey,
    elevenLabsVoiceId: config.elevenLabsVoiceId,
  };
}

export function publicIntegrationStatus() {
  const config = serverConfig();
  return {
    supabase: Boolean(config.supabaseUrl && config.supabaseAnonKey),
    openai: Boolean(config.openAiKey),
    elevenlabs: Boolean(config.elevenLabsKey),
    elevenlabsVoice: Boolean(config.elevenLabsVoiceId),
  };
}

export function releaseEnvironmentStatus() {
  const config = serverConfig();
  const coreReady = Boolean(config.supabaseUrl && config.supabaseAnonKey && config.openAiKey);
  const voiceReady = Boolean(config.elevenLabsKey);
  const supabaseServerKey = clean(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const messagingReady = Boolean(
    config.whatsappEnabled &&
      config.metaAppId &&
      config.metaAppSecret &&
      config.metaConfigId &&
      config.metaWhatsappVerifyToken &&
      supabaseServerKey,
  );
  return {
    coreReady,
    voiceReady,
    messagingReady,
    ready: coreReady && voiceReady,
  };
}
