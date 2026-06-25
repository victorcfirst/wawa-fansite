/* ══════════════════════════════════════════════════════════════
   WAWA GAME HUB — vanilla JS (แปลงจาก React)
   ธีมพาสเทลบ้านชิวาว่าแลนด์ · Rhythm Tap + Photo Catch
   Leaderboard: localStorage (เฟส 1) — เตรียมต่อ Supabase ได้ (เฟส 2)
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── PALETTE (พาสเทล) ── */
  const C = {
    pink: '#f57aa8', pinkDeep: '#e85a92', teal: '#1aa3ad', sky: '#8ec9f0',
    lilac: '#b89cf0', gold: '#e8c060', mint: '#7ed4a8', danger: '#ff6b8a',
    ink: '#2e2a44', ink3: '#9a93b8', white: '#fff'
  };
  const LANE_COLORS = [C.pink, C.lilac, C.gold, C.teal];

  /* ════════════ LEADERBOARD STORAGE ════════════
     เฟส 1: localStorage (เก็บในเครื่องผู้เล่น)
     เฟส 2: เปลี่ยน loadBoard/saveBest ให้ดึง/เขียน Supabase
     โครงสร้าง entry: { name, game, score, date }
     ════════════════════════════════════════════ */
  const BOARD_KEY = 'wawa_leaderboard_v2';

  function loadBoard() {
    try { return JSON.parse(localStorage.getItem(BOARD_KEY)) || []; }
    catch { return []; }
  }
  function saveBoard(b) {
    try { localStorage.setItem(BOARD_KEY, JSON.stringify(b)); }
    catch (e) { console.error('storage error', e); }
  }
  // เก็บเฉพาะคะแนนสูงสุดของแต่ละคนในแต่ละเกม
  function upsertBest(board, entry) {
    const next = board.map(e => ({ ...e }));
    const i = next.findIndex(e => e.name === entry.name && e.game === entry.game);
    let isNewBest = false;
    if (i === -1) { next.push(entry); isNewBest = true; }
    else if (entry.score > next[i].score) { next[i] = entry; isNewBest = true; }
    return { board: next, isNewBest };
  }
  // คะแนนรวม = ผลรวมคะแนนสูงสุดจากทุกเกมของคนนั้น
  function totalsFromBoard(board) {
    const m = {};
    board.forEach(e => {
      if (!m[e.name]) m[e.name] = { name: e.name, total: 0, games: {} };
      m[e.name].total += e.score;
      m[e.name].games[e.game] = e.score;
    });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }

  let BOARD = loadBoard();
  let NICK = '';

  function recordScore(game, score) {
    const entry = { name: NICK || 'Guest', game, score, date: new Date().toLocaleDateString('th-TH') };
    const { board, isNewBest } = upsertBest(BOARD, entry);
    BOARD = board; saveBoard(BOARD);
    return isNewBest;
  }

  /* ════════════ DOM HELPERS ════════════ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ════════════ SONG LIST (Rhythm Tap) ════════════
     🎬 ใส่คลิปแฟนแคม: เปลี่ยน src เป็นพาธไฟล์วิดีโอ เช่น "games/fancam/saikyou.mp4"
        แล้วตั้ง USE_VIDEO = true ด้านล่าง — เกมจะ sync กับวิดีโออัตโนมัติ */
  const USE_VIDEO = false;
  const SONGS = [
    { id: 'saikyou', title: 'Saikyou Twintail', sub: 'บีตจากแฟนแคมจริง · 136 BPM', dur: 81.2, color: C.pink, src: '' },
    { id: 'pumpkin', title: 'Oh my Pumpkin', sub: 'บีตจากแฟนแคมจริง · 112 BPM', dur: 85.0, color: C.gold, src: '' }
  ];
  const BEATMAPS = window.WAWA_BEATMAPS || { saikyou: [], pumpkin: [] };

  /* ════════════ RHYTHM TAP ════════════ */
  const RT = { W: 320, H: 480, LANES: 4, HIT_Y: 410, TOL: 52, PXPS: 260, KEYS: ['A', 'S', 'D', 'F'] };
  const rtX = (i) => { const m = 20, s = (RT.W - m * 2) / RT.LANES; return m + s * i + s / 2; };
  const RT_LEAD = (RT.HIT_Y + 24) / RT.PXPS + 0.4;

  function playRhythm(host, song, onEnd) {
    const notes = (BEATMAPS[song.id] || []).map(n => ({ ...n, hit: false, miss: false }));
    const state = { score: 0, combo: 0, maxCombo: 0, fb: [], t0: performance.now() / 1000, running: true };

    host.innerHTML = '';
    const wrap = el('div', 'rt-wrap');
    wrap.innerHTML = `
      <div class="rt-top">
        <button class="g-back">‹ กลับ</button>
        <div class="rt-song">${song.title}</div>
        <div class="rt-score"><span id="rtScore">0</span></div>
      </div>
      <div class="rt-combo" id="rtCombo"></div>
      <div class="rt-playfield">
        <video id="rtVideo" playsinline muted></video>
        <canvas id="rtCanvas" width="${RT.W}" height="${RT.H}"></canvas>
      </div>
      <div class="rt-keys">
        ${RT.KEYS.map((k, i) => `<button class="rt-key" data-lane="${i}" style="--kc:${LANE_COLORS[i]}">${k}</button>`).join('')}
      </div>
      <div class="rt-hint">แตะปุ่มสีให้ตรงจังหวะที่โน้ตถึงเส้น • บนคอมใช้ปุ่ม A S D F ได้</div>
    `;
    host.appendChild(wrap);

    const cvs = $('#rtCanvas', wrap), ctx = cvs.getContext('2d');
    const video = $('#rtVideo', wrap);
    const hasVideo = USE_VIDEO && song.src;
    if (hasVideo) {
      video.src = song.src;
      video.muted = false;       // ผู้ใช้กดเลือกเพลงแล้ว = มี gesture เปิดเสียงได้
      video.currentTime = 0;
      video.play().catch(() => { /* ถ้าเสียงโดนบล็อก ลองเล่นแบบ mute */ video.muted = true; video.play().catch(()=>{}); });
      cvs.classList.add('rt-canvas-overlay'); // พื้นหลัง canvas โปร่งใสให้เห็นวิดีโอ
    }

    const now = () => (USE_VIDEO && song.src && video.readyState > 0) ? video.currentTime : (performance.now() / 1000 - state.t0);

    function judge(lane) {
      if (!state.running) return;
      const t = now();
      let best = null, bestDiff = 1e9;
      for (const n of notes) {
        if (n.hit || n.miss || n.lane !== lane) continue;
        const d = Math.abs(n.t - t);
        if (d < bestDiff) { bestDiff = d; best = n; }
      }
      const tolSec = RT.TOL / RT.PXPS;
      if (best && bestDiff <= tolSec) {
        best.hit = true;
        const perfect = bestDiff <= tolSec * 0.45;
        state.combo++; state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.score += (perfect ? 100 : 60) + state.combo * 2;
        state.fb.push({ x: rtX(lane), y: RT.HIT_Y, txt: perfect ? 'PERFECT' : 'GOOD', col: perfect ? C.gold : C.teal, t: t });
        $('#rtScore', wrap).textContent = state.score;
        const cb = $('#rtCombo', wrap);
        cb.textContent = state.combo > 2 ? state.combo + ' COMBO' : '';
      } else {
        state.combo = 0;
        $('#rtCombo', wrap).textContent = '';
      }
    }

    // input
    wrap.querySelectorAll('.rt-key').forEach(btn => {
      const lane = +btn.dataset.lane;
      const press = (e) => { e.preventDefault(); judge(lane); btn.classList.add('on'); setTimeout(() => btn.classList.remove('on'), 90); };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('mousedown', press);
    });
    const keyHandler = (e) => {
      const i = RT.KEYS.indexOf(e.key.toUpperCase());
      if (i >= 0) { const b = wrap.querySelector(`.rt-key[data-lane="${i}"]`); if (b) { judge(i); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 90); } }
    };
    document.addEventListener('keydown', keyHandler);

    function finish() {
      state.running = false;
      document.removeEventListener('keydown', keyHandler);
      if (USE_VIDEO) { try { video.pause(); } catch {} }
      onEnd({ game: 'Rhythm Tap', score: state.score, maxCombo: state.maxCombo });
    }

    $('.g-back', wrap).addEventListener('click', () => { state.running = false; document.removeEventListener('keydown', keyHandler); if (USE_VIDEO) { try { video.pause(); } catch {} } onEnd(null); });

    // render loop
    function frame() {
      if (!state.running) return;
      const t = now();
      ctx.clearRect(0, 0, RT.W, RT.H);
      // lanes
      for (let i = 0; i < RT.LANES; i++) {
        ctx.fillStyle = 'rgba(245,122,168,0.05)';
        const m = 20, s = (RT.W - m * 2) / RT.LANES;
        ctx.fillRect(m + s * i + 3, 0, s - 6, RT.H);
      }
      // hit line
      ctx.strokeStyle = 'rgba(26,163,173,0.5)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(10, RT.HIT_Y); ctx.lineTo(RT.W - 10, RT.HIT_Y); ctx.stroke();
      // notes
      for (const n of notes) {
        if (n.hit) continue;
        const y = RT.HIT_Y - (n.t - t) * RT.PXPS;
        if (y < -30 || y > RT.H + 30) { if (n.t < t - 0.2 && !n.miss) { n.miss = true; } continue; }
        if (n.t < t - RT.TOL / RT.PXPS && !n.miss) { n.miss = true; state.combo = 0; }
        const x = rtX(n.lane), r = 17;
        ctx.fillStyle = LANE_COLORS[n.lane];
        ctx.globalAlpha = n.miss ? 0.25 : 1;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath(); ctx.arc(x - 5, y - 5, 4, 0, 7); ctx.fill();
      }
      // feedback text
      state.fb = state.fb.filter(f => t - f.t < 0.6);
      for (const f of state.fb) {
        ctx.fillStyle = f.col; ctx.globalAlpha = Math.max(0, 1 - (t - f.t) / 0.6);
        ctx.font = 'bold 15px Fredoka, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(f.txt, f.x, f.y - 30 - (t - f.t) * 40);
        ctx.globalAlpha = 1;
      }
      // end check
      const lastT = notes.length ? notes[notes.length - 1].t : 0;
      if (t > lastT + 1.5) { finish(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ════════════ PHOTO CATCH ════════════ */
  function playPhotoCatch(host, onEnd) {
    const W = 320, H = 460;
    const state = { score: 0, lives: 3, items: [], basket: W / 2, running: true, t0: performance.now(), spawn: 0, speed: 1 };

    host.innerHTML = '';
    const wrap = el('div', 'pc-wrap');
    wrap.innerHTML = `
      <div class="rt-top">
        <button class="g-back">‹ กลับ</button>
        <div class="rt-song">Photo Catch</div>
        <div class="pc-stat">❤️<span id="pcLives">3</span> · <span id="pcScore">0</span></div>
      </div>
      <canvas id="pcCanvas" width="${W}" height="${H}"></canvas>
      <div class="rt-hint">เลื่อนตะกร้าซ้าย-ขวา รับการ์ดวาว่า 💖 เลี่ยงระเบิด 💣</div>
    `;
    host.appendChild(wrap);
    const cvs = $('#pcCanvas', wrap), ctx = cvs.getContext('2d');

    function moveTo(clientX) {
      const r = cvs.getBoundingClientRect();
      state.basket = Math.max(28, Math.min(W - 28, (clientX - r.left) * (W / r.width)));
    }
    cvs.addEventListener('touchmove', e => { e.preventDefault(); moveTo(e.touches[0].clientX); }, { passive: false });
    cvs.addEventListener('mousemove', e => moveTo(e.clientX));

    $('.g-back', wrap).addEventListener('click', () => { state.running = false; onEnd(null); });

    function finish() { state.running = false; onEnd({ game: 'Photo Catch', score: state.score }); }

    function frame() {
      if (!state.running) return;
      const dt = 16;
      state.spawn -= dt;
      const elapsed = (performance.now() - state.t0) / 1000;
      state.speed = 1 + elapsed / 30;
      if (state.spawn <= 0) {
        state.spawn = 720 / state.speed;
        const bomb = Math.random() < 0.22;
        state.items.push({ x: 28 + Math.random() * (W - 56), y: -20, bomb, vy: (1.6 + Math.random() * 1.2) * state.speed });
      }
      ctx.clearRect(0, 0, W, H);
      // items
      for (const it of state.items) {
        it.y += it.vy;
        if (it.bomb) {
          ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.fillText('💣', it.x, it.y);
        } else {
          ctx.fillStyle = C.pink; ctx.strokeStyle = C.white; ctx.lineWidth = 2;
          roundRect(ctx, it.x - 13, it.y - 16, 26, 32, 5); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.white; ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.fillText('💖', it.x, it.y + 3);
        }
        // catch check
        if (it.y > H - 56 && it.y < H - 20 && Math.abs(it.x - state.basket) < 40) {
          if (it.bomb) { state.lives--; $('#pcLives', wrap).textContent = state.lives; }
          else { state.score += 10; $('#pcScore', wrap).textContent = state.score; }
          it.y = H + 100;
        }
      }
      state.items = state.items.filter(it => it.y < H + 40);
      // basket
      ctx.fillStyle = C.teal; ctx.strokeStyle = C.white; ctx.lineWidth = 3;
      roundRect(ctx, state.basket - 30, H - 42, 60, 30, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.white; ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.fillText('🧺', state.basket, H - 20);

      if (state.lives <= 0) { finish(); return; }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ════════════ HUB UI ════════════ */
  const GAMES = [
    { id: 'rhythmtap', title: 'Rhythm Tap', desc: 'กดตามจังหวะเพลงวาว่า สะสมคอมโบ!', emoji: '🎵', col: C.pink, on: true },
    { id: 'photocatch', title: 'Photo Catch', desc: 'รับการ์ดวาว่า เลี่ยงระเบิด!', emoji: '🧺', col: C.gold, on: true },
    { id: '_run', title: 'Endless Runner', desc: 'วาว่าวิ่งเก็บหัวใจ', emoji: '🏃', col: C.teal, on: false },
    { id: '_quiz', title: 'Wawa Quiz', desc: 'ทดสอบความรู้เรื่องวาว่า', emoji: '❓', col: C.lilac, on: false },
    { id: '_memo', title: 'Memory Match', desc: 'จับคู่การ์ดวาว่า', emoji: '🃏', col: C.pinkDeep, on: false },
    { id: '_spot', title: 'Spot Wawa', desc: 'หาวาว่าจากรูปหมู่', emoji: '🔍', col: C.sky, on: false }
  ];

  function mountHub(rootId) {
    const root = document.getElementById(rootId);
    if (!root) return;

    function renderHome() {
      root.innerHTML = '';
      const c = el('div', 'gh');
      // nickname
      const nameRow = el('div', 'gh-name');
      nameRow.innerHTML = `
        <label>ชื่อเล่นของคุณ</label>
        <input id="ghNick" type="text" maxlength="14" placeholder="ใส่ชื่อเล่นก่อนเล่น" value="${NICK}">
      `;
      c.appendChild(nameRow);
      // game grid
      const grid = el('div', 'gh-grid');
      GAMES.forEach(g => {
        const card = el('button', 'gh-card' + (g.on ? '' : ' off'));
        card.style.setProperty('--gc', g.col);
        card.innerHTML = `
          <div class="gh-emoji">${g.emoji}</div>
          <div class="gh-info"><div class="gh-t">${g.title}</div><div class="gh-d">${g.desc}</div></div>
          ${g.on ? '<div class="gh-go">เล่น ›</div>' : '<div class="gh-soon">เร็วๆ นี้</div>'}
        `;
        if (g.on) card.addEventListener('click', () => {
          NICK = ($('#ghNick', root).value || '').trim();
          startGame(g.id);
        });
        grid.appendChild(card);
      });
      c.appendChild(grid);
      root.appendChild(c);
      renderLeaderboard();
    }

    function startGame(id) {
      root.innerHTML = '';
      const stage = el('div', 'gh-stage');
      root.appendChild(stage);
      const onEnd = (result) => {
        if (result) {
          const isNew = recordScore(result.game, result.score);
          showResult(result, isNew);
        } else renderHome();
      };
      if (id === 'rhythmtap') {
        // song picker
        stage.innerHTML = `<div class="gh-pick"><button class="g-back">‹ กลับ</button><div class="gh-pick-t">เลือกเพลง 🎵</div></div>`;
        $('.g-back', stage).addEventListener('click', renderHome);
        const list = el('div', 'gh-songs');
        SONGS.forEach(sg => {
          const b = el('button', 'gh-song'); b.style.setProperty('--gc', sg.color);
          b.innerHTML = `<div class="gh-song-t">${sg.title}</div><div class="gh-song-s">${sg.sub}</div>`;
          b.addEventListener('click', () => playRhythm(stage, sg, onEnd));
          list.appendChild(b);
        });
        stage.appendChild(list);
      } else if (id === 'photocatch') {
        playPhotoCatch(stage, onEnd);
      }
    }

    function showResult(result, isNew) {
      root.innerHTML = '';
      const c = el('div', 'gh-result');
      c.innerHTML = `
        <div class="gh-res-emoji">${isNew ? '🎉' : '💫'}</div>
        <div class="gh-res-title">${isNew ? 'คะแนนสูงสุดใหม่!' : 'เล่นจบแล้ว!'}</div>
        <div class="gh-res-game">${result.game}</div>
        <div class="gh-res-score">${result.score.toLocaleString()}</div>
        ${result.maxCombo ? `<div class="gh-res-combo">คอมโบสูงสุด ${result.maxCombo}</div>` : ''}
        <div class="gh-res-name">ในชื่อ: ${NICK || 'Guest'}</div>
        <div class="gh-res-btns">
          <button class="gh-btn-again">เล่นอีกครั้ง</button>
          <button class="gh-btn-home">กลับหน้าเกม</button>
        </div>
      `;
      $('.gh-btn-home', c).addEventListener('click', renderHome);
      $('.gh-btn-again', c).addEventListener('click', renderHome);
      root.appendChild(c);
    }

    function renderLeaderboard() {
      // อัปเดต leaderboard ในหน้า (ใช้ element ที่มีอยู่)
      const lb = document.getElementById('leaderboard');
      if (!lb) return;
      const totals = totalsFromBoard(BOARD).slice(0, 10);
      if (!totals.length) {
        lb.innerHTML = '<div class="lb-empty"><div class="big">🎮</div><div class="tx">ยังไม่มีคะแนน — มาเป็นคนแรกกันเลย!</div></div>';
        return;
      }
      lb.innerHTML = totals.map((x, i) => {
        const medal = ['🥇', '🥈', '🥉', '4', '5', '6', '7', '8', '9', '10'][i];
        return `<div class="lb-row"><div class="lb-rank">${medal}</div><div class="lb-name">${x.name}</div><div class="lb-score">${x.total.toLocaleString()}</div></div>`;
      }).join('');
    }

    renderHome();
  }

  // expose
  window.WawaGameHub = { mount: mountHub };
})();
