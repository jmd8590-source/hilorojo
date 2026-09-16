(function () {
  "use strict";
  // Panel de accesibilidad real: cada opción cambia CSS de verdad (clases en
  // <html>), nada de "overlays" de IA que simulan accesibilidad sin tocar el
  // sitio. Las preferencias se guardan en localStorage y una versión mínima
  // de esta misma lógica corre en <head> (ver index.html) para aplicarlas
  // antes de pintar la página y evitar parpadeos.

  var STORAGE_KEY = "rojohilo_a11y_prefs";
  var root = document.documentElement;

  function getPrefs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function savePrefs(prefs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (e) {
      /* almacenamiento no disponible: la sesión sigue funcionando, solo no se recuerda */
    }
  }

  var TEXT_CLASSES = ["a11y-text-lg", "a11y-text-xl"];
  function setTextScale(prefs, level) {
    // level: 0 normal, 1 grande, 2 extra grande (cíclico)
    TEXT_CLASSES.forEach(function (c) {
      root.classList.remove(c);
    });
    if (level === 1) root.classList.add(TEXT_CLASSES[0]);
    if (level === 2) root.classList.add(TEXT_CLASSES[1]);
    prefs.textScale = level;
    savePrefs(prefs);
  }

  function setToggle(prefs, key, className, value) {
    root.classList.toggle(className, value);
    prefs[key] = value;
    savePrefs(prefs);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("a11yBtn");
    var panel = document.getElementById("a11yPanel");
    var textLabel = document.getElementById("a11yTextLabel");
    var contrastSwitch = document.getElementById("a11yContrastSwitch");
    var motionSwitch = document.getElementById("a11yMotionSwitch");
    var underlineSwitch = document.getElementById("a11yUnderlineSwitch");
    var dyslexicSwitch = document.getElementById("a11yDyslexicSwitch");
    var resetBtn = document.getElementById("a11yResetBtn");
    var textMinus = document.getElementById("a11yTextMinus");
    var textPlus = document.getElementById("a11yTextPlus");

    if (!btn || !panel) return;
    var prefs = getPrefs();

    function reflectSwitches() {
      if (contrastSwitch) contrastSwitch.setAttribute("aria-pressed", String(!!prefs.contrast));
      if (motionSwitch) motionSwitch.setAttribute("aria-pressed", String(!!prefs.noMotion));
      if (underlineSwitch) underlineSwitch.setAttribute("aria-pressed", String(!!prefs.underline));
      if (dyslexicSwitch) dyslexicSwitch.setAttribute("aria-pressed", String(!!prefs.dyslexic));
      if (textLabel) {
        var level = prefs.textScale || 0;
        textLabel.textContent = level === 0 ? "Normal" : level === 1 ? "Grande" : "Extra grande";
      }
    }
    reflectSwitches();

    function openPanel() {
      panel.classList.add("open");
      panel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    }
    function closePanel() {
      panel.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      setTimeout(function () {
        panel.hidden = true;
      }, 180);
    }

    btn.addEventListener("click", function () {
      var isOpen = btn.getAttribute("aria-expanded") === "true";
      isOpen ? closePanel() : openPanel();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
        closePanel();
        btn.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (
        btn.getAttribute("aria-expanded") === "true" &&
        !panel.contains(e.target) &&
        e.target !== btn &&
        !btn.contains(e.target)
      ) {
        closePanel();
      }
    });

    if (textMinus) {
      textMinus.addEventListener("click", function () {
        var level = Math.max(0, (prefs.textScale || 0) - 1);
        setTextScale(prefs, level);
        reflectSwitches();
      });
    }
    if (textPlus) {
      textPlus.addEventListener("click", function () {
        var level = Math.min(2, (prefs.textScale || 0) + 1);
        setTextScale(prefs, level);
        reflectSwitches();
      });
    }
    if (contrastSwitch) {
      contrastSwitch.addEventListener("click", function () {
        setToggle(prefs, "contrast", "a11y-contrast", !prefs.contrast);
        reflectSwitches();
      });
    }
    if (motionSwitch) {
      motionSwitch.addEventListener("click", function () {
        setToggle(prefs, "noMotion", "a11y-no-motion", !prefs.noMotion);
        reflectSwitches();
      });
    }
    if (underlineSwitch) {
      underlineSwitch.addEventListener("click", function () {
        setToggle(prefs, "underline", "a11y-underline", !prefs.underline);
        reflectSwitches();
      });
    }
    if (dyslexicSwitch) {
      dyslexicSwitch.addEventListener("click", function () {
        setToggle(prefs, "dyslexic", "a11y-dyslexic", !prefs.dyslexic);
        reflectSwitches();
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        prefs = {};
        savePrefs(prefs);
        TEXT_CLASSES.forEach(function (c) {
          root.classList.remove(c);
        });
        root.classList.remove("a11y-contrast", "a11y-no-motion", "a11y-underline", "a11y-dyslexic");
        reflectSwitches();
      });
    }
  });
})();
