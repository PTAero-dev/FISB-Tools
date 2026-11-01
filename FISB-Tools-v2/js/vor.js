// =========================================================
// VOR TOOLS — orbit, prediction, siting, FSPL (logic from v1.1)
// New: compass-rose orbit plots, redesigned siting profile, 3D
// screening cone, interactive signal chart.
// =========================================================
let vorDirection = 'cw';

function setVorDir(dir) {
    vorDirection = dir;
    const cwBtn = document.getElementById('dir-cw');
    const ccwBtn = document.getElementById('dir-ccw');
    cwBtn.classList.toggle('active', dir === 'cw');
    cwBtn.classList.toggle('cw', dir === 'cw');
    ccwBtn.classList.toggle('active', dir === 'ccw');
    ccwBtn.classList.toggle('ccw', dir === 'ccw');

    // Auto Set Current Time
    setVorNow();

    calculateVOR();
    calcVorTime();
}

function updateVorMorse(ident) {
    const morseEl = document.getElementById('vor-morse');
    if (!morseEl) return;
    let code = "";
    for (let char of ident.toUpperCase()) {
        if (MORSE_CODE[char]) code += MORSE_CODE[char] + "   "; // 3 spaces between chars
    }
    morseEl.textContent = code;
}

function setVorNow() {
    const now = new Date();
    const hh = now.getUTCHours().toString().padStart(2, '0');
    const mm = now.getUTCMinutes().toString().padStart(2, '0');
    document.getElementById('vor-startTime').value = `${hh}:${mm}`;
    calcVorTime();
}

function formatTimeInput(input) {
    let original = input.value;
    let clean = original.replace(/[^0-9]/g, '');
    if (clean.length > 4) clean = clean.substring(0, 4);
    if (clean.length >= 3) {
        input.value = clean.substring(0, 2) + ':' + clean.substring(2);
    } else {
        input.value = clean;
    }
}

function calculateVOR() {
    let dist = parseFloat(document.getElementById('vor-dist').value) || 0;
    let speed = parseFloat(document.getElementById('vor-speed').value) || 0;
    let startRad = parseFloat(document.getElementById('vor-startRad').value) || 0;
    let targetRaw = document.getElementById('vor-targetRad').value;
    let targetRad = parseFloat(targetRaw);

    // Constrain
    if (startRad > 360) { startRad = 360; document.getElementById('vor-startRad').value = 360; }
    if (targetRad > 360) { targetRad = 360; document.getElementById('vor-targetRad').value = 360; }

    if (dist <= 0 || speed <= 0) {
        document.getElementById('vor-total-time').innerText = "--:--";
        document.getElementById('vor-total-dist').innerText = "-- NM";
        document.getElementById('vor-time-target').innerText = "--:--";
        drawVorArc(0, 0, vorDirection);
        return;
    }

    let circumference = 2 * Math.PI * dist;
    let totalTimeMin = (circumference / speed) * 60;

    document.getElementById('vor-total-time').innerText = formatMinSec(totalTimeMin);
    document.getElementById('vor-total-dist').innerText = fmt(circumference.toFixed(2)) + " NM";

    if (document.getElementById('vor-targetRad').value !== "") {
        // Input is "Final Crs", use Reciprocal Radial
        let actualTargetRad = (targetRad + 180) % 360;
        if (actualTargetRad === 0) actualTargetRad = 360;

        let deltaDeg = 0;
        if (vorDirection === 'cw') {
            deltaDeg = (actualTargetRad - startRad + 360) % 360;
        } else {
            deltaDeg = (startRad - actualTargetRad + 360) % 360;
        }
        if (deltaDeg === 0) deltaDeg = 360;

        let targetTimeMin = (deltaDeg / 360) * totalTimeMin;
        let targetDistNM = (deltaDeg / 360) * circumference;

        document.getElementById('vor-time-target').innerText = formatMinSec(targetTimeMin);
        document.getElementById('vor-dist-target').innerText = `${fmt(targetDistNM.toFixed(1))} NM (${deltaDeg.toFixed(0)}°)`;
        drawVorArc(startRad, deltaDeg, vorDirection);
    } else {
        document.getElementById('vor-time-target').innerText = "--:--";
        document.getElementById('vor-dist-target').innerText = "-- NM";
        drawVorArc(0, 0, vorDirection);
    }

    calcVorTime(); // Recalculate ETA after updating target time
    updateVorHeader();
}

function calcVorTime() {
    const startTimeVal = document.getElementById('vor-startTime').value;
    const finishEl = document.getElementById('vor-finishTime');
    const fullOrbitEtaEl = document.getElementById('vor-full-orbit-eta');

    let startH = NaN, startM = NaN;
    if (startTimeVal && startTimeVal.includes(':')) {
        const parts = startTimeVal.split(':');
        startH = parseInt(parts[0], 10);
        startM = parseInt(parts[1], 10);
    }
    const validStartTime = !isNaN(startH) && !isNaN(startM);

    let crossTimeStr = document.getElementById('vor-time-target').innerText;
    let fullTimeStr = document.getElementById('vor-total-time').innerText;

    if (!validStartTime || !crossTimeStr || crossTimeStr.includes("--") || crossTimeStr === "00:00") {
        finishEl.innerText = "--:-- UTC";
    } else {
        const [durM, durS] = crossTimeStr.split(':').map(n => parseInt(n, 10));
        if (isNaN(durM) || isNaN(durS)) {
            finishEl.innerText = "--:-- UTC";
        } else {
            let date = new Date();
            date.setUTCHours(startH);
            date.setUTCMinutes(startM);
            date.setSeconds(0);
            date.setMinutes(date.getMinutes() + durM);
            date.setSeconds(date.getSeconds() + durS);
            const endH = date.getUTCHours().toString().padStart(2, '0');
            const endM = date.getUTCMinutes().toString().padStart(2, '0');
            finishEl.innerText = `${endH}:${endM} UTC`;
        }
    }

    if (!validStartTime || !fullTimeStr || fullTimeStr.includes("--") || fullTimeStr === "00:00") {
        fullOrbitEtaEl.innerText = "--:-- UTC";
    } else {
        const [durM, durS] = fullTimeStr.split(':').map(n => parseInt(n, 10));
        if (isNaN(durM) || isNaN(durS)) {
            fullOrbitEtaEl.innerText = "--:-- UTC";
        } else {
            let date = new Date();
            date.setUTCHours(startH);
            date.setUTCMinutes(startM);
            date.setSeconds(0);
            date.setMinutes(date.getMinutes() + durM);
            date.setSeconds(date.getSeconds() + durS);
            const endH = date.getUTCHours().toString().padStart(2, '0');
            const endM = date.getUTCMinutes().toString().padStart(2, '0');
            fullOrbitEtaEl.innerText = `${endH}:${endM} UTC`;
        }
    }

    updateVorHeader();
}

// ===== PREDICTION CARD =====
let predDirection = 'cw';

function setPredNow() {
    const now = new Date();
    const hh = now.getUTCHours().toString().padStart(2, '0');
    const mm = now.getUTCMinutes().toString().padStart(2, '0');
    const el = document.getElementById('pred-startTime');
    if (el) el.value = `${hh}:${mm}`;
    calcTimeToRadial();
    calcRadialFromTime();
}

function setPredDir(dir) {
    predDirection = dir;
    const cwBtn = document.getElementById('pred-dir-cw');
    const ccwBtn = document.getElementById('pred-dir-ccw');
    cwBtn.classList.toggle('active', dir === 'cw');
    cwBtn.classList.toggle('cw', dir === 'cw');
    ccwBtn.classList.toggle('active', dir === 'ccw');
    ccwBtn.classList.toggle('ccw', dir === 'ccw');

    // Set current time when direction is selected
    setPredNow();
}

function updatePrediction() {
    document.getElementById('pred-header-info').innerHTML = "";
    document.getElementById('pred-result-time').innerText = "--:-- min";
    document.getElementById('pred-result-eta').innerText = "";
    document.getElementById('pred-result-rad').innerText = "--°";
    document.getElementById('pred-result-rad-eta').innerText = "";
    calcTimeToRadial();
    calcRadialFromTime();
}

