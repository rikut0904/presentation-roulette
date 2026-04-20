package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	firebase "firebase.google.com/go/v4"
	firebaseauth "firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"

	"presentation-raffle/internal/domain/entity"
	"presentation-raffle/internal/infrastructure/config"
)

type FirebaseVerifier struct {
	client *firebaseauth.Client
}

func NewFirebaseVerifier(cfg config.Config) (*FirebaseVerifier, error) {
	if cfg.FirebaseProjectID == "" {
		return nil, fmt.Errorf("FIREBASE_PROJECT_ID is required")
	}

	appConfig := &firebase.Config{ProjectID: cfg.FirebaseProjectID}

	var opts []option.ClientOption
	switch {
	case cfg.FirebaseServiceAccountKey != "":
		opts = append(opts, option.WithCredentialsJSON([]byte(cfg.FirebaseServiceAccountKey)))
	case cfg.FirebaseServiceAccountPath != "":
		contents, err := os.ReadFile(cfg.FirebaseServiceAccountPath)
		if err != nil {
			return nil, fmt.Errorf("read firebase service account: %w", err)
		}
		opts = append(opts, option.WithCredentialsJSON(contents))
	default:
		return nil, fmt.Errorf("firebase service account credentials are required")
	}

	app, err := firebase.NewApp(context.Background(), appConfig, opts...)
	if err != nil {
		return nil, fmt.Errorf("initialize firebase app: %w", err)
	}

	client, err := app.Auth(context.Background())
	if err != nil {
		return nil, fmt.Errorf("initialize firebase auth client: %w", err)
	}

	return &FirebaseVerifier{client: client}, nil
}

func (v *FirebaseVerifier) VerifyIDToken(ctx context.Context, idToken string) (entity.AuthenticatedUser, error) {
	token, err := v.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		return entity.AuthenticatedUser{}, err
	}

	provider := ""
	if firebaseInfo, ok := token.Claims["firebase"].(map[string]any); ok {
		if signInProvider, ok := firebaseInfo["sign_in_provider"].(string); ok {
			provider = signInProvider
		}
	}

	return entity.AuthenticatedUser{
		UID:           token.UID,
		Email:         getStringClaim(token.Claims, "email"),
		DisplayName:   getStringClaim(token.Claims, "name"),
		PhotoURL:      getStringClaim(token.Claims, "picture"),
		Provider:      provider,
		EmailVerified: getBoolClaim(token.Claims, "email_verified"),
	}, nil
}

func getStringClaim(claims map[string]any, key string) string {
	if value, ok := claims[key].(string); ok {
		return value
	}
	return ""
}

func getBoolClaim(claims map[string]any, key string) bool {
	if value, ok := claims[key].(bool); ok {
		return value
	}

	raw, ok := claims[key]
	if !ok {
		return false
	}

	bytes, err := json.Marshal(raw)
	if err != nil {
		return false
	}

	var result bool
	if err := json.Unmarshal(bytes, &result); err != nil {
		return false
	}
	return result
}
