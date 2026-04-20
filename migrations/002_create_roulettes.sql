-- Migration: Create roulettes table
-- Version: 002

CREATE TABLE IF NOT EXISTS roulette_models (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    user_uid VARCHAR(191) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    items JSONB NOT NULL,
    
    FOREIGN KEY (user_uid) REFERENCES user_models(uid)
);

CREATE INDEX IF NOT EXISTS idx_roulette_models_user_uid ON roulette_models (user_uid);
CREATE INDEX IF NOT EXISTS idx_roulette_models_deleted_at ON roulette_models (deleted_at);
