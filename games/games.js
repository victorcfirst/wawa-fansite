/* ══════════════════════════════════════════════════════════════
   WAWA GAME HUB — vanilla JS (แปลงจาก React)
   ธีมพาสเทลบ้านชิวาว่าแลนด์ · Rhythm Tap + Photo Catch
   Leaderboard: Supabase (เฟส 2) · fallback localStorage
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

  /* ════════════ LEADERBOARD — Supabase ════════════
     entry: { name, game, score, date }
     fallback: localStorage (ถ้า network ล้มเหลว)
     ================================================ */
  const SB_URL = 'https://hvxtghogabswrrficaxa.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2eHRnaG9nYWJzd3JyZmljYXhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0NTc5NTEsImV4cCI6MjA5ODAzMzk1MX0.J6UFi4qlzOiHck5XCt1cZqIgJCLd7YCxgGH5etC2aEg';
  const BOARD_KEY = 'wawa_leaderboard_v2';

  async function sbFetch(path, opts = {}) {
    const r = await fetch(SB_URL + '/rest/v1/' + path, {
      ...opts,
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        ...(opts.headers || {})
      }
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json().catch(() => null);
  }

  // คะแนนรวม = ผลรวมคะแนนสูงสุดจากทุกเกมของคนนั้น
  function totalsFromBoard(board) {
    const m = {};
    board.forEach(e => {
      if (!m[e.name]) m[e.name] = { name: e.name, total: 0 };
      m[e.name].total += e.score;
    });
    return Object.values(m).sort((a, b) => b.total - a.total);
  }

  // เก็บเฉพาะคะแนนสูงสุดต่อคนต่อเกม (ใช้ใน fallback localStorage)
  function upsertBest(board, entry) {
    const next = board.map(e => ({ ...e }));
    const i = next.findIndex(e => e.name === entry.name && e.game === entry.game);
    let isNewBest = false;
    if (i === -1) { next.push(entry); isNewBest = true; }
    else if (entry.score > next[i].score) { next[i] = entry; isNewBest = true; }
    return { board: next, isNewBest };
  }

  let NICK = '';

  async function recordScore(game, score) {
    const name = NICK || 'Guest';
    const date = new Date().toLocaleDateString('th-TH');
    try {
      const existing = await sbFetch(
        `leaderboard?name=eq.${encodeURIComponent(name)}&game=eq.${encodeURIComponent(game)}&select=score`
      );
      if (score <= (existing?.[0]?.score ?? -1)) return false;
      await sbFetch('leaderboard', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ name, game, score, date, updated_at: new Date().toISOString() })
      });
      return true;
    } catch (e) {
      console.error('recordScore error', e);
      try {
        const board = JSON.parse(localStorage.getItem(BOARD_KEY)) || [];
        const { board: next, isNewBest } = upsertBest(board, { name, game, score, date });
        localStorage.setItem(BOARD_KEY, JSON.stringify(next));
        return isNewBest;
      } catch { return false; }
    }
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
  const USE_VIDEO = true;
  /* noteOffset (วินาที): บวก = เลื่อนโน้ตช้าลง (ตีทีหลัง), ลบ = เลื่อนเร็วขึ้น (ตีก่อน)
     ปรับตามความรู้สึกขณะเล่นจริง — ค่า 0 = ใช้เวลาตรงตาม librosa beat detection */
  const SONGS = [
    { id: 'saikyou', title: 'Saikyou Twintail', sub: 'บีตจากแฟนแคมจริง · 136 BPM', dur: 81.2, color: C.pink, src: 'games/fancam/saikyou.mp4', noteOffset: 0 },
    { id: 'pumpkin', title: 'Oh my Pumpkin', sub: 'บีตจากแฟนแคมจริง · 112 BPM', dur: 69.4, color: C.gold, src: 'games/fancam/Pumpkin.mp4', noteOffset: 0 }
  ];
  const BEATMAPS = window.WAWA_BEATMAPS || { saikyou: [], pumpkin: [] };

  /* ════════════ RHYTHM TAP ════════════ */
  const RT = { W: 320, H: 480, LANES: 4, HIT_Y: 410, TOL: 55, PXPS: 220, KEYS: ['A', 'S', 'D', 'F'] };
  const rtX = (i) => { const m = 20, s = (RT.W - m * 2) / RT.LANES; return m + s * i + s / 2; };

  const GRADE_COLOR = { SS: '#e8c060', S: '#d4930a', A: '#1aa3ad', B: '#8ec9f0', C: '#b89cf0', D: '#f57aa8' };
  function getGrade(perfects, goods, misses, total) {
    if (total === 0) return 'D';
    const acc = (perfects + goods * 0.6) / total;
    const isFC = misses === 0;
    if (isFC && perfects === total) return 'SS';
    if (isFC && acc >= 0.85) return 'S';
    if (acc >= 0.80) return 'A';
    if (acc >= 0.65) return 'B';
    if (acc >= 0.50) return 'C';
    return 'D';
  }

  function playRhythm(host, song, onEnd) {
    const off = song.noteOffset || 0;
    const notes = (BEATMAPS[song.id] || []).map(n => ({ ...n, t: n.t + off, hit: false, miss: false }));
    const totalNotes = notes.length;
    const state = { score: 0, combo: 0, maxCombo: 0, fb: [], perfects: 0, goods: 0, misses: 0, t0: 0, running: false };

    const hasVideo = USE_VIDEO && song.src;
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
        ${hasVideo ? '<video id="rtVideo" playsinline></video>' : ''}
        <canvas id="rtCanvas" width="${RT.W}" height="${RT.H}"${hasVideo ? ' class="rt-canvas-overlay"' : ''}></canvas>
        <div class="rt-overlay" id="rtOverlay">
          <div class="rt-ready-box">
            <div class="rt-ready-title">🎵 ${song.title}</div>
            <div class="rt-ready-sub">${song.sub}</div>
            <div class="rt-ready-status" id="rtStatus">${hasVideo ? 'กำลังโหลดวิดีโอ… 🎀' : 'พร้อมเล่นแล้ว!'}</div>
            <button class="rt-ready-btn" id="rtStartBtn"${hasVideo ? ' disabled' : ''}>▶ เริ่มเล่น!</button>
            <div class="rt-ready-hint">ใช้ปุ่ม A S D F หรือแตะปุ่มสี</div>
          </div>
        </div>
        <div class="rt-countdown-overlay" id="rtCountdown"></div>
      </div>
      <div class="rt-keys">
        ${RT.KEYS.map((k, i) => `<button class="rt-key" data-lane="${i}" style="--kc:${LANE_COLORS[i]}">${k}</button>`).join('')}
      </div>
      <div class="rt-hint">แตะปุ่มสีให้ตรงจังหวะที่โน้ตถึงเส้น • บนคอมใช้ปุ่ม A S D F ได้</div>
    `;
    host.appendChild(wrap);

    const cvs = $('#rtCanvas', wrap), ctx = cvs.getContext('2d');
    const video = hasVideo ? $('#rtVideo', wrap) : null;
    const startBtn = $('#rtStartBtn', wrap);
    const statusEl = $('#rtStatus', wrap);
    const overlay = $('#rtOverlay', wrap);
    const countdownEl = $('#rtCountdown', wrap);

    if (hasVideo) {
      video.muted = true;
      video.preload = 'auto';
      video.src = song.src;
      video.load();
      video.addEventListener('canplaythrough', () => {
        statusEl.textContent = 'โหลดเสร็จแล้ว! พร้อมเล่น 🎉';
        startBtn.disabled = false;
      }, { once: true });
      video.addEventListener('error', () => {
        statusEl.textContent = 'วิดีโอโหลดไม่ได้ — เล่นแบบไม่มีวิดีโอ';
        startBtn.disabled = false;
      }, { once: true });
      // เมื่อวิดีโอจบ → จบเกมทันที (ไม่ต้องรอ timer)
      video.addEventListener('ended', () => { if (state.running) finish(); }, { once: true });
    }

    const now = () => (hasVideo && video && video.readyState > 0) ? video.currentTime : (performance.now() / 1000 - state.t0);

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
        if (perfect) state.perfects++; else state.goods++;
        state.fb.push({ x: rtX(lane), y: RT.HIT_Y, txt: perfect ? 'PERFECT' : 'GOOD', col: perfect ? C.gold : C.teal, t });
        $('#rtScore', wrap).textContent = state.score;
        const cb = $('#rtCombo', wrap);
        cb.textContent = state.combo > 2 ? state.combo + ' COMBO' : '';
      } else {
        state.combo = 0;
        $('#rtCombo', wrap).textContent = '';
      }
    }

    wrap.querySelectorAll('.rt-key').forEach(btn => {
      const lane = +btn.dataset.lane;
      const press = (e) => { e.preventDefault(); if (!state.running) return; judge(lane); btn.classList.add('on'); setTimeout(() => btn.classList.remove('on'), 90); };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('mousedown', press);
    });
    const keyHandler = (e) => {
      if (!state.running) return;
      const i = RT.KEYS.indexOf(e.key.toUpperCase());
      if (i >= 0) { const b = wrap.querySelector(`.rt-key[data-lane="${i}"]`); if (b) { judge(i); b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 90); } }
    };
    document.addEventListener('keydown', keyHandler);

    function cleanup() {
      document.removeEventListener('keydown', keyHandler);
      if (video) { try { video.pause(); } catch {} }
    }

    function showGrade() {
      cleanup();
      recordScore('Rhythm Tap', state.score); // async fire-and-forget
      const grade = getGrade(state.perfects, state.goods, state.misses, totalNotes);
      const accuracy = totalNotes > 0 ? Math.round((state.perfects + state.goods * 0.6) / totalNotes * 100) : 0;
      const gcol = GRADE_COLOR[grade] || C.pink;
      const gradeMsg = { SS: 'เพอร์เฟกต์ทุกโน้ต! สุดยอด! 🌟', S: 'ฟูลคอมโบ! เก่งมาก! 🎉', A: 'ยอดเยี่ยม! 💖', B: 'ดีมาก! 👍', C: 'พยายามอีกนิดนะ 💪', D: 'ฝึกต่อไปนะ 🎵' };
      wrap.innerHTML = `
        <div class="rt-grade-screen">
          <div class="rt-grade-header">
            <div class="rt-grade-title">${gradeMsg[grade] || 'จบเพลงแล้ว!'}</div>
            <div class="rt-grade-song-name">${song.title}</div>
          </div>
          <div class="rt-grade-letter" style="color:${gcol};text-shadow:0 4px 20px ${gcol}66">${grade}</div>
          <div class="rt-grade-score-val">${state.score.toLocaleString()}</div>
          <div class="rt-grade-stats">
            <div class="rt-stat perfect"><span>${state.perfects}</span>PERFECT</div>
            <div class="rt-stat good"><span>${state.goods}</span>GOOD</div>
            <div class="rt-stat miss"><span>${state.misses}</span>MISS</div>
          </div>
          <div class="rt-grade-info">
            <span>แม่นยำ ${accuracy}%</span><span class="rt-grade-dot">·</span><span>คอมโบสูงสุด ${state.maxCombo}x</span>
          </div>
          <div class="rt-grade-btns">
            <button class="gh-btn-again rt-grade-again">เล่นอีกครั้ง</button>
            <button class="gh-btn-home rt-grade-home">กลับเมนูเกม</button>
          </div>
        </div>
      `;
      $('.rt-grade-again', wrap).addEventListener('click', () => playRhythm(host, song, onEnd));
      $('.rt-grade-home', wrap).addEventListener('click', () => onEnd(null));
    }

    function finish() {
      state.running = false;
      showGrade();
    }

    $('.g-back', wrap).addEventListener('click', () => { state.running = false; cleanup(); onEnd(null); });

    function startCountdown() {
      overlay.style.display = 'none';
      countdownEl.style.display = 'flex';
      let count = 3;
      countdownEl.textContent = count;
      countdownEl.className = 'rt-countdown-overlay';
      const tick = setInterval(() => {
        count--;
        if (count > 0) {
          countdownEl.textContent = count;
        } else if (count === 0) {
          countdownEl.textContent = 'GO!';
          countdownEl.classList.add('go');
        } else {
          clearInterval(tick);
          countdownEl.style.display = 'none';
          state.t0 = performance.now() / 1000;
          state.running = true;
          if (video) {
            video.muted = false;
            video.currentTime = 0;
            video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
          }
          requestAnimationFrame(frame);
        }
      }, 1000);
    }

    startBtn.addEventListener('click', startCountdown);

    // render loop
    function frame() {
      if (!state.running) return;
      const t = now();
      ctx.clearRect(0, 0, RT.W, RT.H);
      const m = 20, s = (RT.W - m * 2) / RT.LANES;
      // lane separators
      ctx.lineWidth = 1;
      for (let i = 0; i <= RT.LANES; i++) {
        ctx.strokeStyle = 'rgba(255,255,255,0.13)';
        ctx.beginPath(); ctx.moveTo(m + s * i, 0); ctx.lineTo(m + s * i, RT.H); ctx.stroke();
      }
      // hit zone glow gradient
      const zg = ctx.createLinearGradient(0, RT.HIT_Y - 50, 0, RT.HIT_Y + 26);
      zg.addColorStop(0, 'rgba(26,163,173,0)'); zg.addColorStop(1, 'rgba(26,163,173,0.22)');
      ctx.fillStyle = zg; ctx.fillRect(0, RT.HIT_Y - 50, RT.W, 76);
      // target circles (hit zone markers)
      for (let i = 0; i < RT.LANES; i++) {
        ctx.strokeStyle = LANE_COLORS[i]; ctx.lineWidth = 3; ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.arc(rtX(i), RT.HIT_Y, 19, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // hit line
      ctx.shadowColor = 'rgba(255,255,255,0.8)'; ctx.shadowBlur = 8;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(m, RT.HIT_Y); ctx.lineTo(RT.W - m, RT.HIT_Y); ctx.stroke();
      ctx.shadowBlur = 0;
      // notes
      const tolSec = RT.TOL / RT.PXPS;
      for (const n of notes) {
        if (n.hit) continue;
        if (!n.miss && n.t < t - tolSec) {
          n.miss = true; state.misses++; state.combo = 0;
          const cb = $('#rtCombo', wrap); if (cb) cb.textContent = '';
        }
        const y = RT.HIT_Y - (n.t - t) * RT.PXPS;
        if (y < -30 || y > RT.H + 30) continue;
        const x = rtX(n.lane), r = 18;
        ctx.globalAlpha = n.miss ? 0.2 : 1;
        if (!n.miss) { ctx.shadowColor = LANE_COLORS[n.lane]; ctx.shadowBlur = 14; }
        ctx.fillStyle = LANE_COLORS[n.lane];
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
        if (!n.miss) {
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath(); ctx.arc(x - 5, y - 5, 5, 0, 7); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // feedback text
      state.fb = state.fb.filter(f => t - f.t < 0.6);
      for (const f of state.fb) {
        const age = t - f.t;
        ctx.shadowColor = f.col; ctx.shadowBlur = 10;
        ctx.fillStyle = f.col; ctx.globalAlpha = Math.max(0, 1 - age / 0.6);
        ctx.font = 'bold 16px Fredoka, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(f.txt, f.x, f.y - 30 - age * 44);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      // end check — with video, wait for full song.dur; without, end after last note
      const lastT = notes.length ? notes[notes.length - 1].t : 0;
      const endTime = (hasVideo ? Math.max(song.dur || 0, lastT) : lastT) + 1.5;
      if (t > endTime) { finish(); return; }
      requestAnimationFrame(frame);
    }
  }

  /* ════════════ PHOTO CATCH ════════════ */
  /* BGM สำหรับ Photo Catch — วางไฟล์เพลงที่ games/bgm/photocatch.mp3 */
  const PC_BGM_SRC = 'games/bgm/photocatch.mp3';

  function playPhotoCatch(host, onEnd) {
    const W = 320, H = 460;
    const state = {
      score: 0, lives: 3, items: [], basket: W / 2,
      running: false, t0: 0, spawn: 0, speed: 1, fb: []
    };

    // โหลดรูป photocard (ไฟล์ images/pc-normal.png และ images/pc-special.png)
    const imgNormal = new Image(); imgNormal.src = 'images/pc-normal.png';
    const imgSpecial = new Image(); imgSpecial.src = 'images/pc-special.png';

    // BGM
    const bgm = new Audio(PC_BGM_SRC);
    bgm.loop = true; bgm.volume = 0.45;

    host.innerHTML = '';
    const wrap = el('div', 'pc-wrap');
    wrap.innerHTML = `
      <div class="rt-top">
        <button class="g-back">‹ กลับ</button>
        <div class="rt-song">Photo Catch</div>
        <div class="pc-stat">❤️<span id="pcLives">3</span> · <span id="pcScore">0</span></div>
      </div>
      <div class="pc-playfield">
        <canvas id="pcCanvas" width="${W}" height="${H}"></canvas>
        <div class="pc-overlay" id="pcOverlay">
          <div class="rt-ready-box">
            <div class="rt-ready-title">🎴 Photo Catch</div>
            <div class="rt-ready-sub">เลื่อนตะกร้ารับการ์ดวาว่า เลี่ยงระเบิด!</div>
            <div class="pc-rules">
              <div class="pc-rule-item">
                <img src="images/pc-normal.png" class="pc-rule-img" alt="การ์ดปกติ" />
                <div class="pc-rule-lbl">+10 คะแนน</div>
                <div class="pc-rule-sub">การ์ดปกติ</div>
              </div>
              <div class="pc-rule-item">
                <img src="images/pc-special.png" class="pc-rule-img pc-rule-sp" alt="Special" />
                <div class="pc-rule-lbl sp">+50 คะแนน</div>
                <div class="pc-rule-sub">การ์ด ★Special★</div>
              </div>
              <div class="pc-rule-item">
                <div class="pc-bomb-icon">💣<span class="pc-bomb-tag">บด</span></div>
                <div class="pc-rule-lbl bomb">-1 ชีวิต!</div>
                <div class="pc-rule-sub">ระเบิด</div>
              </div>
            </div>
            <div class="pc-lives-hint">❤️❤️❤️ มี 3 ชีวิต • ยิ่งนานยิ่งเร็ว!</div>
            <button class="rt-ready-btn" id="pcStartBtn">▶ เริ่มเล่น!</button>
          </div>
        </div>
      </div>
      <div class="rt-hint">เลื่อนตะกร้าซ้าย-ขวา • ★SP★ หายาก ตกเร็ว ได้ +50!</div>
    `;
    host.appendChild(wrap);
    const cvs = $('#pcCanvas', wrap), ctx = cvs.getContext('2d');
    const overlay = $('#pcOverlay', wrap);
    const startBtn = $('#pcStartBtn', wrap);

    function moveTo(clientX) {
      const r = cvs.getBoundingClientRect();
      state.basket = Math.max(28, Math.min(W - 28, (clientX - r.left) * (W / r.width)));
    }
    cvs.addEventListener('touchmove', e => { e.preventDefault(); moveTo(e.touches[0].clientX); }, { passive: false });
    cvs.addEventListener('mousemove', e => moveTo(e.clientX));

    function stopBgm() { bgm.pause(); bgm.currentTime = 0; }
    $('.g-back', wrap).addEventListener('click', () => { state.running = false; stopBgm(); onEnd(null); });

    startBtn.addEventListener('click', () => {
      overlay.style.display = 'none';
      state.t0 = performance.now();
      state.running = true;
      bgm.play().catch(() => {});
      requestAnimationFrame(frame);
    });

    function finish() { state.running = false; stopBgm(); onEnd({ game: 'Photo Catch', score: state.score }); }

    function drawBomb(x, y) {
      // ลำตัวระเบิด
      const g = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 14);
      g.addColorStop(0, '#505050'); g.addColorStop(1, '#111');
      ctx.fillStyle = g;
      ctx.shadowColor = '#ff3355'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // แสงสะท้อน
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath(); ctx.ellipse(x - 5, y - 5, 4, 2.5, -0.5, 0, Math.PI * 2); ctx.fill();
      // ชนวน
      ctx.strokeStyle = '#c87020'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 9, y - 12);
      ctx.bezierCurveTo(x + 17, y - 20, x + 7, y - 26, x + 13, y - 32);
      ctx.stroke(); ctx.lineCap = 'butt';
      // ประกายไฟ
      ctx.fillStyle = '#ffee22'; ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(x + 13, y - 32, 3, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // ข้อความ "บด"
      ctx.font = 'bold 10px Mitr, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText('บด', x, y + 1);
      ctx.fillStyle = '#ff4466'; ctx.fillText('บด', x, y + 1);
      ctx.textBaseline = 'alphabetic';
    }

    function drawCard(x, y, special) {
      const w = 26, h = 36, rx = 4;
      ctx.save();
      roundRect(ctx, x - w / 2, y - h / 2, w, h, rx); ctx.clip();
      const img = special ? imgSpecial : imgNormal;
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      } else {
        // fallback gradient ถ้ายังโหลดรูปไม่เสร็จ
        const grd = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
        if (special) { grd.addColorStop(0, '#ffa8b8'); grd.addColorStop(1, '#c03060'); }
        else { grd.addColorStop(0, '#b8d8f8'); grd.addColorStop(1, '#5090d0'); }
        ctx.fillStyle = grd; ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.fillStyle = '#fff'; ctx.font = '14px serif'; ctx.textAlign = 'center';
        ctx.textBaseline = 'middle'; ctx.fillText(special ? '⭐' : '💖', x, y);
        ctx.textBaseline = 'alphabetic';
      }
      ctx.restore();
      // ขอบการ์ด
      ctx.shadowColor = special ? '#e8c060' : '#a8d0f0'; ctx.shadowBlur = special ? 10 : 4;
      ctx.strokeStyle = special ? '#e8c060' : '#a8d8f8'; ctx.lineWidth = special ? 2.5 : 2;
      roundRect(ctx, x - w / 2, y - h / 2, w, h, rx); ctx.stroke();
      ctx.shadowBlur = 0;
      // ป้าย SP
      if (special) {
        ctx.fillStyle = '#e8c060'; ctx.font = 'bold 6px Fredoka, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText('★SP★', x, y + h / 2 - 1);
        ctx.textBaseline = 'alphabetic';
      }
    }

    function frame() {
      if (!state.running) return;
      const now = performance.now() / 1000;
      state.spawn -= 16;
      const elapsed = (performance.now() - state.t0) / 1000;
      state.speed = 1 + elapsed / 30;

      if (state.spawn <= 0) {
        state.spawn = 720 / state.speed;
        const roll = Math.random();
        const bomb = roll < 0.22;
        // ~10% ของ spawn ที่ไม่ใช่ระเบิด = การ์ด Special
        const special = !bomb && Math.random() < 0.10;
        state.items.push({
          x: 28 + Math.random() * (W - 56), y: -28, bomb, special,
          vy: (1.6 + Math.random() * 1.2) * state.speed * (special ? 1.4 : 1.0)
        });
      }

      ctx.clearRect(0, 0, W, H);

      for (const it of state.items) {
        it.y += it.vy;
        if (it.bomb) drawBomb(it.x, it.y);
        else drawCard(it.x, it.y, it.special);

        // ตรวจรับ
        if (it.y > H - 56 && it.y < H - 20 && Math.abs(it.x - state.basket) < 40) {
          if (it.bomb) {
            state.lives--; $('#pcLives', wrap).textContent = state.lives;
            state.fb.push({ x: it.x, y: it.y, txt: '💥', col: '#ff4466', t: now });
          } else if (it.special) {
            state.score += 50; $('#pcScore', wrap).textContent = state.score;
            state.fb.push({ x: it.x, y: it.y, txt: 'SPECIAL! +50', col: C.gold, t: now });
          } else {
            state.score += 10; $('#pcScore', wrap).textContent = state.score;
            state.fb.push({ x: it.x, y: it.y, txt: '+10', col: C.teal, t: now });
          }
          it.y = H + 100;
        }
      }
      state.items = state.items.filter(it => it.y < H + 40);

      // ข้อความ feedback ลอยขึ้น
      state.fb = state.fb.filter(f => now - f.t < 0.7);
      for (const f of state.fb) {
        const age = now - f.t;
        ctx.shadowColor = f.col; ctx.shadowBlur = 8;
        ctx.fillStyle = f.col; ctx.globalAlpha = Math.max(0, 1 - age / 0.7);
        ctx.font = 'bold 13px Fredoka, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(f.txt, f.x, f.y - age * 40);
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }

      // ตะกร้า
      ctx.fillStyle = C.teal; ctx.strokeStyle = C.white; ctx.lineWidth = 3;
      roundRect(ctx, state.basket - 30, H - 42, 60, 30, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.white; ctx.font = '16px serif'; ctx.textAlign = 'center';
      ctx.fillText('🧺', state.basket, H - 20);

      if (state.lives <= 0) { finish(); return; }
      requestAnimationFrame(frame);
    }
    // frame เริ่มเมื่อกด "เริ่มเล่น!" — ดูที่ startBtn.addEventListener ด้านบน
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
        <div class="gh-nick-row">
          <input id="ghNick" type="text" maxlength="14" placeholder="ใส่ชื่อเล่นก่อนเล่น" value="${NICK}">
          <button id="ghNickBtn" class="gh-nick-btn">${NICK ? 'เปลี่ยนชื่อ' : 'ยืนยัน ›'}</button>
        </div>
        ${NICK ? `<div class="gh-nick-hello">สวัสดี, <strong>${NICK}</strong>! 🐶</div>` : ''}
      `;
      c.appendChild(nameRow);

      // game grid — hidden until nick is confirmed
      const grid = el('div', 'gh-grid');
      if (!NICK) grid.classList.add('gh-grid-locked');
      GAMES.forEach(g => {
        const card = el('button', 'gh-card' + (g.on ? '' : ' off'));
        card.style.setProperty('--gc', g.col);
        card.innerHTML = `
          <div class="gh-emoji">${g.emoji}</div>
          <div class="gh-info"><div class="gh-t">${g.title}</div><div class="gh-d">${g.desc}</div></div>
          ${g.on ? '<div class="gh-go">เล่น ›</div>' : '<div class="gh-soon">เร็วๆ นี้</div>'}
        `;
        if (g.on) card.addEventListener('click', () => { startGame(g.id); });
        grid.appendChild(card);
      });
      c.appendChild(grid);
      root.appendChild(c);

      // confirm / change button
      $('#ghNickBtn', c).addEventListener('click', () => {
        const val = ($('#ghNick', c).value || '').trim();
        if (!val) {
          const inp = $('#ghNick', c);
          inp.focus(); inp.style.borderColor = 'var(--pink-deep)';
          return;
        }
        NICK = val;
        renderHome();
      });
      // allow Enter key in input
      $('#ghNick', c).addEventListener('keydown', e => {
        if (e.key === 'Enter') $('#ghNickBtn', c).click();
      });

      renderLeaderboard();
    }

    function startGame(id) {
      root.innerHTML = '';
      const stage = el('div', 'gh-stage');
      root.appendChild(stage);
      const onEnd = async (result) => {
        if (result) {
          const isNew = await recordScore(result.game, result.score);
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

    const MEDALS = ['🥇', '🥈', '🥉', '4', '5', '6', '7', '8', '9', '10'];
    const LB_TABS = [
      { key: 'total', label: '🏆 รวมทุกเกม' },
      { key: 'Rhythm Tap', label: '🎵 Rhythm Tap' },
      { key: 'Photo Catch', label: '🧺 Photo Catch' },
    ];
    let lbActiveTab = 'total';

    async function renderLbRows(tab) {
      const lb = document.getElementById('leaderboard');
      if (!lb) return;
      let content = lb.querySelector('.lb-content');
      if (!content) { content = el('div', 'lb-content'); lb.appendChild(content); }
      content.innerHTML = '<div class="lb-loading">⏳ กำลังโหลด...</div>';
      try {
        let rows = [];
        if (tab === 'total') {
          const data = await sbFetch('leaderboard?select=name,score,game&order=score.desc');
          rows = totalsFromBoard(data || []).slice(0, 10).map((x, i) =>
            `<div class="lb-row"><div class="lb-rank">${MEDALS[i]}</div><div class="lb-name">${x.name}</div><div class="lb-score">${x.total.toLocaleString()}</div></div>`
          );
        } else {
          const data = await sbFetch(
            `leaderboard?game=eq.${encodeURIComponent(tab)}&select=name,score&order=score.desc&limit=10`
          );
          rows = (data || []).map((x, i) =>
            `<div class="lb-row"><div class="lb-rank">${MEDALS[i]}</div><div class="lb-name">${x.name}</div><div class="lb-score">${x.score.toLocaleString()}</div></div>`
          );
        }
        content.innerHTML = rows.length
          ? rows.join('')
          : '<div class="lb-empty"><div class="big">🎮</div><div class="tx">ยังไม่มีคะแนน — มาเป็นคนแรกกันเลย!</div></div>';
      } catch (e) {
        console.error('leaderboard fetch error', e);
        content.innerHTML = '<div class="lb-empty"><div class="tx">⚠️ โหลดไม่สำเร็จ — ลองรีเฟรชหน้า</div></div>';
      }
    }

    function renderLeaderboard() {
      const lb = document.getElementById('leaderboard');
      if (!lb) return;
      if (!lb.querySelector('.lb-tabs')) {
        const tabBar = el('div', 'lb-tabs');
        LB_TABS.forEach(t => {
          const btn = el('button', 'lb-tab' + (t.key === lbActiveTab ? ' active' : ''), t.label);
          btn.dataset.tab = t.key;
          btn.addEventListener('click', () => {
            lbActiveTab = t.key;
            lb.querySelectorAll('.lb-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t.key));
            renderLbRows(t.key);
          });
          tabBar.appendChild(btn);
        });
        lb.innerHTML = '';
        lb.appendChild(tabBar);
      }
      renderLbRows(lbActiveTab);
    }

    renderHome();
  }

  // expose
  window.WawaGameHub = { mount: mountHub };
})();
