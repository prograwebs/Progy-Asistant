-- Onboarding state and template markers for the production onboarding flow.

CREATE TYPE public.onboarding_flow_status AS ENUM (
  'business_created',
  'demo_completed',
  'channel_skipped',
  'channel_connected',
  'onboarding_completed'
);

CREATE TYPE public.onboarding_activation_status AS ENUM (
  'preparing',
  'ready',
  'active'
);

CREATE TYPE public.onboarding_channel_status AS ENUM (
  'pending',
  'skipped',
  'connected'
);

ALTER TABLE public.catalog_items
  ADD COLUMN template_key text,
  ADD COLUMN is_demo boolean DEFAULT false NOT NULL;

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_business_template_key_key UNIQUE (business_id, template_key);

ALTER TABLE public.knowledge_items
  ADD COLUMN template_key text,
  ADD COLUMN is_demo boolean DEFAULT false NOT NULL;

ALTER TABLE public.knowledge_items
  ADD CONSTRAINT knowledge_items_business_template_key_key UNIQUE (business_id, template_key);

CREATE TABLE public.business_onboarding (
  business_id              uuid NOT NULL,
  flow_status              public.onboarding_flow_status DEFAULT 'business_created' NOT NULL,
  activation_status        public.onboarding_activation_status DEFAULT 'preparing' NOT NULL,
  channel_status           public.onboarding_channel_status DEFAULT 'pending' NOT NULL,
  template_version         text DEFAULT 'v1' NOT NULL,
  selected_voice_id        text,
  selected_scenario_key    text,
  demo_completed_at        timestamp with time zone,
  channel_updated_at       timestamp with time zone,
  completed_at              timestamp with time zone,
  activated_at              timestamp with time zone,
  created_at                timestamp with time zone DEFAULT now() NOT NULL,
  updated_at                timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.business_onboarding
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_onboarding
  ADD CONSTRAINT business_onboarding_pkey PRIMARY KEY (business_id);

ALTER TABLE public.business_onboarding
  ADD CONSTRAINT business_onboarding_business_id_fkey
  FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

GRANT ALL ON public.business_onboarding TO authenticated;
GRANT ALL ON public.business_onboarding TO service_role;

CREATE INDEX business_onboarding_activation_idx
  ON public.business_onboarding (activation_status, updated_at DESC);

CREATE TRIGGER set_business_onboarding_updated_at
  BEFORE UPDATE ON public.business_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY business_onboarding_read
  ON public.business_onboarding
  FOR SELECT
  TO authenticated
  USING ((SELECT public.can_view_business(business_onboarding.business_id)));

CREATE POLICY business_onboarding_manage
  ON public.business_onboarding
  TO authenticated
  USING ((SELECT public.can_manage_business(business_onboarding.business_id)))
  WITH CHECK ((SELECT public.can_manage_business(business_onboarding.business_id)));

INSERT INTO public.business_onboarding (business_id, flow_status, activation_status, channel_status, template_version, activated_at)
SELECT
  b.id,
  CASE WHEN b.status = 'active'::public.business_status THEN 'onboarding_completed'::public.onboarding_flow_status ELSE 'business_created'::public.onboarding_flow_status END,
  CASE WHEN b.status = 'active'::public.business_status THEN 'active'::public.onboarding_activation_status ELSE 'preparing'::public.onboarding_activation_status END,
  'pending'::public.onboarding_channel_status,
  'legacy'::text,
  CASE WHEN b.status = 'active'::public.business_status THEN b.updated_at ELSE NULL END
FROM public.businesses b
ON CONFLICT (business_id) DO NOTHING;
