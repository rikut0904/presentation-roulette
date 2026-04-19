package repository

import (
	"context"

	"presentation-roulette/internal/domain/entity"
)

type UserRepository interface {
	Upsert(context.Context, entity.User) (entity.User, error)
	List(context.Context) ([]entity.User, error)
}
