-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

DROP EXTENSION pg_net;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT DELETE, INSERT, SELECT, UPDATE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, USAGE ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON ROUTINES TO service_role;

CREATE TYPE public.account_role AS ENUM (
  'client',
  'business_owner',
  'admin'
);

CREATE TYPE public.booking_status AS ENUM (
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE public.booking_type AS ENUM (
  'appointment',
  'reservation'
);

CREATE TYPE public.business_status AS ENUM (
  'draft',
  'trial',
  'active',
  'paused',
  'suspended'
);

CREATE TYPE public.conversation_channel AS ENUM (
  'web_voice',
  'web_chat',
  'whatsapp_voice',
  'whatsapp_chat',
  'phone'
);

CREATE TYPE public.conversation_status AS ENUM (
  'active',
  'completed',
  'transferred',
  'abandoned',
  'failed'
);

CREATE TYPE public.fulfillment_type AS ENUM (
  'delivery',
  'pickup',
  'onsite'
);

CREATE TYPE public.item_kind AS ENUM (
  'product',
  'service'
);

CREATE TYPE public.member_role AS ENUM (
  'owner',
  'manager',
  'staff',
  'viewer'
);

CREATE TYPE public.message_role AS ENUM (
  'customer',
  'assistant',
  'system',
  'human_agent',
  'tool'
);

CREATE TYPE public.order_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled'
);

CREATE TYPE public.plan_status AS ENUM (
  'trial',
  'active',
  'past_due',
  'cancelled',
  'suspended'
);

CREATE TYPE public.usage_kind AS ENUM (
  'voice_seconds',
  'llm_tokens',
  'messages'
);

