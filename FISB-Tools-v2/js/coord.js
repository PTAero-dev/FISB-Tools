// =========================================================
// COORDINATE CONVERTER — logic from v1.1; new card layout + live plot
// =========================================================
const COORD_ROW_COUNT = 24; // 12 waypoints × (lat, lon)

function sanitizeCoordInput(input, allowDecimal) {
    if (!input) return;
    let v = input.value;
    if (allowDecimal) {
        v = v.replace(/[^0-9.]/g, '');
        const parts = v.split('.');
        if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    } else {
        v = v.replace(/[^0-9]/g, '');
    }
    if (input.value !== v) input.value = v;
}

function setFieldInvalid(el, isInvalid) {
    if (!el) return;
    el.classList.toggle('input-invalid', !!isInvalid);
    el.style.borderColor = isInvalid ? 'var(--red)' : '';
    el.style.color = isInvalid ? 'var(--red)' : '';
}

// Validate a single coordinate axis (idx: odd = LAT, even = LONG)
// mode: 'dms' or 'dmm'
function validateCoordAxis(idx, mode) {
    const isLat = (idx % 2 !== 0);
    const axisName = isLat ? 'LAT' : 'LONG';
    const maxDeg = isLat ? 90 : 180;
    const errors = [];

    const elD = document.getElementById(`c-d-${idx}`);
    const elM = document.getElementById(`c-m-${idx}`);
    const elS = document.getElementById(`c-s-${idx}`);
    const elDD = document.getElementById(`c-dd-${idx}`);
    const elDM = document.getElementById(`c-dm-${idx}`);

    if (mode === 'dms') {
        const dStr = elD ? elD.value.trim() : '';
        const mStr = elM ? elM.value.trim() : '';
        const sStr = elS ? elS.value.trim() : '';
        const d = dStr === '' ? NaN : parseFloat(dStr);
        const m = mStr === '' ? NaN : parseFloat(mStr);
        const s = sStr === '' ? NaN : parseFloat(sStr);

        let dBad = !isNaN(d) && (d < 0 || d > maxDeg);
        let mBad = !isNaN(m) && (m < 0 || m >= 60);
        let sBad = !isNaN(s) && (s < 0 || s >= 60);

        if (dBad) errors.push(`${axisName} Deg must be 0–${maxDeg}°`);
        if (mBad) errors.push(`${axisName} Min must be 0–59' (< 60)`);
        if (sBad) errors.push(`${axisName} Sec must be < 60"`);

        if (!dBad && d === maxDeg) {
            if (!isNaN(m) && m > 0) { mBad = true; dBad = true; }
            if (!isNaN(s) && s > 0) { sBad = true; dBad = true; }
            if (mBad || sBad) errors.push(`${axisName} cannot exceed ${maxDeg}° 00' 00"`);
        }

        setFieldInvalid(elD, dBad);
        setFieldInvalid(elM, mBad);
        setFieldInvalid(elS, sBad);
        if (errors.length === 0) {
            setFieldInvalid(elDD, false);
            setFieldInvalid(elDM, false);
        }
    } else {
        const ddStr = elDD ? elDD.value.trim() : '';
        const dmStr = elDM ? elDM.value.trim() : '';
        const dd = ddStr === '' ? NaN : parseFloat(ddStr);
        const dm = dmStr === '' ? NaN : parseFloat(dmStr);

        let ddBad = !isNaN(dd) && (dd < 0 || dd > maxDeg);
        let dmBad = !isNaN(dm) && (dm < 0 || dm >= 60);

        if (ddBad) errors.push(`${axisName} Deg must be 0–${maxDeg}°`);
        if (dmBad) errors.push(`${axisName} Min.mm must be < 60.00'`);

        if (!ddBad && dd === maxDeg && !isNaN(dm) && dm > 0) {
            ddBad = true;
            dmBad = true;
            errors.push(`${axisName} cannot exceed ${maxDeg}° 00.00'`);
        }

        setFieldInvalid(elDD, ddBad);
        setFieldInvalid(elDM, dmBad);
        if (errors.length === 0) {
            setFieldInvalid(elD, false);
            setFieldInvalid(elM, false);
            setFieldInvalid(elS, false);
        }
    }

    updateWaypointErrorState(Math.ceil(idx / 2));
    return errors.length === 0;
}

