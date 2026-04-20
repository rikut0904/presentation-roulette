package repository

import (
	"context"

	"presentation-raffle/internal/domain/entity"
)

type UserRepository interface {
	Upsert(context.Context, entity.User) (entity.User, error)
	GetByUID(context.Context, string) (entity.User, error)
	List(context.Context) ([]entity.User, error)
}
