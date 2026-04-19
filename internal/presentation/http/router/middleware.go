package router

import (
	"net/http"

	"github.com/gorilla/sessions"
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"
)

func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		sess, err := session.Get("session", c)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "ログインしてください")
		}

		userUID, ok := sess.Values["uid"].(string)
		if !ok || userUID == "" {
			delete(sess.Values, "uid")
			sess.Options = &sessions.Options{
				Path:     "/",
				HttpOnly: true,
				MaxAge:   -1,
				SameSite: http.SameSiteLaxMode,
			}
			_ = sess.Save(c.Request(), c.Response())
			return echo.NewHTTPError(http.StatusUnauthorized, "ログインしてください")
		}

		c.Set("userUID", userUID)
		return next(c)
	}
}
