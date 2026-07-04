import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, set, get, onValue, update } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyCwnU6ZEYUTrKCc0Afru7JPjvRif-g_gbA",
  authDomain: "norgeelfenbenkysten.firebaseapp.com",
  databaseURL: "https://norgeelfenbenkysten-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "norgeelfenbenkysten",
  storageBucket: "norgeelfenbenkysten.firebasestorage.app",
  messagingSenderId: "950269622806",
  appId: "1:950269622806:web:97e5ce88e223f783fc5337"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Deadline
var DEADLINE = new Date('2026-07-05T22:00:00');

function isLocked() { return new Date() >= DEADLINE; }

function applyLockState() {
  var locked = isLocked();
  var lb = document.getElementById('lockBanner');
  var cd = document.getElementById('countdownBox');
  var btn = document.getElementById('submitBtn');
  if (lb) lb.style.display = locked ? 'block' : 'none';
  if (cd) cd.style.display = locked ? 'none' : 'block';
  if (btn) btn.disabled = locked;
}

function pad(n) { return String(n).padStart(2,'0'); }

function tickCd() {
  var diff = DEADLINE - new Date();
  if (diff <= 0) { applyLockState(); return; }
  var d = Math.floor(diff / 86400000);
  var h = Math.floor((diff % 86400000) / 3600000);
  var m = Math.floor((diff % 3600000) / 60000);
  var s = Math.floor((diff % 60000) / 1000);
  var el = function(id) { return document.getElementById(id); };
  if (el('cd-d')) el('cd-d').textContent = pad(d);
  if (el('cd-h')) el('cd-h').textContent = pad(h);
  if (el('cd-m')) el('cd-m').textContent = pad(m);
  if (el('cd-s')) el('cd-s').textContent = pad(s);
  setTimeout(tickCd, 1000);
}
tickCd();
applyLockState();

// Status - live count
onValue(ref(db, 'brazil_entries'), function(snap) {
  var count = snap.exists() ? snap.size : 0;
  var el = document.getElementById('fbStatus');
  if (el) el.innerHTML = 'Firebase koplet - ' + count + ' deltakere';
});

// State
var sc = {
  q3a:0, q3b:0, q4:0, q5:0, q6:0,
  q9:0, q10:0, q11:0, q12:0, q13:0,
  a3a:0, a3b:0, a4:0, a5:0, a6:0,
  a9:0, a10:0, a11:0, a12:0, a13:0
};
var opts = {};
var selAvatar = null;
var selEmoji = '';
var avNames = {
  haaland:'Haaland #9', odegaard:'Odegaard #8', nusa:'Nusa #11',
  nyland:'Nyland #1', berge:'Berge #23', sorloth:'Sorloth #20',
  bobb:'Bobb #22', ajer:'Ajer #6', vinicius:'Vinicius #7', rodrygo:'Rodrygo #11'
};

// Tab switching

window.toggleFasit = function() {
  var card = document.getElementById('fasitCard');
  var btn = document.getElementById('editFasitBtn');
  if (!card) return;
  var visible = card.style.display !== 'none';
  card.style.display = visible ? 'none' : 'block';
  btn.textContent = visible ? 'REGISTRER / ENDRE FASIT' : 'SKJUL FASIT';
};
window.showTab = function(t) {
  document.querySelectorAll('.tab').forEach(function(x) { x.classList.remove('active'); });
  document.querySelectorAll('.pane').forEach(function(x) { x.classList.remove('active'); });
  document.getElementById('tab-' + t).classList.add('active');
  document.getElementById('pane-' + t).classList.add('active');
};

// Avatar selection
window.selAv = function(btn) {
  document.querySelectorAll('.av-btn').forEach(function(b) { b.classList.remove('sel'); });
  btn.classList.add('sel');
  selAvatar = btn.dataset.av;
  selEmoji = btn.dataset.emoji;
};

// Option buttons
window.selOpt = function(qid, btn, val) {
  document.querySelectorAll('#' + qid + ' .opt').forEach(function(b) { b.classList.remove('sel'); });
  btn.classList.add('sel');
  opts[qid] = val;
};

// Stepper for inputs (updates .value on input elements)
window.adjSc = function(k, d) {
  sc[k] = Math.max(0, Math.min(500, (sc[k] || 0) + d));
  var el = document.getElementById(k + '-val');
  if (!el) return;
  if (el.tagName === 'INPUT') { el.value = sc[k]; } else { el.textContent = sc[k]; }
};

