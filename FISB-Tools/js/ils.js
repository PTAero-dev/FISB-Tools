// =========================================================
// ILS — profile, coverage (logic from v1.1); new 2D/3D visualisation
// =========================================================
function updateILSMorse(ident) {
    const morseEl = document.getElementById('ils-morse');
    const minInfoEl = document.getElementById('ils-min-info');
    if (!morseEl) return;
    let html = "";
    for (let char of ident.toUpperCase()) {
        if (MORSE_CODE[char]) html += `<span class="morse-ltr">${MORSE_CODE[char]}</span>`;
    }
    morseEl.innerHTML = html;
    if (minInfoEl) minInfoEl.innerText = "";
}

let _ilsLast = null;

function calcILS() {
    const d = parseFloat(document.getElementById('val-ils-dist').value);
    const ang = parseFloat(document.getElementById('val-ils-gpa').value);
    const tch = parseFloat(document.getElementById('val-ils-tch').value);
    const thre = parseFloat(document.getElementById('val-ils-thre').value) || 0;

    if (isNaN(d) || isNaN(ang) || isNaN(tch)) {
        document.getElementById('val-ils-hat').innerText = "-- ft";
        document.getElementById('val-ils-target').innerText = "-- ft";
        drawILSViz(0, 3, 0, 0, 0); // Clear
        return;
    }

    const distFt = d * FT_PER_NM;
    const tanVal = Math.tan(ang * Math.PI / 180);
    const hat = (distFt * tanVal) + tch;
    const target = hat + thre;

    document.getElementById('val-ils-target').innerText = fmt(Math.round(target)) + " ft";
    document.getElementById('val-ils-hat').innerText = fmt(Math.round(hat)) + " ft";

    drawILSViz(d, ang, hat, target, tch);
}

