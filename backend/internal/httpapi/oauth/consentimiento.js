// La página de consentimiento: Supabase Auth redirige aquí con ?authorization_id=… cuando una aplicación (Claude)
// pide acceso. Con sesión, muestra quién pide acceso y deja aprobar o rechazar; Supabase devuelve a dónde volver.
"use strict";

(function () {
  var cruce = window.Cruce;
  var $ = cruce.$;
  var VENCIDA = "Esta solicitud ya no sirve. Vuelve a conectar Cruce desde Claude.";
  var autorizacion = new URLSearchParams(window.location.search).get("authorization_id");

  function vencida() {
    cruce.mostrar("");
    cruce.avisar(VENCIDA);
  }

  function volver(respuesta) {
    if (respuesta.error || !respuesta.data || !respuesta.data.redirect_url) return vencida();
    window.location.assign(respuesta.data.redirect_url);
  }

  function decidir(aprobar) {
    $("permitir").disabled = true;
    $("no-permitir").disabled = true;
    var oauth = cruce.supabase.auth.oauth;
    var pedido = aprobar
      ? oauth.approveAuthorization(autorizacion, { skipBrowserRedirect: true })
      : oauth.denyAuthorization(autorizacion, { skipBrowserRedirect: true });
    pedido.then(volver, vencida);
  }

  function preguntar(sesion) {
    cruce.avisar("");
    cruce.mostrar("cargando");
    cruce.supabase.auth.oauth.getAuthorizationDetails(autorizacion).then(function (r) {
      if (r.error || !r.data) return vencida();
      // Ya había dado permiso antes: Supabase devuelve directo a dónde volver.
      if (!r.data.authorization_id) return volver(r);
      var aplicacion = (r.data.client && r.data.client.name) || "Una aplicación";
      $("pregunta").textContent = aplicacion + " quiere ver tus cruces y parches y anotar gastos en tus cruces.";
      $("quien").textContent = sesion.user.email;
      cruce.mostrar("paso-permiso");
    }, vencida);
  }

  if (!autorizacion) return vencida();
  $("permitir").addEventListener("click", function () {
    decidir(true);
  });
  $("no-permitir").addEventListener("click", function () {
    decidir(false);
  });
  cruce.entrar(preguntar);
})();
