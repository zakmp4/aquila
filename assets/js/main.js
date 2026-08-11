/* ==========================================================================
   AQUILA WATER LEAK DETECTION — Site behaviour
   Vanilla JS, no dependencies. Everything degrades gracefully.
   ========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Mobile drawer ---------- */
  var toggle = $('.nav-toggle');
  var drawer = $('.mobile-drawer');

  function setNav(open) {
    document.body.classList.toggle('nav-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (drawer) drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      setNav(!document.body.classList.contains('nav-open'));
    });
    $$('a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { setNav(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) setNav(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 920 && document.body.classList.contains('nav-open')) setNav(false);
    });
  }

  /* ---------- Header state, scroll progress, back-to-top ---------- */
  var header   = $('.site-header');
  var progress = $('.scroll-progress');
  var toTop    = $('.to-top');
  var ticking  = false;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    if (header) header.classList.toggle('scrolled', y > 24);
    if (toTop)  toTop.classList.toggle('show', y > 520);
    if (progress) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealables = $$('.reveal');
  if (revealables.length) {
    if (!('IntersectionObserver' in window) || reduced) {
      revealables.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealables.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- Cursor glow on cards (pointer devices only) ---------- */
  if (window.matchMedia('(hover: hover)').matches && !reduced) {
    $$('.service-card').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ---------- Hero parallax (desktop, motion-safe) ---------- */
  var heroFrame = $('.hero-photo-frame');
  if (heroFrame && !reduced && window.matchMedia('(min-width: 921px)').matches) {
    var pTicking = false;
    window.addEventListener('scroll', function () {
      if (pTicking) return;
      pTicking = true;
      window.requestAnimationFrame(function () {
        var y = window.pageYOffset || 0;
        if (y < 900) heroFrame.style.transform = 'translate3d(0,' + (y * 0.055) + 'px,0)';
        pTicking = false;
      });
    }, { passive: true });
  }

  /* ---------- Count-up numbers ---------- */
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window && !reduced) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        cio.unobserve(el);
        var target = parseFloat(el.getAttribute('data-count'));
        var start  = performance.now();
        var dur    = 1400;
        (function tick(now) {
          var p = Math.min((now - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased).toString();
          if (p < 1) requestAnimationFrame(tick);
        })(start);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- FAQ accordion ---------- */
  $$('.faq-item').forEach(function (item) {
    var q = $('.faq-q', item);
    var a = $('.faq-a', item);
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var open = item.classList.contains('open');
      // close siblings in the same group
      var group = item.parentElement;
      $$('.faq-item.open', group).forEach(function (other) {
        if (other === item) return;
        other.classList.remove('open');
        $('.faq-a', other).style.maxHeight = '';
        $('.faq-q', other).setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('open', !open);
      q.setAttribute('aria-expanded', String(!open));
      a.style.maxHeight = open ? '' : a.scrollHeight + 'px';
    });
  });
  window.addEventListener('resize', function () {
    $$('.faq-item.open .faq-a').forEach(function (a) { a.style.maxHeight = a.scrollHeight + 'px'; });
  });

  /* ---------- Tabs (areas we serve) ---------- */
  $$('[data-tabs]').forEach(function (group) {
    var tabs   = $$('.tab', group);
    var panels = $$('.suburbs', group.parentElement);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
        tab.setAttribute('aria-selected', 'true');
        var id = tab.getAttribute('data-panel');
        panels.forEach(function (p) { p.classList.toggle('active', p.id === id); });
      });
    });
  });

  /* ---------- Contact forms ---------- */
  $$('form[data-contact]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = $('.form-ok', form);
      var btn = $('button[type=submit]', form);
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      window.setTimeout(function () {
        if (ok) ok.classList.add('show');
        form.reset();
        if (btn) { btn.disabled = false; btn.textContent = btn.getAttribute('data-label') || 'Book My Inspection'; }
      }, 450);
    });
  });

  /* ---------- Current year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Open FAQ targeted by hash ---------- */
  if (location.hash) {
    var target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('faq-item')) {
      var qq = $('.faq-q', target);
      if (qq) window.setTimeout(function () { qq.click(); }, 300);
    }
  }
})();
