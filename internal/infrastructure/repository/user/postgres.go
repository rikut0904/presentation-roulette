package user

import (
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"presentation-raffle/internal/domain/entity"
)

type userModel struct {
	gorm.Model
	UID           string `gorm:"uniqueIndex;size:191"`
	Email         string `gorm:"size:255"`
	DisplayName   string `gorm:"size:255"`
	PhotoURL      string `gorm:"size:1024"`
	Provider      string `gorm:"size:128"`
	EmailVerified bool
	LastLoginAt   int64
}

type PostgresUserRepository struct {
	db *gorm.DB
}

func NewPostgresUserRepository(db *gorm.DB) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) Upsert(ctx context.Context, user entity.User) (entity.User, error) {
	model := userModel{
		UID:           user.UID,
		Email:         user.Email,
		DisplayName:   user.DisplayName,
		PhotoURL:      user.PhotoURL,
		Provider:      user.Provider,
		EmailVerified: user.EmailVerified,
		LastLoginAt:   user.LastLoginAt.Unix(),
	}

	if err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "uid"}},
		DoUpdates: clause.Assignments(map[string]any{
			"email":          model.Email,
			"display_name":   model.DisplayName,
			"photo_url":      model.PhotoURL,
			"provider":       model.Provider,
			"email_verified": model.EmailVerified,
			"last_login_at":  model.LastLoginAt,
			"updated_at":     time.Now(),
		}),
	}).Create(&model).Error; err != nil {
		return entity.User{}, err
	}

	return toEntity(model), nil
}

func (r *PostgresUserRepository) GetByUID(ctx context.Context, uid string) (entity.User, error) {
	var model userModel
	if err := r.db.WithContext(ctx).Where("uid = ?", uid).First(&model).Error; err != nil {
		return entity.User{}, err
	}

	return toEntity(model), nil
}

func (r *PostgresUserRepository) List(ctx context.Context) ([]entity.User, error) {
	var models []userModel
	if err := r.db.WithContext(ctx).Order("updated_at desc").Find(&models).Error; err != nil {
		return nil, err
	}

	users := make([]entity.User, 0, len(models))
	for _, model := range models {
		users = append(users, toEntity(model))
	}
	return users, nil
}

func toEntity(model userModel) entity.User {
	return entity.User{
		ID:            model.ID,
		UID:           model.UID,
		Email:         model.Email,
		DisplayName:   model.DisplayName,
		PhotoURL:      model.PhotoURL,
		Provider:      model.Provider,
		EmailVerified: model.EmailVerified,
		LastLoginAt:   time.Unix(model.LastLoginAt, 0),
		CreatedAt:     model.CreatedAt,
		UpdatedAt:     model.UpdatedAt,
	}
}
