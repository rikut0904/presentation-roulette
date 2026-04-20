package entity

import "time"

type RaffleItem struct {
	Label  string `json:"label"`
	Color  string `json:"color"`
	Weight int    `json:"weight"`
}

type Raffle struct {
	ID          string         `json:"id"`
	UserUID     string         `json:"userUid"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Items       []RaffleItem `json:"items"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
}
