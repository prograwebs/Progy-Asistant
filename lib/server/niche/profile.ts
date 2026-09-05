import { SupabaseDataError, supabaseDataRequest, type DataRequest } from "@/lib/server/data/supabase";
import {
  GENERIC_NICHE_PROFILE,
  GENERIC_TERMINOLOGY,
  type NicheProfile,
  type NicheTerminology,
} from "@/lib/shared/niche/profile";

export {
  GENERIC_NICHE_PROFILE,
  GENERIC_TERMINOLOGY,
  type NicheProfile,
  type NicheTerminology,
} from "@/lib/shared/niche/profile";

type Row = Record<string, unknown>;

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function parseTerminology(value: unknown): NicheTerminology {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
  return {
    booking_singular: typeof source.booking_singular === "string" && source.booking_singular.trim() ? source.booking_singular.trim() : GENERIC_TERMINOLOGY.booking_singular,
    booking_plural: typeof source.booking_plural === "string" && source.booking_plural.trim() ? source.booking_plural.trim() : GENERIC_TERMINOLOGY.booking_plural,
    order_singular: typeof source.order_singular === "string" && source.order_singular.trim() ? source.order_singular.trim() : GENERIC_TERMINOLOGY.order_singular,
    order_plural: typeof source.order_plural === "string" && source.order_plural.trim() ? source.order_plural.trim() : GENERIC_TERMINOLOGY.order_plural,
    resource_label: typeof source.resource_label === "string" && source.resource_label.trim() ? source.resource_label.trim() : GENERIC_TERMINOLOGY.resource_label,
  };
}

function genericProfile(categoryCode: string): NicheProfile {
  return { ...GENERIC_NICHE_PROFILE, category_code: categoryCode || GENERIC_NICHE_PROFILE.category_code, terminology: { ...GENERIC_TERMINOLOGY } };
}

export async function getNicheProfile(categoryCode: string, request: DataRequest = supabaseDataRequest): Promise<NicheProfile> {
  const code = categoryCode.trim();
  if (!code) return genericProfile("");

  try {
    const rows = await request<Row[]>(`niche_profiles?category_code=eq.${encodeURIComponent(code)}&select=category_code,terminology,default_feature_codes,default_tool_codes,prompt_addendum,updated_at&limit=1`);
    const row = rows[0];
    if (!row) return genericProfile(code);
    return {
      category_code: typeof row.category_code === "string" ? row.category_code : code,
      terminology: parseTerminology(row.terminology),
      default_feature_codes: strings(row.default_feature_codes),
      default_tool_codes: strings(row.default_tool_codes),
      prompt_addendum: typeof row.prompt_addendum === "string" && row.prompt_addendum.trim() ? row.prompt_addendum.trim() : null,
      updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
    };
  } catch (error) {
    // Niche support is additive, so code deployed before the migration keeps
    // working with generic labels instead of blocking the panel.
    if (error instanceof SupabaseDataError && [400, 404].includes(error.status)) return genericProfile(code);
    throw error;
  }
}
