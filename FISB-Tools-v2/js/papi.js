// =========================================================
// PAPI — configuration logic ported from v1.1
// New: 3D approach view, pilot light indicator, side-view fan, plan-view reference
// =========================================================
let papiOffsetMode = 'dms';
let papiNamingMode = 'AEROTHAI'; // AEROTHAI, ICAO, FAA
let papiUnitMode = 'deg';
let papiCounter = 0;             // Global ID counter for dynamic cards
let lastEditedPapiId = null;     // Card shown in the approach view / reference
let papiMode = 'std';

function setPapiMode(mode) {
    papiMode = mode;
    const stdContainer = document.getElementById('papi-std-container');
    const ilsContainer = document.getElementById('papi-ils-container');
    stdContainer.classList.toggle('hidden', mode !== 'std');
    ilsContainer.classList.toggle('hidden', mode === 'std');
    document.getElementById('btn-papi-std').classList.toggle('active', mode === 'std');
    document.getElementById('btn-papi-ils').classList.toggle('active', mode !== 'std');
    const first = (mode === 'std' ? stdContainer : ilsContainer).querySelector('.papi-card');
    if (first) { lastEditedPapiId = first.id.replace('-card', ''); updatePapiViz(); syncReferenceGuide(lastEditedPapiId); }
}

function addPapiCard(mode) {
    const containerId = (mode === 'std') ? 'papi-std-container' : 'papi-ils-container';
    const container = document.getElementById(containerId);
    if (!container) return;

    const id = 'papi-' + (papiCounter++);
    const isILS = (mode === 'ils');
    const titlePrefix = isILS ? 'PAPI with ILS' : 'PAPI';
    const instanceCount = container.children.length;
    const title = instanceCount === 0 ? titlePrefix : `${titlePrefix} (Additional)`;

    const cardHtml = `
        <div class="panel papi-card" id="${id}-card" onfocusin="if(lastEditedPapiId!=='${id}'){lastEditedPapiId='${id}'; updatePapiViz(); syncReferenceGuide('${id}');}">
            <div class="panel-head">
                <span class="dot" style="background:${isILS ? 'var(--amber)' : 'var(--green)'}"></span>
                <h2>${title}</h2><span class="spacer"></span>
                ${instanceCount === 0
            ? `<button class="btn sm accent" onclick="event.stopPropagation(); addPapiCard('${mode}')" title="Add another card of this type"><svg class="i sm"><use href="#ic-plus"/></svg>Add</button>`
            : `<button class="btn icon sm danger-ghost" onclick="event.stopPropagation(); removePapiCard('${id}')" title="Delete this card"><svg class="i sm"><use href="#ic-x"/></svg></button>`}
            </div>
            <div class="panel-body">
                <div class="fields c3">
                    <div class="field"><label>ICAO / Ident</label>
                        <input type="text" id="${id}-id" maxlength="4" class="input-upper" placeholder="RWY" oninput="this.value=this.value.toUpperCase(); updatePapiDraw('${id}')"></div>
                    <div class="field"><label>Comm. Angle</label><div class="input-wrap">
                        <input type="number" inputmode="decimal" id="${id}-ca" step="0.01" value="3.00" oninput="calculatePAPI('${id}')"><span class="unit">°</span></div></div>
                    <div class="field"><label>Tolerance ±</label><div class="input-wrap">
                        <input type="number" inputmode="decimal" id="${id}-tol" placeholder="0.00" step="0.01" value="0.1" oninput="calculatePAPI('${id}')"><span class="unit">°</span></div></div>
                </div>
                <div class="fields" style="grid-template-columns: minmax(0,4fr) minmax(0,1.2fr); margin-top:12px;">
                    <div class="field"><label>Offsets CA (Box 1 → 4) <span class="opt">· tap to switch ° / '</span></label>
                        <div id="${id}-offsets" class="offset-display" onclick="togglePapiOffsets('${id}')" title="Click to switch degree / minutes"></div></div>
                    <div class="field"><label>OPS</label><div id="${id}-ops" class="ops-display" style="height:38px; display:flex; align-items:center;">--°</div></div>
                </div>
                <div class="table-wrap" style="margin-top:14px;">
                    <table class="modern-table">
                        <thead><tr style="user-select:none;">
                            <th class="papi-h1 clickable" onclick="cycleCardNaming('${id}')" title="Click to cycle naming">AEROTHAI</th>
                            <th class="papi-h2 clickable" onclick="toggleCardUnit('${id}')" style="text-align:center;" title="Click to toggle unit">Degree Decimal</th>
                            <th>Tolerance Range</th>
                        </tr></thead>
                        <tbody id="${id}-tbody"></tbody>
                    </table>
                </div>
                <div style="display:flex; justify-content:flex-end; margin-top:12px;">
                    <button class="btn sm danger-ghost" onclick="event.stopPropagation(); document.getElementById('${id}-id').value=''; document.getElementById('${id}-ca').value=''; calculatePAPI('${id}');"><svg class="i sm"><use href="#ic-trash"/></svg>Clear</button>
                </div>
            </div>
        </div>`;

    container.insertAdjacentHTML('beforeend', cardHtml);

    const card = document.getElementById(id + '-card');
    card.dataset.mode = mode;
    card.dataset.naming = 'AEROTHAI';
    card.dataset.unit = 'deg';
    card.dataset.offsetUnit = 'dms';

    setTimeout(() => {
        renderPapiOffsets(id);
        calculatePAPI(id);
    }, 10);
}