function updateWaypointErrorState(wptNum) {
    const latIdx = 2 * wptNum - 1;
    const lonIdx = 2 * wptNum;
    const card = document.getElementById(`wpt-${wptNum}`);
    const errEl = document.getElementById(`wpt-err-${wptNum}`);
    if (!card || !errEl) return;

    const msgs = [];
    const checkPair = (idx, axisName, maxDeg) => {
        const elD = document.getElementById(`c-d-${idx}`);
        const elM = document.getElementById(`c-m-${idx}`);
        const elS = document.getElementById(`c-s-${idx}`);
        const elDD = document.getElementById(`c-dd-${idx}`);
        const elDM = document.getElementById(`c-dm-${idx}`);

        const d = elD && elD.value !== '' ? parseFloat(elD.value) : NaN;
        const m = elM && elM.value !== '' ? parseFloat(elM.value) : NaN;
        const s = elS && elS.value !== '' ? parseFloat(elS.value) : NaN;
        const dd = elDD && elDD.value !== '' ? parseFloat(elDD.value) : NaN;
        const dm = elDM && elDM.value !== '' ? parseFloat(elDM.value) : NaN;

        if ((!isNaN(d) && d > maxDeg) || (!isNaN(dd) && dd > maxDeg)) {
            msgs.push(`${axisName} Degree exceeds ${maxDeg}° limit (0–${maxDeg}°)`);
        }
        if (!isNaN(m) && m >= 60) {
            msgs.push(`${axisName} Minutes must be 0–59' (< 60)`);
        }
        if (!isNaN(s) && s >= 60) {
            msgs.push(`${axisName} Seconds must be < 60.00"`);
        }
        if (!isNaN(dm) && dm >= 60) {
            msgs.push(`${axisName} Decimal Minutes must be < 60.00'`);
        }
        if ((d === maxDeg && ((m || 0) > 0 || (s || 0) > 0)) || (dd === maxDeg && (dm || 0) > 0)) {
            msgs.push(`${axisName} total cannot exceed ${maxDeg}° 00' 00"`);
        }
    };

    checkPair(latIdx, 'LAT', 90);
    checkPair(lonIdx, 'LONG', 180);

    const hasErr = msgs.length > 0;
    card.classList.toggle('has-err', hasErr);
    if (hasErr) {
        errEl.textContent = '⚠ ' + msgs.join(' · ');
        errEl.classList.add('show');
    } else {
        errEl.textContent = '';
        errEl.classList.remove('show');
    }
}

function checkCoordLimit(input, max, isDegree) {
    sanitizeCoordInput(input, !isDegree && input.placeholder && input.placeholder.includes('.'));
    const val = parseFloat(input.value);
    if (isNaN(val)) {
        setFieldInvalid(input, false);
        return true;
    }
    const invalid = isDegree ? (val < 0 || val > max) : (val < 0 || val >= max);
    setFieldInvalid(input, invalid);
    return !invalid;
}

