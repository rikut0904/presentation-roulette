package router

import (
	"net/http"

	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"
)

func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		sess, _ := session.Get("session", c)
		userUID, ok := sess.Values["uid"].(string)
		if !ok || userUID == "" {
			return echo.NewHTTPError(http.StatusUnauthorized, "ログインしてください")
		}
		c.Set("userUID", userUID)
		return next(c)
	}
}