function syncPredFromOrbitCal() {
    const orbitDist = document.getElementById('vor-dist').value;
    const orbitSpeed = document.getElementById('vor-speed').value;
    if (orbitDist) document.getElementById('pred-orbitDist').value = orbitDist;
    if (orbitSpeed) document.getElementById('pred-speed').value = orbitSpeed;
    setPredDir(vorDirection);
    calcTimeToRadial();
    calcRadialFromTime();
}

function getPredDegPerMin() {
    const dist = parseFloat(document.getElementById('pred-orbitDist').value) || 0;
    const speed = parseFloat(document.getElementById('pred-speed').value) || 0;
    if (dist <= 0 || speed <= 0) return 0;
    const circumference = 2 * Math.PI * dist;
    const totalMin = (circumference / speed) * 60;
    return (totalMin > 0) ? 360 / totalMin : 0;
}

function getPredInitials() {
    const startTimeVal = document.getElementById('pred-startTime').value;
    const startRad = parseFloat(document.getElementById('pred-startRad').value);
    let startH = NaN, startM = NaN;
    if (startTimeVal && startTimeVal.includes(':')) {
        const parts = startTimeVal.split(':');
        startH = parseInt(parts[0], 10);
        startM = parseInt(parts[1], 10);
    }
    return {
        startH, startM,
        validStartTime: !isNaN(startH) && !isNaN(startM),
        startRad: isNaN(startRad) ? NaN : startRad
    };
}

function calcTimeToRadial() { _calcTimeToRadial(); drawPredCompass(); }
function calcRadialFromTime() { _calcRadialFromTime(); drawPredCompass(); }

