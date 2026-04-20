-- Migration: Create users table
-- Version: 001

CREATE TABLE IF NOT EXISTS user_models (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    uid VARCHAR(191) UNIQUE,
    email VARCHAR(255),
    display_name VARCHAR(255),
    photo_url VARCHAR(1024),
    provider VARCHAR(128),
    email_verified BOOLEAN,
    last_login_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_user_models_deleted_at ON user_models (deleted_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_models_uid ON user_models (uid);
