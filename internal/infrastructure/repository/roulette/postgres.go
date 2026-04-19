package roulette

import (
	"context"
	"encoding/json"
	"fmt"

	"gorm.io/gorm"
	"presentation-roulette/internal/domain/entity"
)

type rouletteModel struct {
	gorm.Model
	UserUID     string `gorm:"index"`
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
		result[i] = m.toEntity()
	}
	return result, nil
}

func (r *PostgresRouletteRepository) GetByID(ctx context.Context, id uint) (entity.Roulette, error) {
	var m rouletteModel
	if err := r.db.WithContext(ctx).First(&m, id).Error; err != nil {
		return entity.Roulette{}, err
	}
	return m.toEntity(), nil
}

func (r *PostgresRouletteRepository) Save(ctx context.Context, roulette entity.Roulette) (entity.Roulette, error) {
	itemsJSON, err := json.Marshal(roulette.Items)
	if err != nil {
		return entity.Roulette{}, fmt.Errorf("failed to marshal items: %w", err)
	}

	model := rouletteModel{
		UserUID:     roulette.UserUID,
		Title:       roulette.Title,
		Description: roulette.Description,
		Items:       string(itemsJSON),
	}
	model.ID = roulette.ID

	if err := r.db.WithContext(ctx).Save(&model).Error; err != nil {
		return entity.Roulette{}, err
	}

	return model.toEntity(), nil
}

func (r *PostgresRouletteRepository) Delete(ctx context.Context, id uint, userUID string) error {
	return r.db.WithContext(ctx).Where("id = ? AND user_uid = ?", id, userUID).Delete(&rouletteModel{}).Error
}

func (m rouletteModel) toEntity() entity.Roulette {
	var items []entity.RouletteItem
	_ = json.Unmarshal([]byte(m.Items), &items)

	return entity.Roulette{
		ID:          m.ID,
		UserUID:     m.UserUID,
		Title:       m.Title,
		Description: m.Description,
		Items:       items,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}
