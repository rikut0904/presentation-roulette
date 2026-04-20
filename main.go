package main

import (
	"log"

	"presentation-raffle/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
