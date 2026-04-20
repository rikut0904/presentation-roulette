-- Migration: Rename roulettes table to raffles
-- Version: 007

ALTER TABLE roulette_models RENAME TO raffle_models;
ALTER INDEX idx_roulette_models_user_uid RENAME TO idx_raffle_models_user_uid;
ALTER INDEX idx_roulette_models_deleted_at RENAME TO idx_raffle_models_deleted_at;
