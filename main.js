const yr = document.getElementById('yr');
if (yr) yr.textContent = new Date().getFullYear();

// Lazy-load and play section videos only while on screen
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const vio = new IntersectionObserver(entries => entries.forEach(e => {
  const v = e.target;
  if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; if (!reduce) v.play().catch(() => {}); }
  else v.pause();
}), { rootMargin: '200px' });
document.querySelectorAll('video[data-src]').forEach(v => vio.observe(v));

const rio = new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); }
}), { threshold: .15 });
document.querySelectorAll('.reveal').forEach(el => rio.observe(el));

// Inner pages: video card that follows the cursor over service rows (mouse users only)
const rows = document.querySelectorAll('.row[data-video]');
if (rows.length && matchMedia('(hover: hover) and (pointer: fine)').matches && !reduce) {
  const peek = document.createElement('div');
  peek.className = 'peek';
  peek.setAttribute('aria-hidden', 'true');
  const vids = [...rows].map(r => {
    const v = document.createElement('video');
    v.muted = v.loop = v.playsInline = true;
    v.preload = 'none';
    v.dataset.lazy = r.dataset.video;
    return peek.appendChild(v);
  });
  document.body.appendChild(peek);
  let x = 0, y = 0, tx = 0, ty = 0, s = 0, ts = 0, raf = 0;
  addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  const step = () => {
    const dx = tx - x;
    x += dx * .14; y += (ty - y) * .14; s += (ts - s) * .16;
    const tilt = Math.max(-12, Math.min(12, dx * .08));
    peek.style.transform = `translate3d(${x + 28}px, ${y - 135}px, 0) rotate(${tilt}deg) scale(${.6 + .4 * s})`;
    peek.style.opacity = s;
    if (ts || s > .01) raf = requestAnimationFrame(step);
    else { peek.style.opacity = 0; vids.forEach(v => v.pause()); }
  };
  rows.forEach((r, i) => {
    r.addEventListener('mouseenter', e => {
      if (s < .05) { x = tx = e.clientX; y = ty = e.clientY; }
      ts = 1;
      vids.forEach((v, j) => {
        if (j !== i) { v.classList.remove('on'); v.pause(); return; }
        if (!v.src) v.src = v.dataset.lazy;
        v.classList.add('on');
        v.play().catch(() => {});
      });
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
    });
    r.addEventListener('mouseleave', () => { ts = 0; });
  });
}

// ===== Homepage scroll effects (one rAF-throttled handler) =====
const root = document.documentElement;
const heroEl = document.querySelector('.hero');
const drifts = [...document.querySelectorAll('[data-drift]')];
const cardVids = [...document.querySelectorAll('.card video')];
const man = document.querySelector('.manifesto p');
let pieces = [];
if (man) {
  // split text nodes into word spans; highlighted words and video pills count as one piece each
  [...man.childNodes].forEach(n => {
    if (n.nodeType !== 3) { pieces.push(n); return; }
    const frag = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach(t => {
      if (!t) return;
      if (/^\s+$/.test(t)) { frag.append(t); return; }
      const w = document.createElement('span');
      w.className = 'w'; w.textContent = t;
      frag.append(w); pieces.push(w);
    });
    n.replaceWith(frag);
  });
}
let ticking = false;
const clamp01 = v => Math.min(1, Math.max(0, v));
const onScroll = () => {
  ticking = false;
  const vh = innerHeight, y = scrollY;
  root.style.setProperty('--sp', clamp01(y / (root.scrollHeight - vh)).toFixed(4));
  root.classList.toggle('scrolled', y > 40);
  if (man) {
    const r = man.getBoundingClientRect();
    const p = clamp01((.85 * vh - r.top) / (.6 * vh + r.height));
    const N = pieces.length;
    pieces.forEach((el, i) => el.style.setProperty('--t', clamp01((p - (i / N - .08)) / .12).toFixed(3)));
  }
  if (reduce) return;
  if (heroEl && y < vh * 1.2) root.style.setProperty('--hp', clamp01(y / vh).toFixed(4));
  drifts.forEach(el => {
    const top = el.parentElement.getBoundingClientRect().top;
    const q = clamp01(1 - (top - vh * .6) / (vh * .4)); // settles once the heading is 60% up the screen
    el.style.translate = `${((1 - q) * 10 * el.dataset.drift).toFixed(2)}vw 0`;
  });
  cardVids.forEach(v => {
    const r = v.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    v.style.translate = `0 ${((r.top + r.height / 2 - vh / 2) * -.07).toFixed(1)}px`;
  });
};
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', onScroll);
onScroll();

