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
// Hero headline: letters take vivid colours and burst (EVERYTHING to the left, ONE STUDIO. to the right) while "AI," glides to the centre and zooms
const h1 = heroEl && heroEl.querySelector('h1');
const bits = [];
let aiEl = null;
const PALETTE = ['#2F7BFF', '#5AA2FF', '#FFD21F', '#FFB800', '#FF2E93', '#FF66C4']; // vivid blue, yellow and pink for the burst
const rnd = (a, b) => a + Math.random() * (b - a);
const roll = b => Object.assign(b, {
  col: PALETTE[(Math.random() * PALETTE.length) | 0],
  dx: b.dir * rnd(30, 75), dy: rnd(-45, 45), rz: rnd(-260, 260), rx: rnd(-150, 150), ry: rnd(-150, 150),
  s: rnd(.3, 2.6), d: rnd(0, .12), len: rnd(.25, .4), // burst is over by ~half-way, before the dive
});
if (h1 && !reduce) {
  h1.setAttribute('aria-label', h1.textContent.replace(/\s+/g, ' ').trim());
  h1.querySelectorAll('.line').forEach((line, li) => {
    line.setAttribute('aria-hidden', 'true');
    const lineBits = [];
    const holder = line.firstElementChild;
    [...holder.childNodes].forEach(n => {
      if (n.nodeType !== 3) { if (!aiEl) aiEl = n; else lineBits.push({ el: n, colored: false }); return; } // "AI" zooms; the comma bursts with ONE STUDIO.
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(tok => {
        if (!tok) return;
        if (/^\s+$/.test(tok)) { frag.append(tok); return; }
        const word = document.createElement('span');
        word.className = 'word';
        [...tok].forEach(c => {
          const ch = document.createElement('span');
          ch.className = 'ch'; ch.textContent = c;
          word.append(ch); lineBits.push({ el: ch, colored: true });
        });
        frag.append(word);
      });
      n.replaceWith(frag);
    });
    lineBits.forEach(b => { b.dir = li === 0 ? -1 : 1; bits.push(roll(b)); }); // line 1 bursts left, line 2 right
  });
}
const easeInOut = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
let flash = null; // full-screen colour flash that completes the dive (text stops rendering at extreme zoom)
let ai = null; // AI's offset to the hero centre and its target zoom, measured at rest
const measureAI = () => {
  if (!aiEl) return;
  const prev = aiEl.style.transform;
  aiEl.style.transform = '';
  const r = aiEl.getBoundingClientRect(), hr = heroEl.getBoundingClientRect();
  ai = {
    dx: hr.left + hr.width / 2 - (r.left + r.width / 2),
    dy: hr.top + hr.height / 2 - (r.top + r.height / 2),
    s: Math.min(hr.width * .6 / r.width, hr.height * .55 / r.height), // logo size before the dive
  };
  // dive target: the middle of the slanted "I" stem, found by drawing "AI" on a canvas and scanning its ink at
  // mid-cap height, so flying into it floods the screen with the gradient instead of passing through a gap
  const rg = document.createRange();
  rg.selectNodeContents(aiEl);
  const tr = rg.getBoundingClientRect(), cs = getComputedStyle(aiEl), fs = parseFloat(cs.fontSize);
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  const m = ctx.measureText('AI'), aW = ctx.measureText('A').width, capH = ctx.measureText('I').actualBoundingBoxAscent;
  const pad = Math.ceil(fs * .5), W = Math.ceil(m.width + pad * 2), y = Math.round(m.fontBoundingBoxAscent - capH / 2);
  ctx.canvas.width = W; ctx.canvas.height = Math.ceil(m.fontBoundingBoxAscent + m.fontBoundingBoxDescent);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
  ctx.fillText('AI', pad, m.fontBoundingBoxAscent);
  const row = ctx.getImageData(0, y, W, 1).data;
  let best = null, start = -1;
  for (let x = 0; x <= W; x++) {
    const ink = x < W && row[x * 4 + 3] > 128 && x - pad > aW * .85; // only the I's ink
    if (ink && start < 0) start = x;
    if (!ink && start >= 0) { if (!best || x - start > best[1] - best[0]) best = [start, x]; start = -1; }
  }
  const sx = best ? (best[0] + best[1]) / 2 - pad : aW + (m.width - aW) / 2;
  ai.ox = tr.left + sx - (r.left + r.width / 2);
  ai.oy = tr.top + y - (r.top + r.height / 2);
  aiEl.style.transform = prev;
};
let lastHp = 0;
const explode = hp => {
  if (!bits.length) return;
  if (hp > 0 && (lastHp === 0 || !ai)) measureAI();
  if (aiEl && ai) {
    // phase 1 (0-45%): glide to centre and grow into a logo. phase 2 (45-82%): Netflix-style dive into the "I"
    // that accelerates until the gradient floods the screen. 82-90%: hold the colour flash. 90-100%: fade, then the next section arrives.
    const c = easeInOut(clamp01(hp / .45));
    const dz = clamp01((hp - .45) / .37), aim = easeInOut(dz);
    const sc = (1 + (ai.s - 1) * c) * Math.pow(16, dz * dz); // capped (~100x): browsers drop clipped-gradient text far beyond this
    const tx = ai.dx * c - ai.ox * sc * aim, ty = ai.dy * c - ai.oy * sc * aim; // keeps the stem point sliding onto the screen centre
    aiEl.style.transform = hp ? `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${sc.toFixed(3)})` : '';
    aiEl.style.opacity = hp > .82 ? '0' : '';
    if (!flash) { flash = document.createElement('div'); flash.className = 'ai-flash'; flash.setAttribute('aria-hidden', 'true'); heroEl.append(flash); }
    // floods in over the last part of the dive, holds, then fades so the next section can arrive
    flash.style.opacity = (hp < .9 ? clamp01((dz - .55) / .45) : 1 - clamp01((hp - .9) / .1)).toFixed(3);
  }
  if (hp === 0 && lastHp > 0) bits.forEach(b => { roll(b); b.k = b.glow = undefined; }); // new random burst every time the hero is back at rest
  lastHp = hp;
  h1.classList.toggle('boom', hp > 0);
  const k = clamp01(hp / .08); // letters are fully coloured within the first few pixels of scroll
  bits.forEach(b => {
    const t = clamp01((hp - b.d) / b.len), e = 1 - (1 - t) ** 3;
    const st = b.el.style;
    st.transform = t ? `perspective(800px) translate3d(${(b.dx * e).toFixed(2)}vw, ${(b.dy * e).toFixed(2)}vh, 0) rotateX(${(b.rx * e).toFixed(1)}deg) rotateY(${(b.ry * e).toFixed(1)}deg) rotate(${(b.rz * e).toFixed(1)}deg) scale(${(1 + (b.s - 1) * e).toFixed(3)})` : '';
    st.opacity = t > .55 ? (1 - (t - .55) / .45).toFixed(3) : '';
    if (b.colored) {
      if (k !== b.k) { b.k = k; st.color = k ? `color-mix(in oklch, ${b.col} ${(k * 100).toFixed(0)}%, #F5F1EA)` : ''; }
      const glow = t > 0; // fixed glow (toggled once) so letters never repaint their shadow mid-flight
      if (glow !== b.glow) { b.glow = glow; st.textShadow = glow ? `0 0 22px ${b.col}` : ''; }
    }
  });
};
let ticking = false;
const clamp01 = v => Math.min(1, Math.max(0, v));
const progressEl = document.querySelector('.progress');
// Hero progress glides toward the scroll position (both directions) instead of jumping with each wheel step
let hpTarget = 0, hpCur = 0, hraf = 0;
const heroStep = () => {
  hpCur += (hpTarget - hpCur) * .12;
  if (Math.abs(hpTarget - hpCur) < .0005) hpCur = hpTarget;
  // vars live on the hero, not :root, so only the hero restyles each frame
  heroEl.style.setProperty('--hp', hpCur.toFixed(4));
  heroEl.style.setProperty('--dim', (1 - (1 - clamp01(hpCur / .4)) ** 2).toFixed(4)); // ease-out: darkens right away, near-black by 40%
  explode(hpCur);
  hraf = hpCur !== hpTarget ? requestAnimationFrame(heroStep) : 0;
};
const onScroll = () => {
  ticking = false;
  const vh = innerHeight, y = scrollY;
  if (progressEl) progressEl.style.setProperty('--sp', clamp01(y / (root.scrollHeight - vh)).toFixed(4));
  root.classList.toggle('scrolled', y > 40);
  if (man) {
    const r = man.getBoundingClientRect();
    const p = clamp01((.85 * vh - r.top) / (.6 * vh + r.height));
    const N = pieces.length;
    pieces.forEach((el, i) => el.style.setProperty('--t', clamp01((p - (i / N - .08)) / .12).toFixed(3)));
  }
  if (reduce) return;
  if (heroEl) {
    hpTarget = clamp01(y / Math.max(1, heroEl.parentElement.offsetHeight - vh)); // progress through the pinned runway
    if (!hraf && hpTarget !== hpCur) hraf = requestAnimationFrame(heroStep);
  }
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
addEventListener('resize', () => { if (hpCur > 0) { measureAI(); explode(hpCur); } onScroll(); });
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
