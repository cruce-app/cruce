// Servicio de Cruce: webhooks de Supabase, notificaciones y tareas programadas.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joanrojas/cruce/backend/internal/config"
	"github.com/joanrojas/cruce/backend/internal/httpapi"
	"github.com/joanrojas/cruce/backend/internal/notify"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("configuración incompleta", "err", err)
		os.Exit(1)
	}

	// Las páginas de OAuth (conectar Claude) solo reciben la URL y la clave anónima: nunca la service_role.
	server := httpapi.NewServer(cfg.WebhookSecret, notify.LogNotifier{Logger: logger}, logger).
		WithConsent(httpapi.ConsentConfig{SupabaseURL: cfg.SupabaseURL, AnonKey: cfg.SupabaseAnonKey})
	if cfg.SupabaseURL == "" || cfg.SupabaseAnonKey == "" {
		logger.Warn("sin SUPABASE_URL o SUPABASE_ANON_KEY: las páginas de OAuth responden 503")
	}
	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           server.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("escuchando", "port", cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("el servidor se detuvo", "err", err)
			stop()
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(shutdownCtx)
	logger.Info("apagado")
}
