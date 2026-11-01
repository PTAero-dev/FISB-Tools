// =========================================================
// THEODOLITE — logic from v1.1; new geometry diagram & setup chart
// =========================================================
let currentTheoMode = 'gen';

function setTheoMode(mode) {
    currentTheoMode = mode;
    if (mode === 'gen') {
        updateTheoUI();
        calculateTheodolite();
    } else {
        calculateTheoSetup();
    }
}

function theoTargetSuffix(mode) {
    return (mode === 'dist') ? 'd1' : (mode === 'elev') ? 'x' : (mode === 'angle') ? 'angle' : 'h1';
}

function updateTheoUI() {
    const mode = document.getElementById('theo-mode').value;
    ['angle', 'h1', 'x', 'd1'].forEach(suffix => {
        const inp = document.getElementById(`theo-${suffix}`);
        if (inp) { inp.disabled = false; inp.classList.remove('is-target'); }
    });
    const targetSuffix = theoTargetSuffix(mode);
    const tgtInp = document.getElementById(`theo-${targetSuffix}`);
    if (tgtInp) {
        tgtInp.disabled = true;
        tgtInp.value = "";
        tgtInp.placeholder = "Calc";
        tgtInp.classList.add('is-target');
    }
    const labels = { dist: 'Distance (D)', elev: 'PAPI Lens Height (X)', angle: 'Path Angle (θ)', h1: 'Theodolite Height (H)' };
    document.getElementById('theo-res-label').textContent = labels[mode];
}

function calculateTheodolite() {
    const mode = document.getElementById('theo-mode').value;
    const aVal = parseFloat(document.getElementById('theo-angle').value);
    const hVal = parseFloat(document.getElementById('theo-h1').value);
    const xVal = parseFloat(document.getElementById('theo-x').value);
    const dVal = parseFloat(document.getElementById('theo-d1').value);

    const resEl = document.getElementById('theo-res-val');
    const resUnit = document.getElementById('theo-res-unit');
    const formulaEl = document.getElementById('theo-formula');
    if (!resEl) return;

    let result = null;
    let unit = "";
    let formula = "";

    try {
        if (mode === 'dist') {
            if (isNaN(aVal) || isNaN(hVal) || isNaN(xVal) || aVal <= 0 || aVal >= 90) throw new Error();
            const aRad = (aVal * Math.PI) / 180;
            result = (hVal - xVal) / Math.tan(aRad);
            unit = "m";
            formula = "Formula: D = (H - X) / tan(θ)";
        }
        else if (mode === 'elev') {
            if (isNaN(aVal) || isNaN(hVal) || isNaN(dVal) || aVal >= 90) throw new Error();
            const aRad = (aVal * Math.PI) / 180;
            result = hVal - (dVal * Math.tan(aRad));
            unit = "m";
            formula = "Formula: X = H - (D × tan(θ))";
        }
        else if (mode === 'angle') {
            if (isNaN(hVal) || isNaN(xVal) || isNaN(dVal) || dVal <= 0) throw new Error();
            const aRad = Math.atan((hVal - xVal) / dVal);
            result = aRad * (180 / Math.PI);
            unit = "°";
            formula = "Formula: θ = arctan((H - X) / D)";
        }
        else if (mode === 'h1') {
            if (isNaN(aVal) || isNaN(xVal) || isNaN(dVal) || aVal >= 90) throw new Error();
            const aRad = (aVal * Math.PI) / 180;
            result = xVal + (dVal * Math.tan(aRad));
            unit = "m";
            formula = "Formula: H = X + (D × tan(θ))";
        }

        if (result !== null && !isNaN(result) && isFinite(result)) {
            resEl.innerText = (unit === '°') ? result.toFixed(3) : result.toFixed(2);
            resUnit.innerText = unit;
            formulaEl.innerText = formula;
            const inp = document.getElementById(`theo-${theoTargetSuffix(mode)}`);
            if (inp) inp.value = (unit === '°') ? result.toFixed(3) : result.toFixed(2);
        } else {
            throw new Error();
        }
    } catch (e) {
        resEl.innerText = "--";
        resUnit.innerText = (mode === 'angle') ? "°" : "m";
        formulaEl.innerText = "Formula: --";
    }
    drawTheoDiagram();
}

function syncTheoFromGen() {
    const aVal = document.getElementById('theo-angle').value;
    const xVal = document.getElementById('theo-x').value;
    if (aVal) document.getElementById('theo-setup-angle').value = (parseFloat(aVal)).toFixed(3);
    if (xVal) document.getElementById('theo-setup-x').value = (parseFloat(xVal)).toFixed(2);
    calculateTheoSetup();
}

