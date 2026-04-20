-- Migration: Drop redundant explicit unique index on user_models.uid
-- Version: 006

-- To drop the index safely, we must temporarily drop the foreign key that may depend on it.
ALTER TABLE roulette_models DROP CONSTRAINT IF EXISTS roulette_models_user_uid_fkey;

-- Now we can drop the explicit index.
DROP INDEX IF EXISTS idx_user_models_uid;

-- Re-add the foreign key. It will now automatically use the implicit index 
-- created by the UNIQUE constraint on user_models(uid).
ALTER TABLE roulette_models ADD CONSTRAINT roulette_models_user_uid_fkey 
    FOREIGN KEY (user_uid) REFERENCES user_models(uid);