function removePapiCard(id) {
    const card = document.getElementById(id + '-card');
    if (card) card.remove();
    if (lastEditedPapiId === id) setPapiMode(papiMode);
}

function cycleCardNaming(id) {
    const card = document.getElementById(id + '-card');
    if (!card) return;
    const modes = ['AEROTHAI', 'ICAO', 'FAA'];
    let current = card.dataset.naming || 'AEROTHAI';
    let idx = modes.indexOf(current);
    let next = modes[(idx + 1) % modes.length];
    card.dataset.naming = next;
    card.querySelector('.papi-h1').innerText = next;
    calculatePAPI(id);
}

function toggleCardUnit(id) {
    const card = document.getElementById(id + '-card');
    if (!card) return;
    let current = card.dataset.unit || 'deg';
    let next = (current === 'deg') ? 'dms' : 'deg';
    card.dataset.unit = next;
    const label = (next === 'deg') ? 'Degree Decimal' : 'Degree Minute';
    card.querySelector('.papi-h2').innerText = label;
    calculatePAPI(id);
}

function togglePapiOffsets(id) {
    const card = document.getElementById(id + '-card');
    if (!card) return;
    let current = card.dataset.offsetUnit || 'dms';
    card.dataset.offsetUnit = (current === 'deg') ? 'dms' : 'deg';
    renderPapiOffsets(id);
}

// Offsets in minutes (same rules as v1)
function papiOffsetsMinutes(mode, caVal) {
    if (mode === 'std') {
        let diff = 20; // Default 20'
        if (caVal > 4 && caVal <= 7) diff = 30;
        else if (caVal > 7) diff = 60;
        return [-1.5 * diff, -0.5 * diff, 0.5 * diff, 1.5 * diff];
    }
    return [-35, -15, 15, 35];
}

function renderPapiOffsets(id) {
    const container = document.getElementById(id + '-offsets');
    const card = document.getElementById(id + '-card');
    if (!container || !card) return;

    const mode = card.dataset.mode || 'std';
    const offsetUnit = card.dataset.offsetUnit || 'dms';

    let caVal = 3.00;
    const caInput = document.getElementById(id + '-ca');
    if (caInput && caInput.value !== "") {
        const _caParsed = parseFloat(caInput.value);
        caVal = (!isNaN(_caParsed) && _caParsed > 0) ? _caParsed : 3.00;
    }

    let minutes = papiOffsetsMinutes(mode, caVal);

    let html = '';
    minutes.forEach(m => {
        let val = '';
        if (offsetUnit === 'deg') {
            let d = (m / 60).toFixed(2);
            val = (m > 0 ? '+' : '') + d + '°';
        } else {
            val = (m > 0 ? '+' : '') + m + "'";
        }
        html += `<span>${val}</span>`;
    });
    container.innerHTML = html;
}