// Marquee tapes: follow scroll direction, speed up and lean with scroll velocity (rows run opposite ways)
const tracks = [...document.querySelectorAll('.marquee .track')];
if (tracks.length && !reduce) {
  const st = tracks.map(t => { t.style.animation = 'none'; return { t, x: 0, d: +(t.dataset.dir || 1) }; });
  let dir = 1, boost = 0, lastY = scrollY, lastT = performance.now(), on = false;
  const tick = now => {
    const dt = Math.min(64, now - lastT) / 16.67; lastT = now;
    const dy = scrollY - lastY; lastY = scrollY;
    if (dy) dir = dy > 0 ? 1 : -1;
    boost += (Math.min(Math.abs(dy), 80) * .35 - boost) * .12;
    const skew = -dir * Math.min(boost, 4);
    st.forEach(s => {
      const W = s.t.scrollWidth / 2;
      s.x -= dir * s.d * (1 + boost) * dt;
      if (s.x <= -W) s.x += W; else if (s.x > 0) s.x -= W;
      s.t.style.transform = `translate3d(${s.x.toFixed(1)}px,0,0) skewX(${(skew * s.d).toFixed(2)}deg)`;
    });
    if (on) requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !on) { on = true; lastT = performance.now(); lastY = scrollY; requestAnimationFrame(tick); }
    else if (!e.isIntersecting) on = false;
  }).observe(tracks[0].closest('.tapes') || tracks[0]);
}

const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

// Hero: colour glow follows the pointer; headline lines and video shift with it for depth
const glowEl = document.querySelector('.hero .glow');
if (heroEl && glowEl && fine && !reduce) {
  let gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy, graf = 0;
  const gstep = () => {
    gx += (tx - gx) * .12; gy += (ty - gy) * .12;
    heroEl.style.setProperty('--gx', gx.toFixed(1) + 'px');
    heroEl.style.setProperty('--gy', gy.toFixed(1) + 'px');
    heroEl.style.setProperty('--px', (gx / heroEl.offsetWidth - .5).toFixed(3) * 2);
    heroEl.style.setProperty('--py', (gy / heroEl.offsetHeight - .5).toFixed(3) * 2);
    graf = Math.abs(tx - gx) + Math.abs(ty - gy) > .5 ? requestAnimationFrame(gstep) : 0;
  };
  heroEl.addEventListener('pointermove', e => {
    const r = heroEl.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top;
    heroEl.style.setProperty('--go', 1);
    if (!graf) graf = requestAnimationFrame(gstep);
  });
  heroEl.addEventListener('pointerleave', () => heroEl.style.setProperty('--go', 0));
}

// Magnetic buttons: drift a fifth of the way toward the cursor, ease back slower
if (fine && !reduce) document.querySelectorAll('.magnet').forEach(wrap => {
  const inner = wrap.firstElementChild;
  let active = false, mraf = 0, mx = 0, my = 0;
  const update = () => {
    mraf = 0;
    const r = wrap.getBoundingClientRect();
    const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
    if (Math.abs(dx) < r.width / 2 + 60 && Math.abs(dy) < r.height / 2 + 60) {
      if (!active) { active = true; inner.style.transition = 'transform .3s ease-out'; }
      inner.style.transform = `translate3d(${dx / 5}px, ${dy / 5}px, 0)`;
    } else if (active) {
      active = false;
      inner.style.transition = 'transform .6s ease-in-out';
      inner.style.transform = 'translate3d(0,0,0)';
    }
  };
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; if (!mraf) mraf = requestAnimationFrame(update); }, { passive: true });
});

// Custom cursor: exact dot + lagging ring that swells over anything clickable
if (fine && innerWidth >= 1024) {
  const dot = document.createElement('div'), ring = document.createElement('div');
  dot.className = 'cur-dot'; ring.className = 'cur-ring';
  dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
  document.body.append(dot, ring);
  let cx = -100, cy = -100, rx = cx, ry = cy, craf = 0;
  const cstep = () => {
    rx += (cx - rx) * (reduce ? 1 : .18); ry += (cy - ry) * (reduce ? 1 : .18);
    ring.style.transform = `translate3d(${rx.toFixed(1)}px, ${ry.toFixed(1)}px, 0)`;
    craf = Math.abs(cx - rx) + Math.abs(cy - ry) > .3 ? requestAnimationFrame(cstep) : 0;
  };
  addEventListener('pointermove', e => {
    cx = e.clientX; cy = e.clientY;
    dot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    root.classList.add('has-cursor');
    ring.classList.toggle('hot', !!e.target.closest('a, button, .row, .phase'));
    if (!craf) craf = requestAnimationFrame(cstep);
  }, { passive: true });
  document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
}
