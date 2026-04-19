package entity

import "time"

type RouletteItem struct {
	Label  string `json:"label"`
	Color  string `json:"color"`
	Weight int    `json:"weight"`
}

type Roulette struct {
	ID          uint           `json:"id"`
	UserUID     string         `json:"userUid"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Items       []RouletteItem `json:"items"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}
