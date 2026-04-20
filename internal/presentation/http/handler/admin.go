package handler

import (
	"fmt"
	"log"
	"net/http"
	"presentation-raffle/internal/domain/entity"
	"presentation-raffle/internal/usecase"

	"github.com/labstack/echo-contrib/session"
	"github.com/labstack/echo/v4"
)

type FirebaseClientConfig struct {
	APIKey     string `json:"apiKey"`
	AuthDomain string `json:"authDomain"`
	ProjectID  string `json:"projectId"`
	AppID      string `json:"appId"`
}

type AdminHandler struct {
	usecase      *usecase.AdminUsecase
	clientConfig FirebaseClientConfig
	errorMessage string
}

func NewAdminHandler(usecase *usecase.AdminUsecase, clientConfig FirebaseClientConfig) *AdminHandler {
	return &AdminHandler{
		usecase:      usecase,
		clientConfig: clientConfig,
	}
}

func NewUnavailableAdminHandler(clientConfig FirebaseClientConfig, message string) *AdminHandler {
	return &AdminHandler{
		clientConfig: clientConfig,
		errorMessage: message,
	}
}

func (h *AdminHandler) GetFirebaseConfig(c echo.Context) error {
	enabled := h.errorMessage == ""
	return c.JSON(http.StatusOK, map[string]any{
		"enabled": enabled,
		"config":  h.clientConfig,
		"reason":  h.errorMessage,
	})
}

func (h *AdminHandler) Login(c echo.Context) error {
	if h.errorMessage != "" {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.errorMessage)
	}

	var req struct {
		IDToken string `json:"idToken"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}

	user, err := h.usecase.VerifyToken(c.Request().Context(), req.IDToken)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "Invalid token")
	}

	sess, _ := session.Get("session", c)
	sess.Options.MaxAge = 86400 * 7 // 7 days
	sess.Options.HttpOnly = true
	sess.Values["uid"] = user.UID
	log.Printf("Login successful: setting session uid: %s", user.UID)
	if err := sess.Save(c.Request(), c.Response()); err != nil {
		log.Printf("Failed to save session: %v", err)
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to save session")
	}

	return c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) Logout(c echo.Context) error {
	sess, _ := session.Get("session", c)
	sess.Options.MaxAge = -1
	if err := sess.Save(c.Request(), c.Response()); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to clear session")
	}
	return c.NoContent(http.StatusOK)
}

func (h *AdminHandler) GetMe(c echo.Context) error {
	if h.errorMessage != "" {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.errorMessage)
	}

	userUID := c.Get("userUID").(string)
	user, err := h.usecase.GetUser(c.Request().Context(), userUID)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "User not found")
	}
	return c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) ListRaffles(c echo.Context) error {
	if h.errorMessage != "" {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.errorMessage)
	}

	userUID := c.Get("userUID").(string)
	raffles, err := h.usecase.ListRaffles(c.Request().Context(), userUID)
	if err != nil {
		log.Printf("ListRaffles error for uid %s: %v", userUID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, raffles)
}

func (h *AdminHandler) SaveRaffle(c echo.Context) error {
	if h.errorMessage != "" {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.errorMessage)
	}

	userUID := c.Get("userUID").(string)
	var k entity.Raffle
	if err := c.Bind(&k); err != nil {
		fmt.Printf("Bind error: %v\n", err)
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request")
	}
	k.UserUID = userUID
	saved, err := h.usecase.SaveRaffle(c.Request().Context(), k)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, saved)
}

func (h *AdminHandler) DeleteRaffle(c echo.Context) error {
	if h.errorMessage != "" {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.errorMessage)
	}

	userUID := c.Get("userUID").(string)
	id := c.Param("id")
	err := h.usecase.DeleteRaffle(c.Request().Context(), id, userUID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusOK)
}

func (h *AdminHandler) GetRaffle(c echo.Context) error {
	if h.errorMessage != "" {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.errorMessage)
	}

	userUID := c.Get("userUID").(string)
	id := c.Param("id")
	raffle, err := h.usecase.GetRaffle(c.Request().Context(), userUID, id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Raffle not found")
	}
	return c.JSON(http.StatusOK, raffle)
}
