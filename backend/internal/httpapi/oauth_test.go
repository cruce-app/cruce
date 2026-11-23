package httpapi

import (
	"encoding/base64"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/joanrojas/cruce/backend/internal/config"
)

const (
	testSupabaseURL = "http://127.0.0.1:54321"
	testAnonKey     = "sb_publishable_clave-anonima-de-prueba"
	// Nunca debe aparecer en lo que recibe el navegador.
	testServiceRole = "clave-service-role-que-nunca-sale"
)

func newConsentServer(t *testing.T, consent ConsentConfig) http.Handler {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := NewServer("secreto", &recorder{}, logger).WithConsent(consent)
	return s.Routes()
}

func get(t *testing.T, h http.Handler, path string) *httptest.ResponseRecorder {
	t.Helper()
	res := httptest.NewRecorder()
	h.ServeHTTP(res, httptest.NewRequest(http.MethodGet, path, nil))
	return res
}

// Las dos páginas de OAuth llevan los encabezados de design D4 y la configuración pública del ambiente.
func TestOAuthPagesServeHTMLWithSecurityHeaders(t *testing.T) {
	h := newConsentServer(t, ConsentConfig{SupabaseURL: testSupabaseURL, AnonKey: testAnonKey})
	for _, path := range []string{"/oauth/consent?authorization_id=abc", "/oauth/conexiones"} {
		res := get(t, h, path)
		if res.Code != http.StatusOK {
			t.Fatalf("%s: esperaba 200, llegó %d", path, res.Code)
		}
		if ct := res.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/html") {
			t.Errorf("%s: Content-Type %q", path, ct)
		}
		csp := res.Header().Get("Content-Security-Policy")
		for _, want := range []string{
			"default-src 'none'",
			"script-src 'self' https://cdn.jsdelivr.net",
			"connect-src " + testSupabaseURL + ";",
			"frame-ancestors 'none'",
		} {
			if !strings.Contains(csp, want) {
				t.Errorf("%s: el CSP %q no tiene %q", path, csp, want)
			}
		}
		if strings.Contains(csp, "unsafe-inline") || strings.Contains(csp, "unsafe-eval") {
			t.Errorf("%s: el CSP no debe permitir código en línea: %q", path, csp)
		}
		checkHeader(t, res, path, "Referrer-Policy", "no-referrer")
		checkHeader(t, res, path, "Cache-Control", "no-store")
		checkHeader(t, res, path, "X-Content-Type-Options", "nosniff")
		body := res.Body.String()
		for _, want := range []string{testSupabaseURL, testAnonKey} {
			if !strings.Contains(body, want) {
				t.Errorf("%s: la página no trae %q", path, want)
			}
		}
	}
}

func checkHeader(t *testing.T, res *httptest.ResponseRecorder, path, name, want string) {
	t.Helper()
	if got := res.Header().Get(name); got != want {
		t.Errorf("%s: %s = %q, esperaba %q", path, name, got, want)
	}
}

// supabase-js llega de jsDelivr con la versión fija y con SRI.
func TestOAuthPagesLoadSupabaseJSWithSRI(t *testing.T) {
	h := newConsentServer(t, ConsentConfig{SupabaseURL: testSupabaseURL, AnonKey: testAnonKey})
	for _, path := range []string{"/oauth/consent", "/oauth/conexiones"} {
		body := get(t, h, path).Body.String()
		want := `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.js" ` +
			`integrity="sha384-uteMfOloLDGt042uDz+xHGF3ym63/WQ6rFq7murQRG8Ih7QrXGEGNtWd8688sb4O" crossorigin="anonymous"`
		if !strings.Contains(body, want) {
			t.Errorf("%s: falta supabase-js con versión fija y SRI", path)
		}
	}
}

// La página de consentimiento tiene los textos de la spec conexion-claude.
func TestConsentPageTexts(t *testing.T) {
	h := newConsentServer(t, ConsentConfig{SupabaseURL: testSupabaseURL, AnonKey: testAnonKey})
	page := get(t, h, "/oauth/consent?authorization_id=abc").Body.String()
	script := get(t, h, "/oauth/static/consentimiento.js").Body.String() + get(t, h, "/oauth/static/sesion.js").Body.String()
	all := page + script
	for _, want := range []string{
		"Permitir",
		"No permitir",
		" quiere ver tus cruces y parches y anotar gastos en tus cruces.",
		"Ese código no sirve. Revisa el correo o pide otro.",
		"Ese correo no tiene cuenta en Cruce. Créala primero en la app.",
		"Esta solicitud ya no sirve. Vuelve a conectar Cruce desde Claude.",
		"shouldCreateUser: false",
		"getAuthorizationDetails",
		"approveAuthorization",
		"denyAuthorization",
	} {
		if !strings.Contains(all, want) {
			t.Errorf("a la página de consentimiento le falta %q", want)
		}
	}
}

func TestConexionesPageTexts(t *testing.T) {
	h := newConsentServer(t, ConsentConfig{SupabaseURL: testSupabaseURL, AnonKey: testAnonKey})
	all := get(t, h, "/oauth/conexiones").Body.String() + get(t, h, "/oauth/static/conexiones.js").Body.String()
	for _, want := range []string{"Tus conexiones", "Quitar acceso", "listGrants", "revokeGrant"} {
		if !strings.Contains(all, want) {
			t.Errorf("a «Tus conexiones» le falta %q", want)
		}
	}
}

