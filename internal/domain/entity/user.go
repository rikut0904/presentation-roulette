package entity

import "time"

type AuthenticatedUser struct {
	UID           string
	Email         string
	DisplayName   string
	PhotoURL      string
	Provider      string
	EmailVerified bool
}

type User struct {
	ID            uint      `json:"id"`
	UID           string    `json:"uid"`
	Email         string    `json:"email"`
	DisplayName   string    `json:"displayName"`
	PhotoURL      string    `json:"photoUrl"`
	Provider      string    `json:"provider"`
	EmailVerified bool      `json:"emailVerified"`
	LastLoginAt   time.Time `json:"lastLoginAt"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}
