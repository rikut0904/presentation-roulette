-- Migration: Drop redundant explicit unique index on user_models.uid
-- Version: 006

DROP INDEX IF EXISTS idx_user_models_uid;
