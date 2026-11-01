// =========================================================
// CONVERTERS — fuel, units, altimeter, Morse, DDM (logic from v1.1)
// =========================================================
function calcFuel(src) {
    let sg = parseFloat(document.getElementById('fuel-sg').value) || 0.8;
    if (sg <= 0) sg = 0.8;

    let lit = parseFloat(document.getElementById('fuel-liters').value);
    let gal = parseFloat(document.getElementById('fuel-gal').value);
    let lbs = parseFloat(document.getElementById('fuel-lbs').value);
    let kg = parseFloat(document.getElementById('fuel-kg').value);

    let baseLiters = 0;
    if (src === 'liters') baseLiters = lit;
    else if (src === 'gal') baseLiters = gal * 3.78541;
    else if (src === 'kg') baseLiters = kg / sg;
    else if (src === 'lbs') baseLiters = (lbs * 0.453592) / sg;
    else if (src === 'sg') {
        // If SG changes, re-calc based on what's filled (liters as master)
        if (!isNaN(lit)) baseLiters = lit;
        else if (!isNaN(gal)) baseLiters = gal * 3.78541;
    }

    if (isNaN(baseLiters)) return;

    if (src !== 'liters') document.getElementById('fuel-liters').value = baseLiters.toFixed(2);
    if (src !== 'gal') document.getElementById('fuel-gal').value = (baseLiters / 3.78541).toFixed(2);
    if (src !== 'kg') document.getElementById('fuel-kg').value = (baseLiters * sg).toFixed(2);
    if (src !== 'lbs') document.getElementById('fuel-lbs').value = ((baseLiters * sg) * 2.20462).toFixed(2);
}

function convDist(src) {
    const val = parseFloat(document.getElementById(`u-${src}`).value);
    if (isNaN(val)) return;
    let nm = 0;
    if (src === 'nm') nm = val;
    else if (src === 'm') nm = val / 1852;
    else if (src === 'ft') nm = val / 6076.12;
    else if (src === 'km') nm = val / 1.852;
    if (src !== 'nm') document.getElementById('u-nm').value = nm.toFixed(4);
    if (src !== 'm') document.getElementById('u-m').value = (nm * 1852).toFixed(2);
    if (src !== 'ft') document.getElementById('u-ft').value = (nm * 6076.12).toFixed(2);
    if (src !== 'km') document.getElementById('u-km').value = (nm * 1.852).toFixed(4);
}

function convSpeed(src) {
    const val = parseFloat(document.getElementById(`u-${src}`).value);
    if (isNaN(val)) return;
    let kts = 0;
    if (src === 'kts') kts = val;
    else if (src === 'mph') kts = val / 1.15078;
    else if (src === 'kph') kts = val / 1.852;
    else if (src === 'mps') kts = val * 1.94384;
    if (src !== 'kts') document.getElementById('u-kts').value = kts.toFixed(2);
    if (src !== 'mph') document.getElementById('u-mph').value = (kts * 1.15078).toFixed(2);
    if (src !== 'kph') document.getElementById('u-kph').value = (kts * 1.852).toFixed(2);
    if (src !== 'mps') document.getElementById('u-mps').value = (kts / 1.94384).toFixed(2);
}

function convPress(src) {
    const val = parseFloat(document.getElementById(`u-${src}`).value);
    if (isNaN(val)) return;
    if (src === 'hpa') document.getElementById('u-inhg').value = (val * 0.02953).toFixed(3);
    else document.getElementById('u-hpa').value = (val * 33.8639).toFixed(1);
}

function convGrad(src) {
    const val = parseFloat(document.getElementById(`u-grad-${src}`).value);
    if (isNaN(val)) return;
    if (src === 'pct') {
        const deg = Math.atan(val / 100) * (180 / Math.PI);
        document.getElementById('u-grad-deg').value = deg.toFixed(2);
    } else {
        const pct = Math.tan(val * Math.PI / 180) * 100;
        document.getElementById('u-grad-pct').value = pct.toFixed(2);
    }
}

function calcAltimeter() {
    const qnh = parseFloat(document.getElementById('alt-qnh').value);
    const read = parseFloat(document.getElementById('alt-read').value);
    if (!isNaN(qnh)) {
        // (1013.25 - QNH) * 30 ft per hPa — e.g. 1010 → +97.5 ft
        let diff = (1013.25 - qnh) * 30;
        let sign = diff >= 0 ? "+" : "";
        document.getElementById('alt-corr').innerText = `${sign}${Math.round(diff)} ft`;
        if (!isNaN(read)) {
            let pAlt = read + diff;
            document.getElementById('alt-palt').innerText = `${Math.round(pAlt).toLocaleString()} ft`;
        } else {
            document.getElementById('alt-palt').innerText = "-- ft";
        }
    } else {
        document.getElementById('alt-corr').innerText = "-- ft";
        document.getElementById('alt-palt').innerText = "-- ft";
    }
}

// --- MORSE ---
const MORSE_REVERSE = {};
for (const [char, code] of Object.entries(MORSE_CODE)) MORSE_REVERSE[code] = char;