// Los archivos estáticos salen con su tipo y los mismos encabezados; uno que no existe es 404.
func TestOAuthStaticFiles(t *testing.T) {
	h := newConsentServer(t, ConsentConfig{SupabaseURL: testSupabaseURL, AnonKey: testAnonKey})
	cases := map[string]string{
		"/oauth/static/cruce.css":         "text/css",
		"/oauth/static/sesion.js":         "text/javascript",
		"/oauth/static/consentimiento.js": "text/javascript",
		"/oauth/static/conexiones.js":     "text/javascript",
	}
	for path, ct := range cases {
		res := get(t, h, path)
		if res.Code != http.StatusOK {
			t.Fatalf("%s: esperaba 200, llegó %d", path, res.Code)
		}
		if got := res.Header().Get("Content-Type"); !strings.HasPrefix(got, ct) {
			t.Errorf("%s: Content-Type %q, esperaba %q", path, got, ct)
		}
		checkHeader(t, res, path, "X-Content-Type-Options", "nosniff")
	}
	// Solo se sirven los archivos de la lista: ni otro nombre ni un camino hacia afuera (el mux lo redirige).
	for _, path := range []string{"/oauth/static/nada.js", "/oauth/static/../oauth.go", "/oauth/static/", "/oauth/static/consentimiento.html"} {
		if res := get(t, h, path); res.Code == http.StatusOK {
			t.Errorf("%s: no debía servirse", path)
		}
	}
}

// Con la configuración que lee config.Load, nada de lo que recibe el navegador trae la service_role.
func TestOAuthPagesNeverExposeServiceRole(t *testing.T) {
	t.Setenv("WEBHOOK_SECRET", "secreto")
	t.Setenv("SUPABASE_URL", testSupabaseURL)
	t.Setenv("SUPABASE_ANON_KEY", testAnonKey)
	t.Setenv("SUPABASE_SERVICE_ROLE_KEY", testServiceRole)
	cfg, err := config.Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.SupabaseAnonKey != testAnonKey {
		t.Fatalf("SUPABASE_ANON_KEY no llegó a la configuración: %q", cfg.SupabaseAnonKey)
	}
	h := newConsentServer(t, ConsentConfig{SupabaseURL: cfg.SupabaseURL, AnonKey: cfg.SupabaseAnonKey})
	for _, path := range []string{
		"/oauth/consent?authorization_id=abc", "/oauth/conexiones", "/oauth/static/cruce.css",
		"/oauth/static/sesion.js", "/oauth/static/consentimiento.js", "/oauth/static/conexiones.js",
	} {
		res := get(t, h, path)
		if strings.Contains(res.Body.String(), testServiceRole) {
			t.Errorf("%s expone la service_role", path)
		}
		for name, values := range res.Header() {
			if strings.Contains(strings.Join(values, " "), testServiceRole) {
				t.Errorf("%s expone la service_role en %s", path, name)
			}
		}
	}
}

// Si por error ponen una clave secreta como anónima, las páginas no la sirven.
func TestOAuthPagesRefuseSecretKeys(t *testing.T) {
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"iss":"supabase","role":"service_role"}`))
	for _, key := range []string{"sb_secret_abc123", "eyJhbGciOiJIUzI1NiJ9." + payload + ".firma"} {
		h := newConsentServer(t, ConsentConfig{SupabaseURL: testSupabaseURL, AnonKey: key})
		res := get(t, h, "/oauth/consent?authorization_id=abc")
		if res.Code != http.StatusServiceUnavailable {
			t.Errorf("%q: esperaba 503, llegó %d", key, res.Code)
		}
		if strings.Contains(res.Body.String(), key) {
			t.Errorf("%q: la página trae la clave secreta", key)
		}
	}
}

// Sin la configuración pública, las páginas no se sirven (el webhook sigue funcionando).
func TestOAuthPagesWithoutConfig(t *testing.T) {
	h := newConsentServer(t, ConsentConfig{})
	if res := get(t, h, "/oauth/consent"); res.Code != http.StatusServiceUnavailable {
		t.Fatalf("esperaba 503, llegó %d", res.Code)
	}
	if res := get(t, h, "/healthz"); res.Code != http.StatusOK {
		t.Fatalf("healthz: esperaba 200, llegó %d", res.Code)
	}
	// Una URL que no es un origen http(s) limpio tampoco: iría tal cual al CSP.
	for _, url := range []string{"https://x.supabase.co; script-src *", "ftp://x.supabase.co", "https://x.supabase.co/ruta"} {
		h := newConsentServer(t, ConsentConfig{SupabaseURL: url, AnonKey: testAnonKey})
		if res := get(t, h, "/oauth/consent"); res.Code != http.StatusServiceUnavailable {
			t.Errorf("%q: esperaba 503, llegó %d", url, res.Code)
		}
	}
}

// La configuración va escapada: un valor raro no rompe el HTML.
func TestOAuthPagesEscapeConfig(t *testing.T) {
	h := newConsentServer(t, ConsentConfig{SupabaseURL: testSupabaseURL, AnonKey: `x"><script>alert(1)</script>`})
	body := get(t, h, "/oauth/consent").Body.String()
	if strings.Contains(body, "<script>alert(1)</script>") {
		t.Fatal("la clave llegó sin escapar")
	}
}
