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

// Marquee: follows scroll direction, speeds up and leans with scroll velocity
const track = document.querySelector('.marquee .track');
if (track && !reduce) {
  track.style.animation = 'none';
  let mx = 0, dir = 1, boost = 0, lastY = scrollY, lastT = performance.now(), on = false;
  const tick = t => {
    const dt = Math.min(64, t - lastT) / 16.67; lastT = t;
    const dy = scrollY - lastY; lastY = scrollY;
    if (dy) dir = dy > 0 ? 1 : -1;
    boost += (Math.min(Math.abs(dy), 80) * .35 - boost) * .12;
    const W = track.scrollWidth / 2;
    mx -= dir * (1 + boost) * dt;
    if (mx <= -W) mx += W; else if (mx > 0) mx -= W;
    track.style.transform = `translate3d(${mx.toFixed(1)}px,0,0) skewX(${(-dir * Math.min(boost, 12)).toFixed(2)}deg)`;
    if (on) requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !on) { on = true; lastT = performance.now(); lastY = scrollY; requestAnimationFrame(tick); }
    else if (!e.isIntersecting) on = false;
  }).observe(track);
}
