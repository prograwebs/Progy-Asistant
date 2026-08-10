export type PanelUser = { id: string; email: string; name: string };
export type IntegrationStatus = { supabase: boolean; openai: boolean; elevenlabs: boolean; elevenlabsVoice: boolean };
export type Category = { code: string; name: string; description?: string; icon?: string };

export type Business = {
  id: string;
  owner_id: string;
  category_code: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country_code?: string;
  timezone?: string;
  currency?: string;
  status?: string;
  accepts_online_orders?: boolean;
  accepts_online_bookings?: boolean;
};

export type Agent = {
  id: string;
  business_id: string;
  agent_name: string;
  language_code: string;
  greeting: string;
  tone: string;
  voice_id?: string | null;
  elevenlabs_agent_id?: string | null;
  collect_customer_name: boolean;
  collect_customer_phone: boolean;
  fallback_message: string;
  settings?: Record<string, unknown> | null;
};

export type Hour = {
  id?: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

export type Feature = {
  id: string;
  feature_code: string;
  enabled: boolean;
  available_in_trial: boolean;
};

export type CatalogItem = {
  id: string;
  kind: "product" | "service";
  name: string;
  description?: string | null;
  price: number;
  sale_price?: number | null;
  duration_minutes?: number | null;
  stock_quantity?: number;
  track_stock?: boolean;
  is_available: boolean;
};

export type KnowledgeItem = {
  id: string;
  kind: string;
  title: string;
  question?: string | null;
  answer: string;
  is_active: boolean;
};

export type Conversation = {
  id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  channel: string;
  status: string;
  duration_seconds: number;
  summary?: string | null;
  outcome?: string | null;
  started_at: string;
  metadata?: Record<string, unknown> | null;
};

export type Order = {
  id: string;
  order_number: number;
  customer_name?: string | null;
  status: string;
  fulfillment: string;
  total: number;
  created_at: string;
};

export type Booking = {
  id: string;
  customer_name?: string | null;
  type: string;
  status: string;
  starts_at: string;
  party_size?: number | null;
  resource_name?: string | null;
  created_at: string;
};

export type Plan = {
  plan_code: string;
  status: string;
  included_voice_seconds: number;
  used_voice_seconds: number;
  trial_ends_at?: string | null;
};

export type Usage = {
  id: string;
  kind: string;
  quantity: number;
  estimated_cost_usd: number;
  created_at: string;
};

export type VoiceOption = {
  id: string;
  name: string;
  description: string;
  previewUrl: string | null;
  labels: Record<string, string>;
  recommended: boolean;
};

export type SelectedWorkspace = {
  business: Business;
  agent: Agent | null;
  hours: Hour[];
  features: Feature[];
  catalogCategories: unknown[];
  catalogItems: CatalogItem[];
  knowledge: KnowledgeItem[];
  plan: Plan | null;
  conversations: Conversation[];
  orders: Order[];
  bookings: Booking[];
  usage: Usage[];
};

export type Snapshot = {
  categories: Category[];
  businesses: Business[];
  selected: SelectedWorkspace | null;
};

export type WorkspaceAction = (
  payload: Record<string, unknown>,
  message?: string,
  reload?: boolean,
) => Promise<unknown>;
