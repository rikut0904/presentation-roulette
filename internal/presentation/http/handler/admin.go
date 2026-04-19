package handler

import (
	"net/http"

	"github.com/gorilla/sessions"
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

func sessionOptions(maxAge int) *sessions.Options {
	return &sessions.Options{
		Path:     "/",
		HttpOnly: true,
		MaxAge:   maxAge,
		SameSite: http.SameSiteLaxMode,
	}
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
	sess.Values["uid"] = user.UID
	sess.Options = sessionOptions(86400 * 7)
	if err := sess.Save(c.Request(), c.Response()); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "セッション保存に失敗しました: "+err.Error())
	}

	return c.JSON(http.StatusOK, user)
}

func (h *AdminHandler) Logout(c echo.Context) error {
	sess, _ := session.Get("session", c)
	delete(sess.Values, "uid")
	sess.Options = sessionOptions(-1)
	if err := sess.Save(c.Request(), c.Response()); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "ログアウトに失敗しました")
	}
	return c.NoContent(http.StatusOK)
}

func (h *AdminHandler) ListRoulettes(c echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	userUID := c.Get("userUID").(string)
	roulettes, err := h.usecase.ListRoulettes(c.Request().Context(), userUID)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}
	return c.JSON(http.StatusOK, roulettes)
}

func (h *AdminHandler) SaveRoulette(c echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	userUID := c.Get("userUID").(string)
	var r entity.Roulette
	if err := c.Bind(&r); err != nil {
		return err
	}
	r.UserUID = userUID

	saved, err := h.usecase.SaveRoulette(c.Request().Context(), r)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}
	return c.JSON(http.StatusOK, saved)
}

func (h *AdminHandler) DeleteRoulette(c echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	userUID := c.Get("userUID").(string)
	id := c.Param("id")
	err := h.usecase.DeleteRoulette(c.Request().Context(), id, userUID)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}

func (h *AdminHandler) GetRoulette(c echo.Context) error {
	if !h.available {
		return echo.NewHTTPError(http.StatusServiceUnavailable, h.unavailableReason)
	}

	userUID := c.Get("userUID").(string)
	id := c.Param("id")
	roulette, err := h.usecase.GetRoulette(c.Request().Context(), userUID, id)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Roulette not found or unauthorized")
	}
	return c.JSON(http.StatusOK, roulette)
}

func (h *AdminHandler) GetMe(c echo.Context) error {
	userUID := c.Get("userUID").(string)
	user, err := h.usecase.GetUserByUID(c.Request().Context(), userUID)
	if err != nil {
		return echo.NewHTTPError(http.StatusUnauthorized, "ユーザー情報の取得に失敗しました")
	}
	return c.JSON(http.StatusOK, user)
}
