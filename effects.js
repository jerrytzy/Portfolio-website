/* ===================================================================
   effects.js: motion and "life" layer for the portfolio.
   - One master toggle ("Effects") in the nav, remembered in localStorage
   - Defaults to OFF for visitors whose system asks for reduced motion
   - Everything here is decoration: the site works fully without it
=================================================================== */
(function () {
  'use strict';

  var KEY = 'portfolio-effects';
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  var enabled = saved === null ? !reduceMotion : saved === 'on';
  root.classList.toggle('fx-off', !enabled);   // set immediately: no flash

  var listeners = [];   // functions called with (enabled) whenever the toggle flips

  document.addEventListener('DOMContentLoaded', function () {
    setupToggle();
    setupReveals();
    setupProgress();
    setupTilt();
    setupRotator();
    setupPollen();
    setupVideos();
    listeners.forEach(function (fn) { fn(enabled); });
  });

  /* ---------- master toggle ---------- */
  function setupToggle() {
    var btn = document.querySelector('.fx-toggle');
    if (!btn) return;
    var label = btn.querySelector('.fx-label');

    function paint() {
      btn.setAttribute('aria-pressed', String(enabled));
      if (label) label.textContent = enabled ? 'Effects on' : 'Effects off';
    }
    paint();

    btn.addEventListener('click', function () {
      enabled = !enabled;
      root.classList.toggle('fx-off', !enabled);
      try { localStorage.setItem(KEY, enabled ? 'on' : 'off'); } catch (e) {}
      paint();
      listeners.forEach(function (fn) { fn(enabled); });
    });
  }

  /* ---------- scroll reveals ---------- */
  function setupReveals() {
    var groups = [
      ['.page-title, .section-title', 'reveal', 0],
      ['main section:not(.parallax)', 'reveal', 0],
      ['.link-cards li', 'reveal', 0.12],
      ['.pill-list li', 'reveal reveal-pop', 0.1],
      ['.goal-list li', 'reveal reveal-left', 0.18],
      ['main ol:not(.goal-list) li', 'reveal reveal-left', 0.12],
      ['.parallax blockquote', 'reveal reveal-left', 0]
    ];

    var items = [];
    groups.forEach(function (g) {
      document.querySelectorAll(g[0]).forEach(function (el, i) {
        el.className += ' ' + g[1];
        el.style.setProperty('--d', (i * g[2]).toFixed(2) + 's');
        items.push(el);
      });
    });

    function finish(el) {
      el.classList.add('in');
      var delay = parseFloat(el.style.getPropertyValue('--d')) || 0;
      // once shown, drop the reveal classes so hover effects are not delayed
      setTimeout(function () {
        el.classList.remove('reveal', 'reveal-pop', 'reveal-left', 'in');
        el.style.removeProperty('--d');
      }, 1000 + delay * 1000);
    }

    if (!('IntersectionObserver' in window)) { items.forEach(finish); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { io.unobserve(en.target); finish(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- gold reading-progress bar ---------- */
  function setupProgress() {
    var bar = document.createElement('div');
    bar.className = 'fx-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- gentle 3D tilt under the mouse ---------- */
  function setupTilt() {
    if (!window.matchMedia('(hover: hover)').matches) return;
    var targets = document.querySelectorAll('.link-cards a, .hero-photo, .hobby-photo, .float-photo');
    targets.forEach(function (el) {
      var max = el.matches('.link-cards a') ? 5 : 7;
      el.classList.add('tilt');
      el.addEventListener('pointermove', function (e) {
        if (root.classList.contains('fx-off') || e.pointerType !== 'mouse') return;
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(700px) rotateX(' + (-py * max).toFixed(2) +
          'deg) rotateY(' + (px * max).toFixed(2) + 'deg) translateY(-3px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    listeners.push(function (on) {
      if (!on) targets.forEach(function (el) { el.style.transform = ''; });
    });
  }

  /* ---------- rotating line on the home hero ---------- */
  function setupRotator() {
    var word = document.querySelector('.rot-word');
    if (!word) return;
    var words = word.getAttribute('data-words').split('|');
    var i = 0, timer = null;

    function next() {
      word.classList.add('out');
      setTimeout(function () {
        i = (i + 1) % words.length;
        word.textContent = words[i];
        word.classList.remove('out');
      }, 320);
    }
    listeners.push(function (on) {
      clearInterval(timer);
      timer = null;
      if (on) timer = setInterval(next, 2800);
    });
  }

  /* ---------- drifting pollen (canvas) ---------- */
  function setupPollen() {
    var canvas = document.createElement('canvas');
    canvas.className = 'fx-pollen';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // one pre-rendered soft glow, reused for every particle
    var sprite = document.createElement('canvas');
    sprite.width = sprite.height = 48;
    var sctx = sprite.getContext('2d');
    var g = sctx.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, 'rgba(255, 244, 190, 1)');
    g.addColorStop(0.3, 'rgba(255, 220, 110, 0.7)');
    g.addColorStop(1, 'rgba(255, 210, 90, 0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 48, 48);

    var W = 0, H = 0, dpr = 1, parts = [], raf = 0, running = false;
    var mouse = { x: -999, y: -999 };

    function rand(a, b) { return a + Math.random() * (b - a); }

    function make(spawnAnywhere) {
      return {
        x: rand(0, W),
        y: spawnAnywhere ? rand(0, H) : H + 20,
        s: rand(8, 22),             // drawn size in px
        vy: -rand(0.12, 0.42),      // rises slowly
        vx: rand(0.05, 0.3),        // light breeze to the right
        ph: rand(0, Math.PI * 2),
        a: rand(0.35, 0.9)
      };
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(16, Math.min(46, Math.round(W * H / 30000)));
      parts = [];
      for (var i = 0; i < count; i++) parts.push(make(true));
    }

    function frame(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx + Math.sin(t * 0.0006 + p.ph) * 0.35;
        p.y += p.vy;

        // pollen gets nudged away from the cursor
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 9000) {
          var d = Math.sqrt(d2) || 1, f = (1 - d / 95) * 2.2;
          p.x += (dx / d) * f; p.y += (dy / d) * f;
        }

        if (p.y < -20 || p.x > W + 20) { parts[i] = make(false); if (p.x > W + 20) parts[i].x = -10; continue; }

        ctx.globalAlpha = p.a * (0.7 + 0.3 * Math.sin(t * 0.002 + p.ph));  // soft twinkle
        ctx.drawImage(sprite, p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (enabled) start();
    });
    resize();
    listeners.push(function (on) { if (on) start(); else stop(); });
  }

  /* ---------- background videos follow the toggle ---------- */
  function setupVideos() {
    var vids = document.querySelectorAll('.bg-media video');
    if (!vids.length) return;
    listeners.push(function (on) {
      vids.forEach(function (v) {
        if (on) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    });
  }
})();
