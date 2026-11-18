(() => {
  document.documentElement.classList.add('js');
  document.getElementById('year').textContent = new Date().getFullYear();

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── Hero: six voices, from discord to harmony ───────────────────────── */

  const hero = document.querySelector('.hero');
  const canvas = document.querySelector('.hero__canvas');
  const before = document.querySelector('.hero__copy--before');
  const after = document.querySelector('.hero__copy--after');
  const hint = document.querySelector('.hero__hint');
  const ctx = canvas.getContext('2d');

  const COLORS = ['#FF0062', '#B43A80', '#FF8038', '#FF0062', '#B43A80', '#FF8038'];
  const VOICES = COLORS.map((color, i) => ({
    color,
    // Discord: every voice has its own pitch, tempo, volume and place on the page.
    freq: 0.7 + Math.random() * 2.6,
    speed: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.1),
    amp: 0.05 + Math.random() * 0.09,
    home: clamp(i / 5 + (Math.random() - 0.5) * 0.1), // 0..1, mapped to a band in draw()
    jitter: 5 + Math.random() * 9,
    seed: Math.random() * 100,
    // Harmony: same pitch and tempo, evenly spaced phases — a braid.
    phase: (i / COLORS.length) * Math.PI * 2,
  }));

  let w = 0, h = 0, harmony = reduced ? 1 : 0, visible = true;
  // The pointer is followed with a lag (x, y chase tx, ty) and its influence
  // fades in and out (power chases target), so nothing ever snaps.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, power: 0, target: 0, fresh: true };
  const REACH = 110;   // radius of the disturbance, px
  const PUSH = 64;     // how far a line is nudged at most, px
  let last = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(ms) {
    const t = ms / 1000;
    const dt = Math.min(0.05, (ms - last) / 1000 || 0.016);
    last = ms;
    const k = harmony;

    // Frame-rate independent easing toward the real pointer.
    const follow = 1 - Math.exp(-dt * 7);
    pointer.x += (pointer.tx - pointer.x) * follow;
    pointer.y += (pointer.ty - pointer.y) * follow;
    pointer.power += (pointer.target - pointer.power) * (1 - Math.exp(-dt * 4));
    const push = PUSH * pointer.power * (1 - 0.6 * k);

    // On narrow screens the discord is quieter and stays clear of the logo.
    const narrow = w < 700;
    const top = narrow ? 0.3 : 0.14;
    const bottom = 0.88;
    const loud = narrow ? 0.5 : 1;

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = lerp(1.4, 2, k);
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.globalAlpha = lerp(0.5, 0.9, k);

    const step = 3;
    for (const v of VOICES) {
      ctx.beginPath();
      for (let x = -step; x <= w + step; x += step) {
        const u = x / w;

        const chaosY = h * lerp(top, bottom, v.home)
          + Math.sin(u * v.freq * Math.PI * 2 + t * v.speed + v.seed) * h * v.amp * loud
          + Math.sin(u * v.jitter * Math.PI * 2 - t * v.speed * 2.3 + v.seed) * h * 0.014 * loud;

        const envelope = Math.sin(Math.PI * clamp(u));
        const tunedY = h * 0.8
          + Math.sin(u * 1.5 * Math.PI * 2 - t * 0.9 + v.phase) * h * 0.075 * envelope;

        let y = lerp(chaosY, tunedY, k);

        // Lines part around the pointer. The (dy / REACH) factor passes smoothly
        // through zero, so a line directly under the pointer isn't torn in two.
        if (push > 0.05) {
          const dx = x - pointer.x, dy = y - pointer.y;
          y += push * 1.65 * (dy / REACH) * Math.exp(-(dx * dx + dy * dy) / (2 * REACH * REACH));
        }

        x <= 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = v.color;
      ctx.stroke();
    }
  }

  function onScroll() {
    if (reduced) return;
    // The stage is pinned inside the frame's window, so it's shorter than the
    // screen; the pinned stretch is the hero's height minus the stage's.
    const travel = hero.offsetHeight - canvas.parentElement.offsetHeight;
    const p = clamp(scrollY / travel);
    harmony = smooth(0.08, 0.72, p);

    const out = smooth(0.22, 0.42, p);
    const inn = smooth(0.5, 0.7, p);
    before.style.opacity = 1 - out;
    before.style.transform = `translateY(${-out * 40}px) scale(${1 - out * 0.04})`;
    after.style.opacity = inn;
    after.style.transform = `translateY(${(1 - inn) * 40}px)`;
    after.setAttribute('aria-hidden', inn < 0.5);
    hint.style.opacity = 1 - smooth(0.02, 0.15, p);
  }

  function frame(ms) {
    if (visible) draw(ms);
    requestAnimationFrame(frame);
  }

  resize();
  addEventListener('resize', resize);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (reduced) {
    draw(0);
    addEventListener('resize', () => draw(0));
  } else {
    const stage = canvas.parentElement;
    stage.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return; // touch is for scrolling
      const r = canvas.getBoundingClientRect();
      pointer.tx = e.clientX - r.left;
      pointer.ty = e.clientY - r.top;
      if (pointer.fresh) { pointer.x = pointer.tx; pointer.y = pointer.ty; pointer.fresh = false; }
      pointer.target = 1;
    });
    stage.addEventListener('pointerleave', () => { pointer.target = 0; pointer.fresh = pointer.power < 0.02; });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
    requestAnimationFrame(frame);
  }

  /* ── Movements: one open at a time ───────────────────────────────────── */

  const moves = [...document.querySelectorAll('.move')];
  const setOpen = (target) => moves.forEach((m) => {
    const open = m === target;
    m.classList.toggle('is-open', open);
    m.querySelector('.move__head').setAttribute('aria-expanded', open);
  });
  moves.forEach((m) => {
    m.querySelector('.move__head').addEventListener('click', () =>
      setOpen(m.classList.contains('is-open') ? null : m));
    if (matchMedia('(hover: hover)').matches) m.addEventListener('mouseenter', () => setOpen(m));
  });

  /* ── Scroll reveals, lightly staggered within each section ───────────── */

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

  document.querySelectorAll('section').forEach((section) => {
    section.querySelectorAll('.reveal').forEach((el, i) => {
      el.style.setProperty('--d', `${Math.min(i, 6) * 0.09}s`);
      io.observe(el);
    });
  });

  /* ── Gentle settle: a section eases into place when a scroll stops near
     its top ───────────────────────────────────────────────────────────────
     Only section tops count, and only those that can actually reach the top
     of the window; the end of the page is a resting place of its own, never
     pulled away from. A stop just short
     of a section, in the direction you were going, is drawn forward; a
     slight overshoot is drawn back, but only a little. Anywhere else, and
     whenever a finger is down or new input arrives, nothing happens. */

  if (!reduced) {
    const root = document.documentElement;
    const edge = document.querySelector('.frame__edge');
    const sections = [...document.querySelectorAll('main > section')];
    const AHEAD = 0.22;    // reach towards where you were heading, in windows
    const BEHIND = 0.08;   // reach back after an overshoot
    const QUIET = 220;     // ms of stillness before settling

    let lastY = scrollY, dir = 0, timer = 0, touching = false, anim = 0;

    const target = () => {
      const win = edge.getBoundingClientRect();
      const max = root.scrollHeight - innerHeight;
      const y = scrollY;
      let best = null;
      for (const s of sections) {
        const top = Math.round(s.getBoundingClientRect().top - win.top + y);
        if (top > max + 1) continue;          // can't reach the top of the window
        const d = top - y;
        if (Math.abs(d) < 2) return null;     // already in place
        const reach = win.height * (Math.sign(d) === dir ? AHEAD : BEHIND);
        if (Math.abs(d) <= reach && (best === null || Math.abs(d) < Math.abs(best - y))) best = top;
      }
      // The end of the page is a resting place too: never pull away from it,
      // or from anywhere nearer to it than to the section top.
      if (best !== null && max - y < Math.abs(best - y)) return null;
      return best;
    };

    const stop = () => {
      if (!anim) return;
      cancelAnimationFrame(anim);
      anim = 0;
      root.style.scrollBehavior = '';
      lastY = scrollY;
    };

    // Starts from rest and arrives at rest: an ease-in-out, about 320–650ms.
    const glide = (to) => {
      const from = scrollY, dist = to - from, t0 = performance.now();
      const dur = clamp(Math.abs(dist) * 2.4, 320, 650);
      root.style.scrollBehavior = 'auto';    // step exactly; CSS smooth would lag each frame
      const step = (now) => {
        const p = clamp((now - t0) / dur);
        scrollTo(0, from + dist * (1 - Math.cos(Math.PI * p)) / 2);
        if (p < 1) anim = requestAnimationFrame(step);
        else { anim = 0; root.style.scrollBehavior = ''; lastY = scrollY; }
      };
      anim = requestAnimationFrame(step);
    };

    const settle = () => {
      if (touching || anim) return;
      const to = target();
      if (to !== null) glide(to);
    };
    const later = () => { clearTimeout(timer); timer = setTimeout(settle, QUIET); };

    addEventListener('scroll', () => {
      if (anim) return;
      const y = scrollY;
      if (y !== lastY) dir = Math.sign(y - lastY);
      lastY = y;
      later();
    }, { passive: true });

    // Any new input takes over at once.
    const takeOver = () => { stop(); clearTimeout(timer); };
    ['wheel', 'keydown', 'mousedown'].forEach((t) => addEventListener(t, takeOver, { passive: true }));
    addEventListener('touchstart', () => { touching = true; takeOver(); }, { passive: true });
    const lift = () => { touching = false; later(); };
    addEventListener('touchend', lift, { passive: true });
    addEventListener('touchcancel', lift, { passive: true });
  }

  /* ── Polaroid: leans toward whoever is looking at it ─────────────────── */

  const polaroid = document.getElementById('polaroid');
  if (polaroid && !reduced && matchMedia('(hover: hover)').matches) {
    polaroid.addEventListener('pointermove', (e) => {
      const r = polaroid.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      polaroid.style.setProperty('--ry', `${px * 9}deg`);
      polaroid.style.setProperty('--rx', `${-py * 9}deg`);
    });
    polaroid.addEventListener('pointerleave', () => {
      polaroid.style.setProperty('--rx', '0deg');
      polaroid.style.setProperty('--ry', '0deg');
    });
  }
})();
