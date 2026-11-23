package httpapi

// Páginas de OAuth para conectar Claude a Cruce (cambio mcp-cruce, design D4).
//
// Supabase Auth es el servidor de autorización y redirige a site_url + /oauth/consent?authorization_id=…; esta
// página deja entrar con el correo y el código de 6 dígitos (como la app) y aprobar o rechazar con supabase-js.
// "Tus conexiones" (/oauth/conexiones) lista las aplicaciones con acceso y deja quitárselo.
//
// Todo corre en el navegador con la clave anónima del ambiente: el servidor solo sirve HTML, CSS y JS embebidos y
// nunca recibe ni guarda tokens. La service_role del backend no se toca aquí.

import (
	"bytes"
	"embed"
	"encoding/base64"
	"encoding/json"
	"html/template"
	"net/http"
	"net/url"
	"strings"
)

//go:embed oauth/*.html oauth/*.css oauth/*.js
var oauthFiles embed.FS

var oauthPages = template.Must(template.ParseFS(oauthFiles, "oauth/*.html"))

// Los archivos de /oauth/static/ y su tipo. Solo estos se sirven.
var oauthStatic = map[string]string{
	"cruce.css":         "text/css; charset=utf-8",
	"sesion.js":         "text/javascript; charset=utf-8",
	"consentimiento.js": "text/javascript; charset=utf-8",
	"conexiones.js":     "text/javascript; charset=utf-8",
}

// ConsentConfig es la configuración pública que reciben las páginas: la URL de Supabase y la clave anónima del
// ambiente. Sin las dos, las páginas responden 503 y el resto del servicio sigue igual.
type ConsentConfig struct {
	SupabaseURL string
	AnonKey     string
}

// WithConsent activa las páginas de OAuth con la configuración pública del ambiente.
func (s *Server) WithConsent(cfg ConsentConfig) *Server {
	s.consent = cfg
	return s
}

func (s *Server) registerOAuthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /oauth/consent", s.oauthPage("consentimiento.html"))
	mux.HandleFunc("GET /oauth/conexiones", s.oauthPage("conexiones.html"))
	mux.HandleFunc("GET /oauth/static/{file}", s.handleOAuthStatic)
}

// oauthPage arma la página con la configuración pública escapada por html/template.
func (s *Server) oauthPage(name string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		origin, ok := s.consentOrigin()
		if !ok {
			setOAuthHeaders(w, "")
			http.Error(w, "La conexión con Claude no está configurada en este ambiente.", http.StatusServiceUnavailable)
			return
		}
		var page bytes.Buffer
		data := map[string]string{"SupabaseURL": origin, "AnonKey": s.consent.AnonKey}
		if err := oauthPages.ExecuteTemplate(&page, name, data); err != nil {
			s.logger.Error("no se pudo armar la página de OAuth", "pagina", name, "err", err)
			http.Error(w, "Algo falló. Intenta de nuevo.", http.StatusInternalServerError)
			return
		}
		setOAuthHeaders(w, origin)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(page.Bytes())
	}
}

func (s *Server) handleOAuthStatic(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("file")
	contentType, ok := oauthStatic[name]
	if !ok {
		http.NotFound(w, r)
		return
	}
	content, err := oauthFiles.ReadFile("oauth/" + name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	origin, _ := s.consentOrigin()
	setOAuthHeaders(w, origin)
	w.Header().Set("Content-Type", contentType)
	_, _ = w.Write(content)
}

// consentOrigin devuelve la URL de Supabase como origen limpio (va tal cual al CSP) si la configuración sirve: una
// URL http(s) sin ruta y una clave anónima que no sea secreta.
func (s *Server) consentOrigin() (string, bool) {
	if s.consent.SupabaseURL == "" || s.consent.AnonKey == "" {
		return "", false
	}
	u, err := url.Parse(s.consent.SupabaseURL)
	if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" ||
		strings.Trim(u.Path, "/") != "" || u.RawQuery != "" || u.Fragment != "" || u.User != nil {
		s.logger.Error("SUPABASE_URL no es un origen http(s): las páginas de OAuth quedan apagadas")
		return "", false
	}
	if isSecretKey(s.consent.AnonKey) {
		s.logger.Error("SUPABASE_ANON_KEY es una clave secreta: las páginas de OAuth quedan apagadas")
		return "", false
	}
	return u.Scheme + "://" + u.Host, true
}

// isSecretKey reconoce una clave que no puede ir al navegador: sb_secret_… o un JWT con role service_role.
func isSecretKey(key string) bool {
	if strings.HasPrefix(key, "sb_secret_") {
		return true
	}
	parts := strings.Split(key, ".")
	if len(parts) != 3 {
		return false
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return false
	}
	var claims struct {
		Role string `json:"role"`
	}
	return json.Unmarshal(payload, &claims) == nil && claims.Role == "service_role"
}

// setOAuthHeaders pone los encabezados de design D4. El JS sale solo de este servidor y de jsDelivr (con SRI), y
// solo habla con el Supabase del ambiente.
func setOAuthHeaders(w http.ResponseWriter, supabaseOrigin string) {
	connect := "'none'"
	if supabaseOrigin != "" {
		connect = supabaseOrigin
	}
	h := w.Header()
	h.Set("Content-Security-Policy", "default-src 'none'; script-src 'self' https://cdn.jsdelivr.net; "+
		"style-src 'self'; img-src 'self'; connect-src "+connect+"; base-uri 'none'; form-action 'none'; "+
		"frame-ancestors 'none'")
	h.Set("Referrer-Policy", "no-referrer")
	h.Set("Cache-Control", "no-store")
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("X-Frame-Options", "DENY")
}