function calculatePAPI(id) {
    const caInput = document.getElementById(id + '-ca');
    const tbody = document.getElementById(id + '-tbody');
    if (!caInput || !tbody) return;

    if (caInput.value === "") {
        tbody.innerHTML = "";
        const opsEl = document.getElementById(id + '-ops');
        if (opsEl) opsEl.innerHTML = "--°";
        renderPapiOffsets(id);
        updatePapiDraw(id);
        return;
    }

    const caVal = parseFloat(caInput.value) || 3.00;
    const tolInput = document.getElementById(id + '-tol');
    const tolVal = tolInput ? (parseFloat(tolInput.value) || 0) : 0.1;
    tbody.innerHTML = "";

    const card = document.getElementById(id + '-card');
    if (!card) return;
    const mode = card.dataset.mode || 'std';
    const unitMode = card.dataset.unit || 'deg';
    const namingMode = card.dataset.naming || 'AEROTHAI';

    let offsetsMinutes = papiOffsetsMinutes(mode, caVal);

    const namingMap = {
        'AEROTHAI': ['Box 1', 'Box 2', 'Box 3', 'Box 4'],
        'ICAO': ['A', 'B', 'C', 'D'],
        'FAA': ['#4', '#3', '#2', '#1']
    };

    offsetsMinutes.forEach((offsetMin, index) => {
        let offsetDeg = offsetMin / 60;
        let decimalDeg = caVal + offsetDeg;

        let displayVal = "";
        let colorClass = "color:var(--accent-warning); font-weight:700;";
        let rangeStr = "";

        const formatToDMS = (val) => {
            let d = Math.floor(val);
            let m = Math.round((val - d) * 60);
            if (m === 60) { d += 1; m = 0; }
            return `${d}° ${m.toString().padStart(2, '0')}'`;
        };

        if (unitMode === 'deg') {
            displayVal = decimalDeg.toFixed(2) + "°";
            rangeStr = `${(decimalDeg - tolVal).toFixed(2)}° - ${(decimalDeg + tolVal).toFixed(2)}°`;
        } else {
            displayVal = formatToDMS(decimalDeg);
            rangeStr = `${formatToDMS(decimalDeg - tolVal)} - ${formatToDMS(decimalDeg + tolVal)}`;
        }

        let rowLabel = namingMap[namingMode][index];

        let row = `<tr class="papi-box-row">
            <td>${rowLabel}</td>
            <td style="${colorClass} font-family:'JetBrains Mono', monospace; text-align: center;">${displayVal}</td>
            <td style="font-family:'JetBrains Mono', monospace; color:var(--text-muted);">${rangeStr}</td>
        </tr>`;
        tbody.innerHTML += row;

        // OPS based on Box 1
        if (index === 0) {
            const opsEl = document.getElementById(id + '-ops');
            if (opsEl) {
                let opsVal = decimalDeg - 0.57;
                opsEl.innerHTML = opsVal.toFixed(2) + "°";
            }
        }
    });
    renderPapiOffsets(id);
    updatePapiDraw(id);
}

function updatePapiDraw(id) {
    lastEditedPapiId = id;
    syncReferenceGuide(id);
    updatePapiViz();
}

// ---------- Angle converter (logic unchanged) ----------
function buildAngleRows() {
    const host = document.getElementById('ang-rows');
    if (!host || host.children.length) return;
    let html = '';
    for (let r = 1; r <= 4; r++) {
        const nextDec = r < 4 ? `autoTab(this, 5, 'ang-dec-${r + 1}'); ` : '';
        const nextD = r < 4 ? `autoTab(this, 5, 'ang-d-${r + 1}'); ` : '';
        html += `
            <div class="n">${r}</div>
            <input type="text" inputmode="decimal" id="ang-dec-${r}" placeholder="3.50" maxlength="5" class="mono" oninput="${nextDec}convertAngDecToDM(${r})">
            <div class="arrow">↔</div>
            <input type="text" inputmode="numeric" id="ang-d-${r}" placeholder="D" maxlength="2" class="mono" oninput="autoTab(this, 2, 'ang-m-${r}'); convertAngDMToDec(${r})">
            <input type="text" inputmode="numeric" id="ang-m-${r}" placeholder="Min" maxlength="5" class="mono" oninput="${nextD}convertAngDMToDec(${r})">
            <button class="btn icon sm danger-ghost" onclick="clearAngRow(${r})" title="Clear"><svg class="i sm"><use href="#ic-x"/></svg></button>`;
    }
    host.innerHTML = html;
}

