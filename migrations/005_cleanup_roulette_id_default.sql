-- Migration: Remove default numeric sequence from roulette_models.id
-- Version: 005

-- Remove the numeric default value since IDs are now UUID strings
ALTER TABLE roulette_models ALTER COLUMN id DROP DEFAULT;

-- Drop the unused numeric sequence
DROP SEQUENCE IF EXISTS roulette_models_id_seq;
