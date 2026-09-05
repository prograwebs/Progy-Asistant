create table if not exists public.auth_rate_limits (
  bucket              text not null,
  key_hash            text not null,
  window_started_at   timestamptz not null,
  attempts            integer not null default 0,
  expires_at          timestamptz not null,
  primary key (bucket, key_hash, window_started_at),
  constraint auth_rate_limits_bucket_check check (length(bucket) between 1 and 80),
  constraint auth_rate_limits_hash_check check (key_hash ~ '^[a-f0-9]{64}$'),
  constraint auth_rate_limits_attempts_check check (attempts >= 0)
);

create index if not exists auth_rate_limits_expires_idx
  on public.auth_rate_limits (expires_at);

alter table public.auth_rate_limits enable row level security;

revoke all on public.auth_rate_limits from public, anon, authenticated;
grant all on public.auth_rate_limits to service_role;

create or replace function public.consume_auth_rate_limit(
  p_bucket text,
  p_key_hash text,
  p_window_seconds integer,
  p_max_attempts integer,
  p_now timestamptz default now()
)
returns table (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_window_started_at timestamptz;
  v_expires_at timestamptz;
  v_attempts integer;
begin
  if p_bucket is null or length(trim(p_bucket)) not between 1 and 80 then
    raise exception 'Invalid rate limit bucket' using errcode = '22023';
  end if;
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid rate limit key' using errcode = '22023';
  end if;
  if p_window_seconds is null or p_window_seconds not between 1 and 604800 then
    raise exception 'Invalid rate limit window' using errcode = '22023';
  end if;
  if p_max_attempts is null or p_max_attempts not between 1 and 100000 then
    raise exception 'Invalid rate limit attempts' using errcode = '22023';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from p_now) / p_window_seconds) * p_window_seconds
  );
  v_expires_at := v_window_started_at + make_interval(secs => p_window_seconds);

  delete from public.auth_rate_limits
  where expires_at <= p_now;

  insert into public.auth_rate_limits (
    bucket,
    key_hash,
    window_started_at,
    attempts,
    expires_at
  )
  values (
    p_bucket,
    p_key_hash,
    v_window_started_at,
    1,
    v_expires_at
  )
  on conflict (bucket, key_hash, window_started_at)
  do update set attempts = public.auth_rate_limits.attempts + 1
  returning auth_rate_limits.attempts into v_attempts;

  allowed := v_attempts <= p_max_attempts;
  remaining := greatest(p_max_attempts - v_attempts, 0);
  retry_after_seconds := greatest(
    1,
    ceil(extract(epoch from v_expires_at - p_now))::integer
  );
  return next;
end;
$function$;

revoke all on function public.consume_auth_rate_limit(text, text, integer, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.consume_auth_rate_limit(text, text, integer, integer, timestamptz) to service_role;
