(() => {
  const STORAGE_KEY = 'lexeis-words-v1';
  // Your edits live in this browser (localStorage). data/words.js is the starting list.
  const state = (() => {
    try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved && Array.isArray(saved.words)) return saved; } catch {}
    return JSON.parse(JSON.stringify(window.LEXEIS_DATA || { cats: [], words: [] }));
  })();
  // state = { cats: [{id, name}], words: [{id, g, p, e, c, n?}] }

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const catById = id => state.cats.find(c => c.id === id);
  const catByName = name => state.cats.find(c => c.name.toLowerCase() === String(name || '').trim().toLowerCase());
  const wordsIn = id => state.words.filter(w => w.c === id);
  const plural = n => n + (n === 1 ? ' word' : ' words');
  const nextId = (list, prefix) => prefix + (Math.max(0, ...list.map(x => parseInt(x.id.slice(1), 10) || 0)) + 1);
  const normGreek = g => String(g || '').toLowerCase().normalize('NFC').replace(/[!;.…?¿,]/g, '').replace(/\s+/g, ' ').trim();
  const hasGreek = s => /[Ͱ-Ͽἀ-῿]/.test(s);

  /* ---------- Greek → IPA (spelling rules; same style as the word list) ---------- */
  const ACC = { 'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω', 'ΐ': 'ϊ', 'ΰ': 'ϋ' };
  const VOICELESS = 'θκξπστφχψς';
  const ONSETS = new Set(['pr','tr','kr','pl','kl','fr','fl','vr','vl','ɣr','ɣl','θr','xr','xl','br','dr','gr','bl','gl','sp','st','sk','sx','sf','sθ','spr','str','skr','skl','sm','sn','kt','pt','fθ','xθ','ɣn','mn','ks','ps','ts','dz','vɣ','ðr','θn','kn','pn','zm','zv','zɣ','sl','vð']);
  const VMAP = { 'α': 'a', 'ε': 'e', 'η': 'i', 'ι': 'i', 'ϊ': 'i', 'ο': 'o', 'υ': 'i', 'ϋ': 'i', 'ω': 'o' };
  const CMAP = { 'β': 'v', 'γ': 'ɣ', 'δ': 'ð', 'ζ': 'z', 'θ': 'θ', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'ks', 'π': 'p', 'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'φ': 'f', 'χ': 'x', 'ψ': 'ps' };
  function wordIpa(raw) {
    const w = raw.toLowerCase().normalize('NFC').replace(/[^α-ωάέήίόύώϊϋΐΰ]/g, '');
    if (!w) return '';
    const stressed = ch => ch in ACC;
    const base = ch => ACC[ch] || ch;
    const out = []; // [sound, isVowel, stressed, fromDigraph]
    const n = w.length;
    let i = 0;
    while (i < n) {
      const c = w[i], b = base(c), nx = i + 1 < n ? w[i + 1] : '', nb = nx ? base(nx) : '';
      if ('αεο'.includes(b) && nb === 'υ' && !'ϋΰ'.includes(nx)) {
        if (b === 'ο') { out.push(['u', true, stressed(nx) || stressed(c), false]); i += 2; continue; }
        const after = i + 2 < n ? w[i + 2] : '';
        const v = (!after || VOICELESS.includes(base(after))) ? 'f' : 'v';
        out.push([b === 'α' ? 'a' : 'e', true, stressed(nx) || stressed(c), false]);
        out.push([v, false, false, false]); i += 2; continue;
      }
      if (b === 'α' && nb === 'ι' && !'ϊΐ'.includes(nx) && !stressed(c)) { out.push(['e', true, stressed(nx), false]); i += 2; continue; }
      if ('εου'.includes(b) && nb === 'ι' && !'ϊΐ'.includes(nx) && !stressed(c)) { out.push(['i', true, stressed(nx), true]); i += 2; continue; }
      if (b in VMAP) { out.push([VMAP[b], true, stressed(c) || 'ΐΰ'.includes(c), false]); i += 1; continue; }
      const two = b + nb, initial = out.length === 0;
      if (two === 'μπ') { out.push([initial ? 'b' : 'mb', false, false, false]); i += 2; continue; }
      if (two === 'ντ') { out.push([initial ? 'd' : 'nd', false, false, false]); i += 2; continue; }
      if (two === 'γγ' && i + 2 < n && base(w[i + 2]) === 'ν') { out.push(['ɣ', false, false, false]); i += 2; continue; }
      if (two === 'γκ' || two === 'γγ') { out.push([initial ? 'g' : 'ŋg', false, false, false]); i += 2; continue; }
      if (two === 'τσ') { out.push(['ts', false, false, false]); i += 2; continue; }
      if (two === 'τζ') { out.push(['dz', false, false, false]); i += 2; continue; }
      if (b === nb && 'βκλμνπρστφ'.includes(b)) { i += 1; continue; }
      if (b === 'γ' && nb && 'χξ'.includes(nb)) { out.push(['ŋ', false, false, false]); i += 1; continue; }
      if (b in CMAP) { out.push([CMAP[b], false, false, false]); i += 1; continue; }
      i += 1;
    }
    for (let k = 0; k < out.length - 1; k++) {
      if (out[k][0] === 's' && !out[k][1] && ['v','ɣ','ð','m','n','r','l','z','b','d','g'].includes(out[k + 1][0])) out[k][0] = 'z';
    }
    const stIdx = out.map((o, k) => o[2] ? k : -1).filter(k => k >= 0);
    stIdx.slice(0, -1).forEach(k => { out[k][2] = false; });
    const stressAt = stIdx.length ? stIdx[stIdx.length - 1] : out.length;
    const res = [];
    for (let k = 0; k < out.length; k++) {
      const [s, isV, st, dg] = out[k];
      if (isV && s === 'i' && !st && !dg && k + 1 < out.length && out[k + 1][1] && k + 1 <= stressAt && k > 0 && !out[k - 1][1] && (k < 2 || out[k - 2][1])) {
        const prev = res[res.length - 1];
        if (prev[0] === 'ɣ') prev[0] = 'j';
        else if (prev[0] === 'x') prev[0] = 'ç';
        else if (prev[0] === 'k') prev[0] = 'kj';
        else if (prev[0] === 'l') prev[0] = 'lj';
        else if (prev[0] === 'n') prev[0] = 'nj';
        else res.push(['j', false, false]);
        continue;
      }
      res.push([s, isV, st]);
    }
    if (res.length > 2 && res[0][0] === 'ɣ' && res[1][0] === 'i' && res[2][1] && !res[1][2]) { res[0][0] = 'j'; res.splice(1, 1); }
    for (let k = 0; k < res.length - 1; k++) {
      if (res[k + 1][0] === 'e' || res[k + 1][0] === 'i') {
        if (res[k][0] === 'ɣ') res[k][0] = 'j';
        else if (res[k][0] === 'x') res[k][0] = 'ç';
      }
    }
    const vowels = res.filter(r => r[1]).length;
    let s = '';
    res.forEach(([snd, isV, st], k) => {
      if (isV && st && vowels > 1) {
        const cons = [];
        let m = k - 1;
        while (m >= 0 && !res[m][1]) { cons.unshift(res[m][0]); m--; }
        let best = 0;
        for (let L = 1; L <= cons.length; L++) {
          const cl = cons.slice(-L).join('');
          if (L === 1 || ONSETS.has(cl)) best = L; else break;
        }
        if (m < 0) best = cons.length;
        let cut = best ? cons.slice(-best).join('').length : 0;
        if (best && ['mb', 'nd', 'ŋg'].includes(cons[cons.length - best])) cut -= 1;
        s = s.slice(0, s.length - cut) + 'ˈ' + s.slice(s.length - cut);
      }
      s += snd;
    });
    return s;
  }
  function phraseIpa(text) {
    const t = String(text || '').replace(/\([^)]*\)/g, '').split(',')[0];
    return t.split('/').map(p => {
      p = p.trim();
      const parts = p.split(/\s+/);
      if (parts.length === 2 && ['ο', 'η', 'το', 'τα', 'οι'].includes(parts[0])) p = parts[1];
      const ws = p.split(/\s+/).map(wordIpa).filter(Boolean);
      return ws.length ? '[' + ws.join(' ') + ']' : '';
    }).filter(Boolean).join(' / ');
  }

  // Rough guess for when Claude isn't available.
  function guessCategory(g, e) {
    const pick = name => catByName(name)?.name || null;
    if (/^\d+$/.test(String(e).trim())) return pick('Numbers');
    if (/\(-|, ?-/.test(g)) return pick('Adjectives');
    const one = g.trim().split(/\s+/);
    if (one.length === 1 && /(ω|ώ|ομαι|άμαι|ούμαι)$/.test(one[0].toLowerCase())) return pick('Verbs');
    if (/^(ο|η|το|τα|οι)\s/i.test(g.trim())) return pick('Nouns');
    if (one.length > 2) return pick('Phrases');
    return null;
  }

  /* ---------- Shell ---------- */
  const root = document.getElementById('root');
  root.innerHTML = `
    <header class="topbar">
      <button class="app-name" id="home" type="button" aria-label="Λέξεις, back to cards">Λέξεις</button>
      <button class="menu-btn" id="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">
        <span></span><span></span><span></span>
      </button>
    </header>
    <div class="scrim" id="scrim"></div>
    <nav class="drawer" id="drawer" aria-label="Main menu" inert>
      <button type="button" data-go="">Cards</button>
      <button type="button" data-go="categories">Categories</button>
      <button type="button" data-go="add">Add words</button>
      <button type="button">Test</button>
    </nav>
    <main id="main"></main>`;

  const html = document.documentElement;
  const menuBtn = $('#menu-btn');
  const drawer = $('#drawer');
  function setMenu(open) {
    html.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.inert = !open;
  }
  menuBtn.addEventListener('click', () => setMenu(!html.classList.contains('menu-open')));
  $('#scrim').addEventListener('click', () => setMenu(false));
  drawer.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    setMenu(false);
    if ('go' in b.dataset) go(b.dataset.go);
  }));
  $('#home').addEventListener('click', () => { setMenu(false); go(''); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSheet(); setMenu(false); }
    if (currentView === 'cards' && !sheetOpen()) {
      if (e.key === 'ArrowRight') answer(true);
      if (e.key === 'ArrowLeft') answer(false);
    }
  });

  /* ---------- Routing (#categories, #c12, #add) ---------- */
  let currentView = '';
  let editing = false;
  function go(hash) {
    editing = false;
    if (hash) { if (location.hash.slice(1) === hash) route(); else location.hash = hash; }
    else { history.pushState('', '', location.pathname + location.search); route(); }
  }
  function route() {
    const h = location.hash.slice(1);
    if (h === 'categories') renderCategories();
    else if (h === 'add') renderAdd();
    else if (/^c\d+$/.test(h) && catById(h)) renderCategory(h);
    else renderCards();
  }
  window.addEventListener('hashchange', () => { editing = false; route(); });

  /* ---------- Learning status ---------- */
  // A word starts as new. Its first review moves it to absorbing. SOLID_AFTER "knew it"
  // answers in a row make it solid; a "didn't know" resets the run (and a solid word
  // goes back to absorbing).
  const SOLID_AFTER = 3;
  const STATUS = { new: 'New', learning: 'Absorbing', solid: 'Solid' };
  const statusOf = w => w.s || 'new';
  function review(w, knew) {
    if (knew) { w.k = (w.k || 0) + 1; w.s = w.k >= SOLID_AFTER ? 'solid' : 'learning'; }
    else { w.k = 0; w.s = 'learning'; }
  }
  function setStatus(w, s) {
    if (s === 'new') { delete w.s; delete w.k; }
    else if (s === 'solid') { w.s = 'solid'; w.k = Math.max(w.k || 0, SOLID_AFTER); }
    else { w.s = 'learning'; w.k = Math.min(w.k || 0, SOLID_AFTER - 1); }
  }

  /* ---------- Card deck ---------- */
  const PILES = [['all', 'All'], ['new', 'New'], ['learning', 'Absorbing'], ['solid', 'Solid']];
  let pile = 'all';
  try { const p = localStorage.getItem('lexeis-pile'); if (PILES.some(([k]) => k === p)) pile = p; } catch {}
  let deck = [];
  let pos = 0;
  const shuffle = ids => { for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } return ids; };
  function buildDeck() {
    const inPile = w => pile === 'all' || statusOf(w) === pile;
    const ws = state.words.filter(inPile);
    // In "All", words still being learned come before solid ones.
    deck = [...shuffle(ws.filter(w => statusOf(w) !== 'solid').map(w => w.id)), ...shuffle(ws.filter(w => statusOf(w) === 'solid').map(w => w.id))];
    pos = 0;
  }
  buildDeck();
  const fitSize = text => { const n = text.length; return n <= 10 ? 12.5 : n <= 15 ? 10 : n <= 22 ? 8 : n <= 34 ? 6.6 : 5.6; };
  const pileCount = k => k === 'all' ? state.words.length : state.words.filter(w => statusOf(w) === k).length;

  function renderCards() {
    currentView = 'cards';
    $('#main').innerHTML = `
      <section class="view-cards">
        <div class="piles" role="group" aria-label="Which words to study">
          ${PILES.map(([k, label]) => `<button type="button" class="pile${k === pile ? ' on' : ''}" data-pile="${k}" aria-pressed="${k === pile}">${label} <span>${pileCount(k)}</span></button>`).join('')}
        </div>
        <div class="scene" id="scene">
          <button class="card" id="card" type="button"></button>
          <div class="verdict verdict-yes" aria-hidden="true">Knew it</div>
          <div class="verdict verdict-no" aria-hidden="true">Didn’t know</div>
        </div>
        <div class="answers">
          <button class="answer" type="button" id="ans-no">← Didn’t know</button>
          <span class="hint">tap the card to flip</span>
          <button class="answer" type="button" id="ans-yes">Knew it →</button>
        </div>
      </section>`;
    paintCard();
    $('#main').querySelectorAll('[data-pile]').forEach(b => b.addEventListener('click', () => {
      pile = b.dataset.pile;
      try { localStorage.setItem('lexeis-pile', pile); } catch {}
      buildDeck();
      renderCards();
    }));
    $('#ans-no').addEventListener('click', () => answer(false));
    $('#ans-yes').addEventListener('click', () => answer(true));

    // Drag the card: right = knew it, left = didn't know.
    const scene = $('#scene'), card = $('#card');
    let sx = 0, sy = 0, dx = 0, down = false, dragged = false;
    const yes = $('.verdict-yes', scene), no = $('.verdict-no', scene);
    const showDrag = () => {
      scene.style.translate = `${dx}px 0`;
      scene.style.rotate = `${dx / 40}deg`;
      yes.style.opacity = Math.max(0, Math.min(1, dx / 90));
      no.style.opacity = Math.max(0, Math.min(1, -dx / 90));
    };
    card.addEventListener('pointerdown', e => {
      if (!currentWord() || answering) return;
      down = true; dragged = false; sx = e.clientX; sy = e.clientY; dx = 0;
      scene.classList.add('dragging');
    });
    card.addEventListener('pointermove', e => {
      if (!down) return;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if (!dragged && Math.abs(mx) > 10 && Math.abs(mx) > Math.abs(my)) { dragged = true; try { card.setPointerCapture(e.pointerId); } catch {} }
      if (dragged) { dx = mx; showDrag(); }
    });
    const release = () => {
      if (!down) return;
      down = false;
      scene.classList.remove('dragging');
      if (dragged && Math.abs(dx) > 90) answer(dx > 0);
      else { dx = 0; showDrag(); }
    };
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
    card.addEventListener('click', () => {
      if (dragged) { dragged = false; return; }
      card.classList.toggle('flipped');
      labelCard();
    });
  }
  function currentWord() {
    deck = deck.filter(id => state.words.some(w => w.id === id));
    if (!deck.length) return null;
    pos = ((pos % deck.length) + deck.length) % deck.length;
    return state.words.find(w => w.id === deck[pos]);
  }
  function paintCard() {
    const card = $('#card');
    if (!card) return;
    const w = currentWord();
    ['#ans-no', '#ans-yes'].forEach(id => { const b = $(id); if (b) b.disabled = !w; });
    if (!w) {
      const msg = pile === 'all' ? 'No words yet' : `No ${STATUS[pile].toLowerCase()} words`;
      card.innerHTML = `<div class="face front"><div class="word" style="--fs:7">${msg}</div></div>`;
      return;
    }
    const st = statusOf(w);
    const dots = st === 'learning'
      ? `<span class="dots" aria-label="${w.k || 0} of ${SOLID_AFTER}">${Array.from({ length: SOLID_AFTER }, (_, i) => `<i class="${i < (w.k || 0) ? 'on' : ''}"></i>`).join('')}</span>`
      : '';
    card.innerHTML = `
      <div class="face front">
        <div class="word" lang="el" style="--fs:${fitSize(w.g)}">${esc(w.g)}</div>
        ${w.p ? `<div class="ipa">${esc(w.p)}</div>` : ''}
        <div class="tag status-${st}">${STATUS[st]}${dots}</div>
      </div>
      <div class="face back">
        <div class="word" style="--fs:${fitSize(w.e)}">${esc(w.e)}</div>
        <div class="tag">English</div>
      </div>`;
    labelCard();
  }
  function labelCard() {
    const card = $('#card'), w = currentWord();
    if (!card || !w) return;
    card.setAttribute('aria-label', card.classList.contains('flipped')
      ? `Flashcard: ${w.e}. Tap to show Greek.`
      : `Flashcard: ${w.g}, ${STATUS[statusOf(w)]}. Tap to show English.`);
  }
  let answering = false;
  function answer(knew) {
    const scene = $('#scene'), card = $('#card'), w = currentWord();
    if (!scene || !w || answering) return;
    answering = true;
    const before = statusOf(w);
    review(w, knew);
    const after = statusOf(w);
    save(after === 'solid' && before !== 'solid' ? `${w.g} is solid now` : null);
    scene.classList.add(knew ? 'fly-right' : 'fly-left');
    setTimeout(() => {
      pos += 1;
      if (pos >= deck.length) buildDeck();
      scene.classList.add('no-anim');
      scene.classList.remove('fly-right', 'fly-left');
      scene.style.translate = ''; scene.style.rotate = '';
      scene.querySelectorAll('.verdict').forEach(v => { v.style.opacity = ''; });
      card.classList.remove('flipped');
      paintCard();
      $('#main').querySelectorAll('[data-pile] span').forEach(sp => { sp.textContent = pileCount(sp.parentElement.dataset.pile); });
      scene.classList.add('enter');
      void scene.offsetWidth;
      scene.classList.remove('no-anim', 'enter');
      answering = false;
    }, 260);
  }

  /* ---------- Edit toggle ---------- */
  const PENCIL = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M10.8 2.2l3 3L5.5 13.5 2 14l.5-3.5z"/><path d="M9.3 3.7l3 3"/></svg>';
  const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2.5 8.5l3.5 3.5 7.5-8"/></svg>';
  const CHEVRON = '<svg class="row-pencil" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M10.8 2.2l3 3L5.5 13.5 2 14l.5-3.5z"/></svg>';
  const editButton = what => `<button class="edit-btn${editing ? ' on' : ''}" type="button" id="edit-toggle" aria-pressed="${editing}" aria-label="${editing ? 'Done editing' : 'Edit ' + what}">${editing ? CHECK : PENCIL}</button>`;
  function wireEditToggle() {
    $('#edit-toggle').addEventListener('click', () => { editing = !editing; route(); });
  }

  /* ---------- Categories ---------- */
  function renderCategories() {
    currentView = 'categories';
    $('#main').innerHTML = `
      <section class="view-list${editing ? ' is-editing' : ''}">
        <div class="title-row">
          <h2 class="page-title">Categories</h2>
          ${editButton('categories')}
        </div>
        <p class="page-note">${editing ? 'Tap a category to rename it' : `${plural(state.words.length)} in ${state.cats.length} categories`}</p>
        <ul class="rows">
          ${state.cats.map(c => `
            <li><button class="cat-row" type="button" data-cat="${c.id}">
              <span class="cat-name">${esc(c.name)}</span>
              <span class="cat-count">${plural(wordsIn(c.id).length)}${editing ? CHEVRON : ''}</span>
            </button></li>`).join('')}
          ${editing ? `<li><button class="cat-row add-row" type="button" id="new-cat"><span class="cat-name">+ New category</span></button></li>` : ''}
        </ul>
        <button class="btn-text download" type="button" id="download">Download word list (words.js)</button>
      </section>`;
    wireEditToggle();
    $('#download').addEventListener('click', downloadWords);
    $('#main').querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
      if (editing) openCategorySheet(b.dataset.cat); else go(b.dataset.cat);
    }));
    $('#new-cat')?.addEventListener('click', () => openCategorySheet(null));
  }

  function renderCategory(id) {
    currentView = 'category';
    const c = catById(id);
    const ws = wordsIn(id);
    $('#main').innerHTML = `
      <section class="view-list${editing ? ' is-editing' : ''}">
        <button class="back-link" type="button" id="to-cats">‹ Categories</button>
        <div class="title-row">
          <h2 class="page-title">${esc(c.name)}</h2>
          ${ws.length ? editButton('words') : ''}
        </div>
        <p class="page-note">${editing ? 'Tap a word to edit it' : plural(ws.length)}</p>
        ${ws.length ? `<ul class="rows">
          ${ws.map(w => `
            <li>${editing ? `<button class="word-row" type="button" data-word="${w.id}" aria-label="Edit ${esc(w.g)}">` : '<div class="word-row">'}
              <span class="wr-greek" lang="el">${esc(w.g)}</span>
              <span class="wr-english">${esc(w.e)}${editing ? CHEVRON : ''}</span>
              ${w.p || statusOf(w) !== 'new' ? `<span class="wr-ipa">${esc(w.p)}${statusOf(w) !== 'new' ? ` <span class="wr-status status-${statusOf(w)}">${STATUS[statusOf(w)]}</span>` : ''}</span>` : ''}
            ${editing ? '</button>' : '</div>'}</li>`).join('')}
        </ul>` : `<p class="empty">No words in this category yet.</p>`}
      </section>`;
    $('#to-cats').addEventListener('click', () => go('categories'));
    if (ws.length) wireEditToggle();
    $('#main').querySelectorAll('[data-word]').forEach(b => b.addEventListener('click', () => openWordSheet(b.dataset.word)));
  }

  /* ---------- Sheets ---------- */
  const sheetOpen = () => !!$('.sheet-scrim');
  function closeSheet() { const s = $('.sheet-scrim'); if (s) s.remove(); }
  function openSheet(inner) {
    closeSheet();
    const scrim = document.createElement('div');
    scrim.className = 'sheet-scrim';
    scrim.innerHTML = `<form class="sheet" role="dialog" aria-modal="true" novalidate>${inner}</form>`;
    scrim.addEventListener('click', e => { if (e.target === scrim) closeSheet(); });
    document.body.appendChild(scrim);
    scrim.querySelector('[data-cancel]').addEventListener('click', closeSheet);
    return scrim.querySelector('form');
  }
  function showError(form, msg) { const err = $('#sheet-error', form); err.textContent = msg; err.hidden = false; }

  function openCategorySheet(id) {
    const c = id ? catById(id) : null;
    const count = c ? wordsIn(id).length : 0;
    const form = openSheet(`
      <h3>${c ? 'Rename category' : 'New category'}</h3>
      <div class="field">
        <label for="cat-name">Name</label>
        <input id="cat-name" type="text" value="${esc(c?.name || '')}" autocomplete="off">
      </div>
      ${c && count ? `<p class="sheet-note">${plural(count)} in this category. To delete it, move or delete its words first.</p>` : ''}
      <p class="error" id="sheet-error" hidden></p>
      <div class="sheet-actions">
        ${c && !count ? '<button class="btn-text danger" type="button" id="cat-delete">Delete category</button>' : ''}
        <div class="right">
          <button class="btn-text" type="button" data-cancel>Cancel</button>
          <button class="btn-save" type="submit">${c ? 'Save' : 'Create'}</button>
        </div>
      </div>`);
    const input = $('#cat-name', form);
    input.focus();
    const del = $('#cat-delete', form);
    del?.addEventListener('click', () => {
      if (!del.dataset.armed) { del.dataset.armed = '1'; del.textContent = 'Tap again to delete'; return; }
      state.cats = state.cats.filter(x => x.id !== id);
      closeSheet(); route(); save('Category deleted');
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) return showError(form, 'Enter a name for the category.');
      const clash = catByName(name);
      if (clash && clash.id !== id) return showError(form, `There's already a category called “${clash.name}”.`);
      if (c) c.name = name;
      else state.cats.push({ id: nextId(state.cats, 'c'), name });
      closeSheet(); route(); save(c ? 'Category renamed' : 'Category created');
    });
  }

  function openWordSheet(wid) {
    const w = state.words.find(x => x.id === wid);
    if (!w) return;
    const form = openSheet(`
      <h3>Edit word</h3>
      <div class="field">
        <label for="w-greek">Greek</label>
        <input id="w-greek" class="greek" type="text" lang="el" value="${esc(w.g)}" autocomplete="off">
      </div>
      <div class="field">
        <label for="w-ipa">Pronunciation (IPA)</label>
        <input id="w-ipa" class="ipa-in" type="text" value="${esc(w.p)}" autocomplete="off" spellcheck="false">
      </div>
      <div class="field">
        <label for="w-english">English</label>
        <input id="w-english" type="text" value="${esc(w.e)}" autocomplete="off">
      </div>
      <div class="field">
        <label for="w-cat">Category</label>
        <select id="w-cat">${state.cats.map(c => `<option value="${c.id}"${c.id === w.c ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label for="w-status">Status</label>
        <select id="w-status">${Object.entries(STATUS).map(([k, label]) => `<option value="${k}"${k === statusOf(w) ? ' selected' : ''}>${label}</option>`).join('')}</select>
      </div>
      <p class="error" id="sheet-error" hidden></p>
      <div class="sheet-actions">
        <button class="btn-text danger" type="button" id="w-delete">Delete word</button>
        <div class="right">
          <button class="btn-text" type="button" data-cancel>Cancel</button>
          <button class="btn-save" type="submit">Save</button>
        </div>
      </div>`);
    const del = $('#w-delete', form);
    del.addEventListener('click', () => {
      if (!del.dataset.armed) { del.dataset.armed = '1'; del.textContent = 'Tap again to delete'; return; }
      state.words = state.words.filter(x => x.id !== wid);
      closeSheet(); route(); save('Word deleted');
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const g = $('#w-greek', form).value.trim();
      const en = $('#w-english', form).value.trim();
      if (!g || !en) return showError(form, 'The Greek word and the English meaning can’t be empty.');
      w.g = g; w.e = en;
      w.p = $('#w-ipa', form).value.trim();
      w.c = $('#w-cat', form).value;
      if ($('#w-status', form).value !== statusOf(w)) setStatus(w, $('#w-status', form).value);
      closeSheet(); route(); save('Word saved');
    });
  }

  /* ---------- Claude (category suggestions, file reading) ---------- */
  let sampleFn = null;
  const sampleReady = window.claude?.use
    ? window.claude.use('sample').then(s => (sampleFn = s)).catch(() => null)
    : Promise.resolve(null);
  let sampleBlocked = false;
  const BLOCKING = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'session_expired'];
  const IPA_STYLE = 'Broad IPA in square brackets, stress mark ˈ before the stressed syllable, r for ρ, ɣ or j for γ, x or ç for χ, ð for δ, θ for θ, b/mb for μπ, d/nd for ντ, g/ŋg for γκ and γγ, i for ι η υ ει οι, e for ε αι, u for ου, af/av ef/ev for αυ ευ. Leave out a leading article (ο, η, το, τα, οι). For "A / B" write "[a] / [b]". Examples: καλημέρα → [kaliˈmera], ευχαριστώ → [efxariˈsto], το παιδί → [peˈði], η οικογένεια → [ikoˈjenia].';

  async function askClaude(prompt, opts) {
    const s = sampleFn ?? await sampleReady;
    if (!s || sampleBlocked) return null;
    try { return await s.json(prompt, opts); }
    catch (e) {
      if (BLOCKING.includes(e?.code)) sampleBlocked = true;
      throw e;
    }
  }

  /* ---------- Add words ---------- */
  let addDraft = { g: '', e: '', p: '', pTouched: false, cat: 'auto', newCat: '' };
  let importJob = null; // { status: 'reading'|'review'|'error', ... }

  function renderAdd() {
    currentView = 'add';
    const d = addDraft;
    $('#main').innerHTML = `
      <section class="view-list">
        <h2 class="page-title">Add words</h2>
        <p class="page-note">Type the Greek and its meaning. The pronunciation fills in by itself.</p>
        <form class="add-form" id="add-form" novalidate>
          <div class="field">
            <label for="a-greek">Greek</label>
            <input id="a-greek" class="greek" type="text" lang="el" value="${esc(d.g)}" autocomplete="off" autocapitalize="off" placeholder="e.g. το μουσείο">
          </div>
          <div class="field">
            <label for="a-english">Translation</label>
            <input id="a-english" type="text" value="${esc(d.e)}" autocomplete="off" placeholder="e.g. museum">
          </div>
          <div class="field">
            <label for="a-ipa">Pronunciation <span class="label-aside">· automatic, you can change it</span></label>
            <input id="a-ipa" class="ipa-in" type="text" value="${esc(d.p)}" autocomplete="off" spellcheck="false" placeholder="[ ]">
          </div>
          <div class="field">
            <label for="a-cat">Category</label>
            <select id="a-cat">
              <option value="auto"${d.cat === 'auto' ? ' selected' : ''}>Choose for me</option>
              ${state.cats.map(c => `<option value="${c.id}"${d.cat === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
              <option value="new"${d.cat === 'new' ? ' selected' : ''}>New category…</option>
            </select>
          </div>
          <div class="field" id="a-newcat-field"${d.cat === 'new' ? '' : ' hidden'}>
            <label for="a-newcat">New category name</label>
            <input id="a-newcat" type="text" value="${esc(d.newCat)}" autocomplete="off">
          </div>
          <p class="error" id="add-error" hidden></p>
          <div class="add-actions">
            <button class="btn-save" type="submit" id="add-btn">Add word</button>
            <span class="status" id="add-status" role="status"></span>
          </div>
        </form>

        <div class="or-rule"><span>or</span></div>

        <div class="import" id="import"></div>
      </section>`;

    const form = $('#add-form');
    const gIn = $('#a-greek'), eIn = $('#a-english'), pIn = $('#a-ipa'), cSel = $('#a-cat'), ncIn = $('#a-newcat');
    gIn.addEventListener('input', () => {
      d.g = gIn.value;
      if (!d.pTouched) { d.p = phraseIpa(d.g); pIn.value = d.p; }
    });
    eIn.addEventListener('input', () => { d.e = eIn.value; });
    pIn.addEventListener('input', () => { d.p = pIn.value; d.pTouched = pIn.value.trim() !== ''; });
    cSel.addEventListener('change', () => { d.cat = cSel.value; $('#a-newcat-field').hidden = d.cat !== 'new'; if (d.cat === 'new') ncIn.focus(); });
    ncIn.addEventListener('input', () => { d.newCat = ncIn.value; });
    form.addEventListener('submit', e => { e.preventDefault(); addSingle(); });
    renderImport();
  }

  async function addSingle() {
    const d = addDraft;
    const err = $('#add-error'), status = $('#add-status'), btn = $('#add-btn');
    const fail = msg => { err.textContent = msg; err.hidden = false; };
    err.hidden = true;
    const g = d.g.trim(), e = d.e.trim();
    if (!g) return fail('Type the Greek word first.');
    if (!hasGreek(g)) return fail('The Greek field needs Greek letters.');
    if (!e) return fail('Add the translation.');
    const dup = state.words.find(w => normGreek(w.g) === normGreek(g));
    if (dup && !d.dupOk) {
      d.dupOk = true;
      return fail(`“${dup.g}” is already in ${catById(dup.c)?.name || 'your words'}. Press Add word again to add it anyway.`);
    }
    let ipa = d.p.trim() || phraseIpa(g);
    let catId = null, catName = null;
    if (d.cat === 'new') {
      catName = d.newCat.trim();
      if (!catName) return fail('Name the new category.');
    } else if (d.cat !== 'auto') {
      catId = d.cat;
    } else {
      btn.disabled = true;
      status.textContent = 'Choosing a category…';
      try {
        const r = await askClaude(
          `A learner is adding a Greek flashcard.\nGreek: ${g}\nMeaning: ${e}\n\nExisting categories: ${state.cats.map(c => c.name).join(' | ')}\n\n` +
          `1. Pick the single best existing category. Only if none fits at all, propose a short new category name in the same style.\n` +
          `2. Write the pronunciation. ${IPA_STYLE}\n\nReply with only JSON: {"category": "...", "ipa": "[...]"}`,
          { modelTier: 'quick' });
        if (r && typeof r.category === 'string' && r.category.trim()) catName = r.category.trim();
        if (r && typeof r.ipa === 'string' && /^\[.*\]$/.test(r.ipa.trim()) && !d.pTouched) ipa = r.ipa.trim();
      } catch (ex) { /* fall back to the rule-based guess */ }
      if (!catName) catName = guessCategory(g, e);
      btn.disabled = false;
      status.textContent = '';
      if (!catName) {
        d.cat = state.cats[0]?.id || 'new';
        $('#a-cat').value = d.cat;
        return fail('Pick a category for this word.');
      }
    }
    const cat = catId ? catById(catId) : ensureCategory(catName);
    const w = { id: nextId(state.words, 'w'), g, p: ipa, e, c: cat.id };
    state.words.push(w);
    deck.push(w.id);
    addDraft = { g: '', e: '', p: '', pTouched: false, cat: d.cat === 'new' ? cat.id : d.cat, newCat: '' };
    renderAdd();
    $('#a-greek').focus();
    save(`Added to ${cat.name}`);
  }
  function ensureCategory(name) {
    let c = catByName(name);
    if (!c) { c = { id: nextId(state.cats, 'c'), name: name.trim() }; state.cats.push(c); }
    return c;
  }

  /* ---------- Import a file ---------- */
  const ACCEPT = '.txt,.csv,.tsv,.xlsx,.xls,.ods,.pdf,.docx';
  function renderImport() {
    const box = $('#import');
    if (!box) return;
    const job = importJob;
    if (!job) {
      box.innerHTML = `
        <button class="btn-outline" type="button" id="pick-file">Import a file</button>
        <p class="import-note">A word list, spreadsheet, PDF or Word file with one word per line, like “η πόλη = city”. The app adds the pronunciation and guesses the category. You check the list before anything is added.</p>
        <input type="file" id="file-in" accept="${ACCEPT}" hidden>`;
      $('#pick-file').addEventListener('click', () => $('#file-in').click());
      $('#file-in').addEventListener('change', ev => { const f = ev.target.files[0]; if (f) startImport(f); });
      return;
    }
    if (job.status === 'reading') {
      box.innerHTML = `
        <div class="import-progress">
          <p class="status-line">${esc(job.message)}</p>
          <button class="btn-text" type="button" id="imp-stop">Stop</button>
        </div>`;
      $('#imp-stop').addEventListener('click', () => { job.ctl?.abort(); importJob = null; renderImport(); });
      return;
    }
    if (job.status === 'error') {
      box.innerHTML = `
        <p class="error">${esc(job.message)}</p>
        <button class="btn-outline" type="button" id="imp-again">Choose another file</button>`;
      $('#imp-again').addEventListener('click', () => { importJob = null; renderImport(); $('#pick-file').click(); });
      return;
    }
    // review
    const items = job.items;
    const chosen = items.filter(it => it.on).length;
    const newCats = [...new Set(items.filter(it => it.on && !catByName(it.c)).map(it => it.c))];
    box.innerHTML = `
      <h3 class="section-title">From “${esc(job.file)}”</h3>
      <p class="page-note tight">${plural(items.length)} found${job.dupes ? ` · ${job.dupes} already in your app, unticked` : ''}${job.note ? ` · ${esc(job.note)}` : ''}</p>
      ${newCats.length ? `<p class="page-note tight">New ${newCats.length === 1 ? 'category' : 'categories'}: ${newCats.map(esc).join(', ')}</p>` : ''}
      <ul class="rows review">
        ${items.map((it, i) => `
          <li><label class="review-row${it.on ? '' : ' off'}">
            <input type="checkbox" data-i="${i}"${it.on ? ' checked' : ''}>
            <span class="wr-greek" lang="el">${esc(it.g)}</span>
            <span class="wr-english">${esc(it.e)}</span>
            <span class="wr-ipa">${esc(it.p)}${it.dup ? ' · already added' : ''}</span>
            <span class="wr-cat">${esc(it.c)}</span>
          </label></li>`).join('')}
      </ul>
      <div class="add-actions sticky-actions">
        <button class="btn-save" type="button" id="imp-add"${chosen ? '' : ' disabled'}>Add ${plural(chosen)}</button>
        <button class="btn-text" type="button" id="imp-cancel">Cancel</button>
      </div>`;
    box.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => {
      items[+cb.dataset.i].on = cb.checked;
      const y = $('#main .view-list').scrollTop;
      renderImport();
      $('#main .view-list').scrollTop = y;
    }));
    $('#imp-cancel').addEventListener('click', () => { importJob = null; renderImport(); });
    $('#imp-add').addEventListener('click', () => {
      const add = items.filter(it => it.on);
      add.forEach(it => {
        const cat = ensureCategory(it.c || 'Imported');
        const w = { id: nextId(state.words, 'w'), g: it.g, p: it.p, e: it.e, c: cat.id };
        state.words.push(w);
        deck.push(w.id);
      });
      importJob = null;
      renderAdd();
      save(`Added ${plural(add.length)}`);
    });
  }

  function loadScript(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve(window[globalName]);
      s.onerror = () => reject(new Error('load'));
      document.head.appendChild(s);
    });
  }

  async function fileToText(file) {
    const name = file.name.toLowerCase();
    if (/\.(xlsx|xls|ods)$/.test(name)) {
      const XLSX = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      return wb.SheetNames.map(n => `# ${n}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: '\t' })).join('\n\n');
    }
    if (/\.pdf$/.test(name)) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js', 'pdfjsWorker');
      const pdfjs = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib');
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      let text = '';
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        text += tc.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join('') + '\n\n';
      }
      return text;
    }
    if (/\.docx$/.test(name)) {
      const mammoth = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', 'mammoth');
      const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return r.value;
    }
    return await file.text();
  }

  // Line-by-line reader for simple lists, used when Claude isn't available.
  function parseLocally(text) {
    const out = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || !hasGreek(line)) continue;
      let g = '', e = '', c = '';
      const cols = line.split('\t').map(s => s.trim()).filter(Boolean);
      if (cols.length >= 2) {
        const gi = cols.findIndex(hasGreek);
        g = cols[gi];
        const rest = cols.filter((_, i) => i !== gi);
        const catCol = rest.find(x => catByName(x));
        if (catCol) c = catByName(catCol).name;
        e = rest.find(x => x !== catCol && !/^\[.*\]$/.test(x) && x !== cols[gi]) || '';
      } else {
        const m = line.match(/^(.+?)\s*(?:=|—|–|:|\s-\s)\s*(.+)$/) || line.match(/^(.+?)\s*\(([^)]*[a-z][^)]*)\)\s*$/i);
        if (!m) continue;
        [g, e] = hasGreek(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
      }
      g = g.replace(/^[\d.)\s•\-]+/, '').trim();
      e = e.trim();
      if (!g || !e || !hasGreek(g) || hasGreek(e)) continue;
      out.push({ g, e, p: phraseIpa(g), c: c || guessCategory(g, e) || 'Imported' });
    }
    return out;
  }

  async function startImport(file) {
    const ctl = new AbortController();
    importJob = { status: 'reading', file: file.name, message: `Reading “${file.name}”…`, ctl };
    renderImport();
    const isImage = /^image\//.test(file.type);
    let text = '', note = '';
    try {
      if (!isImage) text = await fileToText(file);
    } catch {
      importJob = { status: 'error', message: `Couldn’t open “${file.name}”. Try a .txt, .csv, .xlsx, .pdf or .docx file, or a photo.` };
      return renderImport();
    }
    if (importJob?.ctl !== ctl) return;
    if (!isImage && !hasGreek(text)) {
      importJob = { status: 'error', message: `No Greek text found in “${file.name}”. If it’s a scan, try a photo of the page instead.` };
      return renderImport();
    }
    if (text.length > 60000) { text = text.slice(0, 60000); note = 'only the first part of a long file was read'; }

    let items = null;
    const s = sampleFn ?? await sampleReady;
    if (s && !sampleBlocked) {
      importJob.message = 'Finding the words and sorting them into categories. This can take up to a minute…';
      renderImport();
      const prompt =
        `Below is ${isImage ? 'a photo' : 'the text'} of a Greek learner's vocabulary file ("${file.name}"). Extract every Greek vocabulary item with its English meaning.\n` +
        `- Take items from vocabulary lists and Greek–English pairs. Also take words a sentence glosses, like "Αν (if)". Skip instructions and fill-in-the-gap sentences. Useful dialogue words with an obvious meaning may be included, translated by you.\n` +
        `- Keep the Greek as written, with its article if it has one.\n` +
        `- "e": the short English meaning, as the file gives it when it does.\n` +
        `- "p": the pronunciation. ${IPA_STYLE}\n` +
        `- "c": the best category from this list: ${state.cats.map(c => c.name).join(' | ')}. If none fits, a short new category name in the same style.\n` +
        `Reply with only a JSON array like [{"g":"η αστυνομία","e":"police station","p":"[astinoˈmia]","c":"City & transport"}].` +
        (isImage ? '' : `\n\nFILE TEXT:\n<<<\n${text}\n>>>`);
      try {
        const r = await askClaude(prompt, { signal: ctl.signal, ...(isImage ? { images: file } : {}) });
        if (Array.isArray(r)) {
          items = r.filter(x => x && typeof x.g === 'string' && typeof x.e === 'string' && hasGreek(x.g))
            .map(x => ({ g: x.g.trim(), e: x.e.trim(), p: (typeof x.p === 'string' && x.p.trim()) || phraseIpa(x.g), c: (typeof x.c === 'string' && x.c.trim()) || guessCategory(x.g, x.e) || 'Imported' }));
        }
      } catch (e) {
        if (e?.code === 'cancelled') return;
        if (isImage) {
          importJob = { status: 'error', message: e?.code === 'images_unavailable' ? 'Photos can’t be read in this view. Try a text, spreadsheet or PDF file.' : 'Couldn’t read the photo. Try again, or use a text, spreadsheet or PDF file.' };
          return renderImport();
        }
      }
    } else if (isImage) {
      importJob = { status: 'error', message: 'Reading photos needs Claude, which isn’t available in this view. Try a text, spreadsheet or PDF file.' };
      return renderImport();
    }
    if (importJob?.ctl !== ctl) return;
    if (!items) { items = parseLocally(text); if (items.length) note = [note, 'categories guessed from the spelling'].filter(Boolean).join(' · '); }
    if (!items.length) {
      importJob = { status: 'error', message: `Couldn’t find word pairs in “${file.name}”. Put one word per line, like “η πόλη = city”.` };
      return renderImport();
    }
    const seen = new Set(state.words.map(w => normGreek(w.g)));
    let dupes = 0;
    const unique = [];
    const inFile = new Set();
    for (const it of items) {
      const k = normGreek(it.g);
      if (inFile.has(k)) continue;
      inFile.add(k);
      it.dup = seen.has(k);
      it.on = !it.dup;
      if (it.dup) dupes++;
      const existing = catByName(it.c);
      if (existing) it.c = existing.name;
      unique.push(it);
    }
    importJob = { status: 'review', file: file.name, items: unique, dupes, note };
    renderImport();
  }

  /* ---------- Saving: kept in this browser; download a copy to update the repo ---------- */
  let toastTimer;
  function toast(msg, ms = 2200) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), ms);
  }
  function save(doneMsg) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); if (doneMsg) toast(doneMsg); }
    catch { toast('Couldn’t save in this browser. Private browsing can block saving.', 4000); }
  }
  function downloadWords() {
    const body = '// Word list for Λέξεις. Replace this file in the repo to update the starting words.\nwindow.LEXEIS_DATA = ' + JSON.stringify(state, null, 1) + ';\n';
    const url = URL.createObjectURL(new Blob([body], { type: 'text/javascript' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'words.js';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- Start ---------- */
  route();
})();
