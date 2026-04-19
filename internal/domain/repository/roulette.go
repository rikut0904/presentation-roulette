package repository

import (
	"context"
	"presentation-roulette/internal/domain/entity"
)

type RouletteRepository interface {
	ListByUser(ctx context.Context, userUID string) ([]entity.Roulette, error)
	GetByID(ctx context.Context, id string) (entity.Roulette, error)
	Save(ctx context.Context, roulette entity.Roulette) (entity.Roulette, error)
	Delete(ctx context.Context, id string, userUID string) error
}
