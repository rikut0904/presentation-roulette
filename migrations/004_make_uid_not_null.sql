-- Migration: Make uid NOT NULL in user_models
-- Version: 004

ALTER TABLE user_models ALTER COLUMN uid SET NOT NULL;
