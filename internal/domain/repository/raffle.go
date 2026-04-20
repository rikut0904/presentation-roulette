package repository

import (
	"context"
	"presentation-raffle/internal/domain/entity"
)

type RaffleRepository interface {
	ListByUser(ctx context.Context, userUID string) ([]entity.Raffle, error)
	GetByID(ctx context.Context, id string, userUID string) (entity.Raffle, error)
	Save(ctx context.Context, raffle entity.Raffle) (entity.Raffle, error)
	Delete(ctx context.Context, id string, userUID string) error
}
