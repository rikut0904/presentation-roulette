package router

import (
	"net/http"

	"github.com/gorilla/sessions"
	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"
)

func sessionOptions(maxAge int) *sessions.Options {
	return &sessions.Options{
		Path:     "/",
		HttpOnly: true,
		MaxAge:   maxAge,
		SameSite: http.SameSiteLaxMode,
	}
}

func getSessionUserUID(c echo.Context) (string, error) {
	sess, err := session.Get("session", c)
	if err != nil {
		return "", err
	}

	userUID, ok := sess.Values["uid"].(string)
	if !ok || userUID == "" {
		delete(sess.Values, "uid")
		sess.Options = sessionOptions(-1)
		_ = sess.Save(c.Request(), c.Response())
		return "", echo.NewHTTPError(http.StatusUnauthorized, "ログインしてください")
	}

	return userUID, nil
}

func AuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		userUID, err := getSessionUserUID(c)
		if err != nil {
			return echo.NewHTTPError(http.StatusUnauthorized, "ログインしてください")
		}

		c.Set("userUID", userUID)
		return next(c)
	}
}

func PageAuthMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		userUID, err := getSessionUserUID(c)
		if err != nil {
			return c.Redirect(http.StatusFound, "/login")
		}

		c.Set("userUID", userUID)
		return next(c)
	}
}