function initCoordRows() {
    const container = document.getElementById("coord-rows-container");
    if (!container) return;
    container.innerHTML = "";

    for (let i = 1; i <= 12; i++) {
        const latId = 2 * i - 1;
        const longId = 2 * i;
        const card = document.createElement("div");
        card.className = "wpt";
        card.id = `wpt-${i}`;
        card.innerHTML = `
            <div class="wpt-head">
                <b>WAYPOINT ${i}</b><span class="spacer"></span>
                <span class="head-info mono" id="wpt-sum-${i}"></span>
                <button class="btn icon sm danger-ghost" onclick="clearCoordRow(${latId}); clearCoordRow(${longId});" title="Clear waypoint"><svg class="i sm"><use href="#ic-x"/></svg></button>
            </div>
            <div class="wpt-grid">
                <div></div><div class="colh">Lat <span style="opacity:.65;font-weight:500;">(≤90°)</span></div><div class="colh">Long <span style="opacity:.65;font-weight:500;">(≤180°)</span></div>
                <div class="rl">DMS</div>
                <div class="trip">
                    <input type="text" inputmode="numeric" id="c-d-${latId}" placeholder="0-90" maxlength="2" oninput="sanitizeCoordInput(this,false); if(checkCoordLimit(this, 90, true)) autoTab(this, 2, 'c-m-${latId}'); calcCoordDMS(${latId})">
                    <input type="text" inputmode="numeric" id="c-m-${latId}" placeholder="0-59" maxlength="2" oninput="sanitizeCoordInput(this,false); if(checkCoordLimit(this, 60, false)) autoTab(this, 2, 'c-s-${latId}'); calcCoordDMS(${latId})">
                    <input type="text" inputmode="decimal" id="c-s-${latId}" placeholder="<60.0" maxlength="5" oninput="sanitizeCoordInput(this,true); if(checkCoordLimit(this, 60, false)) autoTab(this, 5, 'c-d-${longId}'); calcCoordDMS(${latId})">
                </div>
                <div class="trip">
                    <input type="text" inputmode="numeric" id="c-d-${longId}" placeholder="0-180" maxlength="3" oninput="sanitizeCoordInput(this,false); if(checkCoordLimit(this, 180, true)) autoTab(this, 3, 'c-m-${longId}'); calcCoordDMS(${longId})">
                    <input type="text" inputmode="numeric" id="c-m-${longId}" placeholder="0-59" maxlength="2" oninput="sanitizeCoordInput(this,false); if(checkCoordLimit(this, 60, false)) autoTab(this, 2, 'c-s-${longId}'); calcCoordDMS(${longId})">
                    <input type="text" inputmode="decimal" id="c-s-${longId}" placeholder="<60.0" maxlength="5" oninput="sanitizeCoordInput(this,true); checkCoordLimit(this, 60, false); calcCoordDMS(${longId})">
                </div>
                <div class="rl">DMM</div>
                <div class="pair dmm-row">
                    <input type="text" inputmode="numeric" id="c-dd-${latId}" placeholder="0-90" maxlength="2" oninput="sanitizeCoordInput(this,false); if(checkCoordLimit(this, 90, true)) autoTab(this, 2, 'c-dm-${latId}'); calcCoordDMM(${latId})">
                    <input type="text" inputmode="decimal" id="c-dm-${latId}" placeholder="<60.00" maxlength="5" oninput="sanitizeCoordInput(this,true); if(checkCoordLimit(this, 60, false)) autoTab(this, 5, 'c-dd-${longId}'); calcCoordDMM(${latId})">
                </div>
                <div class="pair dmm-row">
                    <input type="text" inputmode="numeric" id="c-dd-${longId}" placeholder="0-180" maxlength="3" oninput="sanitizeCoordInput(this,false); if(checkCoordLimit(this, 180, true)) autoTab(this, 3, 'c-dm-${longId}'); calcCoordDMM(${longId})">
                    <input type="text" inputmode="decimal" id="c-dm-${longId}" placeholder="<60.00" maxlength="5" oninput="sanitizeCoordInput(this,true); checkCoordLimit(this, 60, false); calcCoordDMM(${longId})">
                </div>
            </div>
            <div class="coord-err" id="wpt-err-${i}"></div>`;
        container.appendChild(card);
    }
    container.addEventListener('input', scheduleCoordPlot);
}

function calcCoordDMS(idx) {
    // Validate DMS inputs first; do not overwrite DMM if DMS is out of bounds
    if (!validateCoordAxis(idx, 'dms')) return;

    let d = parseFloat(document.getElementById(`c-d-${idx}`).value);
    let m = parseFloat(document.getElementById(`c-m-${idx}`).value);
    let s = parseFloat(document.getElementById(`c-s-${idx}`).value);

    if (isNaN(d)) d = 0; // Allow 0 deg
    if (isNaN(m) && isNaN(s)) return; // Don't update if only Deg entered

    let mm = (m || 0) + ((s || 0) / 60);
    const isLat = (idx % 2 !== 0);
    const degPad = isLat ? 2 : 3;
    document.getElementById(`c-dd-${idx}`).value = String(d).padStart(degPad, "0");
    let mmFixed = mm.toFixed(2);
    let [mmInt, mmDec] = mmFixed.split(".");
    document.getElementById(`c-dm-${idx}`).value = mmInt.padStart(2, "0") + "." + mmDec;
    updateWaypointErrorState(Math.ceil(idx / 2));
}

function calcCoordDMM(idx) {
    // Validate DMM inputs first; do not overwrite DMS if DMM is out of bounds
    if (!validateCoordAxis(idx, 'dmm')) return;

    let d = parseFloat(document.getElementById(`c-dd-${idx}`).value);
    let mm = parseFloat(document.getElementById(`c-dm-${idx}`).value);
    if (isNaN(d)) d = 0;
    if (isNaN(mm)) return;

    let m = Math.floor(mm);
    let s = (mm - m) * 60;
    const isLat = (idx % 2 !== 0);
    const degPad = isLat ? 2 : 3;
    document.getElementById(`c-d-${idx}`).value = String(d).padStart(degPad, "0");
    document.getElementById(`c-m-${idx}`).value = String(m).padStart(2, "0");
    let sFixed = s.toFixed(2);
    let [sInt, sDec] = sFixed.split(".");
    document.getElementById(`c-s-${idx}`).value = sInt.padStart(2, "0") + "." + sDec;
    updateWaypointErrorState(Math.ceil(idx / 2));
}

