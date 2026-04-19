package handler

import (
	"net/http"
	"strings"

	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"

	"presentation-roulette/internal/domain/entity"
	"presentation-roulette/internal/usecase"
)

type FirebaseClientConfig struct {
	APIKey     string `json:"apiKey"`
	AuthDomain string `json:"authDomain"`
	ProjectID  string `json:"projectId"`
	AppID      string `json:"appId"`
}

type AdminHandler struct {
	usecase           *usecase.AdminUsecase
	clientConfig      FirebaseClientConfig
	available         bool
	unavailableReason string
}

func NewAdminHandler(usecase *usecase.AdminUsecase, clientConfig FirebaseClientConfig) *AdminHandler {
	return &AdminHandler{
		usecase:      usecase,
		clientConfig: clientConfig,
		available:    true,
	}
}

func NewUnavailableAdminHandler(clientConfig FirebaseClientConfig, reason string) *AdminHandler {
	return &AdminHandler{
		clientConfig:      clientConfig,
		available:         false,
		unavailableReason: reason,
	}
}

func (h *AdminHandler) Login(c echo.Context) error {
	type LoginRequest struct {
		IDToken string `json:"idToken"`
	}
	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		return err
	}

	user, err := h.usecase.SyncUser(c.Request().Context(), req.IDToken)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "認証に失敗しました")
	}

	sess, _ := session.Get("session", c)
	sess.Values["user"] = user
	sess.Options = &sessions.Options{
		Path:     "/",
		HttpOnly: true,
		MaxAge:   86400 * 7,
	}
	sess.Save(c.Request(), c.Response())

	return c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) Logout(c echo.Context) error {
	sess, _ := session.Get("session", c)
	sess.Values["user"] = nil
	sess.Options.MaxAge = -1
	sess.Save(c.Request(), c.Response())
	return c.NoContent(http.StatusOK)
}

func (h *AdminHandler) SyncUser(c echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	user, err := h.usecase.SyncUser(c.Request().Context(), bearerToken(c.Request().Header.Get("Authorization")))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}

	sess, _ := session.Get("session", c)
	sess.Values["user"] = user
	sess.Save(c.Request(), c.Response())

	return c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) ListRoulettes(c echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	roulettes, err := h.usecase.ListRoulettes(c.Request().Context(), bearerToken(c.Request().Header.Get("Authorization")))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}
	return c.JSON(http.StatusOK, roulettes)
}

func (h *AdminHandler) SaveRoulette(c echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	var r entity.Roulette
	if err := c.Bind(&r); err != nil {
		return err
	}

	saved, err := h.usecase.SaveRoulette(c.Request().Context(), bearerToken(c.Request().Header.Get("Authorization")), r)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}
	return c.JSON(http.StatusOK, saved)
}

func (h *AdminHandler) DeleteRoulette(ctx echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	id := ctx.Param("id")
	err := h.usecase.DeleteRoulette(ctx.Request().Context(), bearerToken(ctx.Request().Header.Get("Authorization")), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (h *AdminHandler) GetRoulette(ctx echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	id := ctx.Param("id")
	roulette, err := h.usecase.GetRoulette(ctx.Request().Context(), bearerToken(ctx.Request().Header.Get("Authorization")), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Roulette not found or unauthorized")
	}
	return ctx.JSON(http.StatusOK, roulette)
}

func bearerToken(header string) string {
	return strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
}
