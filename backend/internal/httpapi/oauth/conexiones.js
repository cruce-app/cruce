// "Tus conexiones": las aplicaciones con acceso a la cuenta y "Quitar acceso" en cada una. Quitarlo revoca el
// permiso y las sesiones de esa aplicación; tendrá que volver a pedir consentimiento.
"use strict";

(function () {
  var cruce = window.Cruce;
  var $ = cruce.$;
  var NO_SE_PUDO = "No pude cargar tus conexiones. Intenta de nuevo en un momento.";

  function fecha(iso) {
    try {
      return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
    } catch (_) {
      return "";
    }
  }

  function fila(permiso) {
    var item = document.createElement("li");
    var nombre = document.createElement("p");
    nombre.className = "nombre";
    nombre.textContent = (permiso.client && permiso.client.name) || "Una aplicación";
    var desde = document.createElement("p");
    desde.className = "desde";
    desde.textContent = "Con acceso desde el " + fecha(permiso.granted_at);
    var quitar = document.createElement("button");
    quitar.type = "button";
    quitar.className = "boton";
    quitar.textContent = "Quitar acceso";
    quitar.addEventListener("click", function () {
      quitar.disabled = true;
      cruce.supabase.auth.oauth.revokeGrant({ clientId: permiso.client.id }).then(function (r) {
        if (r.error) {
          quitar.disabled = false;
          return cruce.avisar("No pude quitarle el acceso. Intenta de nuevo.");
        }
        cruce.avisar("");
        cargar();
      });
    });
    item.append(nombre, desde, quitar);
    return item;
  }

  function cargar() {
    cruce.supabase.auth.oauth.listGrants().then(function (r) {
      if (r.error) return cruce.avisar(NO_SE_PUDO);
      var lista = $("lista");
      lista.replaceChildren.apply(lista, (r.data || []).map(fila));
      $("vacia").hidden = (r.data || []).length > 0;
      cruce.mostrar("paso-conexiones");
    }, function () {
      cruce.avisar(NO_SE_PUDO);
    });
  }

  cruce.entrar(function (sesion) {
    $("quien").textContent = sesion.user.email;
    cargar();
  });
})();
