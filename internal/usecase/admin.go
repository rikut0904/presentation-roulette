package usecase

import (
	"context"
	"fmt"
	"time"
	"presentation-roulette/internal/domain/entity"
	"presentation-roulette/internal/domain/repository"
	"presentation-roulette/internal/domain/service"
)

type AdminUsecase struct {
	userRepo     repository.UserRepository
	rouletteRepo repository.RouletteRepository
	verifier     service.TokenVerifier
}

func NewAdminUsecase(userRepo repository.UserRepository, rouletteRepo repository.RouletteRepository, verifier service.TokenVerifier) *AdminUsecase {
	return &AdminUsecase{
		userRepo:     userRepo,
		rouletteRepo: rouletteRepo,
		verifier:     verifier,
	}
}

func (u *AdminUsecase) SyncUser(ctx context.Context, idToken string) (entity.User, error) {
	claims, err := u.verifier.VerifyIDToken(ctx, idToken)
	if err != nil {
		return entity.User{}, fmt.Errorf("invalid token: %w", err)
	}

	user := entity.User{
		UID:           claims.UID,
		Email:         claims.Email,
		DisplayName:   claims.DisplayName,
		PhotoURL:      claims.PhotoURL,
		Provider:      claims.Provider,
		EmailVerified: claims.EmailVerified,
		LastLoginAt:   time.Now(),
	}

	return u.userRepo.Upsert(ctx, user)
}

func (u *AdminUsecase) ListRoulettes(ctx context.Context, idToken string) ([]entity.Roulette, error) {
	claims, err := u.verifier.VerifyIDToken(ctx, idToken)
	if err != nil {
		return nil, fmt.Errorf("unauthorized: %w", err)
	}

	return u.rouletteRepo.ListByUser(ctx, claims.UID)
}

func (u *AdminUsecase) SaveRoulette(ctx context.Context, idToken string, roulette entity.Roulette) (entity.Roulette, error) {
	claims, err := u.verifier.VerifyIDToken(ctx, idToken)
	if err != nil {
		return entity.Roulette{}, fmt.Errorf("unauthorized: %w", err)
	}

	roulette.UserUID = claims.UID
	return u.rouletteRepo.Save(ctx, roulette)
}

func (u *AdminUsecase) DeleteRoulette(ctx context.Context, idToken string, id string) error {
	claims, err := u.verifier.VerifyIDToken(ctx, idToken)
	if err != nil {
		return fmt.Errorf("unauthorized: %w", err)
	}

	return u.rouletteRepo.Delete(ctx, id, claims.UID)
}

func (u *AdminUsecase) GetRoulette(ctx context.Context, idToken string, id string) (entity.Roulette, error) {
	claims, err := u.verifier.VerifyIDToken(ctx, idToken)
	if err != nil {
		return entity.Roulette{}, fmt.Errorf("unauthorized: %w", err)
	}
	return u.rouletteRepo.GetByID(ctx, id, claims.UID)
}
