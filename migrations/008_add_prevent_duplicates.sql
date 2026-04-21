-- Migration: Add prevent_duplicates column to raffle_models
-- Version: 008

ALTER TABLE raffle_models ADD COLUMN IF NOT EXISTS prevent_duplicates BOOLEAN DEFAULT FALSE;
