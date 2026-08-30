// @deprecated Compatibility facade. New code must import the focused module
// directly so authentication, configuration and provider concerns stay separate.
export {
  integrationConfig,
  progyAuthCallbackUrl,
  progyOrigin,
  publicIntegrationStatus,
  releaseEnvironmentStatus,
  serverConfig,
} from "./config/env";

export {
  clearSupabaseSession,
  getSupabaseAccessToken,
  getSupabaseRefreshToken,
  getSupabaseUser,
  refreshSupabaseSession,
  requireApiUser,
  saveSupabaseSession,
  supabaseAuthRequest,
  type ProgyUser,
} from "./auth/supabase";

export {
  ElevenLabsVoiceError,
  listElevenLabsVoices,
  resolveElevenLabsVoiceId,
  type ProgyVoice,
} from "./voice/catalog";

export { providerErrorCode, publicDataError, safeErrorMessage } from "./http/errors";
