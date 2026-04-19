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

func (u *AdminUsecase) ListRoulettes(ctx context.Context, userUID string) ([]entity.Roulette, error) {
	return u.rouletteRepo.ListByUser(ctx, userUID)
}

func (u *AdminUsecase) SaveRoulette(ctx context.Context, roulette entity.Roulette) (entity.Roulette, error) {
	return u.rouletteRepo.Save(ctx, roulette)
}

func (u *AdminUsecase) DeleteRoulette(ctx context.Context, id string, userUID string) error {
	return u.rouletteRepo.Delete(ctx, id, userUID)
}

func (u *AdminUsecase) GetRoulette(ctx context.Context, userUID string, id string) (entity.Roulette, error) {
	return u.rouletteRepo.GetByID(ctx, id, userUID)
}