function drawILSViz(distNM, gpa, hat, targetMSL, tch) {
    _ilsLast = distNM > 0 ? { distNM, gpa, hat, targetMSL, tch } : null;
    const empty = document.getElementById('ils-empty');
    if (empty) empty.style.display = distNM > 0 ? 'none' : '';
    if (ilsView === '3d') { buildIls3D(); return; }

    const S = V.canvas(document.getElementById('ilsCanvas'));
    if (!S) return;
    const { ctx, w, h } = S;
    if (distNM <= 0) return;

    const padLeft = 48, padRight = 22, padTop = 20, padBot = 32;
    const drawW = w - padLeft - padRight, drawH = h - padTop - padBot;
    const rwyNM = Math.min(distNM * 0.14, 0.9);
    const minX = -rwyNM, maxX = distNM * 1.10;
    const toX = nm => padLeft + (nm - minX) / (maxX - minX) * drawW; // runway left, approach from the right
    // Gentle vertical scale (~22° visual slope) so glidepath doesn't look overly steep on portrait phones
    const maxY = Math.max(hat * 1.65, 400);
    const toY = alt => (h - padBot) - (alt / maxY) * drawH;
    const yG = h - padBot;

    // sky & ground
    const sky = ctx.createLinearGradient(0, padTop, 0, yG);
    sky.addColorStop(0, V.c('--sky-top')); sky.addColorStop(1, V.c('--sky-bot'));
    ctx.fillStyle = sky; ctx.fillRect(padLeft, padTop - 6, drawW, yG - padTop + 6);
    ctx.fillStyle = V.c('--ground'); ctx.fillRect(padLeft, yG, drawW, padBot - 16);

    // grid
    V.font(ctx, 10, 500, true); ctx.fillStyle = V.c('--muted');
    ctx.strokeStyle = V.c('--viz-grid'); ctx.lineWidth = 1;
    const stepY = V.niceStep(maxY, 3);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let a = 0; a <= maxY; a += stepY) {
        ctx.beginPath(); ctx.moveTo(padLeft, toY(a)); ctx.lineTo(padLeft + drawW, toY(a)); ctx.stroke();
        ctx.fillText(fmt(Math.round(a)), padLeft - 6, toY(a));
    }
    const stepX = V.niceStep(maxX, drawW < 230 ? 4 : 6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let x = stepX; x <= maxX; x += stepX) {
        ctx.beginPath(); ctx.moveTo(toX(x), padTop); ctx.lineTo(toX(x), yG); ctx.stroke();
        ctx.fillText(+x.toFixed(1), toX(x), yG + 5);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('ft HAT', 6, 13);
    ctx.textAlign = 'right'; ctx.fillText('NM from THR', padLeft + drawW, h - 3);

    // runway & THR label (replaces 0 on X-axis so it never overlaps)
    const xThr = toX(0);
    ctx.fillStyle = '#2b313b'; ctx.fillRect(toX(minX), yG - 3, xThr - toX(minX), 6);
    ctx.fillStyle = '#e5e7eb';
    for (let x = xThr - 6; x > toX(minX) + 4; x -= 12) ctx.fillRect(x - 4, yG - 0.75, 5, 1.5);
    V.font(ctx, 10, 800, true); ctx.fillStyle = V.c('--amber'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('THR', xThr, yG + 5);

    // GP extension (dashed) + GP
    const gpY = nm => toY(tch + nm * FT_PER_NM * Math.tan(gpa * Math.PI / 180));
    ctx.setLineDash([6, 5]); ctx.strokeStyle = V.c('--amber'); ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(toX(distNM), gpY(distNM)); ctx.lineTo(toX(maxX), gpY(maxX)); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    const xTarget = toX(distNM), yTarget = toY(hat), yTch = toY(tch);
    const fill = ctx.createLinearGradient(0, yTarget, 0, yG);
    fill.addColorStop(0, 'rgba(245,185,66,0.22)'); fill.addColorStop(1, 'rgba(245,185,66,0.02)');
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.moveTo(xThr, yTch); ctx.lineTo(xTarget, yTarget); ctx.lineTo(xTarget, yG); ctx.lineTo(xThr, yG); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = V.c('--amber'); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(xThr, yTch); ctx.lineTo(xTarget, yTarget); ctx.stroke();

    // TCH dot + angle arc
    ctx.fillStyle = V.c('--amber'); ctx.beginPath(); ctx.arc(xThr, yTch, 4, 0, Math.PI * 2); ctx.fill();
    const angPx = Math.atan2(yTch - yTarget, xTarget - xThr);
    const arcR = Math.min(44, Math.max(24, (xTarget - xThr) * 0.28));
    ctx.strokeStyle = V.c('--amber'); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(xThr, yTch, arcR, -angPx, 0); ctx.stroke();
    if (!V.labelsHidden(ctx)) {
        V.font(ctx, 10.5, 700, true); ctx.fillStyle = V.c('--amber'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${gpa}° (TCH ${tch}')`, xThr + arcR + 5, yTch - 8);
    }

    // drop line
    ctx.strokeStyle = V.c('--primary'); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(xTarget, yTarget); ctx.lineTo(xTarget, yG); ctx.stroke(); ctx.setLineDash([]);

    // aircraft glyph at capture
    ctx.save(); ctx.translate(xTarget, yTarget); ctx.rotate(Math.atan2(yTch - yTarget, xThr - xTarget) + Math.PI);
    ctx.scale(-1.05, 1.05);
    ctx.fillStyle = V.c('--text');
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, -2.5); ctx.lineTo(15, 0); ctx.lineTo(10, 2.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(-6, -10); ctx.lineTo(-2, -10); ctx.lineTo(5, -1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-12, -1); ctx.lineTo(-15, -7); ctx.lineTo(-12, -7); ctx.lineTo(-8, -1); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = V.c('--green'); ctx.beginPath(); ctx.arc(xTarget, yTarget, 3.5, 0, Math.PI * 2); ctx.fill();

    // Non-clipping labels: align to the left of the aircraft so they stay 100% inside the plot
    const lx = Math.max(padLeft + 140, xTarget - 14);
    const ly = Math.max(padTop + 14, yTarget - 18);
    V.pill(ctx, `GP ${fmt(Math.round(targetMSL))}' MSL`, lx, ly, { align: 'right', color: V.c('--cyan'), size: 11.5 });
    V.pill(ctx, `${distNM.toFixed(1)} NM · ${fmt(Math.round(hat))}' HAT`, lx, ly + 22, { align: 'right', color: V.c('--text-2'), size: 10.5, weight: 600 });
}

// --- ILS COVERAGE ---
let covMode = 'loc'; // 'loc' or 'gs'
function setCovMode(mode) {
    covMode = mode;
    document.getElementById('btn-cov-loc').classList.toggle('active', mode === 'loc');
    document.getElementById('btn-cov-gs').classList.toggle('active', mode === 'gs');
    document.getElementById('fc-arc-deg').innerText = (mode === 'loc') ? '40' : '8';
    drawILSCov();
}

function drawILSCov() {
    const crs = parseFloat(document.getElementById('fc-crs').value);
    const dist = parseFloat(document.getElementById('fc-dist').value);
    const gs = parseFloat(document.getElementById('fc-gs').value);
    const c = document.getElementById('fltCkCanvas');

    const ident = document.getElementById('val-ils-id') ? (document.getElementById('val-ils-id').value.toUpperCase() || "ILS") : "ILS";
    if (document.getElementById('fc-chart-title')) document.getElementById('fc-chart-title').innerText = `${ident} Coverage Sector`;
    if (ilsView === '3d' && ilsScene) buildIls3D();

    const empty = document.getElementById('fc-empty');
    if (empty) empty.style.display = isNaN(crs) ? '' : 'none';

    if (isNaN(crs)) {
        document.getElementById('fc-radial').innerText = "--";
        document.getElementById('fc-left').innerText = "--";
        document.getElementById('fc-right').innerText = "--";
        document.getElementById('fc-time').innerText = "--:--";
        if (c) V.canvas(c);
        return;
    }

    const limit = (covMode === 'loc') ? 40 : 8;
    const inboundRad = (crs + 180) % 360;
    const leftLim = (inboundRad - limit + 360) % 360;
    const rightLim = (inboundRad + limit + 360) % 360;
    const fmtRad = (r) => "R" + Math.round(r === 0 ? 360 : r).toString().padStart(3, '0');

    document.getElementById('fc-radial').innerText = fmtRad(inboundRad);
    document.getElementById('fc-left').innerText = fmtRad(leftLim);
    document.getElementById('fc-right').innerText = fmtRad(rightLim);

    let timeMin = NaN;
    if (!isNaN(dist) && !isNaN(gs) && gs > 0) {
        const totalAngle = limit * 2;
        const arcDist = (totalAngle / 360) * 2 * Math.PI * dist;
        const timeHrs = arcDist / gs;
        timeMin = timeHrs * 60;
        document.getElementById('fc-time').innerText = formatMinSec(timeMin) + " min";

        const startTimeInput = document.getElementById('fc-start-time');
        let timeStr = startTimeInput ? startTimeInput.value : "";

        if (timeStr && (/^\d{4}$/.test(timeStr) || /^\d{6}$/.test(timeStr))) {
            let startH = parseInt(timeStr.substring(0, 2));
            let startM = parseInt(timeStr.substring(2, 4));

            // Handle Seconds if present (Round Up Minutes)
            if (timeStr.length === 6) {
                let startS = parseInt(timeStr.substring(4, 6));
                if (startS > 0) {
                    startM++;
                    if (startM >= 60) {
                        startM = 0;
                        startH++;
                        if (startH >= 24) startH = 0;
                    }
                }
            }

            if (startH >= 0 && startH < 24 && startM >= 0 && startM < 60) {
                const totalMin = (startH * 60) + startM + timeMin;
                const endH = Math.floor(totalMin / 60) % 24;
                const endM = Math.floor(totalMin % 60);
                const utcTimeString = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                const now = new Date();
                const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), startH, startM, 0));
                startDate.setMinutes(startDate.getMinutes() + timeMin);
                const localH = startDate.getHours().toString().padStart(2, '0');
                const localM = startDate.getMinutes().toString().padStart(2, '0');

                document.getElementById('fc-end-time-utc').innerText = utcTimeString;
                document.getElementById('fc-end-time-local').innerText = `${localH}:${localM}`;
            } else {
                document.getElementById('fc-end-time-utc').innerText = "Inv";
                document.getElementById('fc-end-time-local').innerText = "Inv";
            }
        } else {
            document.getElementById('fc-end-time-utc').innerText = "--:--";
            document.getElementById('fc-end-time-local').innerText = "--:--";
        }
    } else {
        document.getElementById('fc-time').innerText = "--:--";
        document.getElementById('fc-end-time-utc').innerText = "--:--";
        document.getElementById('fc-end-time-local').innerText = "--:--";
    }

    // ---------- Visualisation ----------
    const S = V.canvas(c);
    if (!S) return;
    const { ctx, w, h } = S;
    const cx = w / 2, cy = h / 2;
    const r = Math.max(60, Math.min(w, h) / 2 - 36);
    const toRad = (deg) => (deg - 90) * (Math.PI / 180);
    const P = (brg, rr) => [cx + Math.cos(toRad(brg)) * rr, cy + Math.sin(toRad(brg)) * rr];

    // rose
    ctx.fillStyle = V.c('--surface-2'); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = V.c('--border-strong'); ctx.lineWidth = 1; ctx.stroke();
    [0.33, 0.66].forEach(f => { ctx.strokeStyle = V.c('--viz-grid'); ctx.beginPath(); ctx.arc(cx, cy, r * f, 0, Math.PI * 2); ctx.stroke(); });
    for (let b = 0; b < 360; b += 5) {
        const major = b % 30 === 0;
        const [x1, y1] = P(b, r), [x2, y2] = P(b, r - (major ? 10 : b % 10 === 0 ? 6 : 3));
        ctx.strokeStyle = major ? V.c('--viz-axis') : V.c('--viz-grid'); ctx.lineWidth = major ? 1.5 : 1;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        if (major) {
            const lbl = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[b] || String(b / 10).padStart(2, '0');
            const [tx, ty] = P(b, r + 14);
            V.font(ctx, lbl.length === 1 ? 12 : 10, 700); ctx.fillStyle = lbl.length === 1 ? V.c('--text') : V.c('--muted');
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(lbl, tx, ty);
        }
    }

    // sector wedge
    const col = covMode === 'loc' ? V.c('--cyan') : V.c('--amber');
    const startAng = toRad(leftLim), endAng = toRad(rightLim);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, col + '55'); grad.addColorStop(1, col + '18');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, startAng, endAng); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    [leftLim, rightLim].forEach(b => { const [x, y] = P(b, r); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); });
    ctx.setLineDash([]);

    // flight-check arc
    if (!isNaN(dist) && dist > 0) {
        const ra = r * 0.78;
        ctx.strokeStyle = V.c('--primary'); ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, ra, startAng, endAng); ctx.stroke();
        const [ex, ey] = P(rightLim, ra);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(endAng + Math.PI); // tangent of a clockwise arc
        ctx.fillStyle = V.c('--primary'); ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
        ctx.restore();
        const [mx, my] = P(inboundRad, ra);
        V.pill(ctx, `${dist} NM arc`, mx, my + 16, { align: 'center', color: V.c('--primary'), size: 10 });
    }

    // centreline (inbound radial) with arrow toward station
    ctx.strokeStyle = V.c('--green'); ctx.lineWidth = 2.5;
    const [ox, oy] = P(inboundRad, r - 6);
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(cx, cy); ctx.stroke();
    const [ax, ay] = P(inboundRad, r * 0.45);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(toRad(crs) + Math.PI / 2);
    ctx.fillStyle = V.c('--green'); ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 5); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
    ctx.restore();

    // runway symbol aligned with course
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(toRad(crs) + Math.PI / 2);
    ctx.fillStyle = '#2b313b'; ctx.strokeStyle = V.c('--text'); ctx.lineWidth = 1;
    ctx.fillRect(-4, -22, 8, 30); ctx.strokeRect(-4, -22, 8, 30);
    ctx.restore();

    // limit labels
    [[leftLim, 'L'], [rightLim, 'R']].forEach(([b]) => {
        const [x, y] = P(b, r + 2);
        V.pill(ctx, fmtRad(b), x, y, { align: 'center', color: col, size: 10.5 });
    });
    const crsLabel = Math.round(crs).toString().padStart(3, '0');
    V.pill(ctx, `LOC CRS ${crsLabel}`, 10, 18, { color: V.c('--green'), size: 12 });
    V.pill(ctx, `${covMode === 'loc' ? 'LOC' : 'GS'} ±${limit}°`, w - 10, 18, { align: 'right', color: col, size: 11 });
}