// Stepper for span elements (result scores a3a, a3b)
window.adjScSpan = function(k, d) {
  sc[k] = Math.max(0, Math.min(20, (sc[k] || 0) + d));
  var el = document.getElementById(k + '-val');
  if (el) el.textContent = sc[k];
};

// Sync manual input to state
window.syncInput = function(k) {
  var el = document.getElementById(k + '-val');
  if (!el) return;
  var v = parseInt(el.value);
  if (isNaN(v) || v < 0) v = 0;
  if (v > 500) v = 500;
  sc[k] = v;
  el.value = v;
};

// Submit entry
window.submitEntry = async function() {
  if (isLocked()) { alert('Beklager - registreringsfristen er passert!'); return; }
  var name = document.getElementById('playerName').value.trim();
  if (!name) { alert('Skriv inn navn forst!'); return; }
  if (!selAvatar) { alert('Velg en spiller!'); return; }
  if (!opts.q1) { alert('Hvem tror du vinner?'); return; }

  ['q9','q10','q11','q12','q13','q4','q5','q6'].forEach(function(k) { window.syncInput(k); });

  var nameKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  try {
    var existing = await get(ref(db, 'brazil_entries/' + nameKey));
    if (existing.exists()) {
      var ok = confirm(name + ' er allerede registrert! Vil du overskrive?');
      if (!ok) return;
    }
    var entry = {
      name: name, avatar: selAvatar, emoji: selEmoji,
      q1: opts.q1 || '', q2: opts.q2 || '', q_penalty: opts.q_penalty || '',
      q3: sc.q3a + '-' + sc.q3b,
      q4: sc.q4, q5: sc.q5, q6: sc.q6,
      q7: document.getElementById('q7').value || '',
      q8: opts.q8 || '',
      q9: sc.q9, q10: sc.q10, q11: sc.q11, q12: sc.q12, q13: sc.q13,
      pts: 0, ts: Date.now()
    };
    await set(ref(db, 'brazil_entries/' + nameKey), entry);
    document.getElementById('successEmoji').textContent = '#' + selEmoji;
    document.getElementById('successName').textContent = name.toUpperCase() + ' ER MED!';
    document.getElementById('successSub').textContent = avNames[selAvatar] + ' heier pa deg! Lykke til!';
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('successBox').style.display = 'block';
  } catch (err) {
    alert('Feil: ' + err.message);
  }
};

// Reset form
window.resetForm = function() {
  document.getElementById('playerName').value = '';
  document.querySelectorAll('.av-btn').forEach(function(b) { b.classList.remove('sel'); });
  document.querySelectorAll('.opt').forEach(function(b) { b.classList.remove('sel'); });
  selAvatar = null; selEmoji = '';
  ['q3a','q3b','q4','q5','q6','q9','q10','q11','q12','q13'].forEach(function(k) {
    sc[k] = 0;
    var el = document.getElementById(k + '-val');
    if (el) { if (el.tagName === 'INPUT') el.value = '0'; else el.textContent = '0'; }
  });
  document.getElementById('q7').value = '';
  document.getElementById('successBox').style.display = 'none';
  document.getElementById('submitBtn').style.display = 'block';
};

// Percentage scoring
function pctScore(guess, actual, maxPts) {
  if (isNaN(guess) || isNaN(actual)) return 0;
  if (actual === 0) return guess === 0 ? maxPts : 0;
  var pct = Math.max(0, 1 - Math.abs(guess - actual) / actual);
  return Math.round(pct * maxPts * 10) / 10;
}

