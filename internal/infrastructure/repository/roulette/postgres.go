package roulette

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"presentation-roulette/internal/domain/entity"
)

type rouletteModel struct {
	ID          string `gorm:"primaryKey"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	UserUID     string         `gorm:"index"`
	Title       string
	Description string
	Items       string `gorm:"type:jsonb"`
}

func (rouletteModel) TableName() string {
	return "roulette_models"
}

type PostgresRouletteRepository struct {
	db *gorm.DB
}

func NewPostgresRouletteRepository(db *gorm.DB) *PostgresRouletteRepository {
	return &PostgresRouletteRepository{db: db}
}

func (r *PostgresRouletteRepository) ListByUser(ctx context.Context, userUID string) ([]entity.Roulette, error) {
	var models []rouletteModel
	if err := r.db.WithContext(ctx).Where("user_uid = ?", userUID).Order("updated_at DESC").Find(&models).Error; err != nil {
		return nil, err
	}

	result := make([]entity.Roulette, len(models))
	for i, m := range models {
		entity, err := m.toEntity()
		if err != nil {
			return nil, err
		}
		result[i] = entity
	}
	return result, nil
}

func (r *PostgresRouletteRepository) GetByID(ctx context.Context, id string, userUID string) (entity.Roulette, error) {
	var m rouletteModel
	if err := r.db.WithContext(ctx).First(&m, "id = ? AND user_uid = ?", id, userUID).Error; err != nil {
		return entity.Roulette{}, err
	}
	return m.toEntity()
}

func (r *PostgresRouletteRepository) Save(ctx context.Context, roulette entity.Roulette) (entity.Roulette, error) {
	itemsJSON, err := json.Marshal(roulette.Items)
	if err != nil {
		return entity.Roulette{}, fmt.Errorf("failed to marshal items: %w", err)
	}

	if roulette.ID == "" || roulette.ID == "0" {
		roulette.ID = uuid.New().String()
	} else {
		// Verify ownership before update
		var count int64
		if err := r.db.WithContext(ctx).Model(&rouletteModel{}).Where("id = ?", roulette.ID).Count(&count).Error; err != nil {
			return entity.Roulette{}, err
		}
		if count > 0 {
			// Record exists, check ownership
			var existing rouletteModel
			if err := r.db.WithContext(ctx).First(&existing, "id = ?", roulette.ID).Error; err != nil {
				return entity.Roulette{}, err
			}
			if existing.UserUID != roulette.UserUID {
				return entity.Roulette{}, fmt.Errorf("unauthorized: this roulette does not belong to you")
			}
		}
	}

	model := rouletteModel{
		ID:          roulette.ID,
		UserUID:     roulette.UserUID,
		Title:       roulette.Title,
		Description: roulette.Description,
		Items:       string(itemsJSON),
	}

	if err := r.db.WithContext(ctx).Save(&model).Error; err != nil {
		return entity.Roulette{}, err
	}

	return model.toEntity()
}

func (r *PostgresRouletteRepository) Delete(ctx context.Context, id string, userUID string) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_uid = ?", id, userUID).Delete(&rouletteModel{}).Error
}

func (m rouletteModel) toEntity() (entity.Roulette, error) {
	var items []entity.RouletteItem
	if err := json.Unmarshal([]byte(m.Items), &items); err != nil {
		return entity.Roulette{}, fmt.Errorf("failed to unmarshal items: %w", err)
	}

	return entity.Roulette{
		ID:          m.ID,
		UserUID:     m.UserUID,
		Title:       m.Title,
		Description: m.Description,
		Items:       items,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}, nil
}
