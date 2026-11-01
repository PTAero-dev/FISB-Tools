// =========================================================
// COORDINATE CONVERTER — logic from v1.1; new card layout + live plot
// =========================================================
const COORD_ROW_COUNT = 24; // 12 waypoints × (lat, lon)

function validateCompoundLimit(idx, isLat, isDMS) {
    let d, m, s, mm;
    let maxDeg = isLat ? 90 : 180;
    let valid = true;

    if (isDMS) {
        d = parseFloat(document.getElementById(`c-d-${idx}`).value) || 0;
        m = parseFloat(document.getElementById(`c-m-${idx}`).value) || 0;
        s = parseFloat(document.getElementById(`c-s-${idx}`).value) || 0;
        if (d > maxDeg) valid = false;
        if (d === maxDeg && (m > 0 || s > 0)) valid = false;

        const elD = document.getElementById(`c-d-${idx}`);
        const elM = document.getElementById(`c-m-${idx}`);
        const elS = document.getElementById(`c-s-${idx}`);
        const color = valid ? "" : "var(--accent-danger)";
        if (d > maxDeg || (d === maxDeg && (m > 0 || s > 0))) elD.style.borderColor = color;
        if (d === maxDeg && m > 0) elM.style.borderColor = color;
        if (d === maxDeg && s > 0) elS.style.borderColor = color;
        if (valid) {
            elD.style.borderColor = "";
            elM.style.borderColor = "";
            elS.style.borderColor = "";
        }
    } else {
        d = parseFloat(document.getElementById(`c-dd-${idx}`).value) || 0;
        mm = parseFloat(document.getElementById(`c-dm-${idx}`).value) || 0;
        if (d > maxDeg) valid = false;
        if (d === maxDeg && mm > 0) valid = false;

        const elD = document.getElementById(`c-dd-${idx}`);
        const elMM = document.getElementById(`c-dm-${idx}`);
        const color = valid ? "" : "var(--accent-danger)";
        if (d > maxDeg || (d === maxDeg && mm > 0)) elD.style.borderColor = color;
        if (d === maxDeg && mm > 0) elMM.style.borderColor = color;
        if (valid) {
            elD.style.borderColor = "";
            elMM.style.borderColor = "";
        }
    }
    return valid;
}

function checkCoordLimit(input, max, isDegree) {
    const val = parseFloat(input.value);
    if (isNaN(val)) {
        input.style.borderColor = "";
        return true;
    }
    // isDegree: allow val == max (e.g. 90). Otherwise strictly < max (e.g. 60 invalid).
    const invalid = isDegree ? (val > max) : (val >= max);
    if (invalid) {
        input.style.borderColor = "var(--accent-danger)";
        return false;
    } else {
        input.style.borderColor = "";
        return true;
    }
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
                <div></div><div class="colh">Lat</div><div class="colh">Long</div>
                <div class="rl">DMS</div>
                <div class="trip">
                    <input type="text" inputmode="decimal" id="c-d-${latId}" placeholder="Deg" maxlength="2" oninput="checkCoordLimit(this, 90, true); autoTab(this, 2, 'c-m-${latId}'); calcCoordDMS(${latId})">
                    <input type="text" inputmode="decimal" id="c-m-${latId}" placeholder="Min" maxlength="2" oninput="if(checkCoordLimit(this, 60)) autoTab(this, 2, 'c-s-${latId}'); calcCoordDMS(${latId})">
                    <input type="text" inputmode="decimal" id="c-s-${latId}" placeholder="Sec" maxlength="5" oninput="checkCoordLimit(this, 60); autoTab(this, 5, 'c-d-${longId}'); calcCoordDMS(${latId})">
                </div>
                <div class="trip">
                    <input type="text" inputmode="decimal" id="c-d-${longId}" placeholder="Deg" maxlength="3" oninput="checkCoordLimit(this, 180, true); autoTab(this, 3, 'c-m-${longId}'); calcCoordDMS(${longId})">
                    <input type="text" inputmode="decimal" id="c-m-${longId}" placeholder="Min" maxlength="2" oninput="if(checkCoordLimit(this, 60)) autoTab(this, 2, 'c-s-${longId}'); calcCoordDMS(${longId})">
                    <input type="text" inputmode="decimal" id="c-s-${longId}" placeholder="Sec" maxlength="5" oninput="checkCoordLimit(this, 60); calcCoordDMS(${longId})">
                </div>
                <div class="rl">DMM</div>
                <div class="pair dmm-row">
                    <input type="text" inputmode="decimal" id="c-dd-${latId}" placeholder="Deg" maxlength="2" oninput="checkCoordLimit(this, 90, true); autoTab(this, 2, 'c-dm-${latId}'); calcCoordDMM(${latId})">
                    <input type="text" inputmode="decimal" id="c-dm-${latId}" placeholder="Min.mm" maxlength="5" oninput="autoTab(this, 5, 'c-dd-${longId}'); calcCoordDMM(${latId})">
                </div>
                <div class="pair dmm-row">
                    <input type="text" inputmode="decimal" id="c-dd-${longId}" placeholder="Deg" maxlength="3" oninput="checkCoordLimit(this, 180, true); autoTab(this, 3, 'c-dm-${longId}'); calcCoordDMM(${longId})">
                    <input type="text" inputmode="decimal" id="c-dm-${longId}" placeholder="Min.mm" maxlength="5" oninput="calcCoordDMM(${longId})">
                </div>
            </div>`;
        container.appendChild(card);
    }
    container.addEventListener('input', scheduleCoordPlot);
}

function calcCoordDMS(idx) {
    // Source: DMS -> Target: DMM
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
    validateCompoundLimit(idx, isLat, true);
}

function calcCoordDMM(idx) {
    // Source: DMM -> Target: DMS
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
    validateCompoundLimit(idx, isLat, false);
}

function clearCoordRow(idx) {
    clearIds(`c-d-${idx}`, `c-m-${idx}`, `c-s-${idx}`, `c-dd-${idx}`, `c-dm-${idx}`);
    [`c-d-${idx}`, `c-m-${idx}`, `c-s-${idx}`, `c-dd-${idx}`, `c-dm-${idx}`].forEach(id => { const el = document.getElementById(id); if (el) el.style.borderColor = ''; });
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