function setNowUTC() {
    const now = new Date();
    const h = now.getUTCHours().toString().padStart(2, '0');
    const m = now.getUTCMinutes().toString().padStart(2, '0');
    const input = document.getElementById('fc-start-time');
    if (input) {
        input.value = `${h}${m}`;
        drawILSCov();
    }
}

// =========================================================
// ILS 3D approach scene
// =========================================================
let ilsView = '2d';
let ilsExag = 3;
let ilsScene = null;

function setIlsView(v) {
    ilsView = v;
    setSegActive(document.querySelector('#ils-2d-wrap').closest('.panel').querySelector('.panel-head .seg'), 'view', v);
    document.getElementById('ils-2d-wrap').classList.toggle('hidden', v !== '2d');
    document.getElementById('ils-3d-wrap').classList.toggle('hidden', v !== '3d');
    if (v === '3d') buildIls3D(true); else calcILS();
}
function setIlsExag(e) {
    ilsExag = e;
    document.querySelectorAll('#ils-exag button').forEach(b => b.classList.toggle('active', b.textContent === '×' + e));
    buildIls3D(true);
}

function buildIls3D(refit) {
    const host = document.getElementById('ils-3d');
    if (!ilsScene) {
        if (host.dataset.loading) return;
        host.dataset.loading = '1';
        host.innerHTML = '<div class="viz-empty"><div>Loading 3D…</div></div>';
        loadThree().then(() => {
            delete host.dataset.loading;
            ilsScene = new Scene3D(host);
            ilsScene.onTheme = () => buildIls3D();
            buildIls3D(true);
        }).catch(() => { delete host.dataset.loading; show3DError(host); });
        return;
    }
    const S = ilsScene, T = THREE;
    S.clear();
    const isLight = document.body.classList.contains('light-theme');
    const st = _ilsLast;
    const crsVal = parseFloat(document.getElementById('fc-crs').value);
    const crs = isNaN(crsVal) ? 0 : crsVal;
    const k = ilsExag / FT_PER_NM; // ft → NM (scene units) with exaggeration
    const dist = st ? st.distNM : 8;
    const gpa = st ? st.gpa : 3;
    const tch = st ? st.tch : 50;
    const fcDist = parseFloat(document.getElementById('fc-dist').value);
    const R = Math.max(dist * 1.35, isNaN(fcDist) ? 0 : fcDist, 6);
    const rwyL = 1.6, rwyW = 0.06;

    const grp = new T.Group();
    grp.rotation.y = -crs * Math.PI / 180;
    S.add(grp);
    const W = (x, y, z) => { grp.updateMatrixWorld(true); return grp.localToWorld(new T.Vector3(x, y, z)); };

    // ground (world aligned, round)
    const ground = new T.Mesh(new T.CircleGeometry(R * 1.25, 96), M3.mat(isLight ? '#d6dccf' : '#121a14', { roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; S.add(ground);
    S.add(M3.ring(0, 0, 0.001, R * 1.2, isLight ? '#64748b' : '#5b6b82', { opacity: 0.5 }));
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([n, b]) => {
        const a = b * Math.PI / 180;
        S.label(n, new T.Vector3(Math.sin(a) * R * 1.24, 0, -Math.cos(a) * R * 1.24), 'plain');
    });

    // runway & centreline extension
    grp.add(M3.runway(rwyL, rwyW, { thick: 0.002 }));
    grp.add(M3.line([[0, 0.003, 0], [0, 0.003, R]], isLight ? '#64748b' : '#8391a7', { dash: 0.12, gap: 0.1, opacity: 0.7 }));
    for (let n = 1; n <= Math.floor(R); n++) {
        if (n % (R > 12 ? 2 : 1)) continue;
        const tick = new T.Mesh(new T.PlaneGeometry(0.08, 0.012), M3.basic(isLight ? '#475569' : '#9fb3c8'));
        tick.rotation.x = -Math.PI / 2; tick.position.set(0, 0.004, n); grp.add(tick);
        S.label(`${n}`, W(0.1, 0, n), 'plain');
    }
    S.label(isNaN(crsVal) ? 'Final course not set — shown north' : `RWY · CRS ${String(Math.round(crs)).padStart(3, '0')}`, W(0, 0.02, -rwyL * 0.5), isNaN(crsVal) ? 'amber' : '');

    // LOC ±40° coverage (from localizer antenna beyond stop end)
    const locZ = -rwyL - 0.16;
    const locR = R + rwyL;
    grp.add(M3.fan(0, locZ, 0.004, locR, Math.PI - 40 * Math.PI / 180, Math.PI + 40 * Math.PI / 180, '#22d3ee', covMode === 'loc' ? 0.09 : 0.05));
    grp.add(M3.fanEdge(0, locZ, 0.005, locR, Math.PI - 40 * Math.PI / 180, Math.PI + 40 * Math.PI / 180, '#22d3ee'));
    [-40, 40].forEach(a => {
        const ar = Math.PI + a * Math.PI / 180;
        grp.add(M3.line([[0, 0.005, locZ], [Math.sin(ar) * locR, 0.005, locZ - Math.cos(ar) * locR]], '#22d3ee', { dash: 0.15, gap: 0.12 }));
    });
    grp.add(M3.tower(0.02, 0.03, '#22d3ee', { cap: false }).translateZ(locZ));
    S.label('LOC ±40°', W(Math.sin(Math.PI + 0.55) * locR * 0.92, 0, locZ - Math.cos(Math.PI + 0.55) * locR * 0.92), 'cyan');

    // GS ±8° sector on the glide path surface
    const gsPts = [];
    const tanG = Math.tan(gpa * Math.PI / 180);
    const yAt = rr => (tch + rr * FT_PER_NM * tanG) * k;
    const steps = 40, a8 = 8 * Math.PI / 180;
    for (let i = 0; i < steps; i++) {
        const r0 = R * i / steps, r1 = R * (i + 1) / steps;
        const P = (rr, a) => [Math.sin(Math.PI + a) * rr, yAt(rr), -Math.cos(Math.PI + a) * rr];
        gsPts.push(...P(r0, -a8), ...P(r1, -a8), ...P(r1, a8), ...P(r0, -a8), ...P(r1, a8), ...P(r0, a8));
    }
    const gsg = new T.BufferGeometry(); gsg.setAttribute('position', new T.Float32BufferAttribute(gsPts, 3));
    grp.add(new T.Mesh(gsg, M3.basic('#f5b942', { transparent: true, opacity: covMode === 'gs' ? 0.32 : 0.2, depthWrite: false })));
    [-a8, a8].forEach(a => grp.add(M3.line([[0, yAt(0), 0], [Math.sin(Math.PI + a) * R, yAt(R), -Math.cos(Math.PI + a) * R]], '#f5b942', { opacity: 0.6 })));
    S.label(`GS ±8° · ${gpa}°`, W(Math.sin(Math.PI + a8) * R, yAt(R), -Math.cos(Math.PI + a8) * R), 'amber');

    // glide path line + aircraft
    grp.add(M3.tube(new T.Vector3(0, tch * k, 0), new T.Vector3(0, yAt(dist), dist), 0.012, '#f5b942'));
    grp.add(M3.line([[0, yAt(dist), dist], [0, yAt(R), R]], '#f5b942', { dash: 0.1, gap: 0.08, opacity: 0.7 }));
    S.label(`TCH ${tch}'`, W(0, tch * k + 0.02, 0), 'amber');
    if (st) {
        const ac = M3.aircraft(isLight ? '#ffffff' : '#e8edf5', '#4f8cff', 0.5);
        ac.position.set(0, yAt(dist), dist);
        ac.rotation.x = Math.atan(tanG * ilsExag);
        grp.add(ac);
        grp.add(M3.line([[0, yAt(dist), dist], [0, 0, dist]], '#4f8cff', { dash: 0.05, gap: 0.04 }));
        S.label(`GP ${fmt(Math.round(st.targetMSL))}' MSL · ${dist.toFixed(1)} NM`, W(0, yAt(dist) + 0.18, dist), 'cyan');
    }

    if (refit || !S._fitted) {
        S._fitted = true;
        const tgt = W(0, yAt(dist) * 0.4, dist * 0.45);
        // camera on the right of the approach, ~55° off the inbound course
        S.setView({ az: -crs * Math.PI / 180 + 0.9, el: 0.5, dist: Math.max(dist, 4) * 2.5, target: tgt, minDist: 0.3, maxDist: R * 12 });
    }
    S.requestRender();
}

// =========================================================
// LOC COURSE WIDTH CALCULATOR (ICAO Annex 10 Vol I, 3.1.3.7)
// Half-sector linear width at ILS Reference Datum (THR) = 106.68 m (350 ft)
// Full linear width at THR = 213.36 m (700 ft)
// =========================================================
const LOC_HALF_WIDTH_M = 106.68; // 350 ft exact (350 * 0.3048 = 106.68 m)
const FT_PER_M = 3.280839895;

function setLocSetbackM(mVal, btn) {
    const smEl = document.getElementById('locw-set-m');
    const sftEl = document.getElementById('locw-set-ft');
    if (smEl) smEl.value = mVal;
    if (sftEl) sftEl.value = Math.round(mVal * FT_PER_M);
    document.querySelectorAll('#locw-presets .preset-chip').forEach(b => b.classList.toggle('active', b === btn));
    calcLocWidth('preset');
}

function setLocSetbackFt(ftVal, btn) {
    const smEl = document.getElementById('locw-set-m');
    const sftEl = document.getElementById('locw-set-ft');
    if (sftEl) sftEl.value = ftVal;
    if (smEl) smEl.value = Math.round(ftVal / FT_PER_M);
    document.querySelectorAll('#locw-presets .preset-chip').forEach(b => b.classList.toggle('active', b === btn));
    calcLocWidth('preset');
}

const M_PER_NM = 1852;

function setLocQueryNM(nm, btn) {
    const qm = document.getElementById('locw-q-m');
    const qft = document.getElementById('locw-q-ft');
    const qnm = document.getElementById('locw-q-nm');
    if (qnm) qnm.value = nm;
    if (qm) qm.value = Math.round(nm * M_PER_NM);
    if (qft) qft.value = Math.round(nm * M_PER_NM * FT_PER_M);
    document.querySelectorAll('#locw-q-presets .preset-chip').forEach(b => b.classList.toggle('active', b === btn));
    calcLocWidth('q-preset');
}

// Updates the "width at distance" readouts; returns query distance (m from THR) or NaN
function calcLocQuery(src, totalM) {
    const qm = document.getElementById('locw-q-m');
    const qft = document.getElementById('locw-q-ft');
    const qnm = document.getElementById('locw-q-nm');
    if (!qm || !qft || !qnm) return NaN;

    if (src === 'q-m' || src === 'q-ft' || src === 'q-nm') {
        let m = NaN;
        if (src === 'q-m') m = parseFloat(qm.value);
        else if (src === 'q-ft') m = parseFloat(qft.value) / FT_PER_M;
        else m = parseFloat(qnm.value) * M_PER_NM;
        const ok = !isNaN(m);
        if (src !== 'q-m') qm.value = ok ? Math.round(m) : '';
        if (src !== 'q-ft') qft.value = ok ? Math.round(m * FT_PER_M) : '';
        if (src !== 'q-nm') qnm.value = ok ? +(m / M_PER_NM).toFixed(3) : '';
        document.querySelectorAll('#locw-q-presets .preset-chip').forEach(b => b.classList.remove('active'));
    }

    const ids = ['locw-q-full', 'locw-q-full-alt', 'locw-q-half', 'locw-q-half-alt', 'locw-q-fromloc', 'locw-q-sens'];
    const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
    const set = (id, t) => { if (el[id]) el[id].textContent = t; };
    const blank = () => {
        set('locw-q-full', '-- m'); set('locw-q-full-alt', '150 µA L ↔ 150 µA R');
        set('locw-q-half', '-- m'); set('locw-q-half-alt', '0.155 DDM / 150 µA');
        set('locw-q-fromloc', '--'); set('locw-q-sens', '--');
    };

    // Distance from THR (m); the metre field is the shared value (rounded to 1 m)
    const dq = parseFloat(qm.value);
    if (!(totalM > 0) || isNaN(dq)) { blank(); return NaN; }

    const fromLoc = totalM + dq;
    if (fromLoc <= 0) {
        blank();
        set('locw-q-full-alt', 'Point is behind LOC antenna');
        return NaN;
    }
    const halfM = LOC_HALF_WIDTH_M * fromLoc / totalM;
    const fullM = halfM * 2;
    const fmtLen = m => m >= 1000 ? fmt(Math.round(m)) : m.toFixed(1);
    set('locw-q-full', `${fmtLen(fullM)} m`);
    set('locw-q-full-alt', `${fmt(Math.round(fullM * FT_PER_M))} ft · ${(fullM / M_PER_NM).toFixed(3)} NM`);
    set('locw-q-half', `±${fmtLen(halfM)} m`);
    set('locw-q-half-alt', `±${fmt(Math.round(halfM * FT_PER_M))} ft · ±${(halfM / M_PER_NM).toFixed(3)} NM`);
    set('locw-q-fromloc', `${fmt(Math.round(fromLoc))} m  (${(fromLoc / M_PER_NM).toFixed(2)} NM)`);
    set('locw-q-sens', `${(0.155 / halfM).toPrecision(3)} DDM/m · ${(150 / halfM).toPrecision(3)} µA/m`);
    return dq;
}

function resetLocWidth() {
    ['locw-q-m', 'locw-q-ft', 'locw-q-nm'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
    document.querySelectorAll('#locw-q-presets .preset-chip').forEach(b => b.classList.remove('active'));
    const rmEl = document.getElementById('locw-rwy-m');
    const rftEl = document.getElementById('locw-rwy-ft');
    const smEl = document.getElementById('locw-set-m');
    const sftEl = document.getElementById('locw-set-ft');
    if (rmEl) rmEl.value = '';
    if (rftEl) rftEl.value = '';
    if (smEl) smEl.value = '0';
    if (sftEl) sftEl.value = '0';
    const chips = document.querySelectorAll('#locw-presets .preset-chip');
    chips.forEach((b, i) => b.classList.toggle('active', i === 0));
    calcLocWidth();
}

function fmtDegDMS(deg) {
    const d = Math.floor(deg);
    const mFull = (deg - d) * 60;
    const m = Math.floor(mFull);
    const s = Math.round((mFull - m) * 60);
    return `${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}"`;
}

function calcLocWidth(src) {
    const rmEl = document.getElementById('locw-rwy-m');
    const rftEl = document.getElementById('locw-rwy-ft');
    const smEl = document.getElementById('locw-set-m');
    const sftEl = document.getElementById('locw-set-ft');
    if (!rmEl || !rftEl) return;

    if (src === 'rwy-m') {
        const m = parseFloat(rmEl.value);
        rftEl.value = (!isNaN(m) && m > 0) ? Math.round(m * FT_PER_M) : '';
    } else if (src === 'rwy-ft') {
        const ft = parseFloat(rftEl.value);
        rmEl.value = (!isNaN(ft) && ft > 0) ? Math.round(ft / FT_PER_M) : '';
    } else if (src === 'set-m') {
        const sm = parseFloat(smEl.value);
        sftEl.value = !isNaN(sm) ? Math.round(sm * FT_PER_M) : '';
        document.querySelectorAll('#locw-presets .preset-chip').forEach(b => b.classList.remove('active'));
    } else if (src === 'set-ft') {
        const sft = parseFloat(sftEl.value);
        smEl.value = !isNaN(sft) ? Math.round(sft / FT_PER_M) : '';
        document.querySelectorAll('#locw-presets .preset-chip').forEach(b => b.classList.remove('active'));
    }

    const rwyM = parseFloat(rmEl.value);
    const setM = parseFloat(smEl && smEl.value !== '' ? smEl.value : '0') || 0;

    const thetaEl = document.getElementById('locw-theta');
    const dmsEl = document.getElementById('locw-theta-dms');
    const halfEl = document.getElementById('locw-half');
    const statusEl = document.getElementById('locw-status');
    const distEl = document.getElementById('locw-total-dist');
    const sensDegEl = document.getElementById('locw-sens-deg');

    if (isNaN(rwyM) || rwyM <= 0) {
        if (thetaEl) thetaEl.textContent = '-- °';
        if (dmsEl) dmsEl.textContent = 'Full Sector (150 µA – 150 µA)';
        if (halfEl) halfEl.textContent = '-- °';
        if (statusEl) statusEl.textContent = 'Enter runway length';
        if (distEl) distEl.textContent = '--';
        if (sensDegEl) sensDegEl.textContent = '--';
        calcLocQuery(src, 0);
        drawLocWidthViz(0, 0, 0, 0);
        return;
    }

    const totalM = rwyM + Math.max(0, setM);
    const totalFt = totalM * FT_PER_M;
    const halfRad = Math.atan(LOC_HALF_WIDTH_M / totalM);
    const halfDeg = halfRad * 180 / Math.PI;
    const thetaDeg = halfDeg * 2;

    const ddmPerDeg = 0.155 / halfDeg;
    const uaPerDeg = 150 / halfDeg;

    if (thetaEl) thetaEl.textContent = `${thetaDeg.toFixed(2)}°`;
    if (dmsEl) dmsEl.textContent = `${fmtDegDMS(thetaDeg)} (${thetaDeg.toFixed(3)}°)`;
    if (halfEl) halfEl.textContent = `±${halfDeg.toFixed(2)}°`;
    if (distEl) distEl.textContent = `${fmt(Math.round(totalM))} m  (${fmt(Math.round(totalFt))} ft)`;
    if (sensDegEl) sensDegEl.textContent = `${ddmPerDeg.toFixed(4)} DDM/° · ${uaPerDeg.toFixed(1)} µA/°`;

    if (statusEl) {
        if (thetaDeg >= 3.0 && thetaDeg <= 6.0) {
            statusEl.innerHTML = `<span style="color:var(--green); font-weight:700;">ICAO Standard (3°–6°)</span>`;
        } else if (thetaDeg > 6.0) {
            statusEl.innerHTML = `<span style="color:var(--amber); font-weight:700;">> 6.0° (Tailored cap = 6.0°)</span>`;
        } else {
            statusEl.innerHTML = `<span style="color:var(--cyan); font-weight:700;">< 3.0° (Long RWY sector)</span>`;
        }
    }

    const dq = calcLocQuery(src, totalM);
    drawLocWidthViz(rwyM, Math.max(0, setM), totalM, thetaDeg, dq);
}

function drawLocWidthViz(rwyM, setM, totalM, thetaDeg, dq) {
    const empty = document.getElementById('locw-empty');
    if (empty) empty.style.display = totalM > 0 ? 'none' : '';
    const S = V.canvas(document.getElementById('locWidthCanvas'));
    if (!S) return;
    const { ctx, w, h } = S;
    if (totalM <= 0) return;

    const padL = 26, padR = 26, padT = 22, padB = 26;
    const drawW = w - padL - padR;
    const cy = (padT + (h - padB)) / 2;

    // Horizontal coordinates: THR on left (xThr), Stop End (xStop), LOC Antenna on right (xLoc)
    const hasQ = typeof dq === 'number' && !isNaN(dq);
    const appM = Math.max(totalM * 0.18, hasQ ? dq * 1.12 : 0); // approach before THR (extends to query point)
    const spanM = appM + totalM * 1.04;
    const toX = mFromThr => padL + ((mFromThr + appM) / spanM) * drawW;

    const xApp = toX(-appM * 0.85);
    const xThr = toX(0);
    const xStop = toX(rwyM);
    const xLoc = toX(totalM);

    // Visual half-width at threshold (schematic vertical scale so wedge is crisp and readable)
    // When the view is stretched for a far query point, shrink the gate so the far edge still fits
    const maxHalfPx = (h - padT - padB) / 2 - 4;
    const halfGatePx = Math.max(4, Math.min(54, Math.max(36, (h - padT - padB) * 0.34),
        maxHalfPx * (xLoc - xThr) / Math.max(1, xLoc - xApp)));
    const lblGate = Math.max(halfGatePx, 24);
    // Slope from LOC antenna (xLoc, cy) through (xThr, cy ± halfGatePx)
    const yAtX = (x, sign) => cy + sign * halfGatePx * ((xLoc - x) / Math.max(1, xLoc - xThr));

    // Centreline dashed
    ctx.strokeStyle = V.c('--viz-axis'); ctx.lineWidth = 1; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(padL, cy); ctx.lineTo(w - padR, cy); ctx.stroke();
    ctx.setLineDash([]);

    // Course sector wedge from LOC antenna through THR to approach
    const grad = ctx.createLinearGradient(xLoc, 0, xApp, 0);
    grad.addColorStop(0, 'rgba(34,211,238,0.26)');
    grad.addColorStop(1, 'rgba(34,211,238,0.06)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(xLoc, cy);
    ctx.lineTo(xApp, yAtX(xApp, -1));
    ctx.lineTo(xApp, yAtX(xApp, +1));
    ctx.closePath();
    ctx.fill();

    // Sector boundary rays (±0.155 DDM / ±150 µA)
    ctx.strokeStyle = V.c('--cyan'); ctx.lineWidth = 2;
    [-1, 1].forEach(s => {
        ctx.beginPath(); ctx.moveTo(xLoc, cy); ctx.lineTo(xApp, yAtX(xApp, s)); ctx.stroke();
    });

    // Runway strip (THR to Stop End)
    const rwyHalfH = 10;
    ctx.fillStyle = '#2b313b'; ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1;
    ctx.fillRect(xThr, cy - rwyHalfH, Math.max(8, xStop - xThr), rwyHalfH * 2);
    ctx.strokeRect(xThr, cy - rwyHalfH, Math.max(8, xStop - xThr), rwyHalfH * 2);
    ctx.fillStyle = '#e5e7eb';
    for (let x = xThr + 10; x < xStop - 8; x += 16) ctx.fillRect(x, cy - 1, 8, 2);

    // Threshold ±106.7 m (±350 ft) gate line
    ctx.strokeStyle = V.c('--amber'); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(xThr, cy - halfGatePx); ctx.lineTo(xThr, cy + halfGatePx); ctx.stroke();
    [-1, 1].forEach(s => {
        ctx.fillStyle = V.c('--amber');
        ctx.beginPath(); ctx.arc(xThr, cy + s * halfGatePx, 3.5, 0, Math.PI * 2); ctx.fill();
    });

    // Query point: width at distance
    let xQ = NaN;
    if (hasQ) {
        xQ = toX(dq);
        const yT = yAtX(xQ, -1), yB = yAtX(xQ, +1);
        ctx.strokeStyle = V.c('--violet'); ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(xQ, yT); ctx.lineTo(xQ, yB); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = V.c('--violet');
        [yT, yB].forEach(y => { ctx.beginPath(); ctx.arc(xQ, y, 3.5, 0, Math.PI * 2); ctx.fill(); });
    }

    // LOC antenna marker
    ctx.fillStyle = V.c('--cyan');
    ctx.beginPath(); ctx.arc(xLoc, cy, 5, 0, Math.PI * 2); ctx.fill();

    // Dimension line at bottom (THR to LOC)
    const yDim = h - 10;
    ctx.strokeStyle = V.c('--muted'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xThr, yDim); ctx.lineTo(xLoc, yDim); ctx.stroke();
    [xThr, xStop, xLoc].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x, yDim - 4); ctx.lineTo(x, yDim + 4); ctx.stroke();
    });

    // Floating labels (automatically hidden when Hide Labels is toggled)
    V.pill(ctx, `±106.7 m (±350')`, xThr + 6, cy - lblGate - 10, { color: V.c('--amber'), size: 10.5 });
    V.pill(ctx, `θ = ${thetaDeg.toFixed(2)}° (±${(thetaDeg / 2).toFixed(2)}°)`, (xThr + xLoc) * 0.5, cy - lblGate * 0.58 - (lblGate > halfGatePx ? 14 : 0), { align: 'center', color: V.c('--cyan'), size: 11.5 });
    V.pill(ctx, `THR`, xThr, cy + lblGate + 12, { align: 'center', color: V.c('--amber'), size: 10 });
    if (hasQ) {
        const fullM = 2 * LOC_HALF_WIDTH_M * (totalM + dq) / totalM;
        const wTxt = fullM >= 1000 ? fmt(Math.round(fullM)) : fullM.toFixed(1);
        V.pill(ctx, `W = ${wTxt} m @ ${(dq / M_PER_NM).toFixed(2)} NM`, Math.max(xQ, padL + 70), yAtX(xQ, -1) - 10,
            { align: 'center', color: V.c('--violet'), size: 10.5 });
    }
    V.pill(ctx, `LOC`, xLoc, cy - 18, { align: 'center', color: V.c('--cyan'), size: 10 });
    if (!V.labelsHidden(ctx)) {
        V.font(ctx, 10, 600, true); ctx.fillStyle = V.c('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(`D = ${fmt(Math.round(totalM))} m (${fmt(Math.round(totalM * FT_PER_M))} ft)`, (xThr + xLoc) / 2, yDim - 3);
    }
}

App.register('ils', {
    onShow(pane) {
        if (pane === 'profile' || !pane) { calcILS(); if (ilsScene) ilsScene.resize(); }
        if (pane === 'coverage') drawILSCov();
        if (pane === 'locwidth') calcLocWidth();
    }
});