function clearCoordRow(idx) {
    clearIds(`c-d-${idx}`, `c-m-${idx}`, `c-s-${idx}`, `c-dd-${idx}`, `c-dm-${idx}`);
    [`c-d-${idx}`, `c-m-${idx}`, `c-s-${idx}`, `c-dd-${idx}`, `c-dm-${idx}`].forEach(id => {
        const el = document.getElementById(id);
        setFieldInvalid(el, false);
    });
    updateWaypointErrorState(Math.ceil(idx / 2));
    scheduleCoordPlot();
}

function clearAllCoords() {
    for (let i = 1; i <= COORD_ROW_COUNT; i++) clearCoordRow(i);
}

// --- CSV EXPORT/IMPORT (ForeFlight Format) ---
function exportCoordsCSV() {
    let prefix = (document.getElementById('coord-ff-prefix').value || 'WPT').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (prefix.length < 1) prefix = 'WPT';

    let csv = 'WAYPOINT_NAME,Waypoint description,Latitude,Longitude,Elevation\n';
    let wptCount = 0;

    for (let i = 1; i <= COORD_ROW_COUNT; i += 2) {
        let latD = parseFloat(document.getElementById(`c-d-${i}`).value);
        let latM = parseFloat(document.getElementById(`c-m-${i}`).value);
        let latS = parseFloat(document.getElementById(`c-s-${i}`).value);
        let lonD = parseFloat(document.getElementById(`c-d-${i + 1}`).value);
        let lonM = parseFloat(document.getElementById(`c-m-${i + 1}`).value);
        let lonS = parseFloat(document.getElementById(`c-s-${i + 1}`).value);

        if (isNaN(latD) && isNaN(latM) && isNaN(latS) && isNaN(lonD) && isNaN(lonM) && isNaN(lonS)) continue;

        let latDec = (latD || 0) + ((latM || 0) / 60) + ((latS || 0) / 3600);
        let lonDec = (lonD || 0) + ((lonM || 0) / 60) + ((lonS || 0) / 3600);

        wptCount++;
        let name = `${prefix}_${String(wptCount).padStart(3, '0')}`;
        csv += `${name},"",${latDec.toFixed(6)},${lonDec.toFixed(6)},\n`;
    }

    if (wptCount === 0) { notify('No coordinates to export. Enter some data first.'); return; }
    downloadText(csv, 'user_waypoints.csv');
}

function exportCoordsDMSDMM() {
    let csv = '#,Lat (DMS),Lon (DMS),Lat (DMM),Lon (DMM)\n';
    let wptCount = 0;

    for (let i = 1; i <= COORD_ROW_COUNT; i += 2) {
        let latD = document.getElementById(`c-d-${i}`).value;
        let latM = document.getElementById(`c-m-${i}`).value;
        let latS = document.getElementById(`c-s-${i}`).value;
        let lonD = document.getElementById(`c-d-${i + 1}`).value;
        let lonM = document.getElementById(`c-m-${i + 1}`).value;
        let lonS = document.getElementById(`c-s-${i + 1}`).value;
        let latDD = document.getElementById(`c-dd-${i}`).value;
        let latDM = document.getElementById(`c-dm-${i}`).value;
        let lonDD = document.getElementById(`c-dd-${i + 1}`).value;
        let lonDM = document.getElementById(`c-dm-${i + 1}`).value;

        if (!latD && !latM && !latS && !lonD && !lonM && !lonS) continue;

        wptCount++;
        let latDmsStr = `N ${(latD || '00').toString().padStart(2, '0')}° ${(latM || '00').toString().padStart(2, '0')}' ${(latS || '00.00')}\"`;
        let lonDmsStr = `E ${(lonD || '000').toString().padStart(3, '0')}° ${(lonM || '00').toString().padStart(2, '0')}' ${(lonS || '00.00')}\"`;
        let latDmmStr = `N ${(latDD || '00').toString().padStart(2, '0')}° ${(latDM || '00.00')}'`;
        let lonDmmStr = `E ${(lonDD || '000').toString().padStart(3, '0')}° ${(lonDM || '00.00')}'`;
        csv += `${wptCount},"${latDmsStr}","${lonDmsStr}","${latDmmStr}","${lonDmmStr}"\n`;
    }

    if (wptCount === 0) { notify('No coordinates to export.'); return; }
    downloadText(csv, 'coordinates_DMS_DMM.csv');
}