function decodeMorseInput() {
    const input = document.getElementById('morse-decode-input').value;
    const outputEl = document.getElementById('morse-decode-output');
    const breakdownEl = document.getElementById('morse-breakdown');

    if (!input.trim()) {
        outputEl.textContent = '—';
        breakdownEl.innerHTML = '';
        return;
    }

    const words = input.trim().split(/\s*\/\s*|\s{2,}/);
    let decoded = '';
    let breakdownHTML = '';

    words.forEach((word, wIdx) => {
        if (wIdx > 0) {
            decoded += ' ';
            breakdownHTML += '<div style="width:12px;"></div>';
        }
        const letters = word.trim().split(/\s+/);
        letters.forEach(code => {
            if (!code) return;
            const char = MORSE_REVERSE[code];
            if (char) {
                decoded += char;
                breakdownHTML += `<div class="morse-chip"><small>${code}</small><b>${char}</b></div>`;
            } else {
                decoded += '?';
                breakdownHTML += `<div class="morse-chip bad"><small>${code.replace(/</g, '&lt;')}</small><b>?</b></div>`;
            }
        });
    });

    outputEl.textContent = decoded || '—';
    breakdownEl.innerHTML = breakdownHTML;
}

function encodeMorseInput() {
    const input = document.getElementById('morse-encode-input').value.toUpperCase();
    const outputEl = document.getElementById('morse-encode-output');
    if (!input.trim()) { outputEl.textContent = '—'; return; }
    let morse = '';
    for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (char === ' ') morse += ' / ';
        else if (MORSE_CODE[char]) morse += MORSE_CODE[char] + '  ';
    }
    outputEl.textContent = morse.trim() || '—';
}

function clearMorseDecoder() {
    document.getElementById('morse-decode-input').value = '';
    document.getElementById('morse-decode-output').textContent = '—';
    document.getElementById('morse-breakdown').innerHTML = '';
    document.getElementById('morse-encode-input').value = '';
    document.getElementById('morse-encode-output').textContent = '—';
}

function copyMorseResult(ev) {
    const text = document.getElementById('morse-decode-output').textContent;
    if (text && text !== '—') {
        const btn = ev && ev.currentTarget;
        navigator.clipboard.writeText(text).then(() => {
            if (!btn) return;
            const orig = btn.innerHTML;
            btn.innerHTML = '✓ Copied';
            btn.style.color = 'var(--accent-success)';
            setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 900);
        }).catch(() => notify('Clipboard not available'));
    }
}

function buildMorseRefTable() {
    const container = document.getElementById('morse-ref-table');
    if (!container || container.children.length) return;
    let html = '';
    for (const [char, code] of Object.entries(MORSE_CODE)) {
        html += `<div><b>${char}</b><span>${code}</span></div>`;
    }
    container.innerHTML = html;
}

// --- DDM ↔ µA (ICAO Annex 10) ---
// LOC FSD = 0.155 DDM = 150 µA; GS FSD = 0.175 DDM = 150 µA
const DDM_CONFIG = {
    loc: { fsdDDM: 0.155, fsdUA: 150 },  // 967.742 µA/DDM
    gs: { fsdDDM: 0.175, fsdUA: 150 }    // 857.143 µA/DDM
};

function convertDDM(type, src) {
    const cfg = DDM_CONFIG[type];
    const scale = cfg.fsdUA / cfg.fsdDDM;
    const ddmEl = document.getElementById(`ddm-${type}-ddm`);
    const uaEl = document.getElementById(`ddm-${type}-ua`);
    const barEl = document.getElementById(`ddm-${type}-bar`);

    let uaVal = 0;
    if (src === 'ddm') {
        const ddm = parseFloat(ddmEl.value);
        if (isNaN(ddm)) { uaEl.value = ''; updateDDMBar(barEl, 0); return; }
        uaVal = ddm * scale;
        uaEl.value = parseFloat(uaVal.toFixed(2));
    } else {
        const ua = parseFloat(uaEl.value);
        if (isNaN(ua)) { ddmEl.value = ''; updateDDMBar(barEl, 0); return; }
        uaVal = ua;
        const ddm = ua / scale;
        ddmEl.value = parseFloat(ddm.toFixed(4));
    }
    updateDDMBar(barEl, uaVal);
}

function updateDDMBar(barEl, uaVal) {
    const pct = Math.min(Math.max(uaVal / 150, -1), 1); // clamp to -1..+1
    const absPct = Math.abs(pct) * 50;
    if (pct >= 0) {
        barEl.style.left = '50%';
        barEl.style.width = absPct + '%';
    } else {
        barEl.style.left = (50 - absPct) + '%';
        barEl.style.width = absPct + '%';
    }
    const needle = document.getElementById(barEl.id.replace('-bar', '-needle'));
    if (needle) needle.style.left = (50 + pct * 50) + '%';
}

function clearDDMConverter() {
    ['ddm-loc-ddm', 'ddm-loc-ua', 'ddm-gs-ddm', 'ddm-gs-ua'].forEach(id => { document.getElementById(id).value = ''; });
    updateDDMBar(document.getElementById('ddm-loc-bar'), 0);
    updateDDMBar(document.getElementById('ddm-gs-bar'), 0);
}

function initDDMScales() {
    ['loc', 'gs'].forEach(t => {
        const sc = document.getElementById(`ddm-${t}-scale`);
        if (!sc || sc.querySelector('.tick')) return;
        for (let k = -5; k <= 5; k++) {
            if (!k) continue;
            const d = document.createElement('div');
            d.className = 'tick';
            d.style.left = (50 + k * 10) + '%';
            sc.insertBefore(d, sc.firstChild);
        }
    });
}

App.register('misc', {
    onPane(pane) { if (pane === 'morse') buildMorseRefTable(); }
});
