package service

import (
	"context"

	"presentation-roulette/internal/domain/entity"
)

type TokenVerifier interface {
	VerifyIDToken(context.Context, string) (entity.AuthenticatedUser, error)
}