// Calculate and save scores
window.calcAndSaveScores = async function() {
  ['a4','a5','a6','a9','a10','a11','a12','a13'].forEach(function(k) { window.syncInput(k); });

  var ans = {
    q1: opts.a1 || '', q2: opts.a2 || '', q_penalty: opts.a_penalty || '',
    q3: sc.a3a + '-' + sc.a3b,
    q4: sc.a4, q5: sc.a5, q6: sc.a6,
    q7: document.getElementById('a7').value || '',
    q8: opts.a8 || '',
    q9: sc.a9, q10: sc.a10, q11: sc.a11, q12: sc.a12, q13: sc.a13
  };
  await set(ref(db, 'brazil_answers'), ans);

  try {
    var snap = await get(ref(db, 'brazil_entries'));
    if (!snap.exists()) { alert('Ingen deltakere funnet.'); return; }
    var updates = {};
    snap.forEach(function(child) {
      var e = child.val();
      var p = 0;
      if (ans.q1 && e.q1 === ans.q1) p += 1;
      if (ans.q2 && e.q2 === ans.q2) p += 1;
      if (ans.q_penalty && e.q_penalty === ans.q_penalty) p += 1;
      // Result: 5pts exact, 2pts if one team score correct
      if (ans.q3 && e.q3 === ans.q3) {
        p += 5;
      } else if (ans.q3) {
        var ag = ans.q3.split('-'); var eg = (e.q3||'').split('-');
        if (ag.length === 2 && eg.length === 2 && (ag[0]===eg[0] || ag[1]===eg[1])) p += 2;
      }
      if (parseInt(e.q4) === parseInt(ans.q4)) p += 2;
      if (parseInt(e.q5) === parseInt(ans.q5)) p += 2;
      if (ans.q8 && e.q8 === ans.q8) p += 2;
      if (ans.q6 && parseInt(e.q6) === parseInt(ans.q6)) p += 3;
      if (ans.q7 && e.q7 && e.q7 === ans.q7) p += 3;
      p += pctScore(parseInt(e.q9),  parseInt(ans.q9),  5);
      p += pctScore(parseInt(e.q10), parseInt(ans.q10), 5);
      p += pctScore(parseInt(e.q11), parseInt(ans.q11), 5);
      p += pctScore(parseInt(e.q12), parseInt(ans.q12), 5);
      p += pctScore(parseInt(e.q13), parseInt(ans.q13), 5);
      updates['brazil_entries/' + child.key + '/pts'] = Math.round(p * 10) / 10;
    });
    await update(ref(db), updates);
    alert('Poeng oppdatert!');
    showResultAnimation(ans.q3, ans.q1);
  } catch (err) {
    alert('Feil: ' + err.message);
  }
};

// Load saved answers on page load - restore animation AND form values
onValue(ref(db, 'brazil_answers'), function(snap) {
  if (!snap.exists()) return;
  var ans = snap.val();
  if (!ans) return;
  showResultAnimation(ans.q3, ans.q1);
  // Restore fasit form
  if (ans.q1) { var b = document.querySelector('#a1 .opt[onclick*="' + ans.q1 + '"]'); if(b) b.classList.add('sel'); opts.a1 = ans.q1; }
  if (ans.q2) { var b = document.querySelector('#a2 .opt[onclick*="' + ans.q2 + '"]'); if(b) b.classList.add('sel'); opts.a2 = ans.q2; }
  if (ans.q_penalty) { var b = document.querySelector('#a_penalty .opt[onclick*="' + ans.q_penalty + '"]'); if(b) b.classList.add('sel'); opts.a_penalty = ans.q_penalty; }
  if (ans.q8) { var b = document.querySelector('#a8 .opt[onclick*="' + ans.q8 + '"]'); if(b) b.classList.add('sel'); opts.a8 = ans.q8; }
  // Result spans
  if (ans.q3) {
    var parts = ans.q3.split('-');
    if (parts.length === 2) {
      sc.a3a = parseInt(parts[0]) || 0;
      sc.a3b = parseInt(parts[1]) || 0;
      var ea = document.getElementById('a3a-val'); if(ea) ea.textContent = sc.a3a;
      var eb = document.getElementById('a3b-val'); if(eb) eb.textContent = sc.a3b;
    }
  }
  // Number inputs
  var numFields = {a4:'q4',a5:'q5',a6:'q6',a9:'q9',a10:'q10',a11:'q11',a12:'q12',a13:'q13'};
  Object.keys(numFields).forEach(function(ak) {
    var qk = numFields[ak];
    var val = ans[qk];
    if (val !== undefined) {
      sc[ak] = parseInt(val) || 0;
      var el = document.getElementById(ak + '-val'); if(el) el.value = sc[ak];
    }
  });
  // Select
  if (ans.q7) { var sel = document.getElementById('a7'); if(sel) sel.value = ans.q7; }
});

