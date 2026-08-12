// Compatibility facade for existing API routes. New code should import from the
// focused modules below so authentication, configuration and voice concerns stay
// independent and testable.
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