function calculateTheoSetup() {
    const table = document.getElementById('theo-setup-table');
    if (!table) return;
    const aVal = parseFloat(document.getElementById('theo-setup-angle').value);
    const xVal = parseFloat(document.getElementById('theo-setup-x').value);
    table.innerHTML = "";

    if (isNaN(aVal) || isNaN(xVal) || aVal <= 0 || aVal >= 90) {
        drawTheoSetupChart(null);
        return;
    }

    const aRad = (aVal * Math.PI) / 180;
    const tanA = Math.tan(aRad);
    const baseD = (1.50 - xVal) / tanA; // Base Distance for H = 1.50
    const heights = [1.45, 1.50, 1.55, 1.60, 1.65, 1.70, 1.75, 1.80];
    let html = "";
    const rows = [];

    heights.forEach(h => {
        let d = (h - xVal) / tanA;
        if (d < 0) d = 0; // Prevent negative distances if X > H
        let diff = d - baseD;
        let sign = diff > 0 ? "+" : "";
        let diffStr = (h === 1.50) ? '<span class="badge">BASE</span>' : `<span style="color:${diff > 0 ? 'var(--accent-warning)' : 'var(--accent-success)'}">${sign}${diff.toFixed(2)}</span>`;
        rows.push({ h, d, base: h === 1.50 });
        html += `
            <tr${h === 1.50 ? ' style="background:var(--primary-soft)"' : ''}>
                <td style="font-weight:700;">${h.toFixed(2)} m</td>
                <td style="text-align:right; color:var(--accent-cyan); font-family:var(--mono); font-weight:600;">${d.toFixed(2)}</td>
                <td style="text-align:right; font-family:var(--mono);">${diffStr}</td>
            </tr>`;
    });
    table.innerHTML = html;
    drawTheoSetupChart(rows);
}

function clearTheodolite() {
    ['theo-angle', 'theo-h1', 'theo-x', 'theo-d1'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.disabled) el.value = "";
    });
    if (document.getElementById('theo-res-val')) document.getElementById('theo-res-val').innerText = "--";
    if (document.getElementById('theo-formula')) document.getElementById('theo-formula').innerText = "Formula: --";
    const mode = document.getElementById('theo-mode').value;
    const inp = document.getElementById(`theo-${theoTargetSuffix(mode)}`);
    if (inp && inp.disabled) inp.value = "";
    if (document.getElementById('theo-setup-angle')) document.getElementById('theo-setup-angle').value = "";
    if (document.getElementById('theo-setup-x')) document.getElementById('theo-setup-x').value = "";
    if (document.getElementById('theo-setup-table')) document.getElementById('theo-setup-table').innerHTML = "";
    drawTheoSetupChart(null);
}