CREATE FUNCTION public.can_access_order (
  target_order_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and (
        o.customer_id = (select auth.uid())
        or (select public.can_view_business(o.business_id))
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.can_access_order(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.can_access_order(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.can_access_order(uuid) TO service_role;

CREATE FUNCTION public.can_manage_business (
  target_business_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select
    (select public.is_admin())
    or exists (
      select 1
      from public.businesses b
      where b.id = target_business_id
        and b.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.business_members bm
      where bm.business_id = target_business_id
        and bm.user_id = (select auth.uid())
        and bm.is_active = true
        and bm.role in ('owner'::public.member_role, 'manager'::public.member_role)
    );
$function$;

REVOKE ALL ON FUNCTION public.can_manage_business(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.can_manage_business(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.can_manage_business(uuid) TO service_role;

CREATE FUNCTION public.can_modify_order (
  target_order_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and (
        (o.customer_id = (select auth.uid()) and o.status = 'pending'::public.order_status)
        or (select public.can_manage_business(o.business_id))
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.can_modify_order(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.can_modify_order(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.can_modify_order(uuid) TO service_role;

CREATE FUNCTION public.can_view_business (
  target_business_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select
    (select public.is_admin())
    or exists (
      select 1
      from public.businesses b
      where b.id = target_business_id
        and b.owner_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.business_members bm
      where bm.business_id = target_business_id
        and bm.user_id = (select auth.uid())
        and bm.is_active = true
    );
$function$;

REVOKE ALL ON FUNCTION public.can_view_business(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.can_view_business(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.can_view_business(uuid) TO service_role;

CREATE FUNCTION public.handle_new_business()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  update public.profiles
  set account_role = case
    when account_role = 'admin'::public.account_role then account_role
    else 'business_owner'::public.account_role
  end
  where id = new.owner_id;

  insert into public.business_members (business_id, user_id, role)
  values (new.id, new.owner_id, 'owner'::public.member_role)
  on conflict (business_id, user_id) do update
    set role = 'owner'::public.member_role, is_active = true;

  insert into public.agent_configs (business_id, greeting)
  values (new.id, 'Hola, soy Kely, la asistente virtual de ' || new.name || '. ¿En que puedo ayudarte?');

  insert into public.business_plans (business_id)
  values (new.id);

  insert into public.business_features (business_id, feature_code, enabled, available_in_trial)
  select
    new.id,
    fd.code,
    case
      when fd.code in ('answer_questions', 'transfer_human') then true
      when fd.code = 'take_orders' and new.category_code in ('restaurant', 'retail_store', 'hardware_store') then true
      when fd.code = 'schedule_appointments' and new.category_code in ('clinic', 'beauty_salon', 'professional_services') then true
      when fd.code = 'create_reservations' and new.category_code in ('hotel', 'restaurant') then true
      when fd.code = 'create_quotes' and new.category_code in ('hardware_store', 'professional_services') then true
      when fd.code = 'capture_leads' then true
      else false
    end,
    case
      when fd.code in ('answer_questions', 'take_orders', 'schedule_appointments', 'create_reservations', 'create_quotes', 'capture_leads', 'transfer_human') then true
      else false
    end
  from public.feature_definitions fd;

  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_business() FROM PUBLIC;

GRANT ALL ON FUNCTION public.handle_new_business() TO service_role;

CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  requested_role public.account_role;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'account_type' = 'business_owner'
      then 'business_owner'::public.account_role
    else 'client'::public.account_role
  end;

  insert into public.profiles (id, email, full_name, avatar_url, account_role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    requested_role
  )
  on conflict (id) do nothing;

  return new;
end;
$function$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;

CREATE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.account_role = 'admin'::public.account_role
      and p.is_active = true
  );
$function$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;

GRANT ALL ON FUNCTION public.is_admin() TO authenticated;

GRANT ALL ON FUNCTION public.is_admin() TO service_role;

CREATE FUNCTION public.is_public_business (
  target_business_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select exists (
    select 1
    from public.businesses b
    where b.id = target_business_id
      and b.is_listed = true
      and b.status in ('trial'::public.business_status, 'active'::public.business_status)
  );
$function$;

REVOKE ALL ON FUNCTION public.is_public_business(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.is_public_business(uuid) TO authenticated;

GRANT ALL ON FUNCTION public.is_public_business(uuid) TO service_role;

CREATE FUNCTION public.prepare_order_item()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  order_business_id uuid;
  item_business_id uuid;
  current_name text;
  current_price numeric(12,2);
  item_available boolean;
begin
  select o.business_id
    into order_business_id
  from public.orders o
  where o.id = new.order_id;

  if order_business_id is null then
    raise exception 'El pedido no existe';
  end if;

  if new.catalog_item_id is not null then
    select ci.business_id, ci.name, coalesce(ci.sale_price, ci.price), ci.is_available
      into item_business_id, current_name, current_price, item_available
    from public.catalog_items ci
    where ci.id = new.catalog_item_id;

    if item_business_id is null or item_business_id <> order_business_id then
      raise exception 'El producto no pertenece al negocio del pedido';
    end if;

    if item_available is not true then
      raise exception 'El producto no esta disponible';
    end if;

    new.item_name_snapshot := current_name;
    new.unit_price := current_price;
  elsif coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
    and not (select public.can_manage_business(order_business_id)) then
    raise exception 'El cliente debe seleccionar un producto valido del catalogo';
  elsif btrim(new.item_name_snapshot) = '' then
    raise exception 'El detalle necesita un nombre';
  end if;

  new.line_total := round(new.quantity * new.unit_price, 2);
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.prepare_order_item() FROM PUBLIC;

GRANT ALL ON FUNCTION public.prepare_order_item() TO service_role;

CREATE FUNCTION public.protect_business_owner()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  if new.owner_id is distinct from old.owner_id and not (select public.is_admin()) then
    raise exception 'No se puede cambiar el propietario directamente';
  end if;
  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.protect_business_owner() FROM PUBLIC;

GRANT ALL ON FUNCTION public.protect_business_owner() TO service_role;

CREATE FUNCTION public.refresh_order_total()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  affected_order_id uuid;
begin
  affected_order_id := coalesce(new.order_id, old.order_id);

  update public.orders o
  set
    subtotal = coalesce((select sum(oi.line_total) from public.order_items oi where oi.order_id = affected_order_id), 0),
    total = greatest(
      0,
      coalesce((select sum(oi.line_total) from public.order_items oi where oi.order_id = affected_order_id), 0)
      - o.discount
      + o.delivery_fee
    )
  where o.id = affected_order_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

REVOKE ALL ON FUNCTION public.refresh_order_total() FROM PUBLIC;

GRANT ALL ON FUNCTION public.refresh_order_total() TO service_role;

CREATE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO ''
  AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;

GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;

GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;

CREATE TABLE public.agent_actions (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid                     NOT NULL,
  business_id     uuid                     NOT NULL,
  action_name     text                     NOT NULL,
  input_data      jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  output_data     jsonb,
  succeeded       boolean,
  error_message   text,
  executed_at     timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.agent_actions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agent_actions
  ADD CONSTRAINT agent_actions_pkey PRIMARY KEY (id);

GRANT ALL ON public.agent_actions TO authenticated;

GRANT ALL ON public.agent_actions TO service_role;

CREATE INDEX agent_actions_conversation_idx ON public.agent_actions (conversation_id, executed_at);

CREATE POLICY agent_actions_read ON public.agent_actions
  FOR SELECT
  TO authenticated
  USING (( SELECT public.can_view_business(agent_actions.business_id) AS can_view_business));

CREATE TABLE public.agent_configs (
  id                     uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id            uuid                     NOT NULL,
  agent_name             text                     DEFAULT 'Kely'::text NOT NULL,
  language_code          text                     DEFAULT 'es-419'::text NOT NULL,
  greeting               text                     DEFAULT 'Hola, soy Kely. ¿En que puedo ayudarte?'::text NOT NULL,
  tone                   text                     DEFAULT 'amable, natural y profesional'::text NOT NULL,
  system_instructions    text,
  voice_provider         text                     DEFAULT 'elevenlabs'::text NOT NULL,
  voice_id               text,
  elevenlabs_agent_id    text,
  llm_provider           text                     DEFAULT 'openai'::text NOT NULL,
  llm_model              text                     DEFAULT 'gpt-5-mini'::text NOT NULL,
  trial_mode             boolean                  DEFAULT true NOT NULL,
  show_transcript        boolean                  DEFAULT true NOT NULL,
  collect_customer_name  boolean                  DEFAULT true NOT NULL,
  collect_customer_phone boolean                  DEFAULT true NOT NULL,
  fallback_message       text                     DEFAULT 'No tengo esa informacion confirmada. Puedo comunicarte con una persona del negocio.'::text NOT NULL,
  settings               jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  is_active              boolean                  DEFAULT true NOT NULL,
  created_at             timestamp with time zone DEFAULT now() NOT NULL,
  updated_at             timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.agent_configs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agent_configs
  ADD CONSTRAINT agent_configs_business_id_key UNIQUE (business_id);

ALTER TABLE public.agent_configs
  ADD CONSTRAINT agent_configs_pkey PRIMARY KEY (id);

GRANT ALL ON public.agent_configs TO authenticated;

GRANT ALL ON public.agent_configs TO service_role;

CREATE TRIGGER set_agent_configs_updated_at
  BEFORE UPDATE ON public.agent_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY agent_configs_read_manage ON public.agent_configs
  FOR SELECT
  TO authenticated
  USING (( SELECT public.can_view_business(agent_configs.business_id) AS can_view_business));

CREATE POLICY agent_configs_write_manage ON public.agent_configs
  TO authenticated
  USING (( SELECT public.can_manage_business(agent_configs.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(agent_configs.business_id) AS can_manage_business));

CREATE TABLE public.bookings (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id     uuid                     NOT NULL,
  customer_id     uuid                     NOT NULL,
  catalog_item_id uuid,
  conversation_id uuid,
  type            public.booking_type      NOT NULL,
  status          public.booking_status    DEFAULT 'pending'::public.booking_status NOT NULL,
  customer_name   text,
  customer_phone  text,
  starts_at       timestamp with time zone NOT NULL,
  ends_at         timestamp with time zone,
  party_size      integer,
  resource_name   text,
  notes           text,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.bookings
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_party_size_check CHECK (party_size IS NULL OR party_size > 0);

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);

ALTER TABLE public.bookings
  ADD CONSTRAINT valid_booking_dates CHECK (ends_at IS NULL OR ends_at > starts_at);

GRANT ALL ON public.bookings TO authenticated;

GRANT ALL ON public.bookings TO service_role;

CREATE INDEX bookings_customer_idx ON public.bookings (customer_id, starts_at DESC);

CREATE INDEX bookings_business_time_idx ON public.bookings (business_id, starts_at, status);

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY bookings_delete_business ON public.bookings
  FOR DELETE
  TO authenticated
  USING (( SELECT public.can_manage_business(bookings.business_id) AS can_manage_business));

CREATE POLICY bookings_insert ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (((customer_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_public_business(bookings.business_id) AS is_public_business)));

CREATE POLICY bookings_read ON public.bookings
  FOR SELECT
  TO authenticated
  USING (((customer_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.can_view_business(bookings.business_id) AS can_view_business)));

CREATE POLICY bookings_update_business ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (( SELECT public.can_manage_business(bookings.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(bookings.business_id) AS can_manage_business));

CREATE TABLE public.business_categories (
  code        text    NOT NULL,
  name        text    NOT NULL,
  description text,
  icon        text,
  sort_order  integer DEFAULT 0 NOT NULL,
  is_active   boolean DEFAULT true NOT NULL
);

ALTER TABLE public.business_categories
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_categories
  ADD CONSTRAINT business_categories_name_key UNIQUE (name);

ALTER TABLE public.business_categories
  ADD CONSTRAINT business_categories_pkey PRIMARY KEY (code);

GRANT ALL ON public.business_categories TO authenticated;

GRANT ALL ON public.business_categories TO service_role;

CREATE POLICY business_categories_read ON public.business_categories
  FOR SELECT
  TO authenticated
  USING (((is_active = true) OR ( SELECT public.is_admin() AS is_admin)));

CREATE TABLE public.business_features (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id        uuid                     NOT NULL,
  feature_code       text                     NOT NULL,
  enabled            boolean                  DEFAULT false NOT NULL,
  available_in_trial boolean                  DEFAULT false NOT NULL,
  configuration      jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  created_at         timestamp with time zone DEFAULT now() NOT NULL,
  updated_at         timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.business_features
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_features
  ADD CONSTRAINT business_features_business_id_feature_code_key UNIQUE (business_id, feature_code);

ALTER TABLE public.business_features
  ADD CONSTRAINT business_features_pkey PRIMARY KEY (id);

GRANT ALL ON public.business_features TO authenticated;

GRANT ALL ON public.business_features TO service_role;

CREATE INDEX business_features_business_idx ON public.business_features (business_id, enabled);

CREATE TRIGGER set_business_features_updated_at
  BEFORE UPDATE ON public.business_features
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY business_features_manage ON public.business_features
  TO authenticated
  USING (( SELECT public.can_manage_business(business_features.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(business_features.business_id) AS can_manage_business));

CREATE POLICY business_features_read ON public.business_features
  FOR SELECT
  TO authenticated
  USING
    ((( SELECT public.is_public_business(business_features.business_id) AS is_public_business) OR ( SELECT public.can_view_business(business_features.business_id) AS
    can_view_business)));

CREATE TABLE public.business_hours (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid                     NOT NULL,
  day_of_week smallint                 NOT NULL,
  opens_at    time without time zone,
  closes_at   time without time zone,
  is_closed   boolean                  DEFAULT false NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  updated_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.business_hours
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_hours
  ADD CONSTRAINT business_hours_business_id_day_of_week_key UNIQUE (business_id, day_of_week);

ALTER TABLE public.business_hours
  ADD CONSTRAINT business_hours_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6);

ALTER TABLE public.business_hours
  ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);

ALTER TABLE public.business_hours
  ADD CONSTRAINT valid_business_hours CHECK (is_closed = true AND opens_at IS NULL AND closes_at IS NULL OR is_closed = false AND opens_at IS NOT NULL AND closes_at IS
    NOT NULL AND opens_at < closes_at);

GRANT ALL ON public.business_hours TO authenticated;

GRANT ALL ON public.business_hours TO service_role;

CREATE INDEX business_hours_business_idx ON public.business_hours (business_id, day_of_week);

CREATE TRIGGER set_business_hours_updated_at
  BEFORE UPDATE ON public.business_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY business_hours_manage ON public.business_hours
  TO authenticated
  USING (( SELECT public.can_manage_business(business_hours.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(business_hours.business_id) AS can_manage_business));

CREATE POLICY business_hours_read ON public.business_hours
  FOR SELECT
  TO authenticated
  USING
    ((( SELECT public.is_public_business(business_hours.business_id) AS is_public_business) OR ( SELECT public.can_view_business(business_hours.business_id) AS can_view_business)));

CREATE TABLE public.business_members (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid                     NOT NULL,
  user_id     uuid                     NOT NULL,
  role        public.member_role       DEFAULT 'staff'::public.member_role NOT NULL,
  is_active   boolean                  DEFAULT true NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  updated_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.business_members
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_members
  ADD CONSTRAINT business_members_business_id_user_id_key UNIQUE (business_id, user_id);

ALTER TABLE public.business_members
  ADD CONSTRAINT business_members_pkey PRIMARY KEY (id);

GRANT ALL ON public.business_members TO authenticated;

GRANT ALL ON public.business_members TO service_role;

CREATE INDEX business_members_user_idx ON public.business_members (user_id, is_active);

CREATE TRIGGER set_business_members_updated_at
  BEFORE UPDATE ON public.business_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY business_members_delete ON public.business_members
  FOR DELETE
  TO authenticated
  USING ((( SELECT public.can_manage_business(business_members.business_id) AS can_manage_business) AND (ROLE <> 'owner'::public.member_role)));

CREATE POLICY business_members_insert ON public.business_members
  FOR INSERT
  TO authenticated
  WITH CHECK (( SELECT public.can_manage_business(business_members.business_id) AS can_manage_business));

CREATE POLICY business_members_read ON public.business_members
  FOR SELECT
  TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.can_view_business(business_members.business_id) AS can_view_business)));

CREATE POLICY business_members_update ON public.business_members
  FOR UPDATE
  TO authenticated
  USING (( SELECT public.can_manage_business(business_members.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(business_members.business_id) AS can_manage_business));

CREATE TABLE public.business_plans (
  business_id                    uuid                     NOT NULL,
  plan_code                      text                     DEFAULT 'free_trial'::text NOT NULL,
  status                         public.plan_status       DEFAULT 'trial'::public.plan_status NOT NULL,
  owner_demo_seconds             integer                  DEFAULT 600 NOT NULL,
  customer_demo_seconds_per_user integer                  DEFAULT 120 NOT NULL,
  max_customer_demo_sessions     integer                  DEFAULT 2 NOT NULL,
  included_voice_seconds         integer                  DEFAULT 600 NOT NULL,
  used_voice_seconds             integer                  DEFAULT 0 NOT NULL,
  trial_starts_at                timestamp with time zone DEFAULT now() NOT NULL,
  trial_ends_at                  timestamp with time zone DEFAULT (now() + '14 days'::interval) NOT NULL,
  current_period_starts_at       timestamp with time zone,
  current_period_ends_at         timestamp with time zone,
  created_at                     timestamp with time zone DEFAULT now() NOT NULL,
  updated_at                     timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.business_plans
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_plans
  ADD CONSTRAINT business_plans_customer_demo_seconds_per_user_check CHECK (customer_demo_seconds_per_user >= 0);

ALTER TABLE public.business_plans
  ADD CONSTRAINT business_plans_included_voice_seconds_check CHECK (included_voice_seconds >= 0);

ALTER TABLE public.business_plans
  ADD CONSTRAINT business_plans_max_customer_demo_sessions_check CHECK (max_customer_demo_sessions >= 0);

ALTER TABLE public.business_plans
  ADD CONSTRAINT business_plans_owner_demo_seconds_check CHECK (owner_demo_seconds >= 0);

ALTER TABLE public.business_plans
  ADD CONSTRAINT business_plans_pkey PRIMARY KEY (business_id);

ALTER TABLE public.business_plans
  ADD CONSTRAINT business_plans_used_voice_seconds_check CHECK (used_voice_seconds >= 0);

GRANT ALL ON public.business_plans TO authenticated;

GRANT ALL ON public.business_plans TO service_role;

CREATE TRIGGER set_business_plans_updated_at
  BEFORE UPDATE ON public.business_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY business_plans_read ON public.business_plans
  FOR SELECT
  TO authenticated
  USING (( SELECT public.can_view_business(business_plans.business_id) AS can_view_business));

CREATE TABLE public.businesses (
  id                      uuid                     DEFAULT gen_random_uuid() NOT NULL,
  owner_id                uuid                     NOT NULL,
  category_code           text                     NOT NULL,
  name                    text                     NOT NULL,
  slug                    text                     NOT NULL,
  legal_name              text,
  description             text,
  logo_url                text,
  cover_url               text,
  phone                   text,
  whatsapp_phone          text,
  email                   text,
  website_url             text,
  address                 text,
  city                    text,
  province                text,
  country_code            character(2)             DEFAULT 'EC'::bpchar NOT NULL,
  latitude                numeric(9,6),
  longitude               numeric(9,6),
  timezone                text                     DEFAULT 'America/Guayaquil'::text NOT NULL,
  currency                character(3)             DEFAULT 'USD'::bpchar NOT NULL,
  status                  public.business_status   DEFAULT 'trial'::public.business_status NOT NULL,
  is_listed               boolean                  DEFAULT false NOT NULL,
  accepts_online_orders   boolean                  DEFAULT false NOT NULL,
  accepts_online_bookings boolean                  DEFAULT false NOT NULL,
  metadata                jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  created_at              timestamp with time zone DEFAULT now() NOT NULL,
  updated_at              timestamp with time zone DEFAULT now() NOT NULL
);

CREATE FUNCTION public.create_business_for_current_user (
  p_name           text,
  p_category_code  text,
  p_slug           text DEFAULT NULL::text,
  p_description    text DEFAULT NULL::text,
  p_phone          text DEFAULT NULL::text,
  p_whatsapp_phone text DEFAULT NULL::text,
  p_email          text DEFAULT NULL::text,
  p_website_url    text DEFAULT NULL::text,
  p_address        text DEFAULT NULL::text,
  p_city           text DEFAULT NULL::text,
  p_province       text DEFAULT NULL::text
)
  RETURNS public.businesses
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  current_user_id uuid;
  clean_name text;
  clean_category text;
  requested_slug text;
  final_slug text;
  created_business public.businesses;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Debes iniciar sesion para crear un negocio'
      using errcode = '42501';
  end if;

  -- El perfil debe existir y pertenecer a un usuario activo.
  if not exists (
    select 1
    from public.profiles p
    where p.id = current_user_id
      and p.is_active = true
  ) then
    raise exception 'No existe un perfil activo para el usuario autenticado'
      using errcode = '42501';
  end if;

  clean_name := nullif(btrim(p_name), '');
  clean_category := nullif(btrim(p_category_code), '');

  if clean_name is null then
    raise exception 'El nombre del negocio es obligatorio'
      using errcode = '22023';
  end if;

  if clean_category is null or not exists (
    select 1
    from public.business_categories bc
    where bc.code = clean_category
      and bc.is_active = true
  ) then
    raise exception 'La categoria seleccionada no es valida'
      using errcode = '22023';
  end if;

  requested_slug := nullif(btrim(lower(coalesce(p_slug, ''))), '');

  if requested_slug is null then
    requested_slug := trim(both '-' from regexp_replace(
      lower(clean_name),
      '[^a-z0-9]+',
      '-',
      'g'
    ));
  else
    requested_slug := trim(both '-' from regexp_replace(
      requested_slug,
      '[^a-z0-9]+',
      '-',
      'g'
    ));
  end if;

  if requested_slug = '' then
    requested_slug := 'negocio';
  end if;

  final_slug := requested_slug;

  -- Si el enlace ya esta ocupado, se agrega un sufijo corto sin revelar
  -- informacion de otro negocio.
  if exists (
    select 1
    from public.businesses b
    where b.slug = final_slug
  ) then
    final_slug := requested_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;

  insert into public.businesses (
    owner_id,
    category_code,
    name,
    slug,
    description,
    phone,
    whatsapp_phone,
    email,
    website_url,
    address,
    city,
    province,
    country_code,
    timezone,
    currency,
    status,
    is_listed
  )
  values (
    current_user_id,
    clean_category,
    clean_name,
    final_slug,
    nullif(btrim(p_description), ''),
    nullif(btrim(p_phone), ''),
    nullif(btrim(p_whatsapp_phone), ''),
    coalesce(nullif(btrim(p_email), ''), (
      select p.email from public.profiles p where p.id = current_user_id
    )),
    nullif(btrim(p_website_url), ''),
    nullif(btrim(p_address), ''),
    nullif(btrim(p_city), ''),
    nullif(btrim(p_province), ''),
    'EC',
    'America/Guayaquil',
    'USD',
    'trial'::public.business_status,
    false
  )
  returning * into created_business;

  -- El trigger on_business_created, creado por el script principal, genera:
  -- 1) la membresia del propietario;
  -- 2) la configuracion inicial de Kely;
  -- 3) el plan de prueba de 10 minutos;
  -- 4) las funciones correspondientes a la categoria.
  return created_business;
end;
$function$;

REVOKE ALL ON FUNCTION public.create_business_for_current_user(text, text, text, text, text, text, text, text, text, text, text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.create_business_for_current_user(text, text, text, text, text, text, text, text, text, text, text) TO authenticated;

GRANT ALL ON FUNCTION public.create_business_for_current_user(text, text, text, text, text, text, text, text, text, text, text) TO service_role;

ALTER TABLE public.businesses
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_category_code_fkey FOREIGN KEY (category_code) REFERENCES public.business_categories(code);

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);

ALTER TABLE public.agent_actions
  ADD CONSTRAINT agent_actions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.agent_configs
  ADD CONSTRAINT agent_configs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;

ALTER TABLE public.business_features
  ADD CONSTRAINT business_features_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_hours
  ADD CONSTRAINT business_hours_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_members
  ADD CONSTRAINT business_members_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_plans
  ADD CONSTRAINT business_plans_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::text);

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_slug_key UNIQUE (slug);

GRANT DELETE, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.businesses TO authenticated;

GRANT ALL ON public.businesses TO service_role;

CREATE INDEX businesses_owner_idx ON public.businesses (owner_id);

CREATE INDEX businesses_directory_idx ON public.businesses (status, is_listed, category_code);

CREATE TRIGGER on_business_created
  AFTER INSERT ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_business();

CREATE TRIGGER protect_business_owner_before_update
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_business_owner();

CREATE TRIGGER set_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY businesses_delete ON public.businesses
  FOR DELETE
  TO authenticated
  USING (((owner_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY businesses_read ON public.businesses
  FOR SELECT
  TO authenticated
  USING
    ((((is_listed = true) AND (status = ANY (ARRAY['trial'::public.business_status, 'active'::public.business_status]))) OR ( SELECT public.can_view_business(businesses.id) AS
    can_view_business)));

CREATE POLICY businesses_update ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (( SELECT public.can_manage_business(businesses.id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(businesses.id) AS can_manage_business));

CREATE TABLE public.catalog_categories (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid                     NOT NULL,
  name        text                     NOT NULL,
  description text,
  sort_order  integer                  DEFAULT 0 NOT NULL,
  is_active   boolean                  DEFAULT true NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  updated_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.catalog_categories
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.catalog_categories
  ADD CONSTRAINT catalog_categories_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.catalog_categories
  ADD CONSTRAINT catalog_categories_business_id_name_key UNIQUE (business_id, name);

ALTER TABLE public.catalog_categories
  ADD CONSTRAINT catalog_categories_pkey PRIMARY KEY (id);

GRANT ALL ON public.catalog_categories TO authenticated;

GRANT ALL ON public.catalog_categories TO service_role;

CREATE INDEX catalog_categories_business_idx ON public.catalog_categories (business_id, is_active);

CREATE TRIGGER set_catalog_categories_updated_at
  BEFORE UPDATE ON public.catalog_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY catalog_categories_manage ON public.catalog_categories
  TO authenticated
  USING (( SELECT public.can_manage_business(catalog_categories.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(catalog_categories.business_id) AS can_manage_business));

CREATE POLICY catalog_categories_read ON public.catalog_categories
  FOR SELECT
  TO authenticated
  USING
    (((( SELECT public.is_public_business(catalog_categories.business_id) AS is_public_business) AND (is_active = true)) OR ( SELECT
    public.can_view_business(catalog_categories.business_id) AS can_view_business)));

CREATE TABLE public.catalog_items (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id      uuid                     NOT NULL,
  category_id      uuid,
  kind             public.item_kind         DEFAULT 'product'::public.item_kind NOT NULL,
  sku              text,
  name             text                     NOT NULL,
  description      text,
  image_url        text,
  price            numeric(12,2)            DEFAULT 0 NOT NULL,
  sale_price       numeric(12,2),
  duration_minutes integer,
  track_stock      boolean                  DEFAULT false NOT NULL,
  stock_quantity   numeric(12,3)            DEFAULT 0 NOT NULL,
  is_available     boolean                  DEFAULT true NOT NULL,
  sort_order       integer                  DEFAULT 0 NOT NULL,
  metadata         jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  created_at       timestamp with time zone DEFAULT now() NOT NULL,
  updated_at       timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.catalog_items
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_business_id_sku_key UNIQUE (business_id, sku);

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.catalog_categories(id) ON DELETE SET NULL;

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_check CHECK (sale_price IS NULL OR sale_price >= 0::numeric AND sale_price <= price);

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_duration_minutes_check CHECK (duration_minutes IS NULL OR duration_minutes > 0);

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_pkey PRIMARY KEY (id);

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_catalog_item_id_fkey FOREIGN KEY (catalog_item_id) REFERENCES public.catalog_items(id) ON DELETE SET NULL;

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_price_check CHECK (price >= 0::numeric);

ALTER TABLE public.catalog_items
  ADD CONSTRAINT catalog_items_stock_quantity_check CHECK (stock_quantity >= 0::numeric);

GRANT ALL ON public.catalog_items TO authenticated;

GRANT ALL ON public.catalog_items TO service_role;

CREATE INDEX catalog_items_business_idx ON public.catalog_items (business_id, is_available, kind);

CREATE TRIGGER set_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY catalog_items_manage ON public.catalog_items
  TO authenticated
  USING (( SELECT public.can_manage_business(catalog_items.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(catalog_items.business_id) AS can_manage_business));

CREATE POLICY catalog_items_read ON public.catalog_items
  FOR SELECT
  TO authenticated
  USING
    (((( SELECT public.is_public_business(catalog_items.business_id) AS is_public_business) AND (is_available = true)) OR ( SELECT
    public.can_view_business(catalog_items.business_id) AS can_view_business)));

CREATE TABLE public.conversation_messages (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  conversation_id uuid                     NOT NULL,
  role            public.message_role      NOT NULL,
  content         text,
  audio_url       text,
  sequence_number integer                  NOT NULL,
  latency_ms      integer,
  metadata        jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  created_at      timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.conversation_messages
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_conversation_id_sequence_number_key UNIQUE (conversation_id, sequence_number);

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_latency_ms_check CHECK (latency_ms IS NULL OR latency_ms >= 0);

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_pkey PRIMARY KEY (id);

GRANT ALL ON public.conversation_messages TO authenticated;

GRANT ALL ON public.conversation_messages TO service_role;

CREATE INDEX conversation_messages_conversation_idx ON public.conversation_messages (conversation_id, sequence_number);

CREATE TABLE public.conversations (
  id                       uuid                        DEFAULT gen_random_uuid() NOT NULL,
  business_id              uuid                        NOT NULL,
  customer_id              uuid,
  channel                  public.conversation_channel DEFAULT 'web_voice'::public.conversation_channel NOT NULL,
  status                   public.conversation_status  DEFAULT 'active'::public.conversation_status NOT NULL,
  is_trial                 boolean                     DEFAULT true NOT NULL,
  external_conversation_id text,
  customer_name            text,
  customer_phone           text,
  started_at               timestamp with time zone    DEFAULT now() NOT NULL,
  ended_at                 timestamp with time zone,
  duration_seconds         integer                     DEFAULT 0 NOT NULL,
  summary                  text,
  outcome                  text,
  metadata                 jsonb                       DEFAULT '{}'::jsonb NOT NULL,
  created_at               timestamp with time zone    DEFAULT now() NOT NULL,
  updated_at               timestamp with time zone    DEFAULT now() NOT NULL
);

CREATE POLICY conversation_messages_insert_customer ON public.conversation_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (((role = 'customer'::public.message_role) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = conversation_messages.conversation_id) AND (c.customer_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY conversation_messages_read ON public.conversation_messages
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE
    ((c.id = conversation_messages.conversation_id) AND ((c.customer_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.can_view_business(c.business_id) AS
    can_view_business))))));

ALTER TABLE public.conversations
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_duration_seconds_check CHECK (duration_seconds >= 0);

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);

ALTER TABLE public.agent_actions
  ADD CONSTRAINT agent_actions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

GRANT ALL ON public.conversations TO authenticated;

GRANT ALL ON public.conversations TO service_role;

CREATE INDEX conversations_customer_idx ON public.conversations (customer_id, created_at DESC);

CREATE INDEX conversations_business_idx ON public.conversations (business_id, created_at DESC);

CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY conversations_insert ON public.conversations
  FOR INSERT
  TO authenticated
  WITH
    CHECK
    (((customer_id = ( SELECT auth.uid() AS uid)) AND (( SELECT public.is_public_business(conversations.business_id) AS is_public_business) OR ( SELECT
    public.can_view_business(conversations.business_id) AS can_view_business))));

CREATE POLICY conversations_read ON public.conversations
  FOR SELECT
  TO authenticated
  USING (((customer_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.can_view_business(conversations.business_id) AS can_view_business)));

CREATE POLICY conversations_update_business ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (( SELECT public.can_manage_business(conversations.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(conversations.business_id) AS can_manage_business));

CREATE TABLE public.feature_definitions (
  code        text    NOT NULL,
  name        text    NOT NULL,
  description text,
  sort_order  integer DEFAULT 0 NOT NULL
);

ALTER TABLE public.feature_definitions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.feature_definitions
  ADD CONSTRAINT feature_definitions_pkey PRIMARY KEY (code);

ALTER TABLE public.business_features
  ADD CONSTRAINT business_features_feature_code_fkey FOREIGN KEY (feature_code) REFERENCES public.feature_definitions(code);

GRANT ALL ON public.feature_definitions TO authenticated;

GRANT ALL ON public.feature_definitions TO service_role;

CREATE POLICY feature_definitions_read ON public.feature_definitions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE public.knowledge_gaps (
  id                uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id       uuid                     NOT NULL,
  conversation_id   uuid,
  customer_question text                     NOT NULL,
  suggested_answer  text,
  status            text                     DEFAULT 'pending'::text NOT NULL,
  resolved_by       uuid,
  resolved_at       timestamp with time zone,
  created_at        timestamp with time zone DEFAULT now() NOT NULL,
  updated_at        timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.knowledge_gaps
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.knowledge_gaps
  ADD CONSTRAINT knowledge_gaps_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.knowledge_gaps
  ADD CONSTRAINT knowledge_gaps_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

ALTER TABLE public.knowledge_gaps
  ADD CONSTRAINT knowledge_gaps_pkey PRIMARY KEY (id);

ALTER TABLE public.knowledge_gaps
  ADD CONSTRAINT knowledge_gaps_status_check CHECK (status = ANY (ARRAY['pending'::text, 'resolved'::text, 'ignored'::text]));

GRANT ALL ON public.knowledge_gaps TO authenticated;

GRANT ALL ON public.knowledge_gaps TO service_role;

CREATE INDEX knowledge_gaps_business_idx ON public.knowledge_gaps (business_id, status, created_at DESC);

CREATE TRIGGER set_knowledge_gaps_updated_at
  BEFORE UPDATE ON public.knowledge_gaps
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY knowledge_gaps_manage ON public.knowledge_gaps
  TO authenticated
  USING (( SELECT public.can_manage_business(knowledge_gaps.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(knowledge_gaps.business_id) AS can_manage_business));

CREATE POLICY knowledge_gaps_read ON public.knowledge_gaps
  FOR SELECT
  TO authenticated
  USING (( SELECT public.can_view_business(knowledge_gaps.business_id) AS can_view_business));

CREATE TABLE public.knowledge_items (
  id          uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid                     NOT NULL,
  kind        text                     DEFAULT 'faq'::text NOT NULL,
  title       text                     NOT NULL,
  question    text,
  answer      text                     NOT NULL,
  priority    integer                  DEFAULT 0 NOT NULL,
  is_active   boolean                  DEFAULT true NOT NULL,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  updated_at  timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.knowledge_items
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.knowledge_items
  ADD CONSTRAINT knowledge_items_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.knowledge_items
  ADD CONSTRAINT knowledge_items_kind_check CHECK (kind = ANY (ARRAY['faq'::text, 'policy'::text, 'instruction'::text, 'location'::text, 'payment_method'::text, 'other'::text]));

ALTER TABLE public.knowledge_items
  ADD CONSTRAINT knowledge_items_pkey PRIMARY KEY (id);

GRANT ALL ON public.knowledge_items TO authenticated;

GRANT ALL ON public.knowledge_items TO service_role;

CREATE INDEX knowledge_items_business_idx ON public.knowledge_items (business_id, is_active, kind);

CREATE TRIGGER set_knowledge_items_updated_at
  BEFORE UPDATE ON public.knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY knowledge_items_manage ON public.knowledge_items
  TO authenticated
  USING (( SELECT public.can_manage_business(knowledge_items.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(knowledge_items.business_id) AS can_manage_business));

CREATE POLICY knowledge_items_read ON public.knowledge_items
  FOR SELECT
  TO authenticated
  USING
    (((( SELECT public.is_public_business(knowledge_items.business_id) AS is_public_business) AND (is_active = true)) OR ( SELECT
    public.can_view_business(knowledge_items.business_id) AS can_view_business)));

CREATE TABLE public.order_items (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  order_id           uuid                     NOT NULL,
  catalog_item_id    uuid,
  item_name_snapshot text                     DEFAULT ''::text NOT NULL,
  quantity           numeric(12,3)            DEFAULT 1 NOT NULL,
  unit_price         numeric(12,2)            DEFAULT 0 NOT NULL,
  line_total         numeric(12,2)            DEFAULT 0 NOT NULL,
  notes              text,
  modifiers          jsonb                    DEFAULT '[]'::jsonb NOT NULL,
  created_at         timestamp with time zone DEFAULT now() NOT NULL,
  updated_at         timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.order_items
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_catalog_item_id_fkey FOREIGN KEY (catalog_item_id) REFERENCES public.catalog_items(id) ON DELETE SET NULL;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_line_total_check CHECK (line_total >= 0::numeric);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_quantity_check CHECK (quantity > 0::numeric);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_unit_price_check CHECK (unit_price >= 0::numeric);

GRANT ALL ON public.order_items TO authenticated;

GRANT ALL ON public.order_items TO service_role;

CREATE INDEX order_items_order_idx ON public.order_items (order_id);

CREATE TRIGGER after_order_item_write
  AFTER INSERT OR DELETE OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.refresh_order_total();

CREATE TRIGGER before_order_item_write
  BEFORE INSERT OR UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prepare_order_item();

CREATE TRIGGER set_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY order_items_delete ON public.order_items
  FOR DELETE
  TO authenticated
  USING (( SELECT public.can_modify_order(order_items.order_id) AS can_modify_order));

CREATE POLICY order_items_insert ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (( SELECT public.can_modify_order(order_items.order_id) AS can_modify_order));

CREATE POLICY order_items_read ON public.order_items
  FOR SELECT
  TO authenticated
  USING (( SELECT public.can_access_order(order_items.order_id) AS can_access_order));

CREATE POLICY order_items_update ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (( SELECT public.can_modify_order(order_items.order_id) AS can_modify_order))
  WITH CHECK (( SELECT public.can_modify_order(order_items.order_id) AS can_modify_order));

CREATE TABLE public.orders (
  id               uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id      uuid                     NOT NULL,
  customer_id      uuid                     NOT NULL,
  conversation_id  uuid,
  order_number     bigint                   GENERATED BY DEFAULT AS IDENTITY NOT NULL,
  status           public.order_status      DEFAULT 'pending'::public.order_status NOT NULL,
  fulfillment      public.fulfillment_type  DEFAULT 'pickup'::public.fulfillment_type NOT NULL,
  customer_name    text,
  customer_phone   text,
  delivery_address text,
  notes            text,
  subtotal         numeric(12,2)            DEFAULT 0 NOT NULL,
  discount         numeric(12,2)            DEFAULT 0 NOT NULL,
  delivery_fee     numeric(12,2)            DEFAULT 0 NOT NULL,
  total            numeric(12,2)            DEFAULT 0 NOT NULL,
  payment_method   text,
  payment_status   text                     DEFAULT 'pending'::text NOT NULL,
  requested_for    timestamp with time zone,
  created_at       timestamp with time zone DEFAULT now() NOT NULL,
  updated_at       timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.orders
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE RESTRICT;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_business_id_order_number_key UNIQUE (business_id, order_number);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_fee_check CHECK (delivery_fee >= 0::numeric);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_discount_check CHECK (discount >= 0::numeric);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text]));

ALTER TABLE public.orders
  ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_subtotal_check CHECK (subtotal >= 0::numeric);

ALTER TABLE public.orders
  ADD CONSTRAINT orders_total_check CHECK (total >= 0::numeric);

GRANT ALL ON public.orders TO authenticated;

GRANT ALL ON public.orders TO service_role;

CREATE INDEX orders_customer_idx ON public.orders (customer_id, created_at DESC);

CREATE INDEX orders_business_status_idx ON public.orders (business_id, status, created_at DESC);

CREATE TRIGGER set_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY orders_delete_business ON public.orders
  FOR DELETE
  TO authenticated
  USING (( SELECT public.can_manage_business(orders.business_id) AS can_manage_business));

CREATE POLICY orders_insert ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (((customer_id = ( SELECT auth.uid() AS uid)) AND ( SELECT public.is_public_business(orders.business_id) AS is_public_business)));

CREATE POLICY orders_read ON public.orders
  FOR SELECT
  TO authenticated
  USING (((customer_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.can_view_business(orders.business_id) AS can_view_business)));

CREATE POLICY orders_update_business ON public.orders
  FOR UPDATE
  TO authenticated
  USING (( SELECT public.can_manage_business(orders.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(orders.business_id) AS can_manage_business));

CREATE TABLE public.profiles (
  id           uuid                     NOT NULL,
  email        text,
  full_name    text,
  phone        text,
  avatar_url   text,
  account_role public.account_role      DEFAULT 'client'::public.account_role NOT NULL,
  is_active    boolean                  DEFAULT true NOT NULL,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  updated_at   timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.business_members
  ADD CONSTRAINT business_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.knowledge_gaps
  ADD CONSTRAINT knowledge_gaps_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE ON public.profiles TO authenticated;

GRANT UPDATE (avatar_url, full_name, phone) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT
  TO authenticated
  USING (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY profiles_update_own_or_admin ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)))
  WITH CHECK (((id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.is_admin() AS is_admin)));

CREATE TABLE public.promotion_items (
  promotion_id    uuid NOT NULL,
  catalog_item_id uuid NOT NULL
);

ALTER TABLE public.promotion_items
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotion_items
  ADD CONSTRAINT promotion_items_catalog_item_id_fkey FOREIGN KEY (catalog_item_id) REFERENCES public.catalog_items(id) ON DELETE CASCADE;

ALTER TABLE public.promotion_items
  ADD CONSTRAINT promotion_items_pkey PRIMARY KEY (promotion_id, catalog_item_id);

GRANT ALL ON public.promotion_items TO authenticated;

GRANT ALL ON public.promotion_items TO service_role;

CREATE TABLE public.promotions (
  id             uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id    uuid                     NOT NULL,
  name           text                     NOT NULL,
  description    text,
  discount_type  text                     DEFAULT 'percentage'::text NOT NULL,
  discount_value numeric(12,2),
  starts_at      timestamp with time zone,
  ends_at        timestamp with time zone,
  terms          text,
  is_active      boolean                  DEFAULT true NOT NULL,
  created_at     timestamp with time zone DEFAULT now() NOT NULL,
  updated_at     timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY promotion_items_manage ON public.promotion_items
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.promotions p
  WHERE ((p.id = promotion_items.promotion_id) AND ( SELECT public.can_manage_business(p.business_id) AS can_manage_business)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM public.promotions p
  WHERE ((p.id = promotion_items.promotion_id) AND ( SELECT public.can_manage_business(p.business_id) AS can_manage_business)))));

CREATE POLICY promotion_items_read ON public.promotion_items
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.promotions p
  WHERE
    ((p.id = promotion_items.promotion_id) AND (( SELECT public.is_public_business(p.business_id) AS is_public_business) OR ( SELECT public.can_view_business(p.business_id) AS
    can_view_business))))));

ALTER TABLE public.promotions
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_discount_type_check CHECK (discount_type = ANY (ARRAY['percentage'::text, 'fixed'::text, 'special_price'::text, 'informational'::text]));

ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_discount_value_check CHECK (discount_value IS NULL OR discount_value >= 0::numeric);

ALTER TABLE public.promotions
  ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);

ALTER TABLE public.promotion_items
  ADD CONSTRAINT promotion_items_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE CASCADE;

ALTER TABLE public.promotions
  ADD CONSTRAINT valid_promotion_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);

GRANT ALL ON public.promotions TO authenticated;

GRANT ALL ON public.promotions TO service_role;

CREATE INDEX promotions_business_idx ON public.promotions (business_id, is_active, starts_at, ends_at);

CREATE TRIGGER set_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY promotions_manage ON public.promotions
  TO authenticated
  USING (( SELECT public.can_manage_business(promotions.business_id) AS can_manage_business))
  WITH CHECK (( SELECT public.can_manage_business(promotions.business_id) AS can_manage_business));

CREATE POLICY promotions_read ON public.promotions
  FOR SELECT
  TO authenticated
  USING
    (((( SELECT public.is_public_business(promotions.business_id) AS is_public_business) AND (is_active = true)) OR ( SELECT public.can_view_business(promotions.business_id) AS
    can_view_business)));

CREATE TABLE public.trial_allowances (
  id              uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id     uuid                     NOT NULL,
  user_id         uuid                     NOT NULL,
  audience        text                     NOT NULL,
  allowed_seconds integer                  NOT NULL,
  used_seconds    integer                  DEFAULT 0 NOT NULL,
  session_count   integer                  DEFAULT 0 NOT NULL,
  expires_at      timestamp with time zone,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.trial_allowances
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.trial_allowances
  ADD CONSTRAINT trial_allowances_allowed_seconds_check CHECK (allowed_seconds >= 0);

ALTER TABLE public.trial_allowances
  ADD CONSTRAINT trial_allowances_audience_check CHECK (audience = ANY (ARRAY['customer'::text, 'business_owner'::text]));

ALTER TABLE public.trial_allowances
  ADD CONSTRAINT trial_allowances_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.trial_allowances
  ADD CONSTRAINT trial_allowances_business_id_user_id_audience_key UNIQUE (business_id, user_id, audience);

ALTER TABLE public.trial_allowances
  ADD CONSTRAINT trial_allowances_pkey PRIMARY KEY (id);

ALTER TABLE public.trial_allowances
  ADD CONSTRAINT trial_allowances_session_count_check CHECK (session_count >= 0);

ALTER TABLE public.trial_allowances
  ADD CONSTRAINT trial_allowances_used_seconds_check CHECK (used_seconds >= 0);

ALTER TABLE public.trial_allowances
  ADD CONSTRAINT trial_allowances_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

GRANT ALL ON public.trial_allowances TO authenticated;

GRANT ALL ON public.trial_allowances TO service_role;

CREATE TRIGGER set_trial_allowances_updated_at
  BEFORE UPDATE ON public.trial_allowances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY trial_allowances_read ON public.trial_allowances
  FOR SELECT
  TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.can_view_business(trial_allowances.business_id) AS can_view_business)));

CREATE TABLE public.usage_ledger (
  id                 uuid                     DEFAULT gen_random_uuid() NOT NULL,
  business_id        uuid                     NOT NULL,
  user_id            uuid,
  conversation_id    uuid,
  kind               public.usage_kind        NOT NULL,
  quantity           integer                  NOT NULL,
  provider           text,
  estimated_cost_usd numeric(12,6)            DEFAULT 0 NOT NULL,
  metadata           jsonb                    DEFAULT '{}'::jsonb NOT NULL,
  created_at         timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.usage_ledger
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.usage_ledger
  ADD CONSTRAINT usage_ledger_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE public.usage_ledger
  ADD CONSTRAINT usage_ledger_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;

ALTER TABLE public.usage_ledger
  ADD CONSTRAINT usage_ledger_estimated_cost_usd_check CHECK (estimated_cost_usd >= 0::numeric);

ALTER TABLE public.usage_ledger
  ADD CONSTRAINT usage_ledger_pkey PRIMARY KEY (id);

ALTER TABLE public.usage_ledger
  ADD CONSTRAINT usage_ledger_quantity_check CHECK (quantity >= 0);

ALTER TABLE public.usage_ledger
  ADD CONSTRAINT usage_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

GRANT ALL ON public.usage_ledger TO authenticated;

GRANT ALL ON public.usage_ledger TO service_role;

CREATE INDEX usage_ledger_user_idx ON public.usage_ledger (user_id, created_at DESC);

CREATE INDEX usage_ledger_business_idx ON public.usage_ledger (business_id, created_at DESC);

CREATE POLICY usage_ledger_read ON public.usage_ledger
  FOR SELECT
  TO authenticated
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT public.can_view_business(usage_ledger.business_id) AS can_view_business)));