function convertAngDecToDM(row) {
    const decEl = document.getElementById('ang-dec-' + row);
    const dEl = document.getElementById('ang-d-' + row);
    const mEl = document.getElementById('ang-m-' + row);
    if (!decEl || !dEl || !mEl) return;
    const dec = parseFloat(decEl.value);
    if (isNaN(dec)) { dEl.value = ''; mEl.value = ''; return; }
    const absVal = Math.abs(dec);
    const d = Math.floor(absVal);
    const m = (absVal - d) * 60;
    dEl.value = dec < 0 ? ('-' + d) : String(d);
    mEl.value = m.toFixed(3);
}

function convertAngDMToDec(row) {
    const decEl = document.getElementById('ang-dec-' + row);
    const dEl = document.getElementById('ang-d-' + row);
    const mEl = document.getElementById('ang-m-' + row);
    if (!decEl || !dEl || !mEl) return;
    const d = parseFloat(dEl.value);
    const m = parseFloat(mEl.value);
    if (isNaN(d)) { decEl.value = ''; return; }
    const sign = d < 0 ? -1 : 1;
    decEl.value = (sign * (Math.abs(d) + (isNaN(m) ? 0 : m) / 60)).toFixed(4);
}

function clearAngRow(row) {
    ['ang-dec-', 'ang-d-', 'ang-m-'].forEach(prefix => {
        const el = document.getElementById(prefix + row);
        if (el) el.value = '';
    });
}

// =========================================================
// Visualisation (2D Clean Side-Profile + 3D View + Dedicated Light Bar)
// =========================================================
let papiView = '2d';
let papiScene = null;
let _papiLastCA = null;
const PAPI_UNIT_FROM_THR = 300;  // m (illustrative)
const PAPI_VIEW_RANGE = 1500;    // m from units shown on approach

function getPapiState() {
    let id = lastEditedPapiId;
    let card = id && document.getElementById(id + '-card');
    if (!card || card.closest('.hidden')) {
        card = document.querySelector(`#${papiMode === 'std' ? 'papi-std-container' : 'papi-ils-container'} .papi-card`);
        id = card ? card.id.replace('-card', '') : null;
    }
    if (!card) return null;
    const caStr = document.getElementById(id + '-ca').value;
    if (caStr === '') return { id, card, empty: true };
    const ca = parseFloat(caStr) || 3.00;
    const mode = card.dataset.mode || 'std';
    const angles = papiOffsetsMinutes(mode, ca).map(m => ca + m / 60);
    const ident = (document.getElementById(id + '-id').value || 'RWY').toUpperCase();
    return { id, card, ca, mode, angles, ident, naming: card.dataset.naming || 'AEROTHAI' };
}

function papiLights(st, acftAngle) {
    // box i shows white when the aircraft is above its transition angle
    return st.angles.map(a => acftAngle > a ? 'w' : 'r');
}
function papiVerdict(lights) {
    const w = lights.filter(l => l === 'w').length;
    return ['LOW', 'SLIGHTLY LOW', 'ON SLOPE', 'SLIGHTLY HIGH', 'HIGH'][w];
}

function setPapiView(v) {
    papiView = v;
    setSegActive(document.querySelector('#tab-papi .panel-head .seg'), 'view', v);
    document.getElementById('papi-2d-wrap').classList.toggle('hidden', v !== '2d');
    document.getElementById('papi-3d-wrap').classList.toggle('hidden', v !== '3d');
    updatePapiViz();
}