// Result animations
function showResultAnimation(resultKey, winner) {
  var el = document.getElementById('resultAnim');
  if (!el) return;
  if (!resultKey) { el.style.display = 'none'; return; }
  var parts = resultKey.split('-');
  if (parts.length !== 2) { el.style.display = 'none'; return; }
  var nor = parseInt(parts[0]);
  var bra = parseInt(parts[1]);
  if (isNaN(nor) || isNaN(bra)) { el.style.display = 'none'; return; }

  el.style.display = 'block';

  if (winner === 'Norge' || nor > bra) {
    // Norway wins - celebration boats + confetti
    el.innerHTML = '<svg width="100%" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="400" height="120" fill="#1a3a6a"/>'
      + '<text x="200" y="20" text-anchor="middle" font-size="15" font-weight="900" fill="#FFD700" font-family="Arial,sans-serif">NORGE VINNER!</text>'
      + '<text x="200" y="38" text-anchor="middle" font-size="11" fill="#a0c0ff" font-family="Arial,sans-serif">' + nor + ' - ' + bra + '</text>'
      // Confetti
      + '<rect x="20" y="0" width="6" height="10" fill="#EF3340" rx="1"><animate attributeName="y" dur="1.1s" repeatCount="indefinite" values="0;100"/><animate attributeName="opacity" dur="1.1s" repeatCount="indefinite" values="1;0"/></rect>'
      + '<rect x="70" y="0" width="6" height="10" fill="#FFD700" rx="1"><animate attributeName="y" dur="1.3s" repeatCount="indefinite" values="0;100" begin="0.3s"/><animate attributeName="opacity" dur="1.3s" repeatCount="indefinite" values="1;0" begin="0.3s"/></rect>'
      + '<rect x="130" y="0" width="6" height="10" fill="white" rx="1"><animate attributeName="y" dur="0.9s" repeatCount="indefinite" values="0;100" begin="0.1s"/><animate attributeName="opacity" dur="0.9s" repeatCount="indefinite" values="1;0" begin="0.1s"/></rect>'
      + '<rect x="190" y="0" width="6" height="10" fill="#EF3340" rx="1"><animate attributeName="y" dur="1.2s" repeatCount="indefinite" values="0;100" begin="0.5s"/><animate attributeName="opacity" dur="1.2s" repeatCount="indefinite" values="1;0" begin="0.5s"/></rect>'
      + '<rect x="250" y="0" width="6" height="10" fill="#FFD700" rx="1"><animate attributeName="y" dur="1.0s" repeatCount="indefinite" values="0;100" begin="0.2s"/><animate attributeName="opacity" dur="1.0s" repeatCount="indefinite" values="1;0" begin="0.2s"/></rect>'
      + '<rect x="310" y="0" width="6" height="10" fill="white" rx="1"><animate attributeName="y" dur="1.4s" repeatCount="indefinite" values="0;100" begin="0.6s"/><animate attributeName="opacity" dur="1.4s" repeatCount="indefinite" values="1;0" begin="0.6s"/></rect>'
      + '<rect x="360" y="0" width="6" height="10" fill="#EF3340" rx="1"><animate attributeName="y" dur="1.1s" repeatCount="indefinite" values="0;100" begin="0.8s"/><animate attributeName="opacity" dur="1.1s" repeatCount="indefinite" values="1;0" begin="0.8s"/></rect>'
      // Boat 1 moving left
      + '<g><animateTransform attributeName="transform" type="translate" dur="5s" repeatCount="indefinite" values="400,0;-200,0"/>'
      + '<ellipse cx="0" cy="78" rx="60" ry="7" fill="#C8943A"/>'
      + '<circle cx="-40" cy="70" r="5" fill="#F5DEB3"/><rect x="-46" y="72" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<circle cx="-18" cy="70" r="5" fill="#F5CBA7"/><rect x="-24" y="72" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<circle cx="4" cy="70" r="5" fill="#F5DEB3"/><rect x="-2" y="72" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<circle cx="26" cy="70" r="5" fill="#8B5A2B"/><rect x="20" y="72" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<rect x="-5" y="58" width="14" height="10" fill="#EF3340" rx="1"/><rect x="-5" y="63" width="14" height="2" fill="white"/><rect x="-1" y="58" width="2" height="10" fill="white"/><rect x="-0.5" y="58" width="1" height="10" fill="#003087"/>'
      + '</g>'
      // Boat 2 offset
      + '<g><animateTransform attributeName="transform" type="translate" dur="5s" repeatCount="indefinite" values="200,0;-400,0"/>'
      + '<ellipse cx="0" cy="98" rx="60" ry="7" fill="#C8943A"/>'
      + '<circle cx="-40" cy="90" r="5" fill="#F5DEB3"/><rect x="-46" y="92" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<circle cx="-18" cy="90" r="5" fill="#F5CBA7"/><rect x="-24" y="92" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<circle cx="4" cy="90" r="5" fill="#F5DEB3"/><rect x="-2" y="92" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<circle cx="26" cy="90" r="5" fill="#8B5A2B"/><rect x="20" y="92" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '</g>'
      + '</svg>';
  } else if (winner === 'Brasil' || bra > nor) {
    // Brazil wins - samba + sinking boat
    el.innerHTML = '<svg width="100%" height="120" viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="400" height="120" fill="#1a3a1a"/>'
      + '<text x="200" y="20" text-anchor="middle" font-size="15" font-weight="900" fill="#FFDF00" font-family="Arial,sans-serif">BRASIL VINNER!</text>'
      + '<text x="200" y="38" text-anchor="middle" font-size="11" fill="#90ee90" font-family="Arial,sans-serif">' + nor + ' - ' + bra + '</text>'
      // Samba dancer left
      + '<g transform="translate(70,45)">'
      + '<circle cx="0" cy="0" r="9" fill="#8B5A2B"/>'
      + '<line x1="0" y1="9" x2="0" y2="40" stroke="#009C3B" stroke-width="4"/>'
      + '<g><animateTransform attributeName="transform" type="rotate" dur="0.5s" repeatCount="indefinite" values="-25 0 20;25 0 20;-25 0 20"/>'
      + '<line x1="0" y1="18" x2="-18" y2="8" stroke="#8B5A2B" stroke-width="3" stroke-linecap="round"/>'
      + '<line x1="0" y1="18" x2="18" y2="28" stroke="#8B5A2B" stroke-width="3" stroke-linecap="round"/>'
      + '</g>'
      + '<g><animateTransform attributeName="transform" type="rotate" dur="0.5s" repeatCount="indefinite" values="15 0 40;-15 0 40;15 0 40"/>'
      + '<line x1="0" y1="40" x2="-12" y2="62" stroke="#8B5A2B" stroke-width="3" stroke-linecap="round"/>'
      + '<line x1="0" y1="40" x2="12" y2="62" stroke="#8B5A2B" stroke-width="3" stroke-linecap="round"/>'
      + '</g>'
      + '</g>'
      // Sinking boat right - tilting
      + '<g transform="translate(240,30)">'
      + '<animateTransform attributeName="transform" type="rotate" dur="2.5s" repeatCount="indefinite" values="0 80 40;18 80 40;0 80 40" additive="sum"/>'
      + '<ellipse cx="80" cy="60" rx="65" ry="8" fill="#8B6A34" opacity="0.85"/>'
      + '<ellipse cx="80" cy="58" rx="62" ry="6" fill="#C8943A" opacity="0.85"/>'
      + '<circle cx="50" cy="49" r="5" fill="#F5DEB3"/><rect x="44" y="51" width="12" height="8" rx="2" fill="#EF3340" opacity="0.8"/>'
      + '<circle cx="80" cy="49" r="5" fill="#F5CBA7"/><rect x="74" y="51" width="12" height="8" rx="2" fill="#EF3340" opacity="0.8"/>'
      + '<circle cx="110" cy="49" r="5" fill="#F5DEB3"/><rect x="104" y="51" width="12" height="8" rx="2" fill="#EF3340" opacity="0.8"/>'
      + '<animate attributeName="opacity" dur="2.5s" repeatCount="indefinite" values="1;0.5;1"/>'
      + '</g>'
      + '</svg>';
  } else {
    // Draw - nervous shaking rowers
    el.innerHTML = '<svg width="100%" height="100" viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg">'
      + '<rect width="400" height="100" fill="#2a2a2a"/>'
      + '<text x="200" y="20" text-anchor="middle" font-size="14" font-weight="900" fill="#FFD700" font-family="Arial,sans-serif">UAVGJORT... STRAFFER?</text>'
      + '<text x="200" y="36" text-anchor="middle" font-size="11" fill="#aaa" font-family="Arial,sans-serif">' + nor + ' - ' + bra + '</text>'
      // Shaking boat
      + '<g>'
      + '<animateTransform attributeName="transform" type="translate" dur="0.12s" repeatCount="indefinite" values="0,0;3,0;-3,0;2,0;-2,0;0,0"/>'
      + '<ellipse cx="200" cy="72" rx="110" ry="8" fill="#C8943A"/>'
      + '<circle cx="145" cy="62" r="5" fill="#F5DEB3"/><rect x="139" y="64" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<circle cx="180" cy="62" r="5" fill="#F5CBA7"/><rect x="174" y="64" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<circle cx="215" cy="62" r="5" fill="#F5DEB3"/><rect x="209" y="64" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '<circle cx="250" cy="62" r="5" fill="#8B5A2B"/><rect x="244" y="64" width="12" height="8" rx="2" fill="#EF3340"/>'
      + '</g>'
      // Sweat drops
      + '<text x="130" y="58" font-size="11" fill="#88aaff"><animate attributeName="opacity" dur="0.9s" repeatCount="indefinite" values="0;1;0"/></text>'
      + '<text x="270" y="55" font-size="11" fill="#88aaff"><animate attributeName="opacity" dur="1.1s" repeatCount="indefinite" values="1;0;1"/></text>'
      + '<text x="200" y="92" text-anchor="middle" font-size="10" fill="#777" font-family="Arial,sans-serif">Venter pa resultat...</text>'
      + '</svg>';
  }
}

