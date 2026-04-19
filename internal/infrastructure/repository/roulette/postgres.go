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
		rouletteEntity, err := m.toEntity()
		if err != nil {
			return nil, err
		}
		result[i] = rouletteEntity
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
		// New record
		model := rouletteModel{
			ID:          uuid.New().String(),
			UserUID:     roulette.UserUID,
			Title:       roulette.Title,
			Description: roulette.Description,
			Items:       string(itemsJSON),
		}
		if err := r.db.WithContext(ctx).Create(&model).Error; err != nil {
			return entity.Roulette{}, err
		}
		return model.toEntity()
	}

	// Update existing record with ownership check in the WHERE clause
	model := rouletteModel{
		ID:          roulette.ID,
		UserUID:     roulette.UserUID,
		Title:       roulette.Title,
		Description: roulette.Description,
		Items:       string(itemsJSON),
	}

	result := r.db.WithContext(ctx).
		Model(&rouletteModel{}).
		Where("id = ? AND user_uid = ?", roulette.ID, roulette.UserUID).
		Updates(map[string]interface{}{
			"title":       model.Title,
			"description": model.Description,
			"items":       model.Items,
		})

	if result.Error != nil {
		return entity.Roulette{}, result.Error
	}

	if result.RowsAffected == 0 {
		return entity.Roulette{}, fmt.Errorf("unauthorized or roulette not found")
	}

	// Fetch the updated record to get the latest timestamps
	if err := r.db.WithContext(ctx).First(&model, "id = ?", model.ID).Error; err != nil {
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