let _papiVizRaf = null;
function updatePapiViz() {
    if (_papiVizRaf) return;
    _papiVizRaf = requestAnimationFrame(() => { _papiVizRaf = null; _updatePapiViz(); });
}
function _updatePapiViz() {
    const page = document.getElementById('tab-papi');
    if (!page.classList.contains('active')) return;
    const st = getPapiState();
    const slider = document.getElementById('papi-acft-angle');
    const hud = document.getElementById('papi-hud');
    const hudTxt = document.getElementById('papi-hud-txt');
    const title = document.getElementById('papi-viz-title');

    if (!st || st.empty) {
        hud.querySelectorAll('.lamp').forEach(l => l.className = 'lamp');
        hudTxt.textContent = '--';
        if (title) title.textContent = 'Approach Profile';
        if (papiScene) { papiScene.clear(); papiScene.requestRender(); }
        drawPapiFan(null);
        return;
    }
    // slider range / follow CA changes
    slider.min = Math.max(0.3, st.angles[0] - 1.0).toFixed(2);
    slider.max = (st.angles[3] + 1.0).toFixed(2);
    if (_papiLastCA !== st.ca) { slider.value = st.ca; _papiLastCA = st.ca; }
    const acft = parseFloat(slider.value);
    document.getElementById('papi-acft-angle-val').textContent = acft.toFixed(2) + '°';

    const lights = papiLights(st, acft);
    hud.querySelectorAll('.lamp').forEach((l, i) => l.className = 'lamp ' + lights[i]);
    hudTxt.textContent = `${papiVerdict(lights)} · ${acft.toFixed(2)}°`;
    if (title) title.textContent = `${st.ident} · CA ${st.ca.toFixed(2)}°`;

    if (papiView === '3d') buildPapi3D(st, acft, lights);
    else drawPapiFan(st, acft, lights);
}

