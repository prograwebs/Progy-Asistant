ALTER TYPE public.usage_kind ADD VALUE IF NOT EXISTS 'openai_input_tokens';
ALTER TYPE public.usage_kind ADD VALUE IF NOT EXISTS 'openai_output_tokens';
ALTER TYPE public.usage_kind ADD VALUE IF NOT EXISTS 'openai_audio_input_tokens';
ALTER TYPE public.usage_kind ADD VALUE IF NOT EXISTS 'elevenlabs_characters';
ALTER TYPE public.usage_kind ADD VALUE IF NOT EXISTS 'catalog_import';
