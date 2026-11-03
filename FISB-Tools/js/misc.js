// =========================================================
// CONVERTERS — fuel, units, altimeter, Morse, DDM (logic from v1.1)
// =========================================================
const EXACT_FT_PER_NM = 1852 / 0.3048;       // 6076.115485564304
const EXACT_L_PER_GAL = 3.785411784;         // Exact US gallon in liters
const EXACT_KG_PER_LB = 0.45359237;          // Exact avoirdupois pound in kg
const EXACT_HPA_PER_INHG = 33.8638866667;    // Exact inHg to hPa (0°C)

// ICAO Doc 7488 Standard Atmosphere constants:
// T0 = 288.15 K, L = 0.0065 K/m = 0.0019812 K/ft, T0 / L_ft = 145442.156 ft
// R * L / g0 = (287.05287 * 0.0065) / 9.80665 = 0.1902632365
const ISA_T0_OVER_L_FT = 288.15 / (0.0065 * 0.3048); // 145442.15581
const ISA_EXPONENT = (287.05287 * 0.0065) / 9.80665; // 0.1902632365
const ISA_P0_HPA = 1013.25;
const ISA_SL_FT_PER_HPA = ISA_T0_OVER_L_FT * ISA_EXPONENT / ISA_P0_HPA; // 27.30946 ft/hPa at 1013.25

function calcFuel(src) {
    let sg = parseFloat(document.getElementById('fuel-sg').value) || 0.8;
    if (sg <= 0) sg = 0.8;

    let lit = parseFloat(document.getElementById('fuel-liters').value);
    let gal = parseFloat(document.getElementById('fuel-gal').value);
    let lbs = parseFloat(document.getElementById('fuel-lbs').value);
    let kg = parseFloat(document.getElementById('fuel-kg').value);

    let baseLiters = NaN;
    if (src === 'liters') baseLiters = lit;
    else if (src === 'gal') baseLiters = gal * EXACT_L_PER_GAL;
    else if (src === 'kg') baseLiters = kg / sg;
    else if (src === 'lbs') baseLiters = (lbs * EXACT_KG_PER_LB) / sg;
    else if (src === 'sg') {
        if (!isNaN(lit)) baseLiters = lit;
        else if (!isNaN(gal)) baseLiters = gal * EXACT_L_PER_GAL;
    }

    if (isNaN(baseLiters)) return;

    if (src !== 'liters') document.getElementById('fuel-liters').value = baseLiters.toFixed(2);
    if (src !== 'gal') document.getElementById('fuel-gal').value = (baseLiters / EXACT_L_PER_GAL).toFixed(2);
    if (src !== 'kg') document.getElementById('fuel-kg').value = (baseLiters * sg).toFixed(2);
    if (src !== 'lbs') document.getElementById('fuel-lbs').value = ((baseLiters * sg) / EXACT_KG_PER_LB).toFixed(2);
}

function convDist(src) {
    const val = parseFloat(document.getElementById(`u-${src}`).value);
    if (isNaN(val)) return;
    let nm = 0;
    if (src === 'nm') nm = val;
    else if (src === 'm') nm = val / 1852;
    else if (src === 'ft') nm = val / EXACT_FT_PER_NM;
    else if (src === 'km') nm = val / 1.852;
    if (src !== 'nm') document.getElementById('u-nm').value = nm.toFixed(4);
    if (src !== 'm') document.getElementById('u-m').value = (nm * 1852).toFixed(2);
    if (src !== 'ft') document.getElementById('u-ft').value = (nm * EXACT_FT_PER_NM).toFixed(2);
    if (src !== 'km') document.getElementById('u-km').value = (nm * 1.852).toFixed(4);
}

function convSpeed(src) {
    const val = parseFloat(document.getElementById(`u-${src}`).value);
    if (isNaN(val)) return;
    const MPH_PER_KT = 1852 / 1609.344; // 1.150779448
    const MPS_PER_KT = 1852 / 3600;     // 0.514444444
    let kts = 0;
    if (src === 'kts') kts = val;
    else if (src === 'mph') kts = val / MPH_PER_KT;
    else if (src === 'kph') kts = val / 1.852;
    else if (src === 'mps') kts = val / MPS_PER_KT;
    if (src !== 'kts') document.getElementById('u-kts').value = kts.toFixed(2);
    if (src !== 'mph') document.getElementById('u-mph').value = (kts * MPH_PER_KT).toFixed(2);
    if (src !== 'kph') document.getElementById('u-kph').value = (kts * 1.852).toFixed(2);
    if (src !== 'mps') document.getElementById('u-mps').value = (kts * MPS_PER_KT).toFixed(2);
}