function buildPapi3D(st, acft, lights) {
    const host = document.getElementById('papi-3d');
    if (!papiScene) {
        if (host.dataset.loading) return;
        host.dataset.loading = '1';
        host.innerHTML = '<div class="viz-empty"><div>Loading 3D…</div></div>';
        loadThree().then(() => {
            delete host.dataset.loading;
            papiScene = new Scene3D(host);
            papiScene.onTheme = () => updatePapiViz();
            papiScene.setView({ az: -0.62, el: 0.24, dist: 1150, target: new THREE.Vector3(-30, 170, 700), minDist: 40, maxDist: 8000 });
            updatePapiViz();
        }).catch(() => { delete host.dataset.loading; show3DError(host); setPapiView('2d'); });
        return;
    }
    const S = papiScene, E = 4;
    S.clear();
    const T = THREE;
    const isLight = document.body.classList.contains('light-theme');

    const ground = new T.Mesh(new T.PlaneGeometry(30000, 30000), M3.mat(isLight ? '#b9c7ae' : '#16211a', { roughness: 1, side: T.FrontSide }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.5, 0);
    S.add(ground);
    S.add(M3.grid(8000, 80, isLight ? '#8a98a8' : '#2c3a4e', 0.35));
    S.add(M3.runway(2400, 45, { thick: 0.4 }));
    S.label(st.ident, new T.Vector3(0, 2, 30), 'plain');

    const zU = -PAPI_UNIT_FROM_THR;
    const unitX = i => -(22.5 + 15 + (3 - i) * 9);
    const lampCol = l => l === 'w' ? '#fffbe8' : '#ff3b3b';
    for (let i = 0; i < 4; i++) {
        const x = unitX(i);
        const box = new T.Mesh(new T.BoxGeometry(6, 3, 4), M3.mat('#3d4552', { roughness: 0.6 }));
        box.position.set(x, 1.5, zU); S.add(box);
        const lamp = new T.Mesh(new T.CircleGeometry(1.3, 20), M3.basic(lampCol(lights[i])));
        lamp.position.set(x, 1.8, zU + 2.05); S.add(lamp);
        const glow = M3.sphere([x, 1.8, zU + 2.4], 2.2, lampCol(lights[i]), { transparent: true, opacity: 0.35 });
        S.add(glow);
    }
    S.label('PAPI ≈300 m', new T.Vector3(unitX(1.5), 8, zU), 'plain');

    const zEnd = zU + PAPI_VIEW_RANGE;
    const boxCols = ['#f87171', '#f5b942', '#34d399', '#4f8cff'];
    const naming = { AEROTHAI: ['Box 1', 'Box 2', 'Box 3', 'Box 4'], ICAO: ['A', 'B', 'C', 'D'], FAA: ['#4', '#3', '#2', '#1'] }[st.naming];
    // Exaggerate angular spread between boxes in 3D too so beams are clearly separated
    const effAngle = a => Math.max(0.4, st.ca + (a - st.ca) * 2.6);
    st.angles.forEach((a, i) => {
        const hEnd = PAPI_VIEW_RANGE * Math.tan(effAngle(a) * Math.PI / 180) * E;
        const x = unitX(i);
        S.add(M3.poly([[x - 14, 1.8, zU], [x + 14, 1.8, zU], [x + 14, hEnd, zEnd], [x - 14, hEnd, zEnd]], boxCols[i], 0.12));
        S.add(M3.line([[x, 1.8, zU], [x, hEnd, zEnd]], boxCols[i], { opacity: 0.95 }));
        const f = [1.0, 0.82, 0.64, 0.46][i];
        S.label(`${naming[i]} ${a.toFixed(2)}°`, new T.Vector3(x, 1.8 + (hEnd - 1.8) * f, zU + PAPI_VIEW_RANGE * f), '');
    });
    const hCA = PAPI_VIEW_RANGE * Math.tan(st.ca * Math.PI / 180) * E;
    S.add(M3.line([[unitX(1.5), 1.8, zU], [unitX(1.5), hCA, zEnd + 200]], '#22d3ee', { dash: 25, gap: 18 }));

    const dA = PAPI_VIEW_RANGE - 120;
    const hA = dA * Math.tan(effAngle(acft) * Math.PI / 180) * E;
    const ac = M3.aircraft(isLight ? '#ffffff' : '#e8edf5', '#4f8cff', 70);
    ac.position.set(unitX(1.5) + 45, hA, zU + dA);
    ac.rotation.x = Math.atan(Math.tan(st.ca * Math.PI / 180) * E) * 0.9;
    S.add(ac);
    S.add(M3.line([[unitX(1.5) + 45, hA, zU + dA], [unitX(1.5), 1.8, zU]], '#a78bfa', { dash: 14, gap: 10, opacity: 0.8 }));
    S.add(M3.line([[unitX(1.5) + 45, hA, zU + dA], [unitX(1.5) + 45, 0, zU + dA]], '#8391a7', { dash: 8, gap: 8, opacity: 0.7 }));
    S.label(`ACFT ${acft.toFixed(2)}° · ${papiVerdict(lights)}`, new T.Vector3(unitX(1.5) + 45, hA + 110, zU + dA), 'primary');
    S.requestRender();
}

function drawPapiFan(st, acft, lights) {
    const s = V.svg(document.getElementById('papi-fan'));
    if (!s) return;
    if (!st) {
        V.el(s.el, 'text', { x: s.w / 2, y: s.h / 2, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 13 }, 'Enter a commissioning angle');
        return;
    }
    const padL = 20, padR = 96, padT = 16, padB = 30;
    const maxD = PAPI_VIEW_RANGE;
    const plotW = s.w - padL - padR;
    const plotH = s.h - padT - padB;
    const X = d => padL + (d / maxD) * plotW;
    const yBase = s.h - padB;

    // Schematic angular exaggeration around CA:
    // Center (CA) sits at 50% height (gentle ~22° visual slope), while the spread
    // between Box 1 and Box 4 is exaggerated to span ~18%..82% of plotH (~34px between each box!)
    const ang = st.angles;
    const halfSpread = Math.max(0.25, (ang[3] - ang[0]) / 2);
    const angleToFrac = a => 0.50 + ((a - st.ca) / halfSpread) * 0.32;
    const YAtEnd = a => yBase - Math.max(0.04, Math.min(0.96, angleToFrac(a))) * plotH;
    const YAtDist = (d, a) => yBase - (d / maxD) * (yBase - YAtEnd(a));

    // Subtle shaded zones (below Box 1 = red, on-slope Box 2..3 = cyan, above Box 4 = white)
    const zone = (yEnd0, yEnd1, col, op) => {
        V.el(s.el, 'path', { d: `M${X(0)} ${yBase} L${X(maxD)} ${yEnd0} L${X(maxD)} ${yEnd1} Z`, fill: col, 'fill-opacity': op });
    };
    zone(yBase, YAtEnd(ang[0]), '#ef4444', 0.13);
    zone(YAtEnd(ang[1]), YAtEnd(ang[2]), '#22d3ee', 0.16);
    zone(YAtEnd(ang[3]), padT, '#f8fafc', 0.06);

    // Distance grid
    const dStep = plotW < 210 ? 500 : 250;
    for (let d = 0; d <= maxD; d += dStep) {
        if (d > 0) V.el(s.el, 'line', { x1: X(d), x2: X(d), y1: padT, y2: yBase, stroke: V.c('--viz-grid'), 'stroke-dasharray': '3 3' });
        V.el(s.el, 'text', { x: X(d), y: yBase + 15, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 10, 'font-family': "'JetBrains Mono', monospace" }, d);
    }
    V.el(s.el, 'text', { x: s.w - padR, y: s.h - 3, 'text-anchor': 'end', fill: V.c('--muted'), 'font-size': 10 }, 'Dist from PAPI (m)');
    V.el(s.el, 'line', { x1: padL, x2: s.w - padR, y1: yBase, y2: yBase, stroke: V.c('--viz-axis'), 'stroke-width': 1.5 });

    // 4 Box transition lines + right-margin labels
    const boxCols = [V.c('--red'), V.c('--amber'), V.c('--green'), V.c('--primary')];
    const naming = { AEROTHAI: ['Box 1', 'Box 2', 'Box 3', 'Box 4'], ICAO: ['A', 'B', 'C', 'D'], FAA: ['#4', '#3', '#2', '#1'] }[st.naming];
    const endYs = ang.map(a => YAtEnd(a));

    ang.forEach((a, i) => {
        const yEnd = endYs[i];
        V.el(s.el, 'line', { x1: X(0), y1: yBase, x2: X(maxD), y2: yEnd, stroke: boxCols[i], 'stroke-width': 2 });
        V.el(s.el, 'text', { x: X(maxD) + 7, y: yEnd, 'dominant-baseline': 'central', fill: boxCols[i], 'font-size': 11, 'font-weight': 700, 'font-family': "'JetBrains Mono', monospace" }, `${naming[i]} ${a.toFixed(2)}°`);
    });

    // Aircraft approach ray & clean aircraft icon along the same exaggerated angular scale
    const dA = maxD * 0.78;
    const xA = X(dA), yA = YAtDist(dA, acft);
    V.el(s.el, 'line', { x1: X(0), y1: yBase, x2: xA, y2: yA, stroke: V.c('--violet'), 'stroke-dasharray': '5 4', 'stroke-width': 2 });
    const pitch = Math.atan2(yBase - yA, X(0) - xA) * 180 / Math.PI - 180;
    const g = V.el(s.el, 'g', { transform: `translate(${xA} ${yA}) rotate(${pitch}) scale(-0.95 0.95)` });
    V.el(g, 'path', { d: 'M-14 0 L10 -2 L14 0 L10 2 Z M-2 -1 L-6 -9 L-3 -9 L4 -1 Z M-12 -1 L-15 -6 L-13 -6 L-9 -1 Z', fill: V.c('--text') });

    // PAPI origin marker & Runway Ident
    V.el(s.el, 'rect', { x: X(0) - 5, y: yBase - 5, width: 10, height: 10, rx: 2, fill: V.c('--amber') });
    V.el(s.el, 'text', { x: X(0) + 8, y: padT + 6, fill: V.c('--muted'), 'font-size': 10.5, 'font-weight': 700, 'font-family': "'JetBrains Mono', monospace" }, `${st.ident} · CA ${st.ca.toFixed(2)}°`);
}

// Plan-view box reference (replaces v1 canvases papi1Canvas / papi2Canvas)
function syncReferenceGuide(id) {
    const s = V.svg(document.getElementById('papi-ref-svg'));
    if (!s) return;
    const card = id ? document.getElementById(id + '-card') : null;
    const mode = card ? card.dataset.mode : 'std';
    const naming = card ? (card.dataset.naming || 'AEROTHAI') : 'AEROTHAI';
    const idInput = id ? document.getElementById(id + '-id') : null;
    const idText = (idInput && idInput.value) ? idInput.value.toUpperCase() : "RWY";
    const color = (mode === 'ils') ? V.c('--amber') : V.c('--green');
    document.getElementById('papi-ref-info').textContent = `${idText} · ${mode === 'ils' ? 'PAPI with ILS' : 'PAPI'}`;

    const padX = 16;
    const rwyY = s.h * 0.64, rwyH = Math.min(64, Math.max(52, s.h * 0.20));
    V.el(s.el, 'rect', { x: padX, y: rwyY, width: s.w - 2 * padX, height: rwyH, rx: 4, fill: '#2b313b', stroke: '#4b5563' });
    for (let x = padX + 108; x < s.w - padX - 24; x += 44) V.el(s.el, 'rect', { x, y: rwyY + rwyH / 2 - 1.5, width: 24, height: 3, fill: '#e5e7eb' });
    for (let i = 0; i < 6; i++) V.el(s.el, 'rect', { x: padX + 8, y: rwyY + 6 + i * (rwyH - 12) / 6, width: 26, height: (rwyH - 12) / 6 - 3, fill: '#e5e7eb' });
    // Draw RWY identifier horizontally or compactly so 4 chars (e.g. RW03) are always 100% visible
    V.el(s.el, 'text', { x: padX + 68, y: rwyY + rwyH / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: '#fff', 'font-weight': 800, 'font-size': idText.length > 3 ? 12.5 : 14, 'font-family': "'JetBrains Mono', monospace", transform: `rotate(-90 ${padX + 68} ${rwyY + rwyH / 2})` }, idText);

    const names = { AEROTHAI: ['Box 1', 'Box 2', 'Box 3', 'Box 4'], ICAO: ['A', 'B', 'C', 'D'], FAA: ['#4', '#3', '#2', '#1'] };
    const bs = 22, gap = 11;
    const bx = Math.min(padX + 130, Math.max(padX + 76, s.w - 210));
    const colStep = Math.min(62, Math.max(46, (s.w - (bx + bs + 12) - 10) / 3));
    for (let i = 0; i < 4; i++) {
        const y = rwyY - 16 - bs - (3 - i) * (bs + gap);
        V.el(s.el, 'rect', { x: bx, y, width: bs, height: bs, rx: 4, fill: color });
        let tx = bx + bs + 12;
        ['AEROTHAI', 'ICAO', 'FAA'].forEach(n => {
            V.el(s.el, 'text', { x: tx, y: y + bs / 2, 'dominant-baseline': 'central', fill: n === naming ? V.c('--text') : V.c('--muted'), 'font-size': 12, 'font-weight': n === naming ? 800 : 500, 'font-family': "'JetBrains Mono', monospace" }, names[n][i]);
            tx += colStep;
        });
    }
    let tx = bx + bs + 12;
    ['AEROTHAI', 'ICAO', 'FAA'].forEach(n => { V.el(s.el, 'text', { x: tx, y: 16, fill: n === naming ? V.c('--primary') : V.c('--muted'), 'font-size': 10, 'font-weight': 700 }, n); tx += colStep; });
    V.el(s.el, 'text', { x: bx - 8, y: rwyY - 16 - bs - 3 * (bs + gap) + bs / 2, 'text-anchor': 'end', 'dominant-baseline': 'central', fill: V.c('--muted'), 'font-size': 10.5 }, 'away ↑');
    V.el(s.el, 'text', { x: bx - 8, y: rwyY - 16 - bs / 2, 'text-anchor': 'end', 'dominant-baseline': 'central', fill: V.c('--muted'), 'font-size': 10.5 }, 'close ↓');
    V.el(s.el, 'text', { x: s.w / 2, y: s.h - 12, 'text-anchor': 'middle', fill: V.c('--text'), 'font-size': 13, 'font-weight': 700 }, 'LANDING DIRECTION →');
}

App.register('papi', {
    onPane(pane) {
        if (pane === 'angle') buildAngleRows();
    },
    onShow(pane) {
        if (pane === 'config' || !pane) updatePapiViz();
        if (pane === 'ref') syncReferenceGuide(lastEditedPapiId);
        if (papiScene) papiScene.resize();
    }
});
