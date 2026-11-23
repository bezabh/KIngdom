-- =========================================================================
-- AXUMITE AI MULTILINGUAL TRANSLATOR PLATFORM - SQL MIGRATIONS REFERENCE
-- Version: 001_translator_platform_schema.sql
-- Synchronized with Firestore schema in firebase-blueprint.json
-- Note: Zero raw payment card numbers (PAN) or CVV values are ever stored.
-- =========================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  email VARCHAR(200) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'Free Member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_source_lang VARCHAR(64) NOT NULL DEFAULT 'English',
  preferred_target_lang VARCHAR(64) NOT NULL DEFAULT 'Tigrinya',
  theme_mode VARCHAR(16) NOT NULL DEFAULT 'cream',
  preferred_voice_id VARCHAR(32) NOT NULL DEFAULT 'Kore',
  speech_rate NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  auto_offline_fallback BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supported_languages (
  code VARCHAR(24) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  native_name VARCHAR(96) NOT NULL,
  script_name VARCHAR(64) NOT NULL,
  coverage_tier VARCHAR(32) NOT NULL CHECK (coverage_tier IN ('full-neural', 'community-validated')),
  supports_tts BOOLEAN NOT NULL DEFAULT TRUE,
  supports_ocr BOOLEAN NOT NULL DEFAULT TRUE,
  supports_offline_pack BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS translation_history (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_language VARCHAR(64) NOT NULL,
  target_language VARCHAR(64) NOT NULL,
  source_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  transliteration TEXT,
  mode VARCHAR(32) NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_a_lang VARCHAR(64) NOT NULL,
  person_b_lang VARCHAR(64) NOT NULL,
  turn_count INTEGER NOT NULL DEFAULT 0,
  transcript_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_code VARCHAR(32) NOT NULL,
  call_type VARCHAR(16) NOT NULL CHECK (call_type IN ('audio', 'video')),
  local_language VARCHAR(64) NOT NULL,
  remote_language VARCHAR(64) NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  transcript_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ocr_documents (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160) NOT NULL,
  capture_source VARCHAR(32) NOT NULL CHECK (capture_source IN ('screen_capture', 'camera_ocr', 'image_upload')),
  detected_language VARCHAR(64) NOT NULL,
  target_language VARCHAR(64) NOT NULL,
  original_text TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_recordings (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  speaker VARCHAR(8) NOT NULL CHECK (speaker IN ('A', 'B')),
  source_language VARCHAR(64) NOT NULL,
  target_language VARCHAR(64) NOT NULL,
  source_transcript TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS downloaded_language_packs (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language_code VARCHAR(24) NOT NULL,
  language_name VARCHAR(64) NOT NULL,
  version VARCHAR(32) NOT NULL,
  size_bytes BIGINT NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(96) NOT NULL,
  tier VARCHAR(32) NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise', 'lifetime')),
  billing_cycle VARCHAR(24) NOT NULL,
  base_price_usd NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS api_usage (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint VARCHAR(128) NOT NULL,
  model_used VARCHAR(64),
  tokens_or_calls INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  microphone_granted BOOLEAN NOT NULL DEFAULT FALSE,
  camera_granted BOOLEAN NOT NULL DEFAULT FALSE,
  screen_capture_consent BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_translation_history_user ON translation_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user ON conversation_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_user ON call_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ocr_documents_user ON ocr_documents(user_id, created_at DESC);

COMMIT;
