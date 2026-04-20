package service

import (
	"context"

	"presentation-raffle/internal/domain/entity"
)

type TokenVerifier interface {
	VerifyIDToken(context.Context, string) (entity.AuthenticatedUser, error)
}
