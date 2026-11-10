// =========================================================
// IFP GRADIENT — logic ported from v1.1; new leg cards + full profile chart
// =========================================================
let gradLegCount = 1; // Track added legs

function legCardHTML(id, num, prevEndAlt, prevEndDist, isFirst) {
    const resetIds = `'${id}-startAlt','${id}-endAlt','${id}-dist','${id}-sdist','${id}-edist','${id}-angle-in','${id}-pct-in', '${id}'`;
    const hideVizOnMobile = (typeof window !== 'undefined' && window.innerWidth <= 760) ? 'hidden' : '';
    return `
    <div class="panel-head" onclick="toggleLeg(this)" title="Collapse / expand">
        <span class="leg-num">${num}</span>
        <div class="panel-title" style="flex:1; min-width:0;"><span style="flex-shrink:0;">Leg</span><span id="${id}-header-info" class="head-info"></span></div>
        <button class="btn icon sm ghost" title="Show / hide leg chart" onclick="event.stopPropagation(); toggleLegChart('${id}');"><svg class="i sm"><use href="#ic-chart"/></svg></button>
        <button class="btn icon sm danger-ghost" title="Reset leg" onclick="event.stopPropagation(); clearIds(${resetIds});"><svg class="i sm"><use href="#ic-reset"/></svg></button>
        ${isFirst ? '' : `<button class="btn icon sm danger-ghost" title="Delete leg" onclick="event.stopPropagation(); deleteGradientLeg('${id}');"><svg class="i sm"><use href="#ic-trash"/></svg></button>`}
        <svg class="i sm chev"><use href="#ic-chev"/></svg>
    </div>
    <div class="leg-body">
        <div class="fields">
            <div class="field"><label>Start Altitude</label><div class="input-wrap"><input type="number" inputmode="decimal" id="${id}-startAlt" placeholder="e.g. ${isFirst ? 2000 : 3000}" value="${prevEndAlt}" oninput="calculateGradient('${id}', 'sAlt')"><span class="unit">ft</span></div></div>
            <div class="field"><label>End Altitude</label><div class="input-wrap"><input type="number" inputmode="decimal" id="${id}-endAlt" placeholder="e.g. 5000" oninput="calculateGradient('${id}', 'eAlt')"><span class="unit">ft</span></div></div>
            <div class="field"><label>Gradient <span class="opt">(optional)</span></label><div class="input-wrap"><input type="number" inputmode="decimal" id="${id}-pct-in" placeholder="Calc" class="alt-input" step="0.01" onchange="calculateGradient('${id}', 'pct')"><span class="unit">%</span></div></div>
            <div class="field"><label>Angle <span class="opt">(optional)</span></label><div class="input-wrap"><input type="number" inputmode="decimal" id="${id}-angle-in" placeholder="Calc" class="alt-input" onchange="calculateGradient('${id}', 'angle')"><span class="unit">°</span></div></div>
        </div>
        <div class="fields c3" style="margin-top:12px;">
            <div class="field"><label>Leg Dist</label><div class="input-wrap"><input type="number" inputmode="decimal" id="${id}-dist" placeholder="e.g. 5.0" oninput="calculateGradient('${id}', 'dist')"><span class="unit">NM</span></div></div>
            <div class="field"><label>Start Dist</label><div class="input-wrap"><input type="number" inputmode="decimal" id="${id}-sdist" placeholder="--" value="${prevEndDist}" onchange="calculateGradient('${id}', 'sDist')"><span class="unit">NM</span></div></div>
            <div class="field"><label>End Dist</label><div class="input-wrap"><input type="number" inputmode="decimal" id="${id}-edist" placeholder="--" onchange="calculateGradient('${id}', 'eDist')"><span class="unit">NM</span></div></div>
        </div>
        <div class="leg-results">
            <div class="stat"><div class="k">Status</div><div class="v" style="font-size:14px; margin-top:6px;"><span id="${id}-type" class="status-pill">---</span></div><div class="s" id="${id}-delta">0 ft</div></div>
            <div class="stat"><div class="k">ft / NM</div><div class="v res-accent" id="${id}-ftnm">0</div></div>
            <div class="stat t-cyan"><div class="k">Gradient</div><div class="v" id="${id}-percent">0.0%</div><div class="s" id="${id}-angle">0.00°</div></div>
        </div>
        <div class="viz leg-canvas ${hideVizOnMobile}" id="${id}-viz-wrap" style="margin-top:12px;"><canvas id="${id}Canvas" style="height:150px;"></canvas><div class="viz-toolbar"><button type="button" class="btn sm active viz-lbl-btn" title="Hide / show chart labels" onclick="event.stopPropagation(); toggle2DLabels(this)">Hide Labels</button></div></div>
    </div>`;
}

