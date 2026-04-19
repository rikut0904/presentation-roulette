package main

import (
	"log"

	"presentation-roulette/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