// Avatar SVGs for leaderboard
var avatarSVGs = {
  haaland: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial,sans-serif">9</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5DEB3"/><path d="M16,24 Q17,12 28,11 Q39,12 40,24 Q36,16 28,16 Q20,16 16,24Z" fill="#D4A355"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  odegaard: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial,sans-serif">8</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5CBA7"/><path d="M16,26 Q16,11 28,10 Q40,11 40,26 Q37,17 28,17 Q19,17 16,26Z" fill="#8B6A34"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  nusa: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial,sans-serif">11</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#8B5A2B"/><path d="M16,27 Q15,11 28,10 Q41,11 40,27 Q37,17 28,17 Q19,17 16,27Z" fill="#1a0a00"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  nyland: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#FFD700"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="#003087" font-family="Arial,sans-serif">1</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#FFD700"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#FFD700"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5DEB3"/><path d="M16,26 Q15,11 28,10 Q41,11 40,26 Q37,17 28,17 Q19,17 16,26Z" fill="#555"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  berge: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial,sans-serif">23</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5DEB3"/><path d="M16,26 Q15,11 28,10 Q41,11 40,26 Q37,17 28,17 Q19,17 16,26Z" fill="#333"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  sorloth: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial,sans-serif">20</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5CBA7"/><path d="M16,26 Q16,11 28,10 Q40,11 40,26 Q37,17 28,17 Q19,17 16,26Z" fill="#8B6A34"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  bobb: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial,sans-serif">22</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#6B3A1F"/><path d="M16,27 Q15,11 28,10 Q41,11 40,27 Q37,17 28,17 Q19,17 16,27Z" fill="#1a0a00"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  ajer: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#EF3340"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="white" font-family="Arial,sans-serif">6</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#EF3340"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#F5DEB3"/><path d="M16,26 Q15,11 28,10 Q41,11 40,26 Q37,18 28,18 Q19,18 16,26Z" fill="#C8943A"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#5D4037"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  vinicius: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#009C3B"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="#FFDF00" font-family="Arial,sans-serif">7</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#009C3B"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#009C3B"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#8B5A2B"/><path d="M16,27 Q15,11 28,10 Q41,11 40,27 Q37,17 28,17 Q19,17 16,27Z" fill="#1a0a00"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>',
  rodrygo: '<svg width="44" height="54" viewBox="0 0 56 80" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="42" width="36" height="34" rx="5" fill="#009C3B"/><text x="28" y="57" text-anchor="middle" font-size="10" font-weight="900" fill="#FFDF00" font-family="Arial,sans-serif">11</text><rect x="2" y="45" width="9" height="24" rx="3" fill="#009C3B"/><rect x="45" y="45" width="9" height="24" rx="3" fill="#009C3B"/><rect x="16" y="74" width="9" height="5" rx="2" fill="#222"/><rect x="31" y="74" width="9" height="5" rx="2" fill="#222"/><ellipse cx="28" cy="24" rx="13" ry="15" fill="#6B3A1F"/><path d="M16,27 Q15,11 28,10 Q41,11 40,27 Q37,17 28,17 Q19,17 16,27Z" fill="#1a0a00"/><ellipse cx="23" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><ellipse cx="33" cy="25" rx="2.2" ry="1.8" fill="#3E2723"/><path d="M24,31 Q28,34 32,31" fill="none" stroke="#C07060" stroke-width="1.2" stroke-linecap="round"/></svg>'
};

