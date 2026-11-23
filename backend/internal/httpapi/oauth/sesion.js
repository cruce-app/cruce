// Entrar a Cruce desde el navegador con el correo y el código de 6 dígitos, igual que en la app. Lo usan las dos
// páginas de OAuth (consentimiento.js y conexiones.js). La sesión queda solo en este navegador (localStorage).
"use strict";

window.Cruce = (function () {
  var MENSAJES = {
    sinCuenta: "Ese correo no tiene cuenta en Cruce. Créala primero en la app.",
    codigoMalo: "Ese código no sirve. Revisa el correo o pide otro.",
    correoInvalido: "Escribe un correo válido.",
    noSeEnvio: "No pude mandarte el código. Espera un momento e intenta de nuevo.",
  };

  var config = document.body.dataset;
  var supabase = window.supabase.createClient(config.supabaseUrl, config.anonKey, {
    auth: { storageKey: "cruce-oauth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });

  function $(id) {
    return document.getElementById(id);
  }

  // Muestra solo uno de los pasos de la página (los demás quedan ocultos).
  function mostrar(id) {
    var pasos = document.querySelectorAll("main > section, main > form");
    for (var i = 0; i < pasos.length; i++) pasos[i].hidden = pasos[i].id !== id;
  }

  function avisar(texto) {
    var mensaje = $("mensaje");
    mensaje.textContent = texto || "";
    mensaje.hidden = !texto;
  }

  function ocupado(formulario, si) {
    var botones = formulario.querySelectorAll("button");
    for (var i = 0; i < botones.length; i++) botones[i].disabled = si;
  }

  var correoPedido = "";

  function enviarCodigo(correo) {
    // shouldCreateUser: false: con un correo sin cuenta no se crea ninguna (así no hay cuentas sin perfil).
    return supabase.auth.signInWithOtp({ email: correo, options: { shouldCreateUser: false } }).then(
      function (r) {
        if (!r.error) return null;
        if (r.error.code === "otp_disabled" || r.error.status === 422) return MENSAJES.sinCuenta;
        return MENSAJES.noSeEnvio;
      },
    );
  }

  // Pide el correo y el código; cuando hay sesión, llama a alEntrar(sesión).
  function entrar(alEntrar) {
    $("paso-correo").addEventListener("submit", function (evento) {
      evento.preventDefault();
      var formulario = evento.currentTarget;
      var correo = $("correo").value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return avisar(MENSAJES.correoInvalido);
      avisar("");
      ocupado(formulario, true);
      enviarCodigo(correo).then(function (error) {
        ocupado(formulario, false);
        if (error) return avisar(error);
        correoPedido = correo;
        $("correo-enviado").textContent = correo;
        $("codigo").value = "";
        mostrar("paso-codigo");
        $("codigo").focus();
      });
    });

    $("paso-codigo").addEventListener("submit", function (evento) {
      evento.preventDefault();
      var formulario = evento.currentTarget;
      var codigo = $("codigo").value.replace(/\D/g, "");
      if (codigo.length !== 6) return avisar(MENSAJES.codigoMalo);
      avisar("");
      ocupado(formulario, true);
      supabase.auth.verifyOtp({ email: correoPedido, token: codigo, type: "email" }).then(function (r) {
        ocupado(formulario, false);
        // Un código que no sirve deja a la persona en el mismo paso.
        if (r.error || !r.data.session) return avisar(MENSAJES.codigoMalo);
        alEntrar(r.data.session);
      });
    });

    $("otro-codigo").addEventListener("click", function () {
      avisar("");
      enviarCodigo(correoPedido).then(function (error) {
        avisar(error || "Te mandamos otro código.");
      });
    });

    $("salir").addEventListener("click", function () {
      supabase.auth.signOut().then(function () {
        avisar("");
        mostrar("paso-correo");
      });
    });

    supabase.auth.getSession().then(function (r) {
      var sesion = r.data && r.data.session;
      if (sesion) return alEntrar(sesion);
      mostrar("paso-correo");
    });
  }

  return { supabase: supabase, $: $, mostrar: mostrar, avisar: avisar, entrar: entrar };
})();
