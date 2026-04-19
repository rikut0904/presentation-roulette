package config

import (
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
	}
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