// ---------- Diagrams ----------
function drawTheoDiagram() {
    const s = V.svg(document.getElementById('theo-svg'));
    if (!s) return;
    const mode = document.getElementById('theo-mode').value;
    const tgt = theoTargetSuffix(mode);
    const num = id => parseFloat(document.getElementById('theo-' + id).value);
    let A = num('angle'), H = num('h1'), X = num('x'), D = num('d1');
    const known = !isNaN(A) && !isNaN(H) && !isNaN(X) && !isNaN(D) && D > 0;
    // schematic proportions when values are incomplete
    const sx = known ? D : 10, sh = known ? H : 1.5, sxh = known ? X : 0.5;

    const padL = 70, padR = 70, padT = 40, padB = 54;
    const gY = s.h - padB;
    const maxH = Math.max(sh, sxh, 0.1) * 1.6;
    const Y = v => gY - v / maxH * (s.h - padT - padB);
    const xP = padL, xT = s.w - padR;
    const colFor = k => k === tgt ? V.c('--primary') : V.c('--text-2');

    V.el(s.el, 'rect', { x: 0, y: gY, width: s.w, height: s.h - gY, fill: V.c('--ground') });
    V.el(s.el, 'line', { x1: 0, x2: s.w, y1: gY, y2: gY, stroke: V.c('--viz-axis'), 'stroke-width': 1.5 });

    // beam through PAPI lens & theodolite (extended)
    const yLens = Y(sxh), yInst = Y(sh);
    const slope = (yInst - yLens) / (xT - xP);
    V.el(s.el, 'line', { x1: xP - 40, y1: yLens - slope * 40, x2: s.w, y2: yLens + slope * (s.w - xP), stroke: V.c('--amber'), 'stroke-width': 2, 'stroke-dasharray': '7 5', 'stroke-opacity': 0.8 });
    V.el(s.el, 'line', { x1: xP, y1: yLens, x2: xT, y2: yInst, stroke: V.c('--amber'), 'stroke-width': 3 });

    // PAPI unit
    V.el(s.el, 'rect', { x: xP - 26, y: yLens - 12, width: 30, height: 20, rx: 3, fill: V.c('--surface-3'), stroke: V.c('--text-2') });
    V.el(s.el, 'circle', { cx: xP, cy: yLens, r: 5, fill: V.c('--amber') });
    V.el(s.el, 'line', { x1: xP - 18, x2: xP - 18, y1: yLens + 8, y2: gY, stroke: V.c('--text-2'), 'stroke-width': 2 });
    V.el(s.el, 'line', { x1: xP - 4, x2: xP - 4, y1: yLens + 8, y2: gY, stroke: V.c('--text-2'), 'stroke-width': 2 });
    V.el(s.el, 'text', { x: xP - 11, y: gY + 18, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 11, 'font-weight': 700 }, 'PAPI');

    // theodolite on tripod
    V.el(s.el, 'path', { d: `M${xT} ${yInst + 8} L${xT - 16} ${gY} M${xT} ${yInst + 8} L${xT + 16} ${gY} M${xT} ${yInst + 8} L${xT} ${gY}`, stroke: V.c('--text-2'), 'stroke-width': 2, fill: 'none' });
    V.el(s.el, 'rect', { x: xT - 10, y: yInst - 9, width: 20, height: 16, rx: 3, fill: V.c('--surface-3'), stroke: V.c('--text-2') });
    V.el(s.el, 'circle', { cx: xT, cy: yInst, r: 4, fill: V.c('--cyan') });
    V.el(s.el, 'text', { x: xT, y: gY + 18, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 11, 'font-weight': 700 }, 'THEODOLITE');

    const fmtV = (v, d = 2) => isNaN(v) ? '?' : v.toFixed(d);
    // X dimension
    V.el(s.el, 'line', { x1: xP - 40, x2: xP - 40, y1: gY, y2: yLens, stroke: colFor('x'), 'stroke-width': 1.5, 'marker-end': '' });
    V.label(s, xP - 40, (gY + yLens) / 2, `X ${fmtV(X)} m`, colFor('x'), { size: 11 });
    // H dimension
    V.el(s.el, 'line', { x1: xT + 36, x2: xT + 36, y1: gY, y2: yInst, stroke: colFor('h1'), 'stroke-width': 1.5 });
    V.label(s, xT + 36, (gY + yInst) / 2, `H ${fmtV(H)} m`, colFor('h1'), { size: 11 });
    // D dimension
    V.el(s.el, 'line', { x1: xP, x2: xT, y1: gY + 32, y2: gY + 32, stroke: colFor('d1'), 'stroke-width': 1.5 });
    V.el(s.el, 'line', { x1: xP, x2: xP, y1: gY + 26, y2: gY + 38, stroke: colFor('d1'), 'stroke-width': 1.5 });
    V.el(s.el, 'line', { x1: xT, x2: xT, y1: gY + 26, y2: gY + 38, stroke: colFor('d1'), 'stroke-width': 1.5 });
    V.label(s, (xP + xT) / 2, gY + 32, `D ${fmtV(D)} m`, colFor('d1'), { size: 11 });
    // θ arc
    const ang = Math.atan2(yLens - yInst, xT - xP);
    const rA = 70;
    V.el(s.el, 'line', { x1: xP, x2: xP + rA + 20, y1: yLens, y2: yLens, stroke: V.c('--viz-axis'), 'stroke-dasharray': '3 3' });
    V.el(s.el, 'path', { d: `M${xP + rA} ${yLens} A ${rA} ${rA} 0 0 0 ${xP + rA * Math.cos(ang)} ${yLens - rA * Math.sin(ang)}`, fill: 'none', stroke: colFor('angle'), 'stroke-width': 1.5 });
    V.label(s, xP + rA + 34, yLens - 14, `θ ${fmtV(A, 3)}°`, colFor('angle'), { size: 11 });
    if (!known) V.el(s.el, 'text', { x: s.w / 2, y: 20, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 11.5 }, 'Schematic — enter three values to solve the fourth');
}

function drawTheoSetupChart(rows) {
    const s = V.svg(document.getElementById('theo-setup-svg'));
    if (!s) return;
    if (!rows) {
        V.el(s.el, 'text', { x: s.w / 2, y: s.h / 2, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 12 }, 'Enter angle and PAPI height');
        return;
    }
    const padL = 64, padR = 60, padT = 10, padB = 10;
    const maxD = Math.max(...rows.map(r => r.d)) || 1;
    const bh = (s.h - padT - padB) / rows.length;
    rows.forEach((r, i) => {
        const y = padT + i * bh;
        const wB = r.d / maxD * (s.w - padL - padR);
        V.el(s.el, 'text', { x: padL - 8, y: y + bh / 2, 'text-anchor': 'end', 'dominant-baseline': 'central', fill: r.base ? V.c('--primary') : V.c('--muted'), 'font-size': 11, 'font-weight': 700, 'font-family': "'JetBrains Mono', monospace" }, r.h.toFixed(2) + ' m');
        V.el(s.el, 'rect', { x: padL, y: y + bh * 0.18, width: Math.max(wB, 1), height: bh * 0.64, rx: 4, fill: r.base ? V.c('--primary') : V.c('--cyan'), 'fill-opacity': r.base ? 0.9 : 0.55 });
        V.el(s.el, 'text', { 'class': 'viz-lbl', x: padL + wB + 6, y: y + bh / 2, 'dominant-baseline': 'central', fill: V.c('--text'), 'font-size': 11, 'font-weight': 600, 'font-family': "'JetBrains Mono', monospace" }, r.d.toFixed(2));
    });
}

App.register('theodolite', {
    onPane(pane) { setTheoMode(pane === 'setup' ? 'setup' : 'gen'); },
    onShow(pane) { if (pane === 'setup') calculateTheoSetup(); else drawTheoDiagram(); }
});
