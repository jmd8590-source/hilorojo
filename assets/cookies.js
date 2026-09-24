(function () {
  "use strict";
  // Consentimiento de cookies muy simple: dos categorías.
  //  - "necesarias": hCaptcha, imprescindible para el envío del formulario
  //    de contacto que el propio visitante activa; se carga siempre.
  //  - "chat": el widget de Tidio, que solo se inyecta en el DOM si el
  //    visitante acepta. Antes de aceptar no se hace ninguna petición a
  //    code.tidio.co ni se planta ninguna cookie de esa categoría.
  var STORAGE_KEY = "rojohilo_cookie_consent";
  var TIDIO_SRC = "//code.tidio.co/TU_CLAVE_PUBLICA.js";

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
  function cargarChatbase() {
  if (window.__chatbaseCargado) return;
  window.__chatbaseCargado = true;
  if (!window.chatbase || window.chatbase("getState") !== "initialized") {
    window.chatbase = (...args) => {
      if (!window.chatbase.q) window.chatbase.q = [];
      window.chatbase.q.push(args);
    };
    window.chatbase = new Proxy(window.chatbase, {
      get(target, prop) {
        if (prop === "q") return target.q;
        return (...args) => target(prop, ...args);
      }
    });
  }
  const s = document.createElement("script");
  s.src = "https://www.chatbase.co/embed.min.js";
  s.id = "rDd4kSmyBmfUyS6AE4F-n";
  s.domain = "www.chatbase.co";
  document.body.appendChild(s);
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
    loadTidio();
  }
  if (!consent) {
    showBanner();
  }

  if (acceptBtn) {
    acceptBtn.addEventListener("click", function () {
      setConsent({ chat: true, ts: Date.now() });
      loadTidio();
      hideBanner();
    });
  }
  if (rejectBtn) {
    rejectBtn.addEventListener("click", function () {
      setConsent({ chat: false, ts: Date.now() });
      hideBanner();
    });
  }
  if (prefsLink) {
    prefsLink.addEventListener("click", function (e) {
      e.preventDefault();
      showBanner();
    });
  }
})();