function toggleLegChart(id) {
    const wrap = document.getElementById(id + '-viz-wrap');
    if (!wrap) return;
    wrap.classList.toggle('hidden');
    if (!wrap.classList.contains('hidden')) {
        setTimeout(() => calculateGradient(id), 20);
    }
}

function initGradient() {
    const container = document.getElementById('grad-legs-container');
    if (!container || container.children.length) return;
    const card = document.createElement('div');
    card.className = 'panel leg-card';
    card.id = 'card-grad';
    card.innerHTML = legCardHTML('grad', 1, '', '', true);
    container.appendChild(card);
}

function toggleLeg(head) {
    const card = head.closest('.leg-card');
    card.classList.toggle('collapsed');
    if (!card.classList.contains('collapsed')) {
        const prefix = card.id.replace('card-', '');
        setTimeout(() => calculateGradient(prefix), 20);
    }
}

function addGradientLeg() {
    gradLegCount++;
    const id = 'grad' + gradLegCount;
    const container = document.getElementById('grad-legs-container');

    // --- AUTO-FILL START ALT FROM PREVIOUS LEG ---
    let prevEndAlt = "";
    let prevEndDist = "";
    const existingCards = Array.from(container.querySelectorAll('.leg-card'));
    if (existingCards.length > 0) {
        const lastExistingCard = existingCards[existingCards.length - 1];
        const lastPrefix = lastExistingCard.id ? lastExistingCard.id.replace('card-', '') : 'grad';
        const lastEndEl = document.getElementById(lastPrefix + '-endAlt');
        const lastEndDistEl = document.getElementById(lastPrefix + '-edist');
        if (lastEndEl && lastEndEl.value !== '') prevEndAlt = lastEndEl.value;
        if (lastEndDistEl && lastEndDistEl.value !== '') prevEndDist = lastEndDistEl.value;
    }
    // ---------------------------------------------

    const card = document.createElement('div');
    card.className = 'panel leg-card';
    card.id = 'card-' + id;
    card.innerHTML = legCardHTML(id, existingCards.length + 1, prevEndAlt, prevEndDist, false);
    container.appendChild(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    scheduleGradProfile();
}

function deleteGradientLeg(id) {
    const card = document.getElementById('card-' + id);
    if (card) card.remove();
    document.querySelectorAll('#grad-legs-container .leg-card').forEach((c, idx) => {
        const n = c.querySelector('.leg-num');
        if (n) n.textContent = idx + 1;
    });
    scheduleGradProfile();
}

function calcGradStart(offset = 0) {
    const rwy = parseFloat(document.getElementById('grad-rwy-elev').value) || 0;
    const tch = parseFloat(document.getElementById('grad-tch').value) || 0;
    const startAlt = document.getElementById('grad-startAlt');
    if (startAlt) {
        startAlt.value = Math.round(rwy + tch + offset);
        calculateGradient('grad', 'sAlt');
    }
}

function calculateGradient(prefix, source) {
    const sAltInput = document.getElementById(prefix + '-startAlt');
    const eAltInput = document.getElementById(prefix + '-endAlt');
    const distInput = document.getElementById(prefix + '-dist');
    const sDistInput = document.getElementById(prefix + '-sdist');
    const eDistInput = document.getElementById(prefix + '-edist');
    const angleInput = document.getElementById(prefix + '-angle-in');
    const pctInput = document.getElementById(prefix + '-pct-in');

    if (!sAltInput || !eAltInput || !distInput) return;

    // --- 1. BIDIRECTIONAL DISTANCE LOGIC (Input 2 -> Calc 3rd) ---
    let sd = parseFloat(sDistInput ? sDistInput.value : NaN);
    let ed = parseFloat(eDistInput ? eDistInput.value : NaN);
    let d = parseFloat(distInput.value);

    if (source === 'sDist' || source === 'eDist' || source === 'dist') {
        if (source === 'dist') {
            if (!isNaN(d)) {
                if (!isNaN(sd)) {
                    eDistInput.value = (sd + d).toFixed(2);       // S + D -> E
                } else if (!isNaN(ed)) {
                    sDistInput.value = (ed - d).toFixed(2);       // E - D -> S
                }
            }
        } else if (source === 'sDist') {
            if (!isNaN(sd)) {
                if (!isNaN(d)) {
                    eDistInput.value = (sd + d).toFixed(2);       // S + D -> E
                } else if (!isNaN(ed)) {
                    distInput.value = Math.abs(ed - sd).toFixed(2); // E - S -> D
                }
            }
        } else if (source === 'eDist') {
            if (!isNaN(ed)) {
                if (!isNaN(d)) {
                    sDistInput.value = (ed - d).toFixed(2);       // E - D -> S
                } else if (!isNaN(sd)) {
                    distInput.value = Math.abs(ed - sd).toFixed(2); // E - S -> D
                }
            }
        }
    }

    // Refetch values
    let sAlt = parseFloat(sAltInput.value);
    let eAlt = parseFloat(eAltInput.value);
    d = parseFloat(distInput.value);
    let angIn = parseFloat(angleInput ? angleInput.value : NaN);
    let pctIn = parseFloat(pctInput ? pctInput.value : NaN);

    // Track whether angle/gradient vs endAlt/dist are manually entered or auto-calculated
    if (source === 'eAlt') {
        eAltInput.dataset.auto = '';
        if (!isNaN(d) && distInput.dataset.auto !== '1') {
            if (angleInput) angleInput.dataset.manual = '';
            if (pctInput) pctInput.dataset.manual = '';
        }
    } else if (source === 'dist' || source === 'sDist' || source === 'eDist') {
        distInput.dataset.auto = '';
        if (!isNaN(eAlt) && eAltInput.dataset.auto !== '1') {
            if (angleInput) angleInput.dataset.manual = '';
            if (pctInput) pctInput.dataset.manual = '';
        }
    } else if (source === 'sAlt') {
        if (!isNaN(eAlt) && eAltInput.dataset.auto !== '1' && !isNaN(d) && distInput.dataset.auto !== '1') {
            if (angleInput) angleInput.dataset.manual = '';
            if (pctInput) pctInput.dataset.manual = '';
        }
    }

    // --- 2. PERCENT <-> ANGLE SYNC ---
    if (source === 'pct') {
        if (!isNaN(pctIn)) {
            angIn = Math.atan(pctIn / 100) * (180 / Math.PI);
            if (angleInput) {
                angleInput.value = angIn.toFixed(4);
                angleInput.dataset.manual = '1';
            }
            if (pctInput) pctInput.dataset.manual = '1';
        } else {
            if (angleInput) { angleInput.value = ''; angleInput.dataset.manual = ''; }
            if (pctInput) pctInput.dataset.manual = '';
            angIn = NaN;
        }
    } else if (source === 'angle') {
        if (!isNaN(angIn)) {
            let pctVal = Math.tan(angIn * Math.PI / 180) * 100;
            if (pctInput) {
                pctInput.value = pctVal.toFixed(4);
                pctInput.dataset.manual = '1';
            }
            if (angleInput) angleInput.dataset.manual = '1';
        } else {
            if (pctInput) { pctInput.value = ''; pctInput.dataset.manual = ''; }
            if (angleInput) angleInput.dataset.manual = '';
            pctIn = NaN;
        }
    }

    const isManualAngle = !!(angleInput && angleInput.dataset.manual === '1');
    const isAutoEAlt = eAltInput.dataset.auto === '1';
    const isAutoDist = distInput.dataset.auto === '1';

    // --- 3. SOLVING LOGIC (only when Angle/Gradient was manually entered) ---
    if (source && isManualAngle && !isNaN(angIn)) {
        if (!isNaN(sAlt) && !isNaN(eAlt) && !isAutoEAlt && (isNaN(d) || isAutoDist)) {
            // Calc Dist — guard: tan(0) = 0 and tan(≥90°) = huge/undefined
            let rise = Math.abs(eAlt - sAlt);
            let rad = Math.abs(angIn) * Math.PI / 180;
            if (rad > 0 && rad < Math.PI / 2) {
                let runFt = rise / Math.tan(rad);
                d = runFt / FT_PER_NM;
                distInput.value = Math.abs(d).toFixed(2);
                distInput.dataset.auto = '1';
            }
        }
        else if (!isNaN(sAlt) && !isNaN(d) && !isAutoDist && (isNaN(eAlt) || isAutoEAlt || source === 'pct' || source === 'angle')) {
            // Calc E.Alt (preserve descent direction if negative angle/pct or leg is already descending)
            let rad = Math.abs(angIn) * Math.PI / 180;
            let runFt = d * FT_PER_NM;
            let sign = (angIn < 0 || (!isNaN(eAlt) && eAlt < sAlt)) ? -1 : 1;
            let rise = sign * Math.tan(rad) * runFt;
            let newEnd = sAlt + rise;
            eAltInput.value = Math.round(newEnd);
            eAltInput.dataset.auto = '1';
        }
    }

    // --- 3. AUTO-SYNC NEXT LEG ---
    eAlt = parseFloat(eAltInput.value);
    const gradCont = document.getElementById('grad-legs-container');
    const allLegCards = gradCont ? Array.from(gradCont.querySelectorAll('.leg-card')) : [];
    const currentCard = (prefix === 'grad')
        ? allLegCards[0]
        : document.getElementById('card-' + prefix);
    const currentIdx = allLegCards.indexOf(currentCard);
    if (currentIdx !== -1 && currentIdx < allLegCards.length - 1) {
        const nextCard = allLegCards[currentIdx + 1];
        const nextPrefix = nextCard.id ? nextCard.id.replace('card-', '') : 'grad';
        const nextStartEl = document.getElementById(nextPrefix + '-startAlt');
        const nextStartDistEl = document.getElementById(nextPrefix + '-sdist');

        if (nextStartEl && !isNaN(eAlt)) {
            if (nextStartEl.value === "") {
                nextStartEl.value = Math.round(eAlt);
                calculateGradient(nextPrefix);
            }
        }
        if (nextStartDistEl && eDistInput && eDistInput.value !== "") {
            if (nextStartDistEl.value === "") {
                nextStartDistEl.value = eDistInput.value;
                calculateGradient(nextPrefix, 'sDist');
            }
        }
    }

    // --- 4. STANDARD CALCULATION & VIZ ---
    sAlt = parseFloat(sAltInput.value);
    eAlt = parseFloat(eAltInput.value);
    d = parseFloat(distInput.value);

    const typeEl = document.getElementById(prefix + '-type');
    const deltaEl = document.getElementById(prefix + '-delta');
    const ftnmEl = document.getElementById(prefix + '-ftnm');
    const pctEl = document.getElementById(prefix + '-percent');
    const angEl = document.getElementById(prefix + '-angle');
    const headerInfoEl = document.getElementById(prefix + '-header-info');
    const canvas = document.getElementById(prefix + 'Canvas');

    scheduleGradProfile();

    if (isNaN(sAlt) || isNaN(eAlt) || isNaN(d) || d <= 0) {
        typeEl.textContent = "---"; typeEl.className = "status-pill";
        deltaEl.textContent = "0 ft";
        ftnmEl.textContent = "0";
        pctEl.textContent = "0.0%";
        angEl.textContent = "0.00°";
        if (!isManualAngle) {
            if (angleInput) angleInput.value = "";
            if (pctInput) pctInput.value = "";
        }
        if (headerInfoEl) headerInfoEl.textContent = "";
        drawGradientViz(0, 0, true, 0, prefix + 'Canvas');
        return;
    }

    let deltaAlt = eAlt - sAlt;
    let absDelta = Math.abs(deltaAlt);
    let angleDeg = 0;

    if (deltaAlt > 0) {
        typeEl.textContent = "CLIMB"; typeEl.className = "status-pill res-success";
    } else if (deltaAlt < 0) {
        typeEl.textContent = "DESCEND"; typeEl.className = "status-pill res-danger";
    } else {
        typeEl.textContent = "LEVEL"; typeEl.className = "status-pill";
    }

    deltaEl.textContent = fmt(Math.round(absDelta)) + " ft";

    if (d > 0) {
        let ftPerNM = absDelta / d;
        let percent = (absDelta / (d * FT_PER_NM)) * 100;
        let angleRad = Math.atan(absDelta / (d * FT_PER_NM));
        angleDeg = angleRad * (180 / Math.PI);

        ftnmEl.textContent = fmt(Math.round(ftPerNM));
        pctEl.textContent = percent.toFixed(2) + "%";
        angEl.textContent = angleDeg.toFixed(2) + "°";

        // Auto-fill angle/pct input boxes if not manually entered
        if (angleInput && source !== 'angle' && source !== 'pct' && !isManualAngle) {
            angleInput.value = angleDeg.toFixed(4);
        }
        if (pctInput && source !== 'angle' && source !== 'pct' && !isManualAngle) {
            pctInput.value = percent.toFixed(4);
        }

        drawGradientViz(d, absDelta, deltaAlt > 0, angleDeg, prefix + 'Canvas');

        if (headerInfoEl) {
            let typeStr = (deltaAlt > 0) ? "CLIMB" : (deltaAlt < 0 ? "DESCEND" : "LEVEL");
            let color = (deltaAlt > 0) ? "var(--accent-success)" : (deltaAlt < 0 ? "var(--accent-danger)" : "var(--text-muted)");
            headerInfoEl.innerHTML = `<span style="color:${color}; font-weight:700;">${typeStr}</span> ${fmt(Math.round(absDelta))} ft · <span style="color:var(--accent-cyan);">${percent.toFixed(2)}%</span> · <span style="color:var(--accent-cyan);">${angleDeg.toFixed(2)}°</span>`;
        }
    } else {
        drawGradientViz(0, 0, true, 0, prefix + 'Canvas');
        if (headerInfoEl) headerInfoEl.textContent = "";
    }
}

// Per-leg side profile (redesigned drawing, same signature as v1)
function drawGradientViz(runNM, riseFT, isClimb, angleVal, canvasId) {
    const canvas = document.getElementById(canvasId);
    const S = V.canvas(canvas);
    if (!S) return;
    const { ctx, w, h } = S;
    const prefix = canvasId.replace(/Canvas$/, '');
    const sAlt = parseFloat((document.getElementById(prefix + '-startAlt') || {}).value);
    const eAlt = parseFloat((document.getElementById(prefix + '-endAlt') || {}).value);

    const padL = 16, padR = 16, padT = 26, padB = 26;
    const x0 = padL, x1 = w - padR, yTop = padT, yBot = h - padB;

    // ground strip
    ctx.fillStyle = V.c('--viz-grid');
    ctx.fillRect(0, yBot, w, h - yBot);
    ctx.strokeStyle = V.c('--viz-axis'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, yBot + 0.5); ctx.lineTo(w, yBot + 0.5); ctx.stroke();

    if (runNM <= 0) {
        V.font(ctx, 12, 500); ctx.fillStyle = V.c('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Enter start / end altitude and leg distance', w / 2, (yTop + yBot) / 2);
        return;
    }

    const level = riseFT <= 0;
    const col = level ? V.c('--muted') : (isClimb ? V.c('--green') : V.c('--red'));
    const ys = level ? (yTop + yBot) / 2 : (isClimb ? yBot - 6 : yTop + 6);
    const ye = level ? (yTop + yBot) / 2 : (isClimb ? yTop + 6 : yBot - 6);

    // fill under path
    const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
    grad.addColorStop(0, col + '55'); grad.addColorStop(1, col + '05');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(x0, ys); ctx.lineTo(x1, ye); ctx.lineTo(x1, yBot); ctx.lineTo(x0, yBot); ctx.closePath(); ctx.fill();

    // horizontal reference + angle arc
    if (!level) {
        const ax = isClimb ? x0 : x1, ay = isClimb ? ys : ye;
        ctx.setLineDash([4, 4]); ctx.strokeStyle = V.c('--viz-axis');
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(isClimb ? x0 + 70 : x1 - 70, ay); ctx.stroke(); ctx.setLineDash([]);
        const ang = Math.atan2(Math.abs(ye - ys), x1 - x0);
        ctx.strokeStyle = V.c('--cyan'); ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (isClimb) ctx.arc(ax, ay, 48, -ang, 0); else ctx.arc(ax, ay, 48, Math.PI, Math.PI + ang);
        ctx.stroke();
        if (!V.labelsHidden(ctx)) {
            V.font(ctx, 11, 700, true); ctx.fillStyle = V.c('--cyan'); ctx.textBaseline = 'middle';
            ctx.textAlign = isClimb ? 'left' : 'right';
            ctx.fillText(`${angleVal.toFixed(2)}°`, isClimb ? ax + 54 : ax - 54, ay - 8);
        }
    }

    // path
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, ys); ctx.lineTo(x1, ye); ctx.stroke();
    [[x0, ys], [x1, ye]].forEach(([x, y]) => {
        ctx.fillStyle = V.c('--surface'); ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();
    });

    // labels
    if (!isNaN(sAlt)) V.pill(ctx, `${fmt(Math.round(sAlt))} ft`, x0 + 2, ys + (level ? -14 : isClimb ? -30 : 16), { color: V.c('--text') });
    if (!isNaN(eAlt)) V.pill(ctx, `${fmt(Math.round(eAlt))} ft`, x1 - 2, ye + (level ? -14 : isClimb ? 16 : -30), { align: 'right', color: V.c('--text') });
    if (!V.labelsHidden(ctx)) {
        V.font(ctx, 11, 600, true); ctx.fillStyle = V.c('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${runNM} NM  ·  Δ ${fmt(Math.round(riseFT))} ft`, w / 2, yBot + 13);
    }
}

// ---------- Full multi-leg profile ----------
let _gradProfileRaf = null;
function scheduleGradProfile() {
    if (_gradProfileRaf) return;
    _gradProfileRaf = requestAnimationFrame(() => { _gradProfileRaf = null; drawGradProfile(); });
}

function drawGradProfile() {
    const svgEl = document.getElementById('grad-profile');
    const empty = document.getElementById('grad-profile-empty');
    const s = V.svg(svgEl);
    if (!s) return;
    const legs = [];
    let cursor = 0;
    document.querySelectorAll('#grad-legs-container .leg-card').forEach((card, idx) => {
        const p = card.id.replace('card-', '');
        const sAlt = parseFloat(document.getElementById(p + '-startAlt').value);
        const eAlt = parseFloat(document.getElementById(p + '-endAlt').value);
        const d = parseFloat(document.getElementById(p + '-dist').value);
        const sd = parseFloat(document.getElementById(p + '-sdist').value);
        if (isNaN(sAlt) || isNaN(eAlt) || isNaN(d) || d <= 0) return;
        const x0 = !isNaN(sd) ? sd : cursor;
        legs.push({ n: idx + 1, x0, x1: x0 + d, sAlt, eAlt, d });
        cursor = x0 + d;
    });
    empty.style.display = legs.length ? 'none' : '';
    if (!legs.length) return;

    const padL = 56, padR = 18, padT = 18, padB = 34;
    const minX = Math.min(...legs.map(l => l.x0)), maxX = Math.max(...legs.map(l => l.x1));
    let minA = Math.min(...legs.map(l => Math.min(l.sAlt, l.eAlt)));
    let maxA = Math.max(...legs.map(l => Math.max(l.sAlt, l.eAlt)));
    const spanA = Math.max(maxA - minA, 200);
    minA = Math.max(0, minA - spanA * 0.15); maxA = maxA + spanA * 0.2;
    const spanX = Math.max(maxX - minX, 0.5);
    const X = v => padL + (v - minX) / spanX * (s.w - padL - padR);
    const Y = a => s.h - padB - (a - minA) / (maxA - minA) * (s.h - padT - padB);

    // grid + axes
    const stepA = V.niceStep(maxA - minA, 4);
    for (let a = Math.ceil(minA / stepA) * stepA; a <= maxA; a += stepA) {
        V.el(s.el, 'line', { x1: padL, x2: s.w - padR, y1: Y(a), y2: Y(a), stroke: V.c('--viz-grid') });
        V.el(s.el, 'text', { x: padL - 8, y: Y(a), 'text-anchor': 'end', 'dominant-baseline': 'central', fill: V.c('--muted'), 'font-size': 10.5, 'font-family': "'JetBrains Mono', monospace" }, fmt(Math.round(a)));
    }
    const stepX = V.niceStep(spanX, 6);
    for (let x = Math.ceil(minX / stepX) * stepX; x <= maxX + 1e-9; x += stepX) {
        V.el(s.el, 'line', { x1: X(x), x2: X(x), y1: padT, y2: s.h - padB, stroke: V.c('--viz-grid') });
        V.el(s.el, 'text', { x: X(x), y: s.h - padB + 16, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 10.5, 'font-family': "'JetBrains Mono', monospace" }, +x.toFixed(2));
    }
    V.el(s.el, 'text', { x: s.w - padR, y: s.h - 4, 'text-anchor': 'end', fill: V.c('--muted'), 'font-size': 10.5 }, 'Distance (NM)');
    V.el(s.el, 'text', { x: 10, y: padT - 4, fill: V.c('--muted'), 'font-size': 10.5 }, 'ft');

    // area fill
    const defs = V.el(s.el, 'defs');
    const lg = V.el(defs, 'linearGradient', { id: 'gpfill', x1: 0, y1: 0, x2: 0, y2: 1 });
    V.el(lg, 'stop', { offset: '0%', 'stop-color': V.c('--primary'), 'stop-opacity': 0.28 });
    V.el(lg, 'stop', { offset: '100%', 'stop-color': V.c('--primary'), 'stop-opacity': 0.02 });

    legs.forEach(l => {
        const col = l.eAlt > l.sAlt ? V.c('--green') : l.eAlt < l.sAlt ? V.c('--red') : V.c('--muted');
        V.el(s.el, 'path', { d: `M${X(l.x0)} ${Y(l.sAlt)} L${X(l.x1)} ${Y(l.eAlt)} L${X(l.x1)} ${s.h - padB} L${X(l.x0)} ${s.h - padB} Z`, fill: 'url(#gpfill)' });
        V.el(s.el, 'line', { x1: X(l.x0), y1: Y(l.sAlt), x2: X(l.x1), y2: Y(l.eAlt), stroke: col, 'stroke-width': 3, 'stroke-linecap': 'round' });
        const pct = Math.abs(l.eAlt - l.sAlt) / (l.d * FT_PER_NM) * 100;
        const mx = (X(l.x0) + X(l.x1)) / 2, my = (Y(l.sAlt) + Y(l.eAlt)) / 2;
        if (X(l.x1) - X(l.x0) > 54) V.label(s, mx, my - 14, `L${l.n} ${pct.toFixed(1)}%`, col, { size: 10 });
    });
    legs.forEach((l, i) => {
        [[l.x0, l.sAlt], [l.x1, l.eAlt]].forEach(([x, a], j) => {
            V.el(s.el, 'circle', { cx: X(x), cy: Y(a), r: 4.5, fill: V.c('--surface'), stroke: V.c('--text'), 'stroke-width': 2 });
            if (j === 1 || i === 0) V.el(s.el, 'text', { 'class': 'viz-lbl', x: X(x), y: Y(a) + 16, 'text-anchor': 'middle', fill: V.c('--text-2'), 'font-size': 10.5, 'font-weight': 700, 'font-family': "'JetBrains Mono', monospace" }, fmt(Math.round(a)));
        });
    });
}

App.register('gradient', {
    onShow() {
        document.querySelectorAll('#grad-legs-container .leg-card').forEach(card => {
            calculateGradient(card.id ? card.id.replace('card-', '') : 'grad');
        });
        drawGradProfile();
    }
});
