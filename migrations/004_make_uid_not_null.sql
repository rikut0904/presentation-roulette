-- Migration: Make uid NOT NULL in user_models
-- Version: 004

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM user_models WHERE uid IS NULL) THEN
        RAISE EXCEPTION 'migration 004 aborted: user_models.uid contains NULL values';
    END IF;
END $$;

ALTER TABLE user_models ALTER COLUMN uid SET NOT NULL;
