(function () {
  "use strict";
  // Consentimiento de cookies muy simple: dos categorías.
  //  - "necesarias": hCaptcha, imprescindible para el envío del formulario
  //    de contacto que el propio visitante activa; se carga siempre.
  //  - "chat": el widget de Chatbase, que solo se inyecta en el DOM si el
  //    visitante acepta. Antes de aceptar no se hace ninguna petición a
  //    chatbase.co ni se planta ninguna cookie de esa categoría.
  var STORAGE_KEY = "rojohilo_cookie_consent";
  var CHATBASE_ID = "rDd4kSmyBmfUyS6AE4F-n";

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function setConsent(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch (e) {
      /* almacenamiento no disponible (navegación privada, etc.): seguimos sin persistir */
    }
  }

  function loadChatbase() {
    if (window.__chatbaseCargado || document.getElementById(CHATBASE_ID)) return;
    window.__chatbaseCargado = true;

    // Cola de comandos de Chatbase (igual que el snippet oficial)
    if (!window.chatbase || window.chatbase("getState") !== "initialized") {
      window.chatbase = function () {
        if (!window.chatbase.q) window.chatbase.q = [];
        window.chatbase.q.push(arguments);
      };
      window.chatbase = new Proxy(window.chatbase, {
        get: function (target, prop) {
          if (prop === "q") return target.q;
          return function () {
            var args = Array.prototype.slice.call(arguments);
            return target.apply(null, [prop].concat(args));
          };
        }
      });
    }

    function inject() {
      var s = document.createElement("script");
      s.src = "https://www.chatbase.co/embed.min.js";
      s.id = CHATBASE_ID;
      s.domain = "www.chatbase.co"; // texto plano, sin formato Markdown
      document.body.appendChild(s);
    }

    // El script oficial espera al evento "load"; aquí puede que ya haya pasado
    if (document.readyState === "complete") {
      inject();
    } else {
      window.addEventListener("load", inject);
    }
  }

  var banner = document.getElementById("cookieBanner");
  var acceptBtn = document.getElementById("cookieAcceptBtn");
  var rejectBtn = document.getElementById("cookieRejectBtn");
  var prefsLink = document.getElementById("cookiePrefsLink");

  function showBanner() {
    if (banner) banner.hidden = false;
  }
  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  var consent = getConsent();
  if (consent && consent.chat) {
    loadChatbase();
  }
  if (!consent) {
    showBanner();
  }

  if (acceptBtn) {
    acceptBtn.addEventListener("click", function () {
      setConsent({ chat: true, ts: Date.now() });
      loadChatbase();
      hideBanner();
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener("click", function () {
      var estabaCargado = !!window.__chatbaseCargado;
      setConsent({ chat: false, ts: Date.now() });
      hideBanner();
      // Si ya se había cargado el chat, recargamos para retirarlo por completo
      if (estabaCargado) location.reload();
    });
  }
  if (prefsLink) {
    prefsLink.addEventListener("click", function (e) {
      e.preventDefault();
      showBanner();
    });
  }
})();
