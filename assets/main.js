(function(){
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header shrink on scroll + floating cta reveal */
  var header = document.getElementById('siteHeader');
  var floatCta = document.getElementById('floatingCta');
  var hero = document.getElementById('top');
  function onScroll(){
    var y = window.scrollY || window.pageYOffset;
    if(header){ header.classList.toggle('scrolled', y > 40); }
    if(floatCta && hero){
      var past = y > hero.offsetHeight * 0.9;
      floatCta.classList.toggle('show', past);
    }
  }
  document.addEventListener('scroll', onScroll, { passive:true });
  onScroll();

  /* mobile menu — con trampa de foco y cierre por Escape, requisitos WCAG
     2.1.2 (sin trampa involuntaria, aquí es intencional y controlada) y
     2.4.3 (orden de foco) para un menú que actúa como diálogo modal */
  var burger = document.getElementById('burgerBtn');
  var menu = document.getElementById('mobileMenu');
  function getFocusable(container){
    if(!container) return [];
    return Array.prototype.slice.call(
      container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    );
  }
  function closeMenu(returnFocus){
    if(!menu) return;
    menu.classList.remove('open');
    if(burger) burger.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', trapKeydown);
    if(returnFocus !== false && burger){ burger.focus(); }
  }
  function openMenu(){
    if(!menu) return;
    menu.classList.add('open');
    if(burger) burger.setAttribute('aria-expanded','true');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', trapKeydown);
    var focusable = getFocusable(menu);
    if(focusable.length){ focusable[0].focus(); }
  }
  function trapKeydown(e){
    if(e.key === 'Escape'){
      e.preventDefault();
      closeMenu(true);
      return;
    }
    if(e.key !== 'Tab' || !menu) return;
    var focusable = getFocusable(menu);
    if(!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault();
      last.focus();
    } else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault();
      first.focus();
    }
  }
  if(burger){
    burger.addEventListener('click', function(){
      var isOpen = burger.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMenu(false) : openMenu();
    });
  }
  if(menu){
    menu.querySelectorAll('a[data-close]').forEach(function(a){
      a.addEventListener('click', function(){ closeMenu(false); });
    });
  }

  /* Disuasión de copia SOLO en las ilustraciones del portafolio (.port-art),
     no en toda la web: bloquear el clic derecho o la selección en el sitio
     entero rompería lectores de pantalla, traductores y el copiado de
     datos de contacto — por eso el alcance queda limitado a estas piezas
     de ejemplo, con un aviso visible en vez de un bloqueo silencioso. */
  var portArts = document.querySelectorAll('.port-art');
  if(portArts.length){
    var toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = '© Rojo Hilo — ilustración protegida';
    document.body.appendChild(toast);
    var toastTimer = null;
    function showToast(){
      toast.classList.add('show');
      if(toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 2200);
    }
    portArts.forEach(function(art){
      art.addEventListener('contextmenu', function(e){
        e.preventDefault();
        showToast();
      });
    });
  }

  /* custom cursor — fine pointers only */
  var isFinePointer = window.matchMedia && window.matchMedia('(pointer:fine)').matches;
  if(isFinePointer && !reduceMotion){
    var dot = document.querySelector('.cursor-dot');
    var ring = document.querySelector('.cursor-ring');
    var enabled = false;
    window.addEventListener('pointermove', function(e){
      if(!enabled){ enabled = true; document.body.classList.add('cursor-ready'); }
      if(dot){ dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }
      if(ring){ ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; }
    }, { passive:true });
    document.addEventListener('mouseover', function(e){
      if(e.target.closest && e.target.closest('a, button, input, textarea, select')){
        document.body.classList.add('cursor-hover');
      }
    });
    document.addEventListener('mouseout', function(e){
      if(e.target.closest && e.target.closest('a, button, input, textarea, select')){
        document.body.classList.remove('cursor-hover');
      }
    });
  }

  /* scroll reveal */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold:.15, rootMargin:'0px 0px -40px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* contact form — envía a /api/contact (función serverless) con verificación hCaptcha */
  var form = document.getElementById('contactForm');
  var note = document.getElementById('formNote');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();

      var honey = form.querySelector('input[name="company"]');
      if(honey && honey.value){ return; } // bot: no seguimos

      var nameEl = form.querySelector('#cf-name');
      var emailEl = form.querySelector('#cf-email');
      var typeEl = form.querySelector('#cf-type');
      var msgEl = form.querySelector('#cf-msg');
      var submitBtn = form.querySelector('button[type="submit"]');

      [nameEl, emailEl, msgEl].forEach(function(el){
        if(el){ el.removeAttribute('aria-invalid'); }
      });

      var emailOk = emailEl && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value);
      var invalidEls = [];
      if(!nameEl.value.trim()) invalidEls.push(nameEl);
      if(!emailOk) invalidEls.push(emailEl);
      if(!msgEl.value.trim()) invalidEls.push(msgEl);

      if(invalidEls.length){
        note.id = note.id || 'formNote';
        note.textContent = 'Revisa el nombre, el email y el mensaje antes de enviar.';
        note.classList.remove('ok');
        invalidEls.forEach(function(el){
          el.setAttribute('aria-invalid', 'true');
          el.setAttribute('aria-describedby', note.id);
        });
        invalidEls[0].focus();
        return;
      }

      var token = (window.hcaptcha && typeof hcaptcha.getResponse === 'function') ? hcaptcha.getResponse() : '';
      if(!token){
        note.textContent = 'Completa la verificación anti-spam antes de enviar.';
        note.classList.remove('ok');
        var captchaBox = form.querySelector('.h-captcha-wrap');
        if(captchaBox){ captchaBox.setAttribute('tabindex', '-1'); captchaBox.focus(); }
        return;
      }

      if(submitBtn){ submitBtn.disabled = true; }
      note.textContent = 'Enviando...';
      note.classList.remove('ok');

      fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameEl.value.trim(),
          email: emailEl.value.trim(),
          type: typeEl ? typeEl.value : '',
          message: msgEl.value.trim(),
          company: honey ? honey.value : '',
          'h-captcha-response': token
        })
      })
      .then(function(res){
        return res.json().catch(function(){ return {}; }).then(function(data){
          return { ok: res.ok, data: data };
        });
      })
      .then(function(result){
        if(result.ok && result.data && result.data.ok){
          note.textContent = 'Mensaje enviado. Te responderemos en breve.';
          note.classList.add('ok');
          form.reset();
        } else {
          note.textContent = (result.data && result.data.error) || 'No se pudo enviar el mensaje. Inténtalo de nuevo.';
          note.classList.remove('ok');
        }
      })
      .catch(function(){
        note.textContent = 'Error de conexión. Inténtalo de nuevo en un momento.';
        note.classList.remove('ok');
      })
      .then(function(){
        if(submitBtn){ submitBtn.disabled = false; }
        if(window.hcaptcha){ hcaptcha.reset(); }
      });
    });
  }
})();
