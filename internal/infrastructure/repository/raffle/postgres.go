package raffle

import (
	"context"
	"encoding/json"
	"presentation-raffle/internal/domain/entity"
	"presentation-raffle/internal/domain/repository"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PostgresRaffleRepository struct {
	db *gorm.DB
}

func NewPostgresRaffleRepository(db *gorm.DB) repository.RaffleRepository {
	return &PostgresRaffleRepository{db: db}
}

type raffleModel struct {
        ID                string `gorm:"primaryKey;size:36"`
        CreatedAt         time.Time
        UpdatedAt         time.Time
        DeletedAt         gorm.DeletedAt `gorm:"index"`
        UserUID           string         `gorm:"not null;index"`
        Title             string         `gorm:"not null"`
        Description       string
        PreventDuplicates bool   `gorm:"default:false"`
        Items             []byte `gorm:"type:jsonb;not null"`
}

func (raffleModel) TableName() string {
        return "raffle_models"
}

func (r *PostgresRaffleRepository) ListByUser(ctx context.Context, userUID string) ([]entity.Raffle, error) {
        var models []raffleModel
        if err := r.db.WithContext(ctx).Where("user_uid = ?", userUID).Find(&models).Error; err != nil {
                return nil, err
        }

        raffles := make([]entity.Raffle, 0, len(models))
        for _, m := range models {
                raffle, err := toEntity(m)
                if err != nil {
                        return nil, err
                }
                raffles = append(raffles, raffle)
        }
        return raffles, nil
}

func (r *PostgresRaffleRepository) GetByID(ctx context.Context, id string, userUID string) (entity.Raffle, error) {
        var model raffleModel
        if err := r.db.WithContext(ctx).Where("id = ? AND user_uid = ?", id, userUID).First(&model).Error; err != nil {
                return entity.Raffle{}, err
        }

        return toEntity(model)
}

func (r *PostgresRaffleRepository) Save(ctx context.Context, raffle entity.Raffle) (entity.Raffle, error) {
        itemsJSON, err := json.Marshal(raffle.Items)
        if err != nil {
                return entity.Raffle{}, err
        }

        model := raffleModel{
                UserUID:           raffle.UserUID,
                Title:             raffle.Title,
                Description:       raffle.Description,
                PreventDuplicates: raffle.PreventDuplicates,
                Items:             itemsJSON,
        }

        if raffle.ID != "" && raffle.ID != "0" {
                var existing raffleModel
                if err := r.db.WithContext(ctx).Where("id = ? AND user_uid = ?", raffle.ID, raffle.UserUID).First(&existing).Error; err == nil {
                        model.ID = existing.ID
                        model.CreatedAt = existing.CreatedAt
                }
        }

        // 新規作成の場合は UUID を生成
        if model.ID == "" {
                model.ID = uuid.New().String()
        }

        if err := r.db.WithContext(ctx).Save(&model).Error; err != nil {
                return entity.Raffle{}, err
        }

        return toEntity(model)
}

func (r *PostgresRaffleRepository) Delete(ctx context.Context, id string, userUID string) error {
        return r.db.WithContext(ctx).Where("id = ? AND user_uid = ?", id, userUID).Delete(&raffleModel{}).Error
}

func toEntity(m raffleModel) (entity.Raffle, error) {
        var items []entity.RaffleItem
        if err := json.Unmarshal(m.Items, &items); err != nil {
                return entity.Raffle{}, err
        }

        return entity.Raffle{
                ID:                m.ID,
                UserUID:           m.UserUID,
                Title:             m.Title,
                Description:       m.Description,
                PreventDuplicates: m.PreventDuplicates,
                Items:             items,
                CreatedAt:         m.CreatedAt,
                UpdatedAt:         m.UpdatedAt,
        }, nil
}
