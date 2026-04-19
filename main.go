package main

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"presentation-roulette/logic"
)

func main() {
	e := echo.New()
	e.HTTPErrorHandler = customHTTPErrorHandler

	e.Static("/css", "css")
	e.Static("/js", "js")

	e.GET("/", getIndex)
	e.GET("/roulette", func(c echo.Context) error {
		return c.Redirect(http.StatusMovedPermanently, "/")
	})

	e.GET("/api/roulette", func(c echo.Context) error {
		cfg, err := logic.GetRoulette()
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, cfg)
	})

	e.POST("/api/roulette/spin", func(c echo.Context) error {
		result, err := logic.SpinRoulette()
		if err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
		return c.JSON(http.StatusOK, result)
	})

	e.Logger.Fatal(e.Start(":8080"))
}

func customHTTPErrorHandler(err error, c echo.Context) {
	code := http.StatusInternalServerError
	message := http.StatusText(code)

	if he, ok := err.(*echo.HTTPError); ok {
		code = he.Code
		if msg, ok := he.Message.(string); ok {
			message = msg
		}
	}

	if code == http.StatusNotFound {
		_ = c.File("html/404.html")
		return
	}

	_ = c.JSON(code, map[string]any{
		"error": map[string]any{
			"code":    code,
			"message": message,
		},
	})
}

func getIndex(c echo.Context) error {
	return c.File("html/index.html")
}