// Mode 1: Input Target Radial → Calculate Time
function _calcTimeToRadial() {
    const resultTime = document.getElementById('pred-result-time');
    const resultEta = document.getElementById('pred-result-eta');
    const headerInfo = document.getElementById('pred-header-info');

    const degPerMin = getPredDegPerMin();
    const { startH, startM, validStartTime, startRad } = getPredInitials();
    const targetRad = parseFloat(document.getElementById('pred-targetRad').value);

    if (isNaN(startRad) || isNaN(targetRad) || degPerMin <= 0) {
        resultTime.innerText = "--:-- min";
        resultEta.innerText = "";
        return;
    }

    let deltaDeg = 0;
    if (predDirection === 'cw') {
        deltaDeg = (targetRad - startRad + 360) % 360;
    } else {
        deltaDeg = (startRad - targetRad + 360) % 360;
    }
    if (deltaDeg === 0) deltaDeg = 360; // Full orbit if same radial

    const timeMin = deltaDeg / degPerMin;
    const mins = Math.floor(timeMin);
    const secs = Math.round((timeMin - mins) * 60);
    resultTime.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} min`;

    if (validStartTime) {
        let date = new Date();
        date.setUTCHours(startH);
        date.setUTCMinutes(startM);
        date.setSeconds(0);
        date.setMinutes(date.getMinutes() + mins);
        date.setSeconds(date.getSeconds() + secs);
        const etaH = date.getUTCHours().toString().padStart(2, '0');
        const etaM = date.getUTCMinutes().toString().padStart(2, '0');
        resultEta.innerText = `ETA ${etaH}:${etaM} UTC`;

        const dirStr = predDirection === 'cw' ? 'CW' : 'CCW';
        headerInfo.innerHTML = `<span style="color:var(--text-main)">${dirStr}</span> &bull; R${targetRad.toFixed(0).padStart(3, '0')} in <span style="color:var(--accent-warning)">${mins}:${secs.toString().padStart(2, '0')}</span> (${etaH}:${etaM} UTC)`;
    } else {
        resultEta.innerText = "";
    }
}

// Mode 2: Input Time → Calculate Radial
function _calcRadialFromTime() {
    const resultRad = document.getElementById('pred-result-rad');
    const resultEta = document.getElementById('pred-result-rad-eta');

    const degPerMin = getPredDegPerMin();
    const { startH, startM, validStartTime, startRad } = getPredInitials();
    const activeMin = parseFloat(document.getElementById('pred-activeMin').value);

    if (isNaN(startRad) || isNaN(activeMin) || degPerMin <= 0) {
        resultRad.innerText = "--°";
        resultEta.innerText = "";
        return;
    }

    const degChange = degPerMin * activeMin;
    let newRad = 0;
    if (predDirection === 'cw') {
        newRad = (startRad + degChange) % 360;
    } else {
        newRad = startRad - degChange;
        while (newRad <= 0) newRad += 360;
    }
    if (newRad <= 0) newRad = 360;

    const radStr = newRad.toFixed(0).padStart(3, '0');
    resultRad.innerText = `${radStr}°`;

    if (validStartTime) {
        let date = new Date();
        date.setUTCHours(startH);
        date.setUTCMinutes(startM);
        date.setSeconds(0);
        date.setMinutes(date.getMinutes() + Math.floor(activeMin));
        date.setSeconds(date.getSeconds() + Math.round((activeMin % 1) * 60));
        const etaH = date.getUTCHours().toString().padStart(2, '0');
        const etaM = date.getUTCMinutes().toString().padStart(2, '0');
        resultEta.innerText = `at ${etaH}:${etaM} UTC`;
    } else {
        resultEta.innerText = "";
    }
}

function updateVorHeader() {
    const speed = parseFloat(document.getElementById('vor-speed').value) || 0;
    const dist = parseFloat(document.getElementById('vor-dist').value) || 0;
    const headerInfo = document.getElementById('vor-header-info');
    if (!headerInfo) return;

    if (speed <= 0 || dist <= 0) {
        headerInfo.innerHTML = "";
        return;
    }

    const dirStr = (vorDirection === 'cw') ? "CW" : "CCW";
    const fullTimeStr = document.getElementById('vor-total-time').innerText;
    const crossTimeStr = document.getElementById('vor-time-target').innerText;
    const startTimeVal = document.getElementById('vor-startTime').value;

    let fullEta = "--:--";
    let crossEta = "--:--";

    if (startTimeVal && !startTimeVal.includes("--")) {
        const [startH, startM] = startTimeVal.split(':').map(n => parseInt(n, 10));
        if (!isNaN(startH) && !isNaN(startM)) {
            if (fullTimeStr && !fullTimeStr.includes("--") && fullTimeStr !== "00:00") {
                const [fDurM, fDurS] = fullTimeStr.split(':').map(n => parseInt(n, 10));
                let d = new Date(); d.setUTCHours(startH); d.setUTCMinutes(startM); d.setSeconds(0);
                d.setMinutes(d.getMinutes() + fDurM); d.setSeconds(d.getSeconds() + fDurS);
                fullEta = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
            }
            if (crossTimeStr && !crossTimeStr.includes("--") && crossTimeStr !== "--:--") {
                const [cDurM, cDurS] = crossTimeStr.split(':').map(n => parseInt(n, 10));
                let d = new Date(); d.setUTCHours(startH); d.setUTCMinutes(startM); d.setSeconds(0);
                d.setMinutes(d.getMinutes() + cDurM); d.setSeconds(d.getSeconds() + cDurS);
                crossEta = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
            }
        }
    }

    headerInfo.innerHTML = `<span style="color:var(--text-main); font-weight:700;">${dirStr}</span> &bull; Time <span style="color:var(--text-main)">${fullTimeStr}</span> min &bull; Full Orbit <span style="color:var(--accent-warning)">${fullEta}</span> UTC &bull; X <span style="color:var(--accent-cyan)">${crossEta}</span> UTC`;
}

// v1 drew a progress bar here; v2 draws a full compass plot
function drawVorArc(startDeg, deltaDeg, dir) { drawVorCompass(); }

function drawVorCompass() {
    const s = V.svg(document.getElementById('vor-orbit-svg'));
    if (!s) return;
    const C = V.compass(s);
    const { cx, cy, r } = C;
    const dist = parseFloat(document.getElementById('vor-dist').value) || 0;
    const startStr = document.getElementById('vor-startRad').value;
    const crsStr = document.getElementById('vor-targetRad').value;
    const ident = document.getElementById('vor-id').value || 'VOR';
    const cw = vorDirection === 'cw';
    const ro = r * 0.7;

    // orbit ring
    V.el(s.el, 'circle', { cx, cy, r: ro, fill: 'none', stroke: dist > 0 ? V.c('--primary') : V.c('--viz-axis'), 'stroke-opacity': dist > 0 ? 0.45 : 0.6, 'stroke-width': 1.5, 'stroke-dasharray': '6 6' });
    if (dist > 0) V.label(s, cx, cy + ro, `${dist} NM`, V.c('--primary'), { size: 10 });

    const startRad = parseFloat(startStr) || 0;
    const hasStart = startStr !== '';
    if (crsStr !== '' && dist > 0) {
        const crs = parseFloat(crsStr);
        let tgt = (crs + 180) % 360; if (tgt === 0) tgt = 360;
        let delta = cw ? (tgt - startRad + 360) % 360 : (startRad - tgt + 360) % 360;
        if (delta === 0) delta = 360;
        // final course line (inbound toward station along radial tgt)
        V.radial(s, cx, cy, 10, r - 4, tgt, V.c('--amber'), { width: 2.5 });
        const [ax, ay] = V.pt(cx, cy, 16, tgt);
        V.el(s.el, 'path', { d: `M${cx} ${cy} L${ax} ${ay}`, stroke: V.c('--amber'), 'stroke-width': 2.5 });
        const [lx, ly] = V.pt(cx, cy, r * 0.88, tgt);
        V.label(s, lx, ly, `CRS ${String(Math.round(crs)).padStart(3, '0')}`, V.c('--amber'), { size: 10.5 });
        // arc flown
        const path = V.el(s.el, 'path', { d: V.arcPath(cx, cy, ro, startRad, delta, cw), fill: 'none', stroke: V.c('--primary'), 'stroke-width': 5, 'stroke-linecap': 'round' });
        // arrowhead at end
        const endB = cw ? startRad + delta : startRad - delta;
        const [ex, ey] = V.pt(cx, cy, ro, endB);
        const hdg = cw ? endB + 90 : endB - 90;
        V.el(s.el, 'path', { d: 'M0 -8 L6 6 L-6 6 Z', fill: V.c('--primary'), transform: `translate(${ex} ${ey}) rotate(${hdg})` });
        const midB = cw ? startRad + delta / 2 : startRad - delta / 2;
        const [mx, my] = V.pt(cx, cy, ro * 0.62, midB);
        const timeTxt = document.getElementById('vor-time-target').innerText;
        V.label(s, mx, my, `${delta.toFixed(0)}° · ${timeTxt}`, V.c('--primary'), { size: 11 });
    }
    if (hasStart) {
        V.radial(s, cx, cy, 10, r - 4, startRad, V.c('--cyan'), { width: 2, dash: '4 4' });
        const [px, py] = V.pt(cx, cy, ro, startRad);
        V.plane(s, px, py, cw ? startRad + 90 : startRad - 90, V.c('--cyan'), 30);
        const [lx, ly] = V.pt(cx, cy, r + 2, startRad);
        V.label(s, lx, ly, `R${String(Math.round(startRad)).padStart(3, '0')}`, V.c('--cyan'), { size: 10.5 });
    }
    // station
    V.el(s.el, 'path', { d: `M${cx - 9} ${cy} L${cx - 4.5} ${cy - 7.8} L${cx + 4.5} ${cy - 7.8} L${cx + 9} ${cy} L${cx + 4.5} ${cy + 7.8} L${cx - 4.5} ${cy + 7.8} Z`, fill: V.c('--surface'), stroke: V.c('--text'), 'stroke-width': 2 });
    V.el(s.el, 'circle', { cx, cy, r: 2, fill: V.c('--text') });
    V.el(s.el, 'text', { x: cx, y: cy + 22, 'text-anchor': 'middle', fill: V.c('--text'), 'font-size': 11, 'font-weight': 800, 'font-family': "'JetBrains Mono', monospace" }, ident);
    V.el(s.el, 'text', { x: 10, y: s.h - 10, fill: V.c('--muted'), 'font-size': 11 }, cw ? '↻ Clockwise' : '↺ Counter-clockwise');
}

function drawPredCompass() {
    const s = V.svg(document.getElementById('pred-svg'));
    if (!s) return;
    const C = V.compass(s);
    const { cx, cy, r } = C;
    const ro = r * 0.7;
    const cw = predDirection === 'cw';
    const dist = parseFloat(document.getElementById('pred-orbitDist').value) || 0;
    V.el(s.el, 'circle', { cx, cy, r: ro, fill: 'none', stroke: V.c('--primary'), 'stroke-opacity': 0.4, 'stroke-width': 1.5, 'stroke-dasharray': '6 6' });
    if (dist > 0) V.label(s, cx, cy + ro, `${dist} NM`, V.c('--primary'), { size: 10 });

    const startStr = document.getElementById('pred-startRad').value;
    if (startStr === '') { V.el(s.el, 'circle', { cx, cy, r: 4, fill: V.c('--text') }); return; }
    const start = parseFloat(startStr);
    const tStr = document.getElementById('pred-targetRad').value;
    if (tStr !== '') {
        const t = parseFloat(tStr);
        let delta = cw ? (t - start + 360) % 360 : (start - t + 360) % 360;
        if (delta === 0) delta = 360;
        V.el(s.el, 'path', { d: V.arcPath(cx, cy, ro, start, delta, cw), fill: 'none', stroke: V.c('--amber'), 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-opacity': 0.85 });
        V.radial(s, cx, cy, 8, r - 4, t, V.c('--amber'), { width: 2 });
        const [lx, ly] = V.pt(cx, cy, r + 2, t);
        V.label(s, lx, ly, `R${String(Math.round(t)).padStart(3, '0')}`, V.c('--amber'), { size: 10.5 });
    }
    const pText = document.getElementById('pred-result-rad').innerText;
    const p = parseFloat(pText);
    if (!isNaN(p)) {
        V.radial(s, cx, cy, 8, r - 4, p, V.c('--violet'), { width: 2, dash: '5 4' });
        const [px, py] = V.pt(cx, cy, ro, p);
        V.plane(s, px, py, cw ? p + 90 : p - 90, V.c('--violet'), 30);
        const [lx, ly] = V.pt(cx, cy, ro * 0.6, p);
        V.label(s, lx, ly, `R${pText.replace('°', '')}`, V.c('--violet'), { size: 10.5 });
    }
    V.radial(s, cx, cy, 8, r - 4, start, V.c('--cyan'), { width: 2 });
    const [sx, sy] = V.pt(cx, cy, ro, start);
    V.el(s.el, 'circle', { cx: sx, cy: sy, r: 6, fill: V.c('--cyan'), stroke: V.c('--surface'), 'stroke-width': 2 });
    const [lx, ly] = V.pt(cx, cy, r + 2, start);
    V.label(s, lx, ly, `R${String(Math.round(start)).padStart(3, '0')}`, V.c('--cyan'), { size: 10.5 });
    V.el(s.el, 'circle', { cx, cy, r: 4, fill: V.c('--text') });
    V.el(s.el, 'text', { x: 10, y: s.h - 10, fill: V.c('--muted'), 'font-size': 11 }, cw ? '↻ Clockwise' : '↺ Counter-clockwise');
}

// --- VOR SITING MODULE ---
const EARTH_RADIUS_FT = 3440.1 * FT_PER_NM;
let vsatUseCurvature = true;

function toggleCurvature() {
    vsatUseCurvature = !vsatUseCurvature;
    const wrapper = document.getElementById('vsat-toggle-curve');
    if (vsatUseCurvature) wrapper.classList.add('toggle-active'); else wrapper.classList.remove('toggle-active');
    calcVorSiting();
}

function getScreeningAlt(hS, hO, dO, dA, isCurved, overrideAngleRad = null) {
    const R = isCurved ? EARTH_RADIUS_FT : Infinity;
    const yObsEffective = hO;
    const deltaY = yObsEffective - hS;
    const deltaX = dO * FT_PER_NM;
    let angleRad = Math.atan2(deltaY, deltaX);

    const isDepression = (hS > hO);
    if (isDepression && isCurved) {
        const horizonRad = -Math.acos(R / (R + hS));
        if (angleRad < horizonRad) angleRad = horizonRad;
    }

    let effectiveAngleRad = angleRad;
    if (overrideAngleRad !== null && !isNaN(overrideAngleRad)) {
        effectiveAngleRad = overrideAngleRad;
    }

    const dropAtAcft = isCurved ? (Math.pow(dA * FT_PER_NM, 2) / (2 * R)) : 0;
    const distAcftFt = dA * FT_PER_NM;
    const yAcftFlat = hS + (distAcftFt * Math.tan(effectiveAngleRad));

    return {
        alt: yAcftFlat + dropAtAcft,
        angleDeg: angleRad * (180 / Math.PI),
        usedAngleDeg: effectiveAngleRad * (180 / Math.PI),
        isDepression: isDepression,
        usedHorizon: (isDepression && isCurved && angleRad === (-Math.acos(R / (R + hS))))
    };
}

let _vsatLast = null; // last drawn state for 3D

function calcVorSiting() {
    const txtId = document.getElementById('vsat-id').value || "VOR";
    const rObsRaw = document.getElementById('vsat-rObs').value;
    document.getElementById('vsat-profile-header').innerText = rObsRaw ? `${txtId} Profile (R-${rObsRaw})` : `${txtId} Profile View`;

    const hStationRaw = document.getElementById('vsat-hStation').value;
    const dObsRaw = document.getElementById('vsat-dObs').value;
    const hObsRaw = document.getElementById('vsat-hObs').value;
    const dAcftRaw = document.getElementById('vsat-dAcft').value;

    const canvas = document.getElementById('vsatCanvas');
    const empty = document.getElementById('vsat-empty');
    if (hStationRaw === "" || dObsRaw === "" || hObsRaw === "") {
        document.getElementById('vsat-angleVal').innerHTML = "--°";
        const ov = document.getElementById('vsat-overlayAngle');
        ov.innerText = "WAITING DATA"; ov.className = 'badge';
        document.getElementById('vsat-flatAlt').innerText = "--";
        document.getElementById('vsat-curvedAlt').innerText = "--";
        document.getElementById('vsat-angleNote').style.display = 'none';
        document.getElementById('vsat-diffVal').innerHTML = "";
        if (canvas) V.canvas(canvas);
        if (empty) empty.style.display = '';
        _vsatLast = null;
        if (vsatView === '3d') buildVsat3D();
        return;
    }
    if (empty) empty.style.display = 'none';

    const hStation = parseFloat(hStationRaw);
    const dObs = parseFloat(dObsRaw);
    const hObs = parseFloat(hObsRaw);
    const dAcft = parseFloat(dAcftRaw) || 0;

    const overrideRaw = document.getElementById('vsat-overrideAngle') ? document.getElementById('vsat-overrideAngle').value : "";
    let overrideAngleRad = null;
    if (overrideRaw !== "") {
        overrideAngleRad = parseFloat(overrideRaw) * (Math.PI / 180);
    }

    const resMain = getScreeningAlt(hStation, hObs, dObs, dAcft, vsatUseCurvature, overrideAngleRad);
    const resFlat = getScreeningAlt(hStation, hObs, dObs, dAcft, false, overrideAngleRad);
    const resCurved = getScreeningAlt(hStation, hObs, dObs, dAcft, true, overrideAngleRad);

    const noteEl = document.getElementById('vsat-angleNote');
    if (overrideRaw !== "") {
        noteEl.innerText = "OVERRIDE ANGLE ACTIVE"; noteEl.style.display = "block"; noteEl.style.color = "var(--accent-warning)";
    } else if (resCurved.isDepression && vsatUseCurvature) {
        noteEl.innerText = "DEPRESSION ANGLE"; noteEl.style.display = "block"; noteEl.style.color = "var(--accent-danger)";
    } else { noteEl.style.display = "none"; }

    document.getElementById('vsat-angleVal').innerHTML = resMain.angleDeg.toFixed(2) + "°";
    const ovAngle = document.getElementById('vsat-overlayAngle');

    if (overrideRaw !== "") {
        ovAngle.innerHTML = `OVERRIDE: ${resMain.usedAngleDeg.toFixed(2)}°`;
        ovAngle.className = 'badge amber';
    } else if (resCurved.usedHorizon) {
        ovAngle.innerHTML = `HORIZON LIM: ${resMain.angleDeg.toFixed(2)}°`;
        ovAngle.className = 'badge red';
    } else {
        ovAngle.innerHTML = `SCREENING: ${resMain.angleDeg.toFixed(2)}°`;
        ovAngle.className = 'badge cyan';
    }

    if (dAcftRaw !== "") {
        document.getElementById('vsat-flatAlt').innerText = fmt(Math.ceil(resFlat.alt)) + " ft";
        document.getElementById('vsat-curvedAlt').innerText = fmt(Math.ceil(resCurved.alt)) + " ft";

        let ecVal = 0.883 * Math.pow(dAcft, 2);
        document.getElementById('vsat-diffVal').innerHTML = `Earth curvature (Ec) <span style="color:var(--accent-cyan);">+${fmt(Math.round(ecVal))} ft</span>`;

        drawVorSiting(hStation, hObs, dObs, dAcft, resMain.alt, vsatUseCurvature, (resMain.usedAngleDeg * Math.PI / 180), txtId, rObsRaw);
    } else {
        document.getElementById('vsat-flatAlt').innerText = "--";
        document.getElementById('vsat-curvedAlt').innerText = "--";
        document.getElementById('vsat-diffVal').innerHTML = "";
        drawVorSiting(hStation, hObs, dObs, 0, null, vsatUseCurvature, (resMain.usedAngleDeg * Math.PI / 180), txtId, rObsRaw);
    }
}

function drawVorSiting(hS, hO, dO, dA, hA_calc, curved, angleRad, id, obsRad) {
    _vsatLast = { hS, hO, dO, dA, hA_calc, curved, angleRad, id, obsRad };
    if (vsatView === '3d') { buildVsat3D(); return; }

    const S = V.canvas(document.getElementById('vsatCanvas'));
    if (!S) return;
    const { ctx, w, h } = S;

    const padLeft = 58; const padRight = 26; const padBot = 34; const padTop = 22;
    const drawW = w - padLeft - padRight; const drawH = h - padBot - padTop;

    let maxDist = (dA > dO) ? dA * 1.15 : dO * 3;
    const scaleX = drawW / maxDist;

    let maxAlt = Math.max(hS, hO); if (hA_calc) maxAlt = Math.max(maxAlt, hA_calc); maxAlt = maxAlt * 1.4;
    let minAlt = 0;
    if (curved) minAlt = -(Math.pow(maxDist * FT_PER_NM, 2) / (2 * EARTH_RADIUS_FT));
    minAlt = Math.min(minAlt, -200);

    const rangeY = maxAlt - minAlt; const scaleY = drawH / rangeY;
    const toX = (nm) => padLeft + (nm * scaleX);
    const toY = (ft) => (h - padBot) - ((ft - minAlt) * scaleY);
    const dropAt = d => curved ? -(Math.pow(d * FT_PER_NM, 2) / (2 * EARTH_RADIUS_FT)) : 0;

    // sky
    const sky = ctx.createLinearGradient(0, padTop, 0, h - padBot);
    sky.addColorStop(0, V.c('--sky-top')); sky.addColorStop(1, V.c('--sky-bot'));
    ctx.fillStyle = sky; ctx.fillRect(padLeft, padTop, drawW, drawH);

    // grid & axes
    V.font(ctx, 10, 500, true); ctx.fillStyle = V.c('--muted');
    const stepY = V.niceStep(rangeY, 5);
    ctx.strokeStyle = V.c('--viz-grid'); ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let a = Math.ceil(minAlt / stepY) * stepY; a <= maxAlt; a += stepY) {
        ctx.beginPath(); ctx.moveTo(padLeft, toY(a)); ctx.lineTo(w - padRight, toY(a)); ctx.stroke();
        ctx.fillText(fmt(Math.round(a)), padLeft - 6, toY(a));
    }
    const stepX = V.niceStep(maxDist, 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let d = 0; d <= maxDist + 1e-9; d += stepX) {
        ctx.beginPath(); ctx.moveTo(toX(d), padTop); ctx.lineTo(toX(d), h - padBot); ctx.stroke();
        ctx.fillText(+d.toFixed(2), toX(d), h - padBot + 6);
    }
    ctx.textAlign = 'right'; ctx.fillText('NM', w - padRight, h - 12);
    ctx.textAlign = 'left'; ctx.fillText('ft', 6, padTop - 14);

    // ground (filled, curved)
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
        let d = (i / 80) * maxDist;
        if (i === 0) ctx.moveTo(toX(d), toY(dropAt(d))); else ctx.lineTo(toX(d), toY(dropAt(d)));
    }
    ctx.lineTo(toX(maxDist), h - padBot); ctx.lineTo(toX(0), h - padBot); ctx.closePath();
    ctx.fillStyle = V.c('--ground'); ctx.fill();
    ctx.strokeStyle = V.c('--viz-axis'); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
        let d = (i / 80) * maxDist;
        if (i === 0) ctx.moveTo(toX(d), toY(dropAt(d))); else ctx.lineTo(toX(d), toY(dropAt(d)));
    }
    ctx.stroke();

    // protected area under screening line
    const sX = toX(0); const sY = toY(hS);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
    ctx.beginPath(); ctx.moveTo(sX, sY);
    for (let i = 0; i <= 60; i++) {
        let d = (i / 60) * maxDist; let y_flat = hS + (d * FT_PER_NM * Math.tan(angleRad));
        ctx.lineTo(toX(d), toY(y_flat));
    }
    for (let i = 60; i >= 0; i--) { let d = (i / 60) * maxDist; ctx.lineTo(toX(d), toY(dropAt(d))); }
    ctx.closePath(); ctx.fill();

    // LOS line
    ctx.save();
    ctx.beginPath(); ctx.rect(padLeft, padTop, drawW, drawH); ctx.clip();
    ctx.strokeStyle = V.c('--red'); ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(sX, sY);
    ctx.lineTo(toX(maxDist), toY(hS + maxDist * FT_PER_NM * Math.tan(angleRad)));
    ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();

    // station mast
    ctx.strokeStyle = V.c('--cyan'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sX, toY(0)); ctx.lineTo(sX, sY); ctx.stroke();
    ctx.fillStyle = V.c('--cyan'); ctx.beginPath(); ctx.arc(sX, sY, 5, 0, Math.PI * 2); ctx.fill();
    V.pill(ctx, `${id} ${fmt(hS)} ft`, sX + 8, sY - 14, { color: V.c('--cyan'), size: 10.5 });

    // obstacle
    let oBase = dropAt(dO);
    const oX = toX(dO); const oY = toY(hO + oBase);
    ctx.fillStyle = V.c('--amber');
    ctx.beginPath(); ctx.moveTo(oX - 7, toY(oBase)); ctx.lineTo(oX, oY); ctx.lineTo(oX + 7, toY(oBase)); ctx.closePath();
    ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
    V.pill(ctx, `OBST ${fmt(hO)} ft${obsRad ? ' · R' + obsRad : ''}`, oX, oY - 14, { align: 'center', color: V.c('--amber'), size: 10.5 });

    // aircraft
    if (dA > 0 && hA_calc !== null) {
        const aX = toX(dA);
        let dropAtAcft = curved ? (Math.pow(dA * FT_PER_NM, 2) / (2 * EARTH_RADIUS_FT)) : 0;
        let visualY = hA_calc - dropAtAcft; let canvasY = toY(visualY);
        ctx.strokeStyle = V.c('--green'); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(aX, canvasY); ctx.lineTo(aX, toY(dropAt(dA))); ctx.stroke(); ctx.setLineDash([]);
        // aircraft glyph (side view, heading toward station)
        ctx.save(); ctx.translate(aX, canvasY); ctx.scale(-1, 1);
        ctx.fillStyle = V.c('--green');
        ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, -2.5); ctx.lineTo(15, 0); ctx.lineTo(10, 2.5); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(-6, -10); ctx.lineTo(-2, -10); ctx.lineTo(5, -1); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-12, -1); ctx.lineTo(-15, -7); ctx.lineTo(-12, -7); ctx.lineTo(-8, -1); ctx.closePath(); ctx.fill();
        ctx.restore();
        V.pill(ctx, `${fmt(Math.ceil(hA_calc))} ft @ ${dA} NM`, aX + (aX > w - 170 ? -10 : 10), canvasY - 18, { align: aX > w - 170 ? 'right' : 'left', color: V.c('--green'), size: 10.5 });
    }
}

// --- VOR siting 3D ---
let vsatView = '2d';
let vsatExag = 5;
let vsatScene = null;

function setVsatView(v) {
    vsatView = v;
    setSegActive(document.querySelector('#vsat-profile-header').parentElement.querySelector('.seg'), 'view', v);
    document.getElementById('vsat-2d-wrap').classList.toggle('hidden', v !== '2d');
    document.getElementById('vsat-3d-wrap').classList.toggle('hidden', v !== '3d');
    calcVorSiting();
    if (v === '3d') buildVsat3D();
}
function setVsatExag(e) {
    vsatExag = e;
    document.querySelectorAll('#vsat-exag button').forEach(b => b.classList.toggle('active', b.textContent === '×' + e));
    buildVsat3D(true);
}

function buildVsat3D(refit) {
    const host = document.getElementById('vsat-3d');
    if (!vsatScene) {
        if (host.dataset.loading) return;
        host.dataset.loading = '1';
        host.innerHTML = '<div class="viz-empty"><div>Loading 3D…</div></div>';
        loadThree().then(() => {
            delete host.dataset.loading;
            vsatScene = new Scene3D(host);
            vsatScene.onTheme = () => buildVsat3D();
            buildVsat3D(true);
        }).catch(() => { delete host.dataset.loading; show3DError(host); });
        return;
    }
    const S = vsatScene, T = THREE;
    S.clear();
    const st = _vsatLast;
    const isLight = document.body.classList.contains('light-theme');
    if (!st) {
        S.add(M3.grid(20, 20, isLight ? '#9aa6b6' : '#2c3a4e', 0.4));
        S.label('Enter VOR & obstacle data', new T.Vector3(0, 1, 0), 'plain');
        S.setView({ az: 0.7, el: 0.5, dist: 30, target: new T.Vector3(0, 0, 0) });
        return;
    }
    const { hS, hO, dO, dA, hA_calc, curved, angleRad, id, obsRad } = st;
    const k = vsatExag / FT_PER_NM;              // ft → scene units (1 unit = 1 NM)
    const maxDist = (dA > dO) ? dA * 1.15 : dO * 3;
    const R = maxDist;
    const drop = d => curved ? (Math.pow(d * FT_PER_NM, 2) / (2 * EARTH_RADIUS_FT)) : 0;
    const brg = (parseFloat(obsRad) || 0) * Math.PI / 180;
    const dir = new T.Vector3(Math.sin(brg), 0, -Math.cos(brg));

    // curved ground disk
    const geo = new T.RingGeometry(0.0001, R, 96, 30);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        pos.setY(i, -drop(Math.hypot(x, z)) * k);
    }
    geo.computeVertexNormals();
    S.add(new T.Mesh(geo, M3.mat(isLight ? '#d6dccf' : '#162019', { roughness: 1, flatShading: true })));
    const wire = new T.Mesh(geo.clone(), new T.MeshBasicMaterial({ color: new T.Color(isLight ? '#9aa6b6' : '#2c3a4e'), wireframe: true, transparent: true, opacity: 0.18 }));
    S.add(wire);
    // range rings
    const ringStep = V.niceStep(R, 4);
    for (let d = ringStep; d <= R + 1e-9; d += ringStep) {
        const pts = [];
        for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; pts.push(new T.Vector3(Math.sin(a) * d, -drop(d) * k + 0.01, -Math.cos(a) * d)); }
        S.add(M3.line(pts, isLight ? '#64748b' : '#5b6b82', { opacity: 0.55 }));
        S.label(`${+d.toFixed(2)} NM`, new T.Vector3(Math.sin(brg + 0.5) * d, -drop(d) * k, -Math.cos(brg + 0.5) * d), 'plain');
    }
    // N marker
    S.add(M3.line([[0, 0.02, 0], [0, 0.02, -R]], '#8391a7', { opacity: 0.4 }));
    S.label('N', new T.Vector3(0, 0, -R * 1.04), 'plain');

    // screening cone
    const tanA = Math.tan(angleRad);
    const segR = 96, rings = 24;
    const cpos = [];
    const vtx = (rr, a) => [Math.sin(a) * rr, (hS + rr * FT_PER_NM * tanA) * k, -Math.cos(a) * rr];
    for (let j = 0; j < rings; j++) {
        const r0 = R * j / rings, r1 = R * (j + 1) / rings;
        for (let i = 0; i < segR; i++) {
            const a0 = i / segR * Math.PI * 2, a1 = (i + 1) / segR * Math.PI * 2;
            cpos.push(...vtx(r0, a0), ...vtx(r1, a0), ...vtx(r1, a1), ...vtx(r0, a0), ...vtx(r1, a1), ...vtx(r0, a1));
        }
    }
    const cg = new T.BufferGeometry(); cg.setAttribute('position', new T.Float32BufferAttribute(cpos, 3));
    S.add(new T.Mesh(cg, M3.basic('#ef4444', { transparent: true, opacity: 0.13, depthWrite: false })));
    const rimPts = [];
    for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2; rimPts.push(new T.Vector3(...vtx(R, a))); }
    S.add(M3.line(rimPts, '#f87171', { opacity: 0.6 }));
    // LOS along obstacle radial
    S.add(M3.tube(new T.Vector3(0, hS * k, 0), new T.Vector3(...vtx(R, brg)), R * 0.004, '#f87171'));

    // station
    const tw = M3.tower(Math.max(hS * k, R * 0.01), R * 0.012, '#22d3ee');
    S.add(tw);
    const cp = new T.Mesh(new T.CylinderGeometry(R * 0.035, R * 0.035, R * 0.002, 32), M3.mat('#9fb3c8'));
    cp.position.y = hS * k; S.add(cp);
    S.label(`${id} ${fmt(hS)} ft`, new T.Vector3(0, hS * k + R * 0.03, 0), 'cyan');

    // obstacle
    const oBase = -drop(dO) * k;
    const ob = M3.tower(Math.max(hO * k, R * 0.005), R * 0.016, '#f5b942', { sides: 4 });
    ob.position.copy(dir.clone().multiplyScalar(dO)); ob.position.y = oBase;
    S.add(ob);
    S.label(`OBST ${fmt(hO)} ft · R${obsRad || '000'}`, new T.Vector3(dir.x * dO, oBase + hO * k + R * 0.03, dir.z * dO), 'amber');

    // aircraft
    if (dA > 0 && hA_calc !== null) {
        const visualY = (hA_calc - drop(dA)) * k;
        const p = dir.clone().multiplyScalar(dA); p.y = visualY;
        const ac = M3.aircraft(isLight ? '#ffffff' : '#e8edf5', '#34d399', R * 0.07);
        ac.position.copy(p);
        ac.rotation.y = -brg + Math.PI; // nose toward station
        S.add(ac);
        S.add(M3.line([p.toArray(), [p.x, -drop(dA) * k, p.z]], '#34d399', { dash: R * 0.01, gap: R * 0.008 }));
        S.label(`${fmt(Math.ceil(hA_calc))} ft`, new T.Vector3(p.x, p.y + R * 0.04, p.z), 'green');
    }
    if (refit || !S._fitted) {
        S._fitted = true;
        S.setView({ az: brg + Math.PI / 2 + 0.35, el: 0.33, dist: R * 2.1, target: new T.Vector3(dir.x * R * 0.4, Math.max(hS, hO) * k * 0.5, dir.z * R * 0.4), minDist: R * 0.05, maxDist: R * 10 });
    }
    S.requestRender();
}

// --- FSPL / SIGNAL ANALYSIS MODULE ---
const NM_TO_KM = 1.852;
const FSPL_SYS_LOSS = 3;       // dB (cables, connectors, atmospheric)
const FSPL_ANT_GAIN = 0;       // dBi, isotropic assumed
const VOR_RX_SENS = -93;       // dBm, per RTCA DO-196
const DME_RX_SENS = -93;       // dBm, per RTCA DO-189/TSO-C66
const DME_XPDR_SENS = -86;     // dBm, ground transponder per ICAO Annex 10
const DME_INTERR_POWER = 1000; // W, standard airborne interrogator

let fsplMode = 'vor';

function setFsplMode(mode) {
    fsplMode = mode;
    document.getElementById('btn-fspl-vor').classList.toggle('active', mode === 'vor');
    document.getElementById('btn-fspl-dme').classList.toggle('active', mode === 'dme');
    const dmeSection = document.getElementById('fspl-dme-twoway');
    if (dmeSection) dmeSection.style.display = (mode === 'dme') ? 'block' : 'none';
    calcSignalAnalysis();
}

function getDmeFreqFromVor(vorMhz) {
    // Simplified ICAO Annex 10 DME reply frequency pairing (X channels)
    if (vorMhz < 108.0 || vorMhz > 117.95) return 0;
    if (vorMhz < 112.0) {
        return Math.round(978 + (vorMhz - 108.0) * 10);
    } else {
        return Math.round(1157 + (vorMhz - 112.0) * 10);
    }
}

function calcFSPL(distKm, freqMhz) {
    if (distKm <= 0 || freqMhz <= 0) return 0;
    return 20 * Math.log10(distKm) + 20 * Math.log10(freqMhz) + 32.45;
}

function wattsTodBm(watts) {
    if (watts <= 0) return -Infinity;
    return 10 * Math.log10(watts * 1000);
}

function calcLinkBudget(txPowerW, freqMhz, distNm) {
    const distKm = distNm * NM_TO_KM;
    const fspl = calcFSPL(distKm, freqMhz);
    const txDbm = wattsTodBm(txPowerW);
    const rxPower = txDbm + FSPL_ANT_GAIN - fspl - FSPL_SYS_LOSS;
    return { fspl, txDbm, rxPower };
}

function calcMaxRangeNm(txPowerW, freqMhz, rxSensDbm) {
    const txDbm = wattsTodBm(txPowerW);
    const availLoss = txDbm + FSPL_ANT_GAIN - rxSensDbm - FSPL_SYS_LOSS;
    const logD = (availLoss - 20 * Math.log10(freqMhz) - 32.45) / 20;
    const distKm = Math.pow(10, logD);
    return distKm / NM_TO_KM;
}

function getMarginClass(margin) {
    if (margin >= 20) return { cls: 'res-success', label: 'STRONG', emoji: '🟢' };
    if (margin >= 6) return { cls: 'res-warning', label: 'MARGINAL', emoji: '🟡' };
    if (margin >= 0) return { cls: 'res-danger', label: 'WEAK', emoji: '🔴' };
    return { cls: 'res-danger', label: 'NO SIGNAL', emoji: '⛔' };
}

function syncFsplDist() {
    const vsatDist = document.getElementById('vsat-dAcft').value;
    if (vsatDist) {
        document.getElementById('fspl-dist').value = vsatDist;
        calcSignalAnalysis();
    } else notify('No aircraft distance in VOR Siting yet', false);
}

function clearSignalAnalysis() {
    clearIds('fspl-freq', 'fspl-vor-txPower', 'fspl-dme-txPower', 'fspl-dist');
    calcSignalAnalysis();
}

function calcSignalAnalysis() {
    const freqEl = document.getElementById('fspl-freq');
    const vorTxEl = document.getElementById('fspl-vor-txPower');
    const dmeTxEl = document.getElementById('fspl-dme-txPower');
    const distEl = document.getElementById('fspl-dist');
    if (!freqEl || !vorTxEl || !dmeTxEl || !distEl) return;

    const vorFreq = parseFloat(freqEl.value);
    const vorTxPower = parseFloat(vorTxEl.value);
    const dmeTxPower = parseFloat(dmeTxEl.value);
    const dist = parseFloat(distEl.value);

    const dmeFreqEl = document.getElementById('fspl-dmeFreq');
    if (dmeFreqEl) {
        if (!isNaN(vorFreq) && vorFreq >= 108.0 && vorFreq <= 117.95) {
            dmeFreqEl.textContent = getDmeFreqFromVor(vorFreq) + ' MHz';
        } else {
            dmeFreqEl.textContent = '--';
        }
    }

    const needBase = !isNaN(vorFreq) && !isNaN(dist) && vorFreq > 0 && dist > 0;
    const needVorCalc = needBase && !isNaN(vorTxPower) && vorTxPower > 0;
    const needDmeCalc = needBase && !isNaN(dmeTxPower) && dmeTxPower > 0;

    // --- VOR one-way ---
    const vorResult = needVorCalc ? calcLinkBudget(vorTxPower, vorFreq, dist) : null;
    const vorMargin = vorResult ? (vorResult.rxPower - VOR_RX_SENS) : null;
    const vorMaxRange = needVorCalc ? calcMaxRangeNm(vorTxPower, vorFreq, VOR_RX_SENS) : null;

    // --- DME two-way ---
    const dmeFreq = !isNaN(vorFreq) ? getDmeFreqFromVor(vorFreq) : 0;
    const dmeDown = (needDmeCalc && dmeFreq > 0) ? calcLinkBudget(dmeTxPower, dmeFreq, dist) : null;
    const dmeDownMargin = dmeDown ? (dmeDown.rxPower - DME_RX_SENS) : null;
    const dmeUp = (needDmeCalc && dmeFreq > 0) ? calcLinkBudget(DME_INTERR_POWER, dmeFreq, dist) : null;
    const dmeUpMargin = dmeUp ? (dmeUp.rxPower - DME_XPDR_SENS) : null;
    const dmeWeakMargin = (dmeDownMargin !== null && dmeUpMargin !== null) ? Math.min(dmeDownMargin, dmeUpMargin) : null;
    const dmeMaxDown = (needDmeCalc && dmeFreq > 0) ? calcMaxRangeNm(dmeTxPower, dmeFreq, DME_RX_SENS) : null;
    const dmeMaxUp = (needDmeCalc && dmeFreq > 0) ? calcMaxRangeNm(DME_INTERR_POWER, dmeFreq, DME_XPDR_SENS) : null;
    const dmeMaxRange = (dmeMaxDown !== null && dmeMaxUp !== null) ? Math.min(dmeMaxDown, dmeMaxUp) : null;

    if (fsplMode === 'vor') {
        document.getElementById('fspl-fsplVal').textContent = vorResult ? vorResult.fspl.toFixed(1) + ' dB' : '--';
        document.getElementById('fspl-rxPower').textContent = vorResult ? vorResult.rxPower.toFixed(1) + ' dBm' : '--';
        const mInfo = vorMargin !== null ? getMarginClass(vorMargin) : { cls: '', label: '--', emoji: '' };
        const marginEl = document.getElementById('fspl-margin');
        marginEl.textContent = vorMargin !== null ? vorMargin.toFixed(1) + ' dB' : '--';
        marginEl.className = 'result-value ' + mInfo.cls;
        document.getElementById('fspl-status').textContent = mInfo.emoji + ' ' + mInfo.label;
        document.getElementById('fspl-status').className = 'result-value ' + mInfo.cls;
        document.getElementById('fspl-maxRange').textContent = vorMaxRange !== null ? vorMaxRange.toFixed(1) + ' NM' : '--';
    } else {
        const fsplVal = dmeDown ? dmeDown.fspl : null;
        document.getElementById('fspl-fsplVal').textContent = fsplVal ? fsplVal.toFixed(1) + ' dB' : '--';
        document.getElementById('fspl-rxPower').textContent = dmeDown ? dmeDown.rxPower.toFixed(1) + ' dBm (↓)' : '--';
        const mInfo = dmeWeakMargin !== null ? getMarginClass(dmeWeakMargin) : { cls: '', label: '--', emoji: '' };
        const marginEl = document.getElementById('fspl-margin');
        marginEl.textContent = dmeWeakMargin !== null ? dmeWeakMargin.toFixed(1) + ' dB' : '--';
        marginEl.className = 'result-value ' + mInfo.cls;
        document.getElementById('fspl-status').textContent = mInfo.emoji + ' ' + mInfo.label;
        document.getElementById('fspl-status').className = 'result-value ' + mInfo.cls;
        document.getElementById('fspl-maxRange').textContent = dmeMaxRange !== null ? dmeMaxRange.toFixed(1) + ' NM' : '--';

        const upEl = document.getElementById('fspl-dme-upMargin');
        const downEl = document.getElementById('fspl-dme-downMargin');
        const weakEl = document.getElementById('fspl-dme-weakLink');
        if (upEl) {
            upEl.textContent = dmeUpMargin !== null ? dmeUpMargin.toFixed(1) + ' dB' : '--';
            upEl.className = 'v result-value ' + (dmeUpMargin !== null ? getMarginClass(dmeUpMargin).cls : '');
        }
        if (downEl) {
            downEl.textContent = dmeDownMargin !== null ? dmeDownMargin.toFixed(1) + ' dB' : '--';
            downEl.className = 'v result-value ' + (dmeDownMargin !== null ? getMarginClass(dmeDownMargin).cls : '');
        }
        if (weakEl) {
            if (dmeUpMargin !== null && dmeDownMargin !== null) {
                weakEl.textContent = (dmeUpMargin < dmeDownMargin) ? '⚠️ UPLINK (Aircraft → Ground)' : '⚠️ DOWNLINK (Ground → Aircraft)';
                weakEl.style.color = 'var(--accent-warning)';
            } else {
                weakEl.textContent = '--';
            }
        }
    }

    // --- Comparison panel ---
    const cmpVorMargin = document.getElementById('fspl-cmp-vorMargin');
    const cmpDmeMargin = document.getElementById('fspl-cmp-dmeMargin');
    const cmpDelta = document.getElementById('fspl-cmp-delta');
    if (cmpVorMargin) {
        if (vorMargin !== null) {
            const vi = getMarginClass(vorMargin);
            cmpVorMargin.textContent = vorMargin.toFixed(1) + ' dB — ' + vi.emoji + ' ' + vi.label;
            cmpVorMargin.className = 'result-value ' + vi.cls;
        } else { cmpVorMargin.textContent = '--'; cmpVorMargin.className = 'result-value'; }
    }
    if (cmpDmeMargin) {
        if (dmeWeakMargin !== null) {
            const di = getMarginClass(dmeWeakMargin);
            cmpDmeMargin.textContent = dmeWeakMargin.toFixed(1) + ' dB — ' + di.emoji + ' ' + di.label;
            cmpDmeMargin.className = 'result-value ' + di.cls;
        } else { cmpDmeMargin.textContent = '--'; cmpDmeMargin.className = 'result-value'; }
    }
    if (cmpDelta) {
        if (vorMargin !== null && dmeWeakMargin !== null) {
            const d = vorMargin - dmeWeakMargin;
            cmpDelta.textContent = d.toFixed(1) + ' dB worse';
            cmpDelta.style.color = (d > 10) ? 'var(--accent-danger)' : 'var(--accent-warning)';
        } else { cmpDelta.textContent = '--'; cmpDelta.style.color = 'var(--text-muted)'; }
    }

    drawSignalCurve(vorFreq, dmeFreq, vorTxPower, dmeTxPower, vorMaxRange, dmeMaxRange);
}

let _fsplState = null, _fsplHoverX = null;

function drawSignalCurve(vorFreq, dmeFreq, vorTxPower, dmeTxPower, vorMaxNm, dmeMaxNm) {
    _fsplState = { vorFreq, dmeFreq, vorTxPower, dmeTxPower, vorMaxNm, dmeMaxNm };
    const c = document.getElementById('fsplCanvas');
    const S = V.canvas(c);
    if (!S) return;
    const { ctx, w, h } = S;
    const empty = document.getElementById('fspl-empty');
    const ok = vorFreq && vorFreq > 0 && (vorTxPower > 0 || dmeTxPower > 0);
    if (empty) empty.style.display = ok ? 'none' : '';
    if (!ok) return;

    const padL = 56, padR = 18, padT = 16, padB = 36;
    const dw = w - padL - padR, dh = h - padT - padB;

    const maxDist = Math.max(vorMaxNm || 200, dmeMaxNm || 50, 50) * 1.3;
    const txDbm = wattsTodBm(Math.max(vorTxPower || 1, dmeTxPower || 1));
    const minDbm = Math.min(VOR_RX_SENS, DME_RX_SENS, DME_XPDR_SENS) - 15;
    const maxDbm = txDbm - 20;

    const toX = d => padL + (d / maxDist) * dw;
    const toY = dbm => padT + ((maxDbm - dbm) / (maxDbm - minDbm)) * dh;

    // below-sensitivity zone
    ctx.fillStyle = 'rgba(239, 68, 68, 0.07)';
    ctx.fillRect(padL, toY(VOR_RX_SENS), dw, h - padB - toY(VOR_RX_SENS));

    // grid
    V.font(ctx, 10, 500, true);
    ctx.strokeStyle = V.c('--viz-grid'); ctx.lineWidth = 1; ctx.fillStyle = V.c('--muted');
    const stepX = V.niceStep(maxDist, 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let d = 0; d <= maxDist; d += stepX) {
        ctx.beginPath(); ctx.moveTo(toX(d), padT); ctx.lineTo(toX(d), h - padB); ctx.stroke();
        ctx.fillText(Math.round(d) + '', toX(d), h - padB + 6);
    }
    const dbmStep = V.niceStep(maxDbm - minDbm, 5);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let dbm = Math.ceil(minDbm / dbmStep) * dbmStep; dbm <= maxDbm; dbm += dbmStep) {
        ctx.beginPath(); ctx.moveTo(padL, toY(dbm)); ctx.lineTo(w - padR, toY(dbm)); ctx.stroke();
        ctx.fillText(dbm + '', padL - 6, toY(dbm));
    }
    V.font(ctx, 10.5, 500);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Distance (NM)', padL + dw / 2, h - 4);
    ctx.save(); ctx.translate(13, padT + dh / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Signal (dBm)', 0, 0); ctx.restore();

    // RX sensitivity threshold
    ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2; ctx.strokeStyle = V.c('--red');
    ctx.beginPath(); ctx.moveTo(padL, toY(VOR_RX_SENS)); ctx.lineTo(w - padR, toY(VOR_RX_SENS)); ctx.stroke();
    ctx.setLineDash([]);
    V.font(ctx, 10, 700, true); ctx.fillStyle = V.c('--red'); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText('RX sens ' + VOR_RX_SENS + ' dBm', w - padR - 4, toY(VOR_RX_SENS) - 3);

    const steps = 120;
    const curve = (tx, f, col) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        ctx.shadowColor = col; ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let i = 1; i <= steps; i++) {
            const d = (i / steps) * maxDist;
            const y = toY(calcLinkBudget(tx, f, d).rxPower);
            if (i === 1) ctx.moveTo(toX(d), y); else ctx.lineTo(toX(d), y);
        }
        ctx.stroke(); ctx.shadowBlur = 0;
    };
    const maxMark = (nm, col, label) => {
        if (!nm || nm > maxDist) return;
        ctx.setLineDash([2, 4]); ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(toX(nm), padT); ctx.lineTo(toX(nm), h - padB); ctx.stroke(); ctx.setLineDash([]);
        V.pill(ctx, `${label} max ${nm.toFixed(0)} NM`, toX(nm), padT + 10, { align: 'center', color: col, size: 9.5 });
    };
    if (vorTxPower > 0) { curve(vorTxPower, vorFreq, V.c('--cyan')); maxMark(vorMaxNm, V.c('--cyan'), 'VOR'); }
    if (dmeFreq > 0 && dmeTxPower > 0) { curve(dmeTxPower, dmeFreq, V.c('--amber')); maxMark(dmeMaxNm, V.c('--amber'), 'DME'); }

    // entered distance marker + gap
    const distVal = parseFloat(document.getElementById('fspl-dist').value);
    const markAt = (dv, solid) => {
        if (isNaN(dv) || dv <= 0 || dv > maxDist) return;
        const xLine = toX(dv);
        ctx.strokeStyle = V.c('--text-2'); ctx.globalAlpha = solid ? 0.6 : 0.35; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(xLine, padT); ctx.lineTo(xLine, h - padB); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        const vorPt = vorTxPower > 0 ? calcLinkBudget(vorTxPower, vorFreq, dv) : null;
        const dmePt = (dmeFreq > 0 && dmeTxPower > 0) ? calcLinkBudget(dmeTxPower, dmeFreq, dv) : null;
        if (vorPt && dmePt && solid) {
            const gap = vorPt.rxPower - dmePt.rxPower;
            if (gap > 2) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
                ctx.fillRect(xLine - 10, toY(vorPt.rxPower), 20, toY(dmePt.rxPower) - toY(vorPt.rxPower));
            }
        }
        const right = xLine > w - 150;
        [[vorPt, V.c('--cyan'), 'VOR'], [dmePt, V.c('--amber'), 'DME']].forEach(([pt, col, nm], i) => {
            if (!pt) return;
            const y = toY(pt.rxPower);
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(xLine, y, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = V.c('--surface'); ctx.lineWidth = 2; ctx.stroke();
            V.pill(ctx, `${nm} ${pt.rxPower.toFixed(1)} dBm`, xLine + (right ? -10 : 10), y + (i ? 12 : -12), { align: right ? 'right' : 'left', color: col, size: 10 });
        });
        if (!solid) V.pill(ctx, `${dv.toFixed(1)} NM`, xLine, h - padB - 12, { align: 'center', size: 10 });
    };
    if (_fsplHoverX !== null) {
        const dv = (_fsplHoverX - padL) / dw * maxDist;
        markAt(dv, false);
    } else markAt(distVal, true);
}

function bindFsplHover() {
    const c = document.getElementById('fsplCanvas');
    if (!c || c._bound) return;
    c._bound = true;
    const redraw = () => { if (_fsplState) { const s = _fsplState; drawSignalCurve(s.vorFreq, s.dmeFreq, s.vorTxPower, s.dmeTxPower, s.vorMaxNm, s.dmeMaxNm); } };
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); _fsplHoverX = e.clientX - r.left; redraw(); });
    c.addEventListener('pointerleave', () => { _fsplHoverX = null; redraw(); });
}

App.register('vor', {
    onShow(pane) {
        if (pane === 'orbit' || !pane) { calculateVOR(); calcVorTime(); drawVorCompass(); }
        if (pane === 'pred') drawPredCompass();
        if (pane === 'siting') { calcVorSiting(); if (vsatScene) vsatScene.resize(); }
        if (pane === 'signal') { bindFsplHover(); calcSignalAnalysis(); }
    }
});
