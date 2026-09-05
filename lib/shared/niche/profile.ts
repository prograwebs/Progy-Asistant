export type NicheTerminology = {
  booking_singular: string;
  booking_plural: string;
  order_singular: string;
  order_plural: string;
  resource_label: string;
};

export type NicheProfile = {
  category_code: string;
  terminology: NicheTerminology;
  default_feature_codes: string[];
  default_tool_codes: string[];
  prompt_addendum: string | null;
  updated_at?: string | null;
};

export const GENERIC_TERMINOLOGY: NicheTerminology = {
  booking_singular: "cita",
  booking_plural: "citas",
  order_singular: "pedido",
  order_plural: "pedidos",
  resource_label: "recurso",
};

export const GENERIC_NICHE_PROFILE: NicheProfile = {
  category_code: "other",
  terminology: GENERIC_TERMINOLOGY,
  default_feature_codes: [],
  default_tool_codes: [],
  prompt_addendum: null,
};
