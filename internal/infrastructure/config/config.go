package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerAddr                 string
	DatabaseURL                string
	FirebaseProjectID          string
	FirebaseAPIKey             string
	FirebaseAuthDomain         string
	FirebaseAppID              string
	FirebaseServiceAccountKey  string
	FirebaseServiceAccountPath string
	AutoMigrate                bool
	SessionSecret              string
	SessionEncryptionSecret    string
}

func Load() Config {
	_ = godotenv.Load()

	return Config{
		ServerAddr:                 normalizeAddr(getEnv("PORT", "8080")),
		DatabaseURL:                os.Getenv("DATABASE_URL"),
		FirebaseProjectID:          os.Getenv("FIREBASE_PROJECT_ID"),
		FirebaseAPIKey:             os.Getenv("FIREBASE_API_KEY"),
		FirebaseAuthDomain:         os.Getenv("FIREBASE_AUTH_DOMAIN"),
		FirebaseAppID:              os.Getenv("FIREBASE_APP_ID"),
		FirebaseServiceAccountKey:  os.Getenv("FIREBASE_SERVICE_ACCOUNT_KEY"),
		FirebaseServiceAccountPath: os.Getenv("FIREBASE_SERVICE_ACCOUNT_PATH"),
		AutoMigrate:                os.Getenv("AUTO_MIGRATE") == "true",
		SessionSecret:              os.Getenv("SESSION_SECRET"),
		SessionEncryptionSecret:    os.Getenv("SESSION_ENCRYPTION_SECRET"),
	}
}

func (c Config) Validate() error {
	if len(c.SessionSecret) < 32 {
		return fmt.Errorf("SESSION_SECRET must be at least 32 bytes")
	}

	if c.SessionEncryptionSecret != "" && len(c.SessionEncryptionSecret) < 32 {
		return fmt.Errorf("SESSION_ENCRYPTION_SECRET must be at least 32 bytes when set")
	}

	return nil
}

func getEnv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func normalizeAddr(port string) string {
	if port == "" {
		return ":8080"
	}
	if port[0] == ':' {
		return port
	}
	return ":" + port
}
