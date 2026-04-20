package database

import (
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"

	"presentation-raffle/migrations"
)

type SchemaMigration struct {
	Version   string    `gorm:"primaryKey"`
	AppliedAt time.Time `gorm:"autoCreateTime"`
}

const migrationAdvisoryLockKey int64 = 2025041901

func Migrate(db *gorm.DB) error {
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

	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("SELECT pg_advisory_xact_lock(?)", migrationAdvisoryLockKey).Error; err != nil {
			return fmt.Errorf("failed to acquire migration advisory lock: %w", err)
		}

		// Create migration tracking table if not exists.
		if err := tx.AutoMigrate(&SchemaMigration{}); err != nil {
			return fmt.Errorf("failed to create migration table: %w", err)
		}

		// Apply migrations while holding the advisory lock.
		for _, filename := range migrationFiles {
			version := filename

			var count int64
			if err := tx.Model(&SchemaMigration{}).Where("version = ?", version).Count(&count).Error; err != nil {
				return fmt.Errorf("failed to check migration status for %s: %w", filename, err)
			}
			if count > 0 {
				continue
			}

			log.Printf("Applying migration: %s", filename)
			content, err := fs.ReadFile(migrations.FS, filename)
			if err != nil {
				return fmt.Errorf("failed to read migration file %s: %w", filename, err)
			}

			if err := tx.Exec(string(content)).Error; err != nil {
				return fmt.Errorf("failed to execute migration %s: %w", filename, err)
			}
			if err := tx.Create(&SchemaMigration{Version: version}).Error; err != nil {
				return fmt.Errorf("failed to record migration %s: %w", filename, err)
			}
			log.Printf("Successfully applied migration: %s", filename)
		}

		return nil
	})
	if err != nil {
		return err
	}

	return nil
}
