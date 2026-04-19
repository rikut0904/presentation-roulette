package router

import (
	"net/http"

	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"
)

func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		sess, _ := session.Get("session", c)
		user, ok := sess.Values["user"]
		if !ok || user == nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "ログインしてください")
		}
		c.Set("user", user)
		return next(c)
	}
}
