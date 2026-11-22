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
