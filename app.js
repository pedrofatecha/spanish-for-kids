/* Colorín Colorado: lógica de la página. Los datos están en data.json y el audio en audio.json. */
(function(){
  'use strict';
  function cargar(u){ return fetch(u).then(function(r){ if(!r.ok) throw new Error(u); return r.json(); }); }
  function error(){
    var p = document.getElementById('panel');
    p.innerHTML = '<p style="padding:20px;font:700 1.1rem sans-serif">No se pudieron cargar los datos. Esta página necesita estar en un sitio web (o abrirse con un servidor local); no funciona haciendo doble clic en el archivo.</p>';
  }
  Promise.all([cargar('data.json'), cargar('audio.json').catch(function(){ return {clips:{},times:{}}; })]).then(function(r){ iniciar(r[0], r[1]); }).catch(error);

function iniciar(D, A){
(function(){

  var CATS = D.cats;

  var app = document.getElementById('app');
  var panel = document.getElementById('panel');
  var chipsEl = document.getElementById('chips');
  var tabsEl = document.getElementById('tabs');
  var sw = document.getElementById('enSwitch');
  var starCount = document.getElementById('starCount');
  var starsEl = document.getElementById('stars');
  var controlsEl = document.getElementById('controls');

  var state = {mode:'alfabeto', es:'letras', tr:0, cat:0, en:false, stars:0, step:'vocales', cons:'m', wg:'base', sp:0, ag:'todas', lvl:'facil', eg:'todas', el:'facil'};
  var timers = [];
  var Q = null, M = null, B = null, E = null, L = null, T = null;
  var CLIPS = (A || {}).clips || {};
  var TIMES = (A || {}).times || {};
  var player = null, clipsOff = false, chainId = 0;

  function load(k, d){ try{ var v = localStorage.getItem(k); return v === null ? d : v; }catch(e){ return d; } }
  function save(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

  state.stars = parseInt(load('colorin.stars', load('spanishStars', '0')), 10) || 0;
  state.en = load('colorin.en', '0') === '1';
  starCount.textContent = state.stars;

  function later(fn, ms){ timers.push(setTimeout(fn, ms)); }
  function clearTimers(){ timers.forEach(clearTimeout); timers = []; }

  function shuffle(a){
    a = a.slice();
    for(var i = a.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Voz en español */
  var voice = null;
  function pickVoice(){
    try{
      var vs = speechSynthesis.getVoices().filter(function(v){ return /^es/i.test(v.lang); });
      function score(v){
        var s = 1;
        if(/^es[-_](US|MX|419)/i.test(v.lang)) s += 2;
        if(/natural|neural|online|google|premium|enhanced|siri/i.test(v.name)) s += 3;
        if(/compact|espeak/i.test(v.name)) s -= 2;
        if(/paulina|m[oó]nica/i.test(v.name)) s += 3;
        if(/eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley/i.test(v.name)) s -= 5;
        return s;
      }
      voice = vs.sort(function(a, b){ return score(b) - score(a); })[0] || null;
    }catch(e){}
  }
  if('speechSynthesis' in window){
    pickVoice();
    try{ speechSynthesis.addEventListener('voiceschanged', pickVoice); }catch(e){}
  }
  function say(text){
    if(playClip('w:' + String(text).toLowerCase(), function(){ say(text); })) return;
    stopClip();
    try{
      if(!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = voice ? voice.lang : 'es-MX';
      if(voice) u.voice = voice;
      u.rate = 0.8;
      u.pitch = 1;
      speechSynthesis.speak(u);
    }catch(e){}
  }

  /* Audios grabados dentro de la página (generados con pronunciación exacta en español).
     Si un audio falta o el navegador no lo reproduce, se usa la voz del dispositivo. */
  function stopClip(){ chainId++; try{ if(player) player.pause(); }catch(e){} }
  function playClip(key, fb){
    var d = CLIPS[key];
    if(!d || clipsOff) return false;
    chainId++;
    try{
      if('speechSynthesis' in window) speechSynthesis.cancel();
      if(!player){
        player = new Audio();
        player.addEventListener('error', function(){ clipsOff = true; if(player.fb) player.fb(); });
      }
      player.pause();
      player.onended = null;
      player.fb = fb || null;
      player.src = 'data:audio/mpeg;base64,' + d;
      var pr = player.play();
      if(pr && pr.catch) pr.catch(function(err){
        if(err && err.name !== 'NotAllowedError' && err.name !== 'AbortError'){ clipsOff = true; if(fb) fb(); }
      });
      return true;
    }catch(e){ clipsOff = true; return false; }
  }
  function playOr(key, fallback){ if(!playClip(key, fallback)) fallback(); }

  /* Varios sonidos seguidos: usa el audio grabado si existe y, si no, la voz del dispositivo. */
  function utter(text, done){
    try{
      if(!('speechSynthesis' in window)) return done();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = voice ? voice.lang : 'es-MX';
      if(voice) u.voice = voice;
      u.rate = 0.8;
      u.pitch = 1;
      u.onend = done;
      u.onerror = done;
      speechSynthesis.speak(u);
    }catch(e){ done(); }
  }
  function playChain(steps){
    stopClip();
    try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){}
    var id = chainId;
    function next(i){
      if(id !== chainId || i >= steps.length) return;
      var s = steps[i];
      function go(){ next(i + 1); }
      if(s.key && playClip(s.key, function(){ say(s.text); })){
        id = chainId;
        player.onended = go;
        return;
      }
      utter(s.text, go);
    }
    next(0);
  }

  function addStar(){
    state.stars++;
    save('colorin.stars', String(state.stars));
    starCount.textContent = state.stars;
    starsEl.classList.remove('bump');
    void starsEl.offsetWidth;
    starsEl.classList.add('bump');
  }

  function pic(it){
    if(it.color) return '<span class="sw" style="--sw:' + it.color + '" aria-hidden="true"></span>';
    if(it.n){
      var d = '';
      for(var i = 0; i < it.n; i++) d += '<i></i>';
      return '<span class="num" aria-hidden="true"><b>' + it.n + '</b><span class="dots">' + d + '</span></span>';
    }
    return '<span class="emo" aria-hidden="true">' + it.pic + '</span>';
  }

  function enSpan(it){ return '<span class="en"' + (state.en ? '' : ' hidden') + '>' + it.en + '</span>'; }
  function starsRow(n){
    var s = '';
    for(var i = 0; i < n; i++) s += '<svg class="star" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-star"/></svg>';
    return s;
  }

  /* Sílabas: método silábico. Vocales, sílabas, palabras de dos golpes de voz, frases y juego. */
  var VOWELS = D.vowels;
  var CONSDEF = D.consdef;
  var CONSIDX = {}, SYLPOOL = [];
  CONSDEF.forEach(function(d, i){ CONSIDX[d.c] = i; d.s.forEach(function(s){ SYLPOOL.push(s); }); });
  var WORDS = D.words;
  var SENTS = D.sents;
  var VMAP = {'á':'a', 'é':'e', 'í':'i', 'ó':'o', 'ú':'u'};

  function vow(s){
    for(var i = s.length - 1; i >= 0; i--){
      var ch = VMAP[s.charAt(i)] || s.charAt(i);
      if('aeiou'.indexOf(ch) > -1) return ch;
    }
    return 'a';
  }
  function vstyle(s){ return 'style="--v:var(--v-' + vow(s) + ')"'; }
  function getBody(){ return document.getElementById('stepBody'); }

  /* Sílabas: audio propio (s:sílaba:1 fuerte o 0 débil). Sin audio, la voz del dispositivo. */
  function sylSound(s){ return s; }
  var ACC = {'á':'a', 'é':'e', 'í':'i', 'ó':'o', 'ú':'u'};
  function plain(s){ return String(s).replace(/[áéíóú]/g, function(c){ return ACC[c]; }); }
  function playSyl(s, strong){
    var base = plain(s);
    var key = 's:' + base + ':' + (strong ? 1 : 0);
    if(!CLIPS[key]) key = 's:' + base + ':1';
    playOr(key, function(){ say(s); });
  }

  /* Palabras agrupadas por la letra más nueva que usan (así solo aparecen cuando ya se enseñó cada letra) */
  function wordGroup(w){
    var best = -1;
    w.s.forEach(function(s){
      var i = CONSIDX[plain(s).slice(0, -1)];
      if(i !== undefined && i > best) best = i;
    });
    return best >= 7 ? CONSDEF[best].c : 'base';
  }
  function wordGroups(){
    var seen = {};
    WORDS.forEach(function(w){ seen[wordGroup(w)] = 1; });
    return ['base'].concat(CONSDEF.slice(7).map(function(d){ return d.c; }).filter(function(c){ return seen[c]; }));
  }
  function chipRow(label, items, cur, attr){
    return '<div class="optrow"><span class="optlabel">' + label + '</span><div class="cons" role="group" aria-label="' + label + '">' +
      items.map(function(it){
        return '<button type="button" class="gchip" data-' + attr + '="' + it[0] + '" aria-pressed="' + (it[0] === cur) + '">' + it[1] + '</button>';
      }).join('') + '</div></div>';
  }
  function groupLabel(g){ return g === 'base' ? 'Primeras' : (g === 'todas' ? 'Todas' : g); }
  /* Posición de la sílaba fuerte: la que lleva tilde; si no hay tilde, la primera */
  function stressIdx(w){
    for(var i = 0; i < w.s.length; i++){ if(/[áéíóú]/.test(w.s[i])) return i; }
    return 0;
  }

  /* Varias voces seguidas: lista de [texto, velocidad]. Devuelve false si no hay voz. */
  function sayMany(list, onStart, onEnd){
    try{
      if(!('speechSynthesis' in window)) return false;
      stopClip();
      speechSynthesis.cancel();
      list.forEach(function(p, i){
        var u = new SpeechSynthesisUtterance(p[0]);
        u.lang = voice ? voice.lang : 'es-MX';
        if(voice) u.voice = voice;
        u.rate = p[1] || 0.8;
        u.pitch = p[2] || 1;
        u.volume = p[3] || 1;
        if(onStart) u.onstart = function(){ onStart(i); };
        if(onEnd && i === list.length - 1) u.onend = onEnd;
        speechSynthesis.speak(u);
      });
      return true;
    }catch(e){ return false; }
  }

  /* Dice las dos sílabas despacio y luego la palabra, encendiendo cada golpe de voz */
  function speakWord(card, it){
    var blocks = card.querySelectorAll('.blk');
    function hl(i){
      Array.prototype.forEach.call(blocks, function(b, k){ b.classList.toggle('on', i === 2 || i === k); });
    }
    function off(){ hl(-1); }
    var st = stressIdx(it);
    var key = 'q:' + it.s.join('');
    if(CLIPS[key] && playClip(key, function(){ clearTimers(); speakWord(card, it); })){
      var tt = TIMES[key];
      hl(0);
      later(function(){ hl(1); }, tt[1]);
      later(function(){ hl(2); }, tt[2]);
      later(off, tt[3]);
      return;
    }
    var ok = sayMany([
      [sylSound(it.s[0], st === 0), 0.6, st === 0 ? 1.4 : 1.0, st === 0 ? 1 : 0.85],
      [sylSound(it.s[1], st === 1), 0.6, st === 1 ? 1.4 : 1.0, st === 1 ? 1 : 0.85],
      [it.s.join(''), 0.8]
    ], hl, off);
    if(!ok){
      hl(0);
      later(function(){ hl(1); }, 800);
      later(function(){ hl(2); }, 1600);
      later(off, 2400);
    }
  }

  function goStep(step){
    clearTimers();
    try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){}
    stopClip();
    state.step = step;
    silabas();
  }

  function silabas(){
    var steps = [['vocales','Vocales'], ['silabas','Sílabas'], ['palabras','Palabras'], ['leer','Leer'], ['frases','Frases'], ['arma','Arma']];
    var head = '<div class="steps" role="group" aria-label="Pasos para aprender sílabas">' +
      steps.map(function(s, i){
        return '<button type="button" class="step" data-step="' + s[0] + '" aria-pressed="' + (state.step === s[0]) + '"><b>' + (i + 1) + '</b>' + s[1] + '</button>';
      }).join('') + '</div><div id="stepBody"></div>';
    panel.innerHTML = head;
    var body = getBody();
    if(state.step === 'vocales') vowelsView(body);
    else if(state.step === 'silabas') sylView(body);
    else if(state.step === 'palabras') wordsView(body);
    else if(state.step === 'leer') leerView(body);
    else if(state.step === 'frases') sentsView(body);
    else buildStart();
  }

  function vowelsView(body){
    body.innerHTML = '<p class="hint">Primero las vocales. Toca una para escucharla.</p><ul class="vlist">' +
      VOWELS.map(function(v, i){
        return '<li><button type="button" class="vrow" data-i="' + i + '" style="--v:var(--v-' + v.l + ')" aria-label="Vocal ' + v.l + ', ' + v.ex + '">' +
          '<span class="big" aria-hidden="true">' + v.l.toUpperCase() + ' ' + v.l + '</span>' +
          '<span class="ex"><span class="emo" aria-hidden="true">' + v.pic + '</span><span class="t">' + v.ex + '</span></span></button></li>';
      }).join('') + '</ul>';
  }

  function sylView(body){
    var def = CONSDEF[CONSIDX[state.cons] || 0];
    var notes = {c:'Ca, co y cu suenan fuerte, como en casa. Ce y ci suenan suave, como en cena.', h:'La h no suena.', qu:'En que y qui, la u no suena.', g:'En gue y gui, la u no suena.'};
    var n = def.s.length;
    body.innerHTML = '<p class="hint">Elige una letra y toca cada sílaba.</p>' +
      '<div class="cons" role="group" aria-label="Letra">' +
      CONSDEF.map(function(d){
        return '<button type="button" class="cbtn" data-c="' + d.c + '" aria-pressed="' + (d.c === state.cons) + '">' + d.c + '</button>';
      }).join('') + '</div><div class="syl-grid" style="grid-template-columns:repeat(' + n + ',minmax(0,1fr));max-width:' + (n * 104) + 'px">' +
      def.s.map(function(s){
        return '<button type="button" class="syl" style="--v:var(--v-' + vow(s) + ')" data-s="' + s + '" aria-label="' + s + '">' + s + '</button>';
      }).join('') + '</div>' + (notes[def.c] ? '<p class="note">' + notes[def.c] + '</p>' : '');
  }

  function wordsView(body){
    var gs = wordGroups();
    if(gs.indexOf(state.wg) < 0) state.wg = 'base';
    var list = [];
    WORDS.forEach(function(w, i){ if(wordGroup(w) === state.wg) list.push({w:w, i:i}); });
    body.innerHTML = '<p class="hint">Cada palabra tiene dos golpes de voz. Toca una sílaba para escucharla y toca el dibujo para oír la palabra completa. El círculo grande marca el golpe fuerte.</p>' +
      chipRow('Letras', gs.map(function(g){ return [g, groupLabel(g)]; }), state.wg, 'wg') +
      '<ul class="wgrid">' +
      list.map(function(x){
        var w = x.w;
        return '<li class="wcard"><button type="button" class="wpic" data-i="' + x.i + '" aria-label="Escuchar ' + w.s.join('') + '"><span class="emo" aria-hidden="true">' + w.pic + '</span></button>' +
          '<span class="sblocks">' + w.s.map(function(s, k){
            var strong = k === stressIdx(w);
            return '<button type="button" class="blk' + (strong ? ' fuerte' : '') + '" ' + vstyle(s) + ' data-s="' + s + '" data-strong="' + (strong ? 1 : 0) + '">' + s + '<i></i></button>';
          }).join('') + '</span><span class="wfull">' + w.s.join('') + '</span></li>';
      }).join('') + '</ul>';
  }

  /* Leer: primero se lee la palabra y después se descubre el dibujo */
  function leerNext(){
    if(!L || !L.queue.length) L = {queue:shuffle(WORDS)};
    L.w = L.queue.pop();
    L.shown = false;
  }
  function leerView(body){
    if(!L) leerNext();
    var w = L.w, st = stressIdx(w);
    body.innerHTML = '<p class="hint">Toca cada sílaba, lee la palabra y descubre el dibujo.</p>' +
      '<div class="wcard leer"><span class="emo' + (L.shown ? '' : ' blur') + '" aria-hidden="true">' + (L.shown ? w.pic : '❓') + '</span>' +
      '<span class="sblocks">' + w.s.map(function(s, k){
        return '<button type="button" class="blk' + (k === st ? ' fuerte' : '') + '" ' + vstyle(s) + ' data-s="' + s + '" data-strong="' + (k === st ? 1 : 0) + '">' + s + '<i></i></button>';
      }).join('') + '</span>' +
      '<div class="btns"><button type="button" class="btn" data-act="leer-say">Leer la palabra</button>' +
      '<button type="button" class="btn" data-act="leer-show"' + (L.shown ? ' disabled' : '') + '>Ver el dibujo</button>' +
      '<button type="button" class="btn primary" data-act="leer-next">Otra palabra</button></div></div>';
  }

  function sentPages(){
    var pages = [[0, 6]];
    for(var i = 6; i < SENTS.length; i += 7) pages.push([i, Math.min(i + 7, SENTS.length)]);
    return pages;
  }
  function sentsView(body){
    var pages = sentPages();
    if(state.sp >= pages.length) state.sp = 0;
    var pg = pages[state.sp], items = '';
    for(var i = pg[0]; i < pg[1]; i++){
      var s = SENTS[i], words = s.t.split(' ');
      items += '<li class="sent"><div class="sent-row"><span class="emo" aria-hidden="true">' + s.pic + '</span><div class="words">' +
        words.map(function(w, k){
          var txt = k === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w;
          return '<button type="button" class="wd" data-say="' + w.replace(/-/g, '') + '">' + txt + (k === words.length - 1 ? '.' : '') + '</button>';
        }).join('') + '</div></div>' +
        '<button type="button" class="btn readsent" data-i="' + i + '"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sound"/></svg>Leer la frase</button></li>';
    }
    body.innerHTML = '<p class="hint">Ahora leemos frases. Toca una palabra para oírla o toca “Leer la frase”.</p>' +
      chipRow('Página', pages.map(function(p, k){ return [String(k), String(k + 1)]; }), String(state.sp), 'sp') +
      '<ul class="slist">' + items + '</ul>';
  }

  /* Arma la palabra: tocar las sílabas en orden. Se elige la letra y el nivel. */
  function game(){ return document.getElementById('armaGame'); }

  function armaReset(){
    clearTimers();
    stopClip();
    try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){}
    silabas();
  }

  function armaShell(){
    var gs = ['todas'].concat(wordGroups());
    getBody().innerHTML = chipRow('Letras', gs.map(function(g){ return [g, groupLabel(g)]; }), state.ag, 'ag') +
      chipRow('Nivel', [['facil', 'Fácil (2 sílabas)'], ['dificil', 'Difícil (4 sílabas)']], state.lvl, 'lvl') +
      '<div id="armaGame"></div>';
  }

  function buildStart(){
    var pool = WORDS.filter(function(w){ return state.ag === 'todas' || wordGroup(w) === state.ag; });
    B = {order:shuffle(pool).slice(0, 8), i:0, score:0, filled:0, miss:0, locked:false, opts:[]};
    armaShell();
    buildQ();
  }

  function distractors(w){
    var bs = w.s.map(plain);
    var cons = bs.map(function(s){ return s.slice(0, -1); });
    var cand = SYLPOOL.filter(function(s){ return bs.indexOf(s) < 0; });
    var near = cand.filter(function(s){ return cons.indexOf(s.slice(0, -1)) > -1; });
    var far = cand.filter(function(s){ return near.indexOf(s) < 0; });
    return shuffle(near).slice(0, 2).concat(shuffle(far)).slice(0, 2);
  }

  function buildQ(){
    var w = B.order[B.i];
    B.filled = 0;
    B.miss = 0;
    B.locked = false;
    var opts = [{t:w.s[0], idx:0}, {t:w.s[1], idx:1}];
    if(state.lvl === 'dificil') distractors(w).forEach(function(s){ opts.push({t:s, idx:-1}); });
    B.opts = shuffle(opts);
    renderBuild();
    say(w.s.join(''));
  }

  function renderBuild(){
    var w = B.order[B.i], n = B.order.length;
    var slots = [0, 1].map(function(k){
      var full = k < B.filled;
      return '<span class="slot' + (full ? ' full' : '') + '"' + (full ? ' ' + vstyle(w.s[k]) : '') + '>' + (full ? w.s[k] : '') + '</span>';
    }).join('');
    var chs = B.opts.map(function(o, k){
      return '<button type="button" class="ch" data-k="' + k + '" ' + vstyle(o.t) + ((o.idx > -1 && o.idx < B.filled) ? ' disabled' : '') + '>' + o.t + '</button>';
    }).join('');
    game().innerHTML =
      '<div class="qhead"><span class="count">Palabra ' + (B.i + 1) + ' de ' + n + '</span><span class="count">Estrellas ganadas: ' + B.score + '</span></div>' +
      '<div class="bar" aria-hidden="true"><i style="--p:' + (B.i / n * 100) + '%"></i></div>' +
      '<div class="build"><button type="button" class="bpic" aria-label="Escuchar la palabra"><span class="emo" aria-hidden="true">' + w.pic + '</span></button>' +
      '<p class="hint">Toca las sílabas en orden para armar la palabra.</p>' +
      '<div class="slots" role="group" aria-label="Sílabas de la palabra">' + slots + '</div>' +
      '<div class="choices">' + chs + '</div><p class="feedback" role="status"></p></div>';
  }

  function buildPick(btn){
    if(B.locked) return;
    var w = B.order[B.i], o = B.opts[+btn.dataset.k], g = game();
    if(o.idx === B.filled){
      B.filled++;
      playSyl(o.t, o.idx === stressIdx(w));
      if(B.filled === 2){
        B.locked = true;
        if(B.miss === 0){ B.score++; addStar(); }
        renderBuild();
        game().querySelector('.feedback').textContent = '¡Muy bien! ' + w.s.join('-');
        later(function(){ say(w.s.join('')); }, 900);
        later(nextB, 2300);
      }else{
        renderBuild();
      }
    }else{
      B.miss++;
      btn.classList.add('bad');
      later(function(){ btn.classList.remove('bad'); }, 400);
      playSyl(o.t, true);
      g.querySelector('.feedback').textContent = 'Casi. Busca la ' + (B.filled === 0 ? 'primera' : 'segunda') + ' sílaba.';
    }
  }

  function nextB(){
    B.i++;
    if(B.i >= B.order.length) finishB(); else buildQ();
  }

  function finishB(){
    var n = B.order.length;
    var msg = B.score >= n - 1 ? '¡Perfecto!' : (B.score >= n / 2 ? '¡Muy bien!' : '¡Sigue practicando!');
    game().innerHTML =
      '<div class="done"><h2>¡Colorín colorado, este juego se ha acabado!</h2>' +
      '<p>' + msg + ' Ganaste ' + B.score + ' de ' + n + ' estrellas a la primera.</p>' +
      '<div class="starrow">' + starsRow(B.score) + '</div>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="again">Jugar otra vez</button>' +
      '<button type="button" class="btn" data-act="step" data-step="frases">Ver las frases</button></div></div>';
  }

  /* Escritura: se ve el dibujo y se tocan las letras en orden para escribir la palabra. */
  var ALFA = 'aeioumpstlndcfbvrgjñyzh'.split('');
  function lstyle(l){
    return 'style="--v:' + ('aeiou'.indexOf(plain(l)) > -1 ? 'var(--v-' + plain(l) + ')' : 'var(--surface)') + '"';
  }
  function escrShell(){
    var gs = ['todas'].concat(wordGroups());
    document.getElementById('escrBody').innerHTML = chipRow('Letras', gs.map(function(g){ return [g, groupLabel(g)]; }), state.eg, 'eg') +
      chipRow('Nivel', [['facil', 'Fácil (las letras justas)'], ['dificil', 'Difícil (con letras de más)']], state.el, 'el') +
      '<div id="escrGame"></div>';
  }
  function escrGame(){ return document.getElementById('escrGame'); }
  function escrStart(){
    var pool = WORDS.filter(function(w){ return state.eg === 'todas' || wordGroup(w) === state.eg; });
    E = {order:shuffle(pool).slice(0, 8), i:0, score:0, filled:0, miss:0, locked:false, tiles:[]};
    escrShell();
    escrQ();
  }
  function escrQ(){
    var w = E.order[E.i], letters = w.s.join('').split('');
    E.filled = 0; E.miss = 0; E.locked = false;
    var tiles = letters.map(function(l){ return {l:l, used:false}; });
    if(state.el === 'dificil'){
      var extra = shuffle(ALFA.filter(function(l){ return plain(letters.join('')).indexOf(l) < 0; })).slice(0, 2);
      extra.forEach(function(l){ tiles.push({l:l, used:false}); });
    }
    E.tiles = shuffle(tiles);
    renderEscr();
    say(w.s.join(''));
  }
  function renderEscr(){
    var w = E.order[E.i], n = E.order.length, word = w.s.join('');
    var slots = word.split('').map(function(l, k){
      var full = k < E.filled;
      return '<span class="slot' + (full ? ' full' : '') + '"' + (full ? ' ' + lstyle(l) : '') + '>' + (full ? l : '') + '</span>';
    }).join('');
    var chs = E.tiles.map(function(t, k){
      return '<button type="button" class="lt" data-k="' + k + '" ' + lstyle(t.l) + (t.used ? ' disabled' : '') + '>' + t.l + '</button>';
    }).join('');
    escrGame().innerHTML =
      '<div class="qhead"><span class="count">Palabra ' + (E.i + 1) + ' de ' + n + '</span><span class="count">Estrellas ganadas: ' + E.score + '</span></div>' +
      '<div class="bar" aria-hidden="true"><i style="--p:' + (E.i / n * 100) + '%"></i></div>' +
      '<div class="build"><button type="button" class="epic bpic" aria-label="Escuchar la palabra"><span class="emo" aria-hidden="true">' + w.pic + '</span></button>' +
      '<p class="hint">Toca las letras en orden para escribir la palabra.</p>' +
      '<div class="slots lets" role="group" aria-label="Letras de la palabra">' + slots + '</div>' +
      '<div class="choices">' + chs + '</div><p class="feedback" role="status"></p></div>';
  }
  function escrPick(btn){
    if(E.locked) return;
    var w = E.order[E.i], word = w.s.join(''), t = E.tiles[+btn.dataset.k];
    if(t.used) return;
    if(t.l === word.charAt(E.filled)){
      t.used = true;
      E.filled++;
      if(E.filled === word.length){
        E.locked = true;
        if(E.miss === 0){ E.score++; addStar(); }
        renderEscr();
        escrGame().querySelector('.feedback').textContent = '¡Muy bien! ' + word;
        later(function(){ say(word); }, 700);
        later(escrNext, 2300);
      }else{
        renderEscr();
      }
    }else{
      E.miss++;
      btn.classList.add('bad');
      later(function(){ btn.classList.remove('bad'); }, 400);
      var need = word.charAt(E.filled);
      escrGame().querySelector('.feedback').textContent = (plain(t.l) === plain(need) ? 'Casi. Esta letra lleva tilde.' : 'Casi. Busca otra letra.');
    }
  }
  function escrNext(){
    E.i++;
    if(E.i >= E.order.length) escrFinish(); else escrQ();
  }
  function escrFinish(){
    var n = E.order.length;
    var msg = E.score >= n - 1 ? '¡Perfecto!' : (E.score >= n / 2 ? '¡Muy bien!' : '¡Sigue practicando!');
    escrGame().innerHTML =
      '<div class="done"><h2>¡Colorín colorado, este juego se ha acabado!</h2>' +
      '<p>' + msg + ' Ganaste ' + E.score + ' de ' + n + ' estrellas a la primera.</p>' +
      '<div class="starrow">' + starsRow(E.score) + '</div>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="again">Jugar otra vez</button>' +
      '<button type="button" class="btn" data-act="mode" data-mode="silabas">Ir a Sílabas</button></div></div>';
  }

  /* Escritura tiene tres formas: tocar letras, usar el teclado y trazar con el dedo */
  function escritura(){
    var steps = [['letras','Letras'], ['teclado','Teclado'], ['trazar','Trazar']];
    panel.innerHTML = '<div class="steps" role="group" aria-label="Formas de escribir">' +
      steps.map(function(s, i){
        return '<button type="button" class="step" data-wstep="' + s[0] + '" aria-pressed="' + (state.es === s[0]) + '"><b>' + (i + 1) + '</b>' + s[1] + '</button>';
      }).join('') + '</div><div id="escrBody"></div>';
    if(state.es === 'letras') escrStart();
    else if(state.es === 'teclado') typeStart();
    else traceView();
  }

  /* Teclado: escribir la palabra con pistas y botones para la tilde y la ñ */
  function typeBody(){ return document.getElementById('escrBody'); }
  function typeStart(){
    T = {order:shuffle(WORDS).slice(0, 8), i:0, score:0};
    typeQ();
  }
  function typeQ(){
    T.hints = 1; T.miss = 0; T.locked = false;
    var w = T.order[T.i], n = T.order.length;
    typeBody().innerHTML =
      '<div class="qhead"><span class="count">Palabra ' + (T.i + 1) + ' de ' + n + '</span><span class="count">Estrellas ganadas: ' + T.score + '</span></div>' +
      '<div class="bar" aria-hidden="true"><i style="--p:' + (T.i / n * 100) + '%"></i></div>' +
      '<div class="build"><button type="button" class="tpic bpic" aria-label="Escuchar la palabra"><span class="emo" aria-hidden="true">' + w.pic + '</span></button>' +
      '<div class="typehint" id="typeHint"></div>' +
      '<input class="typein" id="typeIn" aria-label="Escribe la palabra" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Escribe aquí">' +
      '<div class="cons" role="group" aria-label="Letras especiales">' + ['á', 'é', 'í', 'ó', 'ú', 'ñ'].map(function(c){
        return '<button type="button" class="gchip akey">' + c + '</button>';
      }).join('') + '</div>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="type-check">Revisar</button>' +
      '<button type="button" class="btn" data-act="type-next">Otra palabra</button></div>' +
      '<p class="feedback" role="status"></p></div>';
    typeHint();
    if(window.matchMedia && matchMedia('(pointer:fine)').matches) document.getElementById('typeIn').focus();
    say(w.s.join(''));
  }
  function typeHint(){
    var word = T.order[T.i].s.join('');
    document.getElementById('typeHint').textContent = word.split('').map(function(c, i){ return i < T.hints ? c : '_'; }).join('');
  }
  function typeCheck(){
    if(T.locked) return;
    var word = T.order[T.i].s.join('');
    var typed = document.getElementById('typeIn').value.trim().toLowerCase();
    var fb = typeBody().querySelector('.feedback');
    function loose(x){ return plain(x).replace(/ñ/g, 'n'); }
    if(!typed) return;
    if(typed === word){
      T.locked = true;
      T.hints = word.length;
      typeHint();
      if(T.miss === 0){ T.score++; addStar(); }
      fb.textContent = '¡Muy bien! ' + word;
      later(function(){ say(word); }, 300);
      later(typeNext, 2300);
    }else if(loose(typed) === loose(word)){
      T.miss++;
      fb.textContent = 'Casi. Fíjate en la tilde o la ñ.';
    }else{
      T.miss++;
      T.hints = Math.min(T.hints + 1, word.length);
      typeHint();
      fb.textContent = 'Casi. Aquí tienes otra letra.';
    }
  }
  function typeNext(){
    clearTimers();
    T.i++;
    if(T.i < T.order.length){ typeQ(); return; }
    var n = T.order.length;
    var msg = T.score >= n - 1 ? '¡Perfecto!' : (T.score >= n / 2 ? '¡Muy bien!' : '¡Sigue practicando!');
    typeBody().innerHTML =
      '<div class="done"><h2>¡Colorín colorado, este juego se ha acabado!</h2>' +
      '<p>' + msg + ' Ganaste ' + T.score + ' de ' + n + ' estrellas a la primera.</p>' +
      '<div class="starrow">' + starsRow(T.score) + '</div>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="again">Jugar otra vez</button>' +
      '<button type="button" class="btn" data-act="wstep" data-wstep="trazar">Ir a Trazar</button></div></div>';
  }
  function typeAccent(c){
    var input = document.getElementById('typeIn');
    var pos = input.selectionStart === null ? input.value.length : input.selectionStart;
    var end = input.selectionEnd === null ? pos : input.selectionEnd;
    input.value = input.value.slice(0, pos) + c + input.value.slice(end);
    input.focus();
    input.setSelectionRange(pos + 1, pos + 1);
  }

  /* Trazar: seguir cada letra con el dedo sobre una guía */
  var traceInked = false;
  function traceDraw(){
    var cv = document.getElementById('traceCv');
    if(!cv) return;
    var l = ALPHA[state.tr], ctx = cv.getContext('2d'), text = l.l + l.l.toLowerCase(), size = 210;
    traceInked = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.font = "800 " + size + "px 'Baloo 2', sans-serif";
    var wide = ctx.measureText(text).width;
    if(wide > cv.width * 0.9) size = Math.floor(size * cv.width * 0.9 / wide);
    ctx.font = "800 " + size + "px 'Baloo 2', sans-serif";
    ctx.fillStyle = 'rgba(90,169,255,.4)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cv.width / 2, cv.height / 2 + 12);
    document.getElementById('traceLabel').textContent = l.l + ' ' + l.l.toLowerCase() + ', ' + l.word + ' ' + l.pic;
  }
  function traceGo(d){
    state.tr = (state.tr + d + ALPHA.length) % ALPHA.length;
    traceDraw();
    playLetter(ALPHA[state.tr]);
  }
  function traceView(){
    document.getElementById('escrBody').innerHTML =
      '<div class="build"><p class="hint">Sigue la letra con el dedo.</p>' +
      '<div class="tracelabel"><button type="button" class="gchip" data-act="trace-prev" aria-label="Letra anterior">←</button>' +
      '<span id="traceLabel"></span>' +
      '<button type="button" class="gchip" data-act="trace-next" aria-label="Letra siguiente">→</button></div>' +
      '<canvas class="tracecv" id="traceCv" width="340" height="340" aria-label="Espacio para trazar"></canvas>' +
      '<div class="btns"><button type="button" class="btn" data-act="trace-clear">Borrar</button>' +
      '<button type="button" class="btn primary" data-act="trace-done">¡Lo hice!</button></div>' +
      '<p class="feedback" role="status"></p></div>';
    var cv = document.getElementById('traceCv'), ctx = cv.getContext('2d'), drawing = false;
    function point(e){
      var r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
    }
    cv.addEventListener('pointerdown', function(e){
      var p = point(e);
      drawing = true;
      cv.setPointerCapture(e.pointerId);
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
    });
    cv.addEventListener('pointermove', function(e){
      if(!drawing) return;
      var p = point(e);
      ctx.lineTo(p[0], p[1]);
      ctx.strokeStyle = '#FF6B6B';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      traceInked = true;
    });
    ['pointerup', 'pointercancel'].forEach(function(t){ cv.addEventListener(t, function(){ drawing = false; }); });
    traceDraw();
    /* La guía se vuelve a dibujar cuando la fuente termina de cargar */
    if(document.fonts && document.fonts.load) document.fonts.load("800 210px 'Baloo 2'").then(function(){ if(!traceInked) traceDraw(); });
  }

  /* Alfabeto: el nombre de cada letra y una palabra que la usa */
  var ALPHA = D.alphabet;
  function playLetter(l){
    playChain([{key:l.nameClip, text:l.name}, {key:'w:' + l.word, text:l.word}]);
  }
  function alfaView(){
    panel.innerHTML = '<p class="hint">El español tiene 27 letras. Toca una para oír su nombre y una palabra.</p>' +
      '<ul class="grid" style="--wide:5">' + ALPHA.map(function(l, i){
        var at = l.word.toUpperCase().indexOf(l.l);
        var word = l.word.slice(0, at) + '<b>' + l.word.charAt(at) + '</b>' + l.word.slice(at + 1);
        var v = 'aeiou'.indexOf(l.l.toLowerCase()) > -1 ? ' style="--cat:var(--v-' + l.l.toLowerCase() + ')"' : '';
        return '<li><button type="button" class="tile ltile" data-i="' + i + '"' + v + ' aria-label="' + l.l + ', ' + l.word + '">' +
          '<span class="big" aria-hidden="true">' + l.l + l.l.toLowerCase() + '</span>' +
          '<span class="emo" aria-hidden="true">' + l.pic + '</span><span class="w">' + word + '</span>' + enSpan(l) + '</button></li>';
      }).join('') + '</ul>';
  }

  /* Pantalla principal */
  function renderChips(){
    chipsEl.innerHTML = CATS.map(function(c, i){
      return '<button type="button" class="chip" data-cat="' + i + '" aria-pressed="' + (i === state.cat) + '" style="--c:' + c.color + '"><i></i>' + c.name + '</button>';
    }).join('');
  }

  function render(){
    clearTimers();
    try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){}
    stopClip();
    var cat = CATS[state.cat];
    var sil = state.mode === 'silabas' || state.mode === 'escritura';
    var alfa = state.mode === 'alfabeto';
    app.style.setProperty('--cat', sil || alfa ? 'var(--purple)' : cat.color);
    controlsEl.hidden = sil;
    chipsEl.hidden = alfa;
    Array.prototype.forEach.call(tabsEl.querySelectorAll('.tab'), function(b){
      b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode));
    });
    sw.setAttribute('aria-checked', String(state.en));
    renderChips();
    if(alfa) alfaView();
    else if(state.mode === 'aprender') learn(cat);
    else if(state.mode === 'adivina') quizStart(cat);
    else if(state.mode === 'memoria') memStart(cat);
    else if(state.mode === 'escritura') escritura();
    else silabas();
  }

  function refreshEn(){
    Array.prototype.forEach.call(panel.querySelectorAll('.en'), function(e){ e.hidden = !state.en; });
  }

  /* Aprender */
  function learn(cat){
    var wide = cat.items.length > 8 ? 5 : 4;
    panel.innerHTML =
      '<p class="hint">Toca una tarjeta para escuchar la palabra.</p>' +
      '<ul class="grid" style="--wide:' + wide + '">' +
      cat.items.map(function(it, i){
        return '<li><button type="button" class="tile" data-i="' + i + '" aria-label="' + it.es + '">' +
          pic(it) + '<span class="w">' + it.es + '</span>' + enSpan(it) + '</button></li>';
      }).join('') + '</ul>';
  }

  /* Adivina */
  function quizStart(cat){
    Q = {cat:cat, order:shuffle(cat.items), i:0, score:0, first:true, locked:false, opts:[]};
    question();
  }

  function question(){
    var it = Q.order[Q.i];
    Q.first = true;
    Q.locked = false;
    var others = shuffle(Q.cat.items.filter(function(x){ return x !== it; })).slice(0, 3);
    Q.opts = shuffle([it].concat(others));
    renderQ();
    say(it.es);
  }

  function renderQ(){
    var it = Q.order[Q.i], n = Q.order.length;
    panel.innerHTML =
      '<div class="qhead"><span class="count">Pregunta ' + (Q.i + 1) + ' de ' + n + '</span>' +
      '<span class="count">Estrellas ganadas: ' + Q.score + '</span></div>' +
      '<div class="bar" aria-hidden="true"><i style="--p:' + (Q.i / n * 100) + '%"></i></div>' +
      '<div class="prompt"><button type="button" class="say" aria-label="Escuchar otra vez"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#i-sound"/></svg></button>' +
      '<div><span class="word">' + it.es + '</span>' + enSpan(it) + '</div></div>' +
      '<div class="opts">' +
      Q.opts.map(function(o, k){
        return '<button type="button" class="opt" data-k="' + k + '" aria-label="' + o.en + '">' + pic(o) + '</button>';
      }).join('') + '</div>' +
      '<p class="feedback" role="status"></p>';
  }

  function answer(btn){
    if(Q.locked || btn.dataset.state) return;
    var it = Q.order[Q.i];
    var pick = Q.opts[+btn.dataset.k];
    var fb = panel.querySelector('.feedback');
    if(pick === it){
      btn.dataset.state = 'right';
      Q.locked = true;
      fb.textContent = '¡Muy bien!';
      if(Q.first){ Q.score++; addStar(); }
      say(it.es);
      later(nextQ, 1500);
    }else{
      btn.dataset.state = 'wrong';
      Q.first = false;
      fb.textContent = 'Casi. ¡Inténtalo otra vez!';
    }
  }

  function nextQ(){
    Q.i++;
    if(Q.i >= Q.order.length) finishQ(); else question();
  }

  function finishQ(){
    var n = Q.order.length;
    var msg = Q.score >= n - 1 ? '¡Perfecto!' : (Q.score >= n / 2 ? '¡Muy bien!' : '¡Sigue practicando!');
    panel.innerHTML =
      '<div class="done"><h2>¡Colorín colorado, este juego se ha acabado!</h2>' +
      '<p>' + msg + ' Ganaste ' + Q.score + ' de ' + n + ' estrellas a la primera.</p>' +
      '<div class="starrow">' + starsRow(Q.score) + '</div>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="again">Jugar otra vez</button>' +
      '<button type="button" class="btn" data-act="mode" data-mode="memoria">Probar Memoria</button></div></div>';
  }

  /* Memoria */
  function memStart(cat){
    var pick = shuffle(cat.items).slice(0, 6);
    var cards = [];
    pick.forEach(function(it){
      cards.push({it:it, kind:'pic', matched:false});
      cards.push({it:it, kind:'word', matched:false});
    });
    M = {cat:cat, cards:shuffle(cards), up:[], done:0, tries:0, locked:false};
    panel.innerHTML =
      '<div class="qhead"><span class="count" id="mPairs"></span><span class="count" id="mTries"></span></div>' +
      '<p class="hint">Encuentra cada imagen con su palabra.</p>' +
      '<div class="mem">' + M.cards.map(function(c, k){ return cardHTML(c, k); }).join('') + '</div>';
    updateMHead();
  }

  function cardState(c, k){ return c.matched ? 'done' : (M.up.indexOf(k) > -1 ? 'up' : 'down'); }
  function cardInner(c, st){
    if(st === 'down') return '<span class="back" aria-hidden="true">?</span>';
    return c.kind === 'pic' ? pic(c.it) : '<span class="cw">' + c.it.es + '</span>';
  }
  function cardLabel(c, st){
    if(st === 'down') return 'Carta boca abajo';
    return c.kind === 'pic' ? c.it.en : c.it.es;
  }
  function cardHTML(c, k){
    var st = cardState(c, k);
    return '<button type="button" class="card" data-k="' + k + '" data-state="' + st + '" aria-label="' + cardLabel(c, st) + '">' + cardInner(c, st) + '</button>';
  }
  function paintCard(k){
    var el = panel.querySelector('.card[data-k="' + k + '"]');
    if(!el) return;
    var c = M.cards[k], st = cardState(c, k);
    el.dataset.state = st;
    el.setAttribute('aria-label', cardLabel(c, st));
    el.innerHTML = cardInner(c, st);
  }
  function updateMHead(){
    var a = document.getElementById('mPairs'), b = document.getElementById('mTries');
    if(a) a.textContent = 'Parejas: ' + M.done + ' de 6';
    if(b) b.textContent = 'Intentos: ' + M.tries;
  }

  function flip(btn){
    var k = +btn.dataset.k, c = M.cards[k];
    if(M.locked || c.matched || M.up.indexOf(k) > -1) return;
    M.up.push(k);
    paintCard(k);
    if(c.kind === 'word') say(c.it.es);
    if(M.up.length === 2){
      M.tries++;
      var a = M.cards[M.up[0]], b = M.cards[M.up[1]];
      if(a.it === b.it){
        a.matched = true; b.matched = true;
        var u = M.up; M.up = [];
        u.forEach(paintCard);
        M.done++;
        addStar();
        updateMHead();
        if(M.done === 6) later(finishM, 900);
      }else{
        updateMHead();
        M.locked = true;
        later(function(){
          var u2 = M.up; M.up = []; M.locked = false;
          u2.forEach(paintCard);
        }, 1000);
      }
    }
  }

  function finishM(){
    panel.innerHTML =
      '<div class="done"><h2>¡Colorín colorado, este juego se ha acabado!</h2>' +
      '<p>Encontraste las 6 parejas en ' + M.tries + ' intentos.</p>' +
      '<div class="starrow">' + starsRow(6) + '</div>' +
      '<div class="btns"><button type="button" class="btn primary" data-act="again">Jugar otra vez</button>' +
      '<button type="button" class="btn" data-act="mode" data-mode="adivina">Probar Adivina</button></div></div>';
  }

  /* Eventos */
  panel.addEventListener('click', function(e){
    var t = e.target.closest('button');
    if(!t || !panel.contains(t)) return;
    if(t.classList.contains('ltile')){
      playLetter(ALPHA[+t.dataset.i]);
      t.classList.remove('pop');
      void t.offsetWidth;
      t.classList.add('pop');
    }else if(t.classList.contains('tile')){
      var it = CATS[state.cat].items[+t.dataset.i];
      say(it.es);
      t.classList.remove('pop');
      void t.offsetWidth;
      t.classList.add('pop');
    }else if(t.classList.contains('say')){
      if(Q && Q.order[Q.i]) say(Q.order[Q.i].es);
    }else if(t.classList.contains('opt')){
      answer(t);
    }else if(t.classList.contains('card')){
      flip(t);
    }else if(t.dataset.wstep !== undefined){
      clearTimers();
      stopClip();
      try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){}
      state.es = t.dataset.wstep;
      escritura();
    }else if(t.classList.contains('step')){
      goStep(t.dataset.step);
    }else if(t.classList.contains('vrow')){
      var v = VOWELS[+t.dataset.i];
      playOr('vx:' + v.l, function(){ sayMany([[v.l, 0.7], [v.ex, 0.8]]); });
    }else if(t.classList.contains('cbtn')){
      state.cons = t.dataset.c;
      sylView(getBody());
    }else if(t.classList.contains('syl')){
      playSyl(t.dataset.s, true);
    }else if(t.classList.contains('wpic')){
      speakWord(t.closest('.wcard'), WORDS[+t.dataset.i]);
    }else if(t.classList.contains('blk')){
      playSyl(t.dataset.s, t.dataset.strong === '1');
      t.classList.add('on');
      later(function(){ t.classList.remove('on'); }, 700);
    }else if(t.classList.contains('wd')){
      say(t.dataset.say);
    }else if(t.classList.contains('readsent')){
      var si = +t.dataset.i;
      playOr('f:' + si, function(){ say(SENTS[si].t.replace(/-/g, '') + '.'); });
    }else if(t.classList.contains('tpic')){
      say(T.order[T.i].s.join(''));
    }else if(t.classList.contains('akey')){
      typeAccent(t.textContent);
    }else if(t.classList.contains('epic')){
      say(E.order[E.i].s.join(''));
    }else if(t.classList.contains('bpic')){
      say(B.order[B.i].s.join(''));
    }else if(t.classList.contains('gchip') && !t.dataset.act){
      if(t.dataset.wg !== undefined){ state.wg = t.dataset.wg; wordsView(getBody()); }
      else if(t.dataset.sp !== undefined){ state.sp = +t.dataset.sp; sentsView(getBody()); }
      else if(t.dataset.ag !== undefined){ state.ag = t.dataset.ag; armaReset(); }
      else if(t.dataset.lvl !== undefined){ state.lvl = t.dataset.lvl; armaReset(); }
      else if(t.dataset.eg !== undefined){ state.eg = t.dataset.eg; escrStart(); }
      else if(t.dataset.el !== undefined){ state.el = t.dataset.el; escrStart(); }
    }else if(t.classList.contains('lt')){
      escrPick(t);
    }else if(t.classList.contains('ch')){
      buildPick(t);
    }else if(t.dataset.act === 'type-check'){
      typeCheck();
    }else if(t.dataset.act === 'type-next'){
      typeNext();
    }else if(t.dataset.act === 'trace-prev'){
      traceGo(-1);
    }else if(t.dataset.act === 'trace-next'){
      traceGo(1);
    }else if(t.dataset.act === 'trace-clear'){
      traceDraw();
    }else if(t.dataset.act === 'trace-done'){
      if(traceInked){
        addStar();
        traceGo(1);
        panel.querySelector('.feedback').textContent = '¡Excelente!';
      }else{
        panel.querySelector('.feedback').textContent = 'Primero traza la letra.';
      }
    }else if(t.dataset.act === 'leer-say'){
      clearTimers();
      speakWord(t.closest('.leer'), L.w);
    }else if(t.dataset.act === 'leer-show'){
      if(!L.shown){ L.shown = true; addStar(); }
      leerView(getBody());
      say(L.w.s.join(''));
    }else if(t.dataset.act === 'leer-next'){
      clearTimers();
      stopClip();
      leerNext();
      leerView(getBody());
    }else if(t.dataset.act === 'step'){
      goStep(t.dataset.step);
    }else if(t.dataset.act === 'again'){
      render();
    }else if(t.dataset.act === 'mode'){
      state.mode = t.dataset.mode;
      render();
    }
  });

  panel.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && e.target.id === 'typeIn') typeCheck();
  });

  tabsEl.addEventListener('click', function(e){
    var b = e.target.closest('button');
    if(!b) return;
    state.mode = b.dataset.mode;
    render();
  });

  chipsEl.addEventListener('click', function(e){
    var b = e.target.closest('button');
    if(!b) return;
    state.cat = +b.dataset.cat;
    render();
  });

  sw.addEventListener('click', function(){
    state.en = !state.en;
    save('colorin.en', state.en ? '1' : '0');
    sw.setAttribute('aria-checked', String(state.en));
    refreshEn();
  });

  render();
})();
}
})();
