-- Migration: Change roulette ID to UUID string
-- Version: 003

-- Drop foreign key first if necessary (optional depending on DB state, but safer)
ALTER TABLE roulette_models DROP CONSTRAINT IF EXISTS roulette_models_user_uid_fkey;

-- Change ID column type. We'll use VARCHAR(36) to store UUIDs.
-- Note: PostgreSQL requires an explicit USING clause for this cast.
ALTER TABLE roulette_models ALTER COLUMN id TYPE VARCHAR(36) USING id::VARCHAR(36);

-- Re-add foreign key
ALTER TABLE roulette_models ADD CONSTRAINT roulette_models_user_uid_fkey 
    FOREIGN KEY (user_uid) REFERENCES user_models(uid);
