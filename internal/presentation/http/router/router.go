package router

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"presentation-roulette/internal/presentation/http/handler"
)

func Register(e *echo.Echo, adminHandler *handler.AdminHandler) {
	e.HTTPErrorHandler = customHTTPErrorHandler

	e.Static("/css", "css")
	e.Static("/js", "js")

	e.GET("/", func(c echo.Context) error {
		return c.File("html/index.html")
	})
	e.GET("/dashboard", func(c echo.Context) error {
		return c.File("html/dashboard.html")
	})
	e.GET("/roulette", func(c echo.Context) error {
		return c.File("html/roulette.html")
	})
	e.GET("/login", func(c echo.Context) error {
		return c.File("html/login.html")
	})
	e.GET("/signin", func(c echo.Context) error {
		return c.File("html/signin.html")
	})

	e.GET("/api/config/firebase", adminHandler.GetFirebaseConfig)
	e.POST("/api/dashboard/session", adminHandler.SyncUser)
	e.GET("/api/dashboard/roulettes", adminHandler.ListRoulettes)
	e.GET("/api/dashboard/roulettes/:id", adminHandler.GetRoulette)
	e.POST("/api/dashboard/roulettes", adminHandler.SaveRoulette)
	e.DELETE("/api/dashboard/roulettes/:id", adminHandler.DeleteRoulette)
}

func customHTTPErrorHandler(err error, c echo.Context) {
	code := http.StatusInternalServerError
	message := http.StatusText(code)

	if httpError, ok := err.(*echo.HTTPError); ok {
		code = httpError.Code
		if msg, ok := httpError.Message.(string); ok {
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
