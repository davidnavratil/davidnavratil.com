    // Mapa vazeb: najetí (nebo fokus klávesnicí) zvýrazní sousedy bodu nebo celý svazek, kliknutí výběr podrží.
    (function () {
      const box = document.getElementById('mapa-box'), dataEl = document.getElementById('mapa-data');
      if (!box || !dataEl) return;
      const svg = box.querySelector('svg'), info = document.getElementById('mapa-info');
      const D = JSON.parse(dataEl.textContent), F = D.f, G = D.g;
      const nodes = [...svg.querySelectorAll('.mn')], edges = [...svg.querySelectorAll('.me')], arcs = [...svg.querySelectorAll('.ma')];
      const legBtns = [...document.querySelectorAll('.mapa-leg button')];
      const empty = info.innerHTML;
      let lock = null;
      // Detail síly přes mapu: jedna věta o tom, o co jde, a síly, se kterými souvisí (na ty se dá kliknout dál).
      const det = document.createElement('div');
      det.className = 'mapa-detail'; det.hidden = true; det.setAttribute('role', 'dialog'); det.setAttribute('aria-label', 'Detail síly');
      box.appendChild(det);
      let zpet = null;
      const closeDetail = () => { det.hidden = true; info.hidden = false; if (zpet && zpet.focus) zpet.focus(); zpet = null; };
      const openDetail = id => {
        const f = F[id]; if (!f) return;
        const li = f.nb.map(x => `<li><button type="button" data-id="${x}"><i style="background:${G[F[x].g].c}"></i><span>${esc(F[x].n)}</span></button></li>`).join('');
        det.innerHTML = `<button type="button" class="md-x" aria-label="Zavřít detail">×</button>` +
          `<p class="md-m"><i style="background:${G[f.g].c}"></i>${f.t} · ${esc(G[f.g].n)}</p><h3 class="md-n">${esc(f.n)}</h3>` +
          (f.v ? `<p class="md-v">${esc(f.v)}</p>` : '') + (f.z ? `<p class="md-z">Zdroj: ${esc(f.z)}</p>` : '') +
          (f.nb.length ? `<p class="md-q">Souvisí s&nbsp;${f.nb.length} ${f.nb.length === 1 ? 'silou' : 'silami'}:</p><ul>${li}</ul>` : '');
        det.hidden = false; det.scrollTop = 0; info.hidden = true;
        det.querySelector('.md-x').focus({ preventScroll: true });
      };
      det.addEventListener('click', e => {
        if (e.target.closest('.md-x')) { lock = null; clear(); closeDetail(); return; }
        const b = e.target.closest('button[data-id]'); if (b) { lock = b.dataset.id; showNode(lock); openDetail(lock); }
      });
      const esc = t => String(t).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
      const clear = () => {
        svg.classList.remove('f');
        nodes.forEach(n => n.classList.remove('on', 'sel'));
        edges.forEach(e => e.classList.remove('on'));
        arcs.forEach(a => a.classList.remove('on'));
        legBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
        info.innerHTML = empty;
      };
      const showNode = id => {
        const f = F[id]; if (!f) return;
        const nb = new Set([id, ...f.nb]);
        svg.classList.add('f');
        nodes.forEach(n => { n.classList.toggle('on', nb.has(n.dataset.id)); n.classList.toggle('sel', n.dataset.id === id); });
        edges.forEach(e => e.classList.toggle('on', e.dataset.a === id || e.dataset.b === id));
        arcs.forEach(a => a.classList.toggle('on', +a.dataset.g === f.g));
        legBtns.forEach(b => b.setAttribute('aria-pressed', 'false'));
        const li = f.nb.map(x => `<li data-id="${x}"><i style="background:${G[F[x].g].c}"></i><span>${esc(F[x].n)}</span></li>`).join('');
        info.innerHTML = `<span class="mi-n">${esc(f.n)}</span><span class="mi-m">${f.t} · ${esc(G[f.g].n)}</span>` +
          (f.nb.length ? `<p class="mi-q">Souvisí s&nbsp;${f.nb.length} ${f.nb.length === 1 ? 'silou' : 'silami'}:</p><ul>${li}</ul>` : '<p class="mi-q">Karta zatím nemá vazby na jiné síly.</p>') +
          (lock ? '<button type="button" class="mi-x">Zrušit výběr</button>' : '');
      };
      const showGroup = g => {
        svg.classList.add('f');
        const ids = Object.keys(F).filter(x => F[x].g === g), set = new Set(ids);
        nodes.forEach(n => { n.classList.toggle('on', set.has(n.dataset.id)); n.classList.remove('sel'); });
        edges.forEach(e => e.classList.toggle('on', set.has(e.dataset.a) && set.has(e.dataset.b)));
        arcs.forEach(a => a.classList.toggle('on', +a.dataset.g === g));
        legBtns.forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.g === g)));
        const btn = legBtns.find(b => +b.dataset.g === g), q = btn ? btn.title : '';
        info.innerHTML = `<span class="mi-n">${esc(G[g].n)}</span><span class="mi-m">svazek · ${ids.length} sil</span>` + (q ? `<p class="mi-q">${esc(q)}</p>` : '') +
          `<ul>${ids.map(x => `<li data-id="${x}"><i style="background:${G[g].c}"></i><span>${esc(F[x].n)}</span></li>`).join('')}</ul>` +
          (lock ? '<button type="button" class="mi-x">Zrušit výběr</button>' : '');
      };
      const show = k => { if (!k) return clear(); if (k.startsWith('g:')) showGroup(+k.slice(2)); else showNode(k); };
      const hover = k => { if (!lock) show(k); };
      const toggle = k => { lock = lock === k ? null : k; show(lock || k); if (!lock) clear(); };
      nodes.forEach(n => {
        n.addEventListener('mouseenter', () => hover(n.dataset.id));
        n.addEventListener('mouseleave', () => hover(null));
        n.addEventListener('focus', () => hover(n.dataset.id));
        n.addEventListener('blur', () => hover(null));
        const otevri = () => { zpet = n; lock = n.dataset.id; showNode(lock); openDetail(lock); };
        n.addEventListener('click', otevri);
        n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); otevri(); } });
      });
      legBtns.forEach(b => {
        const k = 'g:' + b.dataset.g;
        b.addEventListener('mouseenter', () => hover(k));
        b.addEventListener('mouseleave', () => hover(null));
        b.addEventListener('click', () => toggle(k));
      });
      info.addEventListener('click', e => {
        if (e.target.closest('.mi-x')) { lock = null; clear(); closeDetail(); return; }
        const li = e.target.closest('li[data-id]'); if (li) { lock = li.dataset.id; showNode(lock); openDetail(lock); }
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && (lock || !det.hidden)) { lock = null; clear(); closeDetail(); } });
      // Na úzkém displeji jsou popisky skryté, mapa se proto přiblíží na samotný kruh
      const full = svg.getAttribute('viewBox'), crop = svg.dataset.crop, mq = window.matchMedia('(max-width: 700px)');
      const fit = () => svg.setAttribute('viewBox', mq.matches && crop ? crop : full);
      fit(); mq.addEventListener('change', fit);
    })();