function importCoordsCSV(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const text = e.target.result;
        const lines = text.replace(/﻿/, '').split('\n');
        clearAllCoords();

        let header = lines[0].trim().toLowerCase();
        let isForeFlight = header.includes('waypoint_name');

        if (isForeFlight) {
            // ForeFlight format: WAYPOINT_NAME,desc,Lat,Lon,Elev
            let pairIdx = 0;
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                let cols = lines[i].split(',');
                let latDec = parseFloat(cols[2]);
                let lonDec = parseFloat(cols[3]);
                if (isNaN(latDec) || isNaN(lonDec)) continue;

                pairIdx++;
                let latRow = (pairIdx * 2) - 1;
                let lonRow = pairIdx * 2;
                if (latRow > COORD_ROW_COUNT) break;

                let latAbs = Math.abs(latDec);
                let latDeg = Math.floor(latAbs);
                let latRem = (latAbs - latDeg) * 60;
                let latMin = Math.floor(latRem);
                let latSec = (latRem - latMin) * 60;
                document.getElementById(`c-d-${latRow}`).value = String(latDeg).padStart(2, '0');
                document.getElementById(`c-m-${latRow}`).value = String(latMin).padStart(2, '0');
                document.getElementById(`c-s-${latRow}`).value = latSec.toFixed(2).padStart(5, '0');
                calcCoordDMS(latRow);

                let lonAbs = Math.abs(lonDec);
                let lonDeg = Math.floor(lonAbs);
                let lonRem = (lonAbs - lonDeg) * 60;
                let lonMin = Math.floor(lonRem);
                let lonSec = (lonRem - lonMin) * 60;
                document.getElementById(`c-d-${lonRow}`).value = String(lonDeg).padStart(3, '0');
                document.getElementById(`c-m-${lonRow}`).value = String(lonMin).padStart(2, '0');
                document.getElementById(`c-s-${lonRow}`).value = lonSec.toFixed(2).padStart(5, '0');
                calcCoordDMS(lonRow);
            }
        } else {
            // Legacy format: Waypoint,Row,DMS_Deg,DMS_Min,DMS_Sec,DMM_Deg,DMM_Min
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const cols = lines[i].split(',');
                let targetRow = parseInt(cols[1]);
                if (isNaN(targetRow) || targetRow > COORD_ROW_COUNT) targetRow = i;
                if (document.getElementById(`c-d-${targetRow}`)) {
                    document.getElementById(`c-d-${targetRow}`).value = cols[2] || '';
                    document.getElementById(`c-m-${targetRow}`).value = cols[3] || '';
                    document.getElementById(`c-s-${targetRow}`).value = cols[4] || '';
                    calcCoordDMS(targetRow);
                }
            }
        }

        input.value = '';
        scheduleCoordPlot();
        notify('Import successful', false);
    };
    reader.readAsText(file);
}

// ---------- Plot ----------
let _coordPlotRaf = null;
function scheduleCoordPlot() {
    if (_coordPlotRaf) return;
    _coordPlotRaf = requestAnimationFrame(() => { _coordPlotRaf = null; drawCoordPlot(); });
}

function getCoordWaypoints() {
    const pts = [];
    for (let i = 1; i <= COORD_ROW_COUNT; i += 2) {
        const v = id => parseFloat(document.getElementById(id).value);
        const latD = v(`c-d-${i}`), latM = v(`c-m-${i}`), latS = v(`c-s-${i}`);
        const lonD = v(`c-d-${i + 1}`), lonM = v(`c-m-${i + 1}`), lonS = v(`c-s-${i + 1}`);
        const n = (i + 1) / 2;
        const card = document.getElementById(`wpt-${n}`);
        const sum = document.getElementById(`wpt-sum-${n}`);
        const any = [latD, latM, latS, lonD, lonM, lonS].some(x => !isNaN(x));
        if (card) card.classList.toggle('filled', any);
        if (card && card.classList.contains('has-err')) {
            if (sum) { sum.textContent = 'Invalid input'; sum.style.color = 'var(--red)'; }
            continue;
        }
        if (sum) sum.style.color = '';
        if (isNaN(latD) || isNaN(lonD)) { if (sum) sum.textContent = ''; continue; }
        const lat = latD + (latM || 0) / 60 + (latS || 0) / 3600;
        const lon = lonD + (lonM || 0) / 60 + (lonS || 0) / 3600;
        if (sum) sum.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        pts.push({ n, lat, lon });
    }
    return pts;
}

