package handler

import (
	"net/http"
	"strings"

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

func (h *AdminHandler) GetFirebaseConfig(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]any{
		"enabled": h.available,
		"reason":  h.unavailableReason,
		"config":  h.clientConfig,
	})
}

func (h *AdminHandler) SyncUser(c echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	user, err := h.usecase.SyncUser(c.Request().Context(), bearerToken(c.Request().Header.Get("Authorization")))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}

	return c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) ListRoulettes(c echo.Context) error {
	roulettes, err := h.usecase.ListRoulettes(c.Request().Context(), bearerToken(c.Request().Header.Get("Authorization")))
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}
	return c.JSON(http.StatusOK, roulettes)
}

func (h *AdminHandler) SaveRoulette(c echo.Context) error {
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
	id := ctx.Param("id")
	err := h.usecase.DeleteRoulette(ctx.Request().Context(), bearerToken(ctx.Request().Header.Get("Authorization")), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (h *AdminHandler) GetRoulette(ctx echo.Context) error {
	id := ctx.Param("id")
	roulette, err := h.usecase.GetRoulette(ctx.Request().Context(), id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Roulette not found")
	}
	return ctx.JSON(http.StatusOK, roulette)
}

func bearerToken(header string) string {
	return strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
}
