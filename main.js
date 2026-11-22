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