function drawCoordPlot() {
    const pts = getCoordWaypoints();
    const s = V.svg(document.getElementById('coord-plot'));
    const empty = document.getElementById('coord-plot-empty');
    if (empty) empty.style.display = pts.length ? 'none' : '';
    document.getElementById('coord-plot-info').textContent = pts.length ? `${pts.length} pts` : '';
    if (!s || !pts.length) return;
    plotLatLon(s, pts.map(p => ({ lat: p.lat, lon: p.lon, label: 'W' + p.n, color: V.c('--primary') })), { connect: true });
}

// Shared equirectangular plot helper (also used by projector & RF arc)
function plotLatLon(s, pts, opt = {}) {
    const pad = opt.pad || 34;
    const lat0 = pts.reduce((a, p) => a + p.lat, 0) / pts.length;
    const kx = Math.cos(lat0 * Math.PI / 180);
    const xs = pts.map(p => p.lon * kx), ys = pts.map(p => p.lat);
    let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    let span = Math.max(maxX - minX, maxY - minY, opt.minSpan || 0.01);
    const cxm = (minX + maxX) / 2, cym = (minY + maxY) / 2;
    const scale = Math.min(s.w - 2 * pad, s.h - 2 * pad) / span;
    const X = lon => s.w / 2 + (lon * kx - cxm) * scale;
    const Y = lat => s.h / 2 - (lat - cym) * scale;

    // grid: nice step in NM
    const spanNM = span * 60;
    const stepNM = V.niceStep(spanNM, 4);
    const stepDeg = stepNM / 60;
    for (let gx = Math.floor((cxm - span) / stepDeg) * stepDeg; gx <= cxm + span; gx += stepDeg) {
        const x = s.w / 2 + (gx - cxm) * scale;
        if (x > 0 && x < s.w) V.el(s.el, 'line', { x1: x, x2: x, y1: 0, y2: s.h, stroke: V.c('--viz-grid') });
    }
    for (let gy = Math.floor((cym - span) / stepDeg) * stepDeg; gy <= cym + span; gy += stepDeg) {
        const y = s.h / 2 - (gy - cym) * scale;
        if (y > 0 && y < s.h) V.el(s.el, 'line', { x1: 0, x2: s.w, y1: y, y2: y, stroke: V.c('--viz-grid') });
    }
    // scale bar
    const barPx = stepNM / 60 * scale;
    V.el(s.el, 'line', { x1: 12, x2: 12 + barPx, y1: s.h - 14, y2: s.h - 14, stroke: V.c('--text-2'), 'stroke-width': 2 });
    V.el(s.el, 'text', { x: 12 + barPx / 2, y: s.h - 20, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 10, 'font-family': "'JetBrains Mono', monospace" }, `${+stepNM.toFixed(3)} NM`);
    // north arrow
    V.el(s.el, 'path', { d: `M${s.w - 18} 12 L${s.w - 12} 26 L${s.w - 18} 22 L${s.w - 24} 26 Z`, fill: V.c('--text-2') });
    V.el(s.el, 'text', { x: s.w - 18, y: 38, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 10, 'font-weight': 700 }, 'N');

    if (opt.draw) opt.draw({ X, Y, scale, kx });
    if (opt.connect && pts.length > 1) {
        V.el(s.el, 'polyline', { points: pts.map(p => `${X(p.lon)},${Y(p.lat)}`).join(' '), fill: 'none', stroke: V.c('--primary'), 'stroke-opacity': 0.5, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' });
    }
    pts.forEach(p => {
        if (p.hidden) return;
        V.el(s.el, 'circle', { cx: X(p.lon), cy: Y(p.lat), r: p.r || 5, fill: p.color || V.c('--primary'), stroke: V.c('--surface'), 'stroke-width': 2 });
        if (p.label) V.el(s.el, 'text', { x: X(p.lon) + 8, y: Y(p.lat) - 8, fill: p.color || V.c('--text'), 'font-size': 11, 'font-weight': 700, 'font-family': "'JetBrains Mono', monospace" }, p.label);
    });
    return { X, Y };
}

App.register('coord', {
    onShow() { drawCoordPlot(); }
});
