package database

import (
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"

	"presentation-roulette/migrations"
)

type SchemaMigration struct {
	Version   string    `gorm:"primaryKey"`
	AppliedAt time.Time `gorm:"autoCreateTime"`
}

func Migrate(db *gorm.DB) error {
	// Create migration tracking table if not exists
	if err := db.AutoMigrate(&SchemaMigration{}); err != nil {
		return fmt.Errorf("failed to create migration table: %w", err)
	}

	// Read migration files from embedded FS
	files, err := fs.ReadDir(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var migrationFiles []string
	for _, f := range files {
		if !f.IsDir() && strings.HasSuffix(f.Name(), ".sql") {
			migrationFiles = append(migrationFiles, f.Name())
		}
	}
	sort.Strings(migrationFiles)

	// Apply migrations
	for _, filename := range migrationFiles {
		version := filename // Use filename as version identifier

		var count int64
		if err := db.Model(&SchemaMigration{}).Where("version = ?", version).Count(&count).Error; err != nil {
			return fmt.Errorf("failed to check migration status for %s: %w", filename, err)
		}
		if count > 0 {
			continue // Already applied
		}

		log.Printf("Applying migration: %s", filename)
		content, err := fs.ReadFile(migrations.FS, filename)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", filename, err)
		}

		err = db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(string(content)).Error; err != nil {
				return err
			}
			if err := tx.Create(&SchemaMigration{Version: version}).Error; err != nil {
				return err
			}
			return nil
		})

		if err != nil {
			return fmt.Errorf("failed to apply migration %s: %w", filename, err)
		}
		log.Printf("Successfully applied migration: %s", filename)
	}

	return nil
}
