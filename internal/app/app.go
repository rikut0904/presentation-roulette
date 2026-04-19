package app

import (
	"fmt"

	"github.com/gorilla/sessions"
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"

	"presentation-roulette/internal/infrastructure/auth"
	"presentation-roulette/internal/infrastructure/config"
	"presentation-roulette/internal/infrastructure/database"
	rouletteinfra "presentation-roulette/internal/infrastructure/repository/roulette"
	userinfra "presentation-roulette/internal/infrastructure/repository/user"
	"presentation-roulette/internal/presentation/http/handler"
	"presentation-roulette/internal/presentation/http/router"
	"presentation-roulette/internal/usecase"
)

func Run() error {
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		return err
	}

	e := echo.New()
	e.Use(session.Middleware(newSessionStore(cfg)))

	adminHandler, adminErr := buildAdminHandler(cfg)
	if adminErr != nil {
		return adminErr
	}

	router.Register(e, adminHandler)

	return e.Start(cfg.ServerAddr)
}

func newSessionStore(cfg config.Config) sessions.Store {
	if cfg.SessionEncryptionSecret != "" {
		return sessions.NewCookieStore(
			[]byte(cfg.SessionSecret),
			[]byte(cfg.SessionEncryptionSecret),
		)
	}

	return sessions.NewCookieStore([]byte(cfg.SessionSecret))
}

func buildAdminHandler(cfg config.Config) (*handler.AdminHandler, error) {
	clientConfig := handler.FirebaseClientConfig{
		APIKey:     cfg.FirebaseAPIKey,
		AuthDomain: cfg.FirebaseAuthDomain,
		ProjectID:  cfg.FirebaseProjectID,
		AppID:      cfg.FirebaseAppID,
	}

	db, err := database.NewPostgresConnection(cfg.DatabaseURL)
	if err != nil {
		return handler.NewUnavailableAdminHandler(clientConfig, fmt.Sprintf("database unavailable: %v", err)), err
	}

	userRepository := userinfra.NewPostgresUserRepository(db)
	rouletteRepository := rouletteinfra.NewPostgresRouletteRepository(db)
	if cfg.AutoMigrate {
		if err := database.Migrate(db); err != nil {
			return handler.NewUnavailableAdminHandler(clientConfig, fmt.Sprintf("migration failed: %v", err)), err
		}
	}

	tokenVerifier, err := auth.NewFirebaseVerifier(cfg)
	if err != nil {
		return handler.NewUnavailableAdminHandler(clientConfig, fmt.Sprintf("firebase unavailable: %v", err)), err
	}

	adminUsecase := usecase.NewAdminUsecase(userRepository, rouletteRepository, tokenVerifier)
	return handler.NewAdminHandler(adminUsecase, clientConfig), nil
}