function convPress(src) {
    const val = parseFloat(document.getElementById(`u-${src}`).value);
    if (isNaN(val)) return;
    if (src === 'hpa') document.getElementById('u-inhg').value = (val / EXACT_HPA_PER_INHG).toFixed(3);
    else document.getElementById('u-hpa').value = (val * EXACT_HPA_PER_INHG).toFixed(2);
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

function calcAltimeter(src) {
    const qnhEl = document.getElementById('alt-qnh');
    const inhgEl = document.getElementById('alt-inhg');
    const readEl = document.getElementById('alt-read');
    if (!qnhEl) return;

    if (src === 'hpa' && inhgEl) {
        const h = parseFloat(qnhEl.value);
        inhgEl.value = (!isNaN(h) && h > 0) ? (h / EXACT_HPA_PER_INHG).toFixed(2) : '';
    } else if (src === 'inhg' && inhgEl) {
        const ig = parseFloat(inhgEl.value);
        qnhEl.value = (!isNaN(ig) && ig > 0) ? (ig * EXACT_HPA_PER_INHG).toFixed(2) : '';
    }

    const qnh = parseFloat(qnhEl.value);
    const read = readEl ? parseFloat(readEl.value) : NaN;
    const corrEl = document.getElementById('alt-corr');
    const corrSubEl = document.getElementById('alt-corr-sub');
    const paltEl = document.getElementById('alt-palt');
    const paltSubEl = document.getElementById('alt-palt-sub');
    const refIsaEl = document.getElementById('alt-ref-isa');
    const ref27El = document.getElementById('alt-ref-27');
    const ref30El = document.getElementById('alt-ref-30');

    if (!isNaN(qnh) && qnh > 0) {
        // Exact ICAO Doc 7488 ISA barometric formula:
        // Δh = 145442.16 * (1 - (QNH / 1013.25)^0.19026324)
        const diffISA = ISA_T0_OVER_L_FT * (1 - Math.pow(qnh / ISA_P0_HPA, ISA_EXPONENT));
        const diff27 = (ISA_P0_HPA - qnh) * ISA_SL_FT_PER_HPA;
        const diff30 = (ISA_P0_HPA - qnh) * 30;

        const fmtSigned = (v, dec = 1) => `${v >= 0 ? '+' : ''}${v.toFixed(dec)} ft`;
        const fmtAlt = (v, dec = 1) => `${v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })} ft`;

        corrEl.innerText = fmtSigned(diffISA, 1);
        if (corrSubEl) corrSubEl.innerText = `Rounded: ${diffISA >= 0 ? '+' : ''}${Math.round(diffISA)} ft  ·  145442.16 × [1 − (QNH/1013.25)^0.190263]`;

        if (!isNaN(read)) {
            const pAltISA = read + diffISA;
            const pAlt27 = read + diff27;
            const pAlt30 = read + diff30;
            paltEl.innerText = fmtAlt(pAltISA, 1);
            if (paltSubEl) paltSubEl.innerText = `Rounded: ${Math.round(pAltISA).toLocaleString('en-US')} ft`;
            if (refIsaEl) refIsaEl.innerText = `${fmtSigned(diffISA, 2)}  →  ${fmtAlt(pAltISA, 1)}`;
            if (ref27El) ref27El.innerText = `${fmtSigned(diff27, 2)}  →  ${fmtAlt(pAlt27, 1)}`;
            if (ref30El) ref30El.innerText = `${fmtSigned(diff30, 1)}  →  ${fmtAlt(pAlt30, 1)}`;
        } else {
            paltEl.innerText = "-- ft";
            if (paltSubEl) paltSubEl.innerText = "Indicated Reading + ISA Correction";
            if (refIsaEl) refIsaEl.innerText = fmtSigned(diffISA, 2);
            if (ref27El) ref27El.innerText = fmtSigned(diff27, 2);
            if (ref30El) ref30El.innerText = fmtSigned(diff30, 1);
        }
    } else {
        corrEl.innerText = "-- ft";
        if (corrSubEl) corrSubEl.innerText = "145442.16 × [1 − (QNH / 1013.25)^0.190263]";
        paltEl.innerText = "-- ft";
        if (paltSubEl) paltSubEl.innerText = "Indicated Reading + ISA Correction";
        if (refIsaEl) refIsaEl.innerText = "--";
        if (ref27El) ref27El.innerText = "--";
        if (ref30El) ref30El.innerText = "--";
    }
}

function clearAltimeter() {
    clearIds('alt-qnh', 'alt-inhg', 'alt-read');
    calcAltimeter();
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
    if (!barEl) return;
    const pct = Math.min(Math.max(uaVal / 150, -1), 1); // clamp to -1..+1
    const absPct = Math.abs(pct) * 50;
    const sc = barEl.closest('.ddm-scale');
    const isVert = sc && sc.classList.contains('vert');
    const needle = document.getElementById(barEl.id.replace('-bar', '-needle'));

    if (isVert) {
        // Vertical CDI Glideslope: +150 µA at top (0%), 0 at center (50%), -150 µA at bottom (100%)
        if (pct >= 0) {
            barEl.style.top = (50 - absPct) + '%';
            barEl.style.height = absPct + '%';
        } else {
            barEl.style.top = '50%';
            barEl.style.height = absPct + '%';
        }
        if (needle) needle.style.top = (50 - pct * 50) + '%';
    } else {
        if (pct >= 0) {
            barEl.style.left = '50%';
            barEl.style.width = absPct + '%';
        } else {
            barEl.style.left = (50 - absPct) + '%';
            barEl.style.width = absPct + '%';
        }
        if (needle) needle.style.left = (50 + pct * 50) + '%';
    }
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
        const isVert = sc.classList.contains('vert');
        for (let k = -5; k <= 5; k++) {
            if (!k) continue;
            const d = document.createElement('div');
            d.className = 'tick';
            if (isVert) d.style.top = (50 + k * 10) + '%';
            else d.style.left = (50 + k * 10) + '%';
            sc.insertBefore(d, sc.firstChild);
        }
    });
}

App.register('misc', {
    onPane(pane) { if (pane === 'morse') buildMorseRefTable(); }
});