// Live leaderboard
var medals = ['1.','2.','3.'];
var allEntries = [];

onValue(ref(db, 'brazil_entries'), function(snap) {
  allEntries = [];
  if (snap.exists()) { snap.forEach(function(c) { allEntries.push(c.val()); }); }
  renderLB();
  populatePlayerSelect();
});

function renderLB() {
  var list = document.getElementById('lbList');
  var empty = document.getElementById('lbEmpty');
  if (!list) return;
  if (!allEntries.length) { list.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  var rows = allEntries.slice().sort(function(a,b) { return b.pts - a.pts; });
  var maxPts = 42;
  list.innerHTML = rows.map(function(e, i) {
    var cls = i===0?'gold':i===1?'silver':i===2?'bronze':'';
    var rank = medals[i] || (i+1)+'.';
    var bar = Math.min(100, Math.round((e.pts/maxPts)*100));
    var av = (e.avatar && avatarSVGs[e.avatar]) ? avatarSVGs[e.avatar]
      : '<div style="font-size:24px;text-align:center;">#' + (e.emoji||'') + '</div>';
    return '<div class="lb-row ' + cls + '">'
      + '<div class="lb-rank">' + rank + '</div>'
      + '<div style="width:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">' + av + '</div>'
      + '<div style="flex:1;min-width:0;">'
      + '<div class="lb-name">' + e.name + '</div>'
      + '<div class="lb-sub">' + (avNames[e.avatar]||'') + '</div>'
      + '<div style="background:#e0e0e0;border-radius:4px;height:5px;margin-top:4px;overflow:hidden;">'
      + '<div style="background:#003087;height:5px;width:'+bar+'%;border-radius:4px;"></div>'
      + '</div></div>'
      + '<div class="lb-pts">' + e.pts + ' pts</div>'
      + '</div>';
  }).join('');
  document.getElementById('lb-info').textContent = 'Live - ' + rows.length + ' deltakere - ' + new Date().toLocaleTimeString('no-NO');
}

// Player detail select
function populatePlayerSelect() {
  var sel = document.getElementById('playerSelect');
  var card = document.getElementById('playerDetailCard');
  if (!sel) return;
  if (!allEntries.length) { if (card) card.style.display = 'none'; return; }
  if (card) card.style.display = 'block';
  var current = sel.value;
  sel.innerHTML = '<option value="">-- Velg spiller --</option>';
  allEntries.slice().sort(function(a,b) { return a.name.localeCompare(b.name); })
    .forEach(function(e) {
      var opt = document.createElement('option');
      opt.value = e.name;
      opt.textContent = e.name + ' (' + e.pts + ' pts)';
      sel.appendChild(opt);
    });
  if (current) sel.value = current;
}

window.showPlayerDetail = function(name) {
  var body = document.getElementById('playerDetailBody');
  if (!body || !name) { if (body) body.innerHTML = ''; return; }
  var entry = allEntries.find(function(e) { return e.name === name; });
  if (!entry) { body.innerHTML = ''; return; }
  var rows = [
    ['Spiller', avNames[entry.avatar] || entry.avatar],
    ['Hvem vinner', entry.q1],
    ['Haaland scorer', entry.q2],
    ['Far Norge straffe', entry.q_penalty],
    ['Resultat (full tid)', entry.q3],
    ['Mal 1. omgang', entry.q4],
    ['Gule kort', entry.q5],
    ['Rodt kort', entry.q8],
    ['"Ro" nevnt', entry.q6],
    ['Kampens 1. mal', entry.q7 === '0' ? 'Ingen mal' : (entry.q7 ? entry.q7+'-'+(parseInt(entry.q7)+9)+' min' : '-')],
    ['Frispark', entry.q10],
    ['Flo-pasninger (langpasninger)', entry.q11],
    ['Corners', entry.q9],
    ['Innkast', entry.q12],
    ['Skudd pa mal', entry.q13],
    ['Poeng', entry.pts + ' pts'],
  ];
  body.innerHTML = rows.map(function(r) {
    return '<div class="detail-row"><span class="detail-label">' + r[0] + ': </span><span class="detail-val">' + (r[1] !== undefined ? r[1] : '-') + '</span></div>';
  }).join('');
};
