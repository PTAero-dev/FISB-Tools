// =========================================================
// WAYPOINT PROJECTOR & RF ARC — WGS-84 Vincenty (logic from v1.1)
// New: coordinate input cards, plan-view plots
// =========================================================
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function getCoordInputHTML(prefix, labelSuffix) {
    const box = (ax, label, dMax, dLen) => `
        <div class="cbox" id="${prefix}-${ax}-cbox">
            <div class="cl">${label} ${labelSuffix} <span style="opacity:.65;font-weight:500;">(≤${dMax}°)</span><em>DMS · DMM</em></div>
            <div class="trip">
                <input type="text" inputmode="numeric" id="${prefix}-${ax}-d" placeholder="0-${dMax}" maxlength="${dLen}" oninput="sanitizeCoordInput(this,false); if(checkCoordLimit(this,${dMax},true)) autoTab(this,${dLen},'${prefix}-${ax}-m'); calcProjDMS('${prefix}-${ax}', ${ax === 'lat'})">
                <input type="text" inputmode="numeric" id="${prefix}-${ax}-m" placeholder="0-59" maxlength="2" oninput="sanitizeCoordInput(this,false); if(checkCoordLimit(this,60,false)) autoTab(this,2,'${prefix}-${ax}-s'); calcProjDMS('${prefix}-${ax}', ${ax === 'lat'})">
                <input type="text" inputmode="decimal" id="${prefix}-${ax}-s" placeholder="<60.0" maxlength="5" oninput="sanitizeCoordInput(this,true); checkCoordLimit(this,60,false); calcProjDMS('${prefix}-${ax}', ${ax === 'lat'})">
            </div>
            <div class="pair dmm-row">
                <input type="text" inputmode="numeric" id="${prefix}-${ax}-dd" placeholder="0-${dMax}" maxlength="${dLen}" oninput="sanitizeCoordInput(this,false); if(checkCoordLimit(this,${dMax},true)) autoTab(this,${dLen},'${prefix}-${ax}-dm'); calcProjDMM('${prefix}-${ax}', ${ax === 'lat'})">
                <input type="text" inputmode="decimal" id="${prefix}-${ax}-dm" placeholder="<60.00" maxlength="5" oninput="sanitizeCoordInput(this,true); checkCoordLimit(this,60,false); calcProjDMM('${prefix}-${ax}', ${ax === 'lat'})">
            </div>
            <div class="coord-err" id="${prefix}-${ax}-err"></div>
        </div>`;
    return `<div class="coord-in">${box('lat', 'LAT', 90, 2)}${box('lon', 'LONG', 180, 3)}</div>`;
}

function validateProjCoordBox(prefix, isLat, mode) {
    const axisName = isLat ? 'LAT' : 'LONG';
    const maxDeg = isLat ? 90 : 180;
    const elD = document.getElementById(`${prefix}-d`);
    const elM = document.getElementById(`${prefix}-m`);
    const elS = document.getElementById(`${prefix}-s`);
    const elDD = document.getElementById(`${prefix}-dd`);
    const elDM = document.getElementById(`${prefix}-dm`);
    const cbox = document.getElementById(`${prefix}-cbox`);
    const errEl = document.getElementById(`${prefix}-err`);
    const msgs = [];

    if (mode === 'dms') {
        const d = elD && elD.value !== '' ? parseFloat(elD.value) : NaN;
        const m = elM && elM.value !== '' ? parseFloat(elM.value) : NaN;
        const s = elS && elS.value !== '' ? parseFloat(elS.value) : NaN;
        let dBad = !isNaN(d) && (d < 0 || d > maxDeg);
        let mBad = !isNaN(m) && (m < 0 || m >= 60);
        let sBad = !isNaN(s) && (s < 0 || s >= 60);
        if (dBad) msgs.push(`${axisName} Deg must be 0–${maxDeg}°`);
        if (mBad) msgs.push(`${axisName} Min must be 0–59' (< 60)`);
        if (sBad) msgs.push(`${axisName} Sec must be < 60.00"`);
        if (!dBad && d === maxDeg && ((m || 0) > 0 || (s || 0) > 0)) {
            dBad = true;
            if ((m || 0) > 0) mBad = true;
            if ((s || 0) > 0) sBad = true;
            msgs.push(`${axisName} cannot exceed ${maxDeg}° 00' 00"`);
        }
        setFieldInvalid(elD, dBad);
        setFieldInvalid(elM, mBad);
        setFieldInvalid(elS, sBad);
        if (!msgs.length) { setFieldInvalid(elDD, false); setFieldInvalid(elDM, false); }
    } else {
        const dd = elDD && elDD.value !== '' ? parseFloat(elDD.value) : NaN;
        const dm = elDM && elDM.value !== '' ? parseFloat(elDM.value) : NaN;
        let ddBad = !isNaN(dd) && (dd < 0 || dd > maxDeg);
        let dmBad = !isNaN(dm) && (dm < 0 || dm >= 60);
        if (ddBad) msgs.push(`${axisName} Deg must be 0–${maxDeg}°`);
        if (dmBad) msgs.push(`${axisName} Min.mm must be < 60.00'`);
        if (!ddBad && dd === maxDeg && (dm || 0) > 0) {
            ddBad = true; dmBad = true;
            msgs.push(`${axisName} cannot exceed ${maxDeg}° 00.00'`);
        }
        setFieldInvalid(elDD, ddBad);
        setFieldInvalid(elDM, dmBad);
        if (!msgs.length) { setFieldInvalid(elD, false); setFieldInvalid(elM, false); setFieldInvalid(elS, false); }
    }

    if (cbox) cbox.classList.toggle('has-err', msgs.length > 0);
    if (errEl) {
        errEl.textContent = msgs.length ? '⚠ ' + msgs.join(' · ') : '';
        errEl.classList.toggle('show', msgs.length > 0);
    }
    return msgs.length === 0;
}

function initProjectorInputs() {
    document.getElementById('proj-o-ptA').innerHTML = getCoordInputHTML('po1', '');
    document.getElementById('proj-a-ptA').innerHTML = getCoordInputHTML('pa1', '(A)');
    document.getElementById('proj-a-ptB').innerHTML = getCoordInputHTML('pa2', '(B)');
    document.getElementById('proj-b-ptA').innerHTML = getCoordInputHTML('pb1', '(A)');
    document.getElementById('proj-rf-center').innerHTML = getCoordInputHTML('prf1', '(Center)');
    document.getElementById('proj-rf-start-wpt').innerHTML = getCoordInputHTML('prfs', '(Start)');
    document.getElementById('proj-rf-end-wpt').innerHTML = getCoordInputHTML('prfe', '(End)');
}

function calcProjDMS(prefix, isLat) {
    if (!validateProjCoordBox(prefix, isLat, 'dms')) return;
    let d = parseFloat(document.getElementById(`${prefix}-d`).value) || 0;
    let m = parseFloat(document.getElementById(`${prefix}-m`).value) || 0;
    let s = parseFloat(document.getElementById(`${prefix}-s`).value) || 0;
    let mm = m + (s / 60);

    const degPad = isLat ? 2 : 3;
    document.getElementById(`${prefix}-dd`).value = String(d).padStart(degPad, "0");
    let mmFixed = mm.toFixed(2);
    let [mmInt, mmDec] = mmFixed.split(".");
    document.getElementById(`${prefix}-dm`).value = mmInt.padStart(2, "0") + "." + mmDec;

    if (prefix.startsWith('po')) calcProjectorO();
    else if (prefix.startsWith('pa')) calcProjectorA();
    else if (prefix.startsWith('pb')) calcProjectorB();
}

function calcProjDMM(prefix, isLat) {
    if (!validateProjCoordBox(prefix, isLat, 'dmm')) return;
    let dStr = document.getElementById(`${prefix}-dd`).value;
    let mmStr = document.getElementById(`${prefix}-dm`).value;
    let d = parseFloat(dStr) || 0;
    let mm = parseFloat(mmStr) || 0;
    let m = Math.floor(mm);
    let s = (mm - m) * 60;

    const degPad = isLat ? 2 : 3;
    if (dStr !== "" || mmStr !== "") {
        document.getElementById(`${prefix}-d`).value = String(d).padStart(degPad, "0");
        document.getElementById(`${prefix}-m`).value = String(m).padStart(2, "0");
        let sFixed = s.toFixed(2);
        let [sInt, sDec] = sFixed.split(".");
        document.getElementById(`${prefix}-s`).value = sInt.padStart(2, "0") + "." + sDec;
    }

    if (prefix.startsWith('po')) calcProjectorO();
    else if (prefix.startsWith('pa')) calcProjectorA();
    else if (prefix.startsWith('pb')) calcProjectorB();
}

function getDecimalDegFromPrefixLoose(prefix) {
    let dstr = document.getElementById(`${prefix}-dd`).value;
    let dmstr = document.getElementById(`${prefix}-dm`).value;
    if (!dstr && !dmstr) return null;
    return (parseFloat(dstr) || 0) + ((parseFloat(dmstr) || 0) / 60);
}

function calcProjectorO() {
    let latA = getDecimalDegFromPrefixLoose('po1-lat'), lonA = getDecimalDegFromPrefixLoose('po1-lon');
    if (latA === null && lonA === null) return;
    if (latA === null) latA = 0;
    if (lonA === null) lonA = 0;

    let inv = vincentyInverse(0, 0, latA, lonA);
    if (!inv) return;

    let distM = inv.distance;
    let distNM = distM / 1852.0;
    let distFt = distM * 3.28084;
    let distKm = distM / 1000.0;

    let formatNumber = num => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let formatAzi = num => {
        let fixed = num.toFixed(2);
        let [intg, frac] = fixed.split('.');
        return intg.padStart(3, '0') + '.' + frac;
    };

    document.getElementById('proj-o-dist-nm').textContent = formatNumber(distNM) + ' NM';
    document.getElementById('proj-o-dist-m').textContent = formatNumber(distM) + ' m';
    document.getElementById('proj-o-dist-ft').textContent = formatNumber(distFt) + ' ft';
    document.getElementById('proj-o-dist-km').textContent = formatNumber(distKm) + ' km';
    document.getElementById('proj-o-trk').textContent = formatAzi(inv.az1) + ' °';
}

function getDecimalDegFromPrefix(prefix) {
    let dstr = document.getElementById(`${prefix}-dd`).value;
    let dmstr = document.getElementById(`${prefix}-dm`).value;
    if (!dstr && !dmstr) return null;
    return (parseFloat(dstr) || 0) + ((parseFloat(dmstr) || 0) / 60);
}

function formatDecimalDegToDMS(decDeg, isLat) {
    let d = Math.floor(decDeg), rem = (decDeg - d) * 60;
    let m = Math.floor(rem), s = (rem - m) * 60;
    let pad = isLat ? 2 : 3;
    let dStr = String(d).padStart(pad, '0'), mStr = String(m).padStart(2, '0');
    let sStr = s.toFixed(2).padStart(5, '0');
    let dmStr = rem.toFixed(2).padStart(5, '0');
    return { dms: `${dStr}&deg; ${mStr}' ${sStr}"`, dmm: `${dStr}&deg; ${dmStr}'` };
}

function vincentyForward(lat1Deg, lon1Deg, alpha1Deg, s) {
    const a = 6378137.0, b = 6356752.314245, f = 1 / 298.257223563;
    let lat1 = lat1Deg * RAD, lon1 = lon1Deg * RAD, alpha1 = alpha1Deg * RAD;
    let sinAlpha1 = Math.sin(alpha1), cosAlpha1 = Math.cos(alpha1);
    let tanU1 = (1 - f) * Math.tan(lat1), cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1), sinU1 = tanU1 * cosU1;
    let sigma1 = Math.atan2(tanU1, cosAlpha1);
    let sinAlpha = cosU1 * sinAlpha1, cosSqAlpha = 1 - sinAlpha * sinAlpha;
    let uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    let A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    let B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    let sigma = s / (b * A), sigmaP = 2 * Math.PI, cos2SigmaM, sinSigma, cosSigma;
    while (Math.abs(sigma - sigmaP) > 1e-12) {
        cos2SigmaM = Math.cos(2 * sigma1 + sigma);
        sinSigma = Math.sin(sigma); cosSigma = Math.cos(sigma);
        let deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
        sigmaP = sigma; sigma = s / (b * A) + deltaSigma;
    }
    let tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
    let lat2 = Math.atan2(sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1, (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp));
    let lambda = Math.atan2(sinSigma * sinAlpha1, cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1);
    let C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
    let L = lambda - (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    let lon2 = (lon1 + L + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
    return { lat2: lat2 * DEG, lon2: lon2 * DEG };
}

function vincentyInverse(lat1Deg, lon1Deg, lat2Deg, lon2Deg) {
    const a = 6378137.0, b = 6356752.314245, f = 1 / 298.257223563;
    let lat1 = lat1Deg * RAD, lon1 = lon1Deg * RAD, lat2 = lat2Deg * RAD, lon2 = lon2Deg * RAD;
    let L = lon2 - lon1, U1 = Math.atan((1 - f) * Math.tan(lat1)), U2 = Math.atan((1 - f) * Math.tan(lat2));
    let sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
    let lambda = L, lambdaP = 2 * Math.PI, iterLimit = 100;
    let sinLambda, cosLambda, sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM;
    do {
        sinLambda = Math.sin(lambda); cosLambda = Math.cos(lambda);
        sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
        if (sinSigma === 0) return { distance: 0, az1: 0 };
        cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda; sigma = Math.atan2(sinSigma, cosSigma);
        sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma; cosSqAlpha = 1 - sinAlpha * sinAlpha;
        cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
        let C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
        lambdaP = lambda; lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);
    if (iterLimit === 0) return null;
    let uSq = cosSqAlpha * (a * a - b * b) / (b * b);
    let A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
    let B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
    let deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
    let s = b * A * (sigma - deltaSigma);
    let az1 = Math.atan2(cosU2 * sinLambda, cosU1 * sinU2 - sinU1 * cosU2 * cosLambda);
    return { distance: s, az1: (az1 * DEG + 360) % 360 };
}

let _projA = null, _projB = null; // last results for plotting

function calcProjectorA() {
    _projA = null;
    let latA = getDecimalDegFromPrefix('pa1-lat'), lonA = getDecimalDegFromPrefix('pa1-lon');
    let latB = getDecimalDegFromPrefix('pa2-lat'), lonB = getDecimalDegFromPrefix('pa2-lon');
    let distStr = document.getElementById('proj-a-dist').value;
    if (latA === null || lonA === null || latB === null || lonB === null || distStr === "") { drawProjPlots(); return; }

    let dExt = parseFloat(distStr);
    let inv = vincentyInverse(latA, lonA, latB, lonB);
    if (!inv) return;
    let distAB_NM = inv.distance / 1852.0;

    let formatNumber = num => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    let formatAzi = num => {
        let fixed = num.toFixed(2);
        let [intg, frac] = fixed.split('.');
        return intg.padStart(3, '0') + '.' + frac;
    };
    document.getElementById('proj-a-azik').textContent = formatAzi(inv.az1) + ' °';
    document.getElementById('proj-a-basedist').textContent = formatNumber(distAB_NM) + ' NM';
    document.getElementById('proj-a-totdist').textContent = formatNumber(distAB_NM + dExt) + ' NM';

    let fwd = vincentyForward(latA, lonA, inv.az1, (distAB_NM + dExt) * 1852.0);
    let resLat = formatDecimalDegToDMS(fwd.lat2, true), resLon = formatDecimalDegToDMS(fwd.lon2, false);

    document.getElementById('proj-a-res-dms').innerHTML = `${resLat.dms} <span style="color:var(--text-muted);">|</span> ${resLon.dms}`;
    document.getElementById('proj-a-res-dmm').innerHTML = `${resLat.dmm} <span style="color:var(--text-muted);">|</span> ${resLon.dmm}`;
    _projA = { latA, lonA, latB, lonB, latC: fwd.lat2, lonC: fwd.lon2, az: inv.az1, dAB: distAB_NM, dExt };
    drawProjPlots();
}

function toggleProjBMode() {
    let mode = document.getElementById('proj-b-mode').value;
    document.getElementById('proj-b-grad-inputs').style.display = (mode === 'gradient') ? '' : 'none';
    document.getElementById('proj-b-ref-inputs').style.display = (mode === 'reference') ? '' : 'none';
    calcProjectorB();
}

function calcProjectorB() {
    _projB = null;
    let latA = getDecimalDegFromPrefix('pb1-lat'), lonA = getDecimalDegFromPrefix('pb1-lon');
    let trkStr = document.getElementById('proj-b-track').value;
    if (latA === null || lonA === null || trkStr === "") { drawProjPlots(); return; }
    let trk = parseFloat(trkStr), mode = document.getElementById('proj-b-mode').value, distNM = 0;

    if (mode === 'gradient') {
        let altA = parseFloat(document.getElementById('proj-b-altA').value);
        let altB = parseFloat(document.getElementById('proj-b-altB').value);
        let grad = parseFloat(document.getElementById('proj-b-grad').value);
        if (isNaN(altA) || isNaN(altB) || isNaN(grad) || grad === 0) { drawProjPlots(); return; }
        distNM = Math.abs(altB - altA) / ((grad / 100.0) * 6076.115);
    } else {
        let d1 = parseFloat(document.getElementById('proj-b-refA').value), d2 = parseFloat(document.getElementById('proj-b-refB').value);
        if (isNaN(d1) || isNaN(d2)) { drawProjPlots(); return; }
        distNM = Math.abs(d1 - d2);
    }

    let formatNumber = num => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('proj-b-dist').textContent = formatNumber(distNM) + ' NM';

    let fwd = vincentyForward(latA, lonA, trk, distNM * 1852.0);
    let resLat = formatDecimalDegToDMS(fwd.lat2, true), resLon = formatDecimalDegToDMS(fwd.lon2, false);
    document.getElementById('proj-b-res-dms').innerHTML = `${resLat.dms} <span style="color:var(--text-muted);">|</span> ${resLon.dms}`;
    document.getElementById('proj-b-res-dmm').innerHTML = `${resLat.dmm} <span style="color:var(--text-muted);">|</span> ${resLon.dmm}`;
    _projB = { latA, lonA, latB: fwd.lat2, lonB: fwd.lon2, trk, distNM };
    drawProjPlots();
}

function drawProjPlots() {
    const sa = V.svg(document.getElementById('proj-a-plot'));
    if (sa) {
        if (!_projA) emptyPlot(sa, 'Enter A, B and extension distance');
        else {
            const p = _projA;
            plotLatLon(sa, [
                { lat: p.latA, lon: p.lonA, label: 'A', color: V.c('--cyan') },
                { lat: p.latB, lon: p.lonB, label: 'B', color: V.c('--cyan') },
                { lat: p.latC, lon: p.lonC, label: 'C', color: V.c('--amber'), r: 6 }
            ], {
                draw: ({ X, Y }) => {
                    V.el(sa.el, 'line', { x1: X(p.lonA), y1: Y(p.latA), x2: X(p.lonB), y2: Y(p.latB), stroke: V.c('--cyan'), 'stroke-width': 3 });
                    V.el(sa.el, 'line', { x1: X(p.lonB), y1: Y(p.latB), x2: X(p.lonC), y2: Y(p.latC), stroke: V.c('--amber'), 'stroke-width': 3, 'stroke-dasharray': '7 5' });
                    V.label(sa, (X(p.lonB) + X(p.lonC)) / 2, (Y(p.latB) + Y(p.latC)) / 2 + 16, `+${p.dExt} NM`, V.c('--amber'), { size: 10 });
                    V.label(sa, (X(p.lonA) + X(p.lonB)) / 2, (Y(p.latA) + Y(p.latB)) / 2 - 16, `${p.az.toFixed(1)}° · ${p.dAB.toFixed(2)} NM`, V.c('--cyan'), { size: 10 });
                }
            });
        }
    }
    const sb = V.svg(document.getElementById('proj-b-plot'));
    if (sb) {
        if (!_projB) emptyPlot(sb, 'Enter A, track and distance inputs');
        else {
            const p = _projB;
            plotLatLon(sb, [
                { lat: p.latA, lon: p.lonA, label: 'A', color: V.c('--cyan') },
                { lat: p.latB, lon: p.lonB, label: 'B', color: V.c('--amber'), r: 6 }
            ], {
                draw: ({ X, Y }) => {
                    V.el(sb.el, 'line', { x1: X(p.lonA), y1: Y(p.latA), x2: X(p.lonB), y2: Y(p.latB), stroke: V.c('--amber'), 'stroke-width': 3 });
                    V.label(sb, (X(p.lonA) + X(p.lonB)) / 2, (Y(p.latA) + Y(p.latB)) / 2 - 16, `${p.trk}° · ${p.distNM.toFixed(2)} NM`, V.c('--amber'), { size: 10 });
                }
            });
        }
    }
}

function emptyPlot(s, msg) {
    V.el(s.el, 'text', { x: s.w / 2, y: s.h / 2, 'text-anchor': 'middle', fill: V.c('--muted'), 'font-size': 12.5 }, msg);
}

// --- RF ARC (Radius to Fix) ---
let rfDirection = 'cw';
let rfInputMode = 'radial'; // 'radial' or 'waypoint'
let rfArcData = [];         // Stored for export
let _rfMeta = null;

function setRFDir(dir) {
    rfDirection = dir;
    document.getElementById('rf-dir-cw').classList.toggle('active', dir === 'cw');
    document.getElementById('rf-dir-ccw').classList.toggle('active', dir === 'ccw');
}

function setRFInputMode(mode) {
    rfInputMode = mode;
    document.getElementById('rf-mode-rad').classList.toggle('active', mode === 'radial');
    document.getElementById('rf-mode-wpt').classList.toggle('active', mode === 'waypoint');
    document.getElementById('rf-rad-start-grp').style.display = (mode === 'radial') ? '' : 'none';
    document.getElementById('rf-rad-end-grp').style.display = (mode === 'radial') ? '' : 'none';
    document.getElementById('rf-wpt-inputs').style.display = (mode === 'waypoint') ? 'block' : 'none';
}

function calcRFArc() {
    let centerLat = getDecimalDegFromPrefix('prf1-lat');
    let centerLon = getDecimalDegFromPrefix('prf1-lon');
    if (centerLat === null || centerLon === null) { notify('Enter center coordinate.'); return; }

    let radius = parseFloat(document.getElementById('rf-radius').value);
    let startRad, endRad;
    let interval = parseFloat(document.getElementById('rf-interval').value);

    if (isNaN(radius) || radius <= 0) { notify('Enter a valid radius.'); return; }
    if (isNaN(interval) || interval < 1) { interval = 1; document.getElementById('rf-interval').value = 1; }

    let sLat, sLon, eLat, eLon;
    if (rfInputMode === 'waypoint') {
        sLat = getDecimalDegFromPrefix('prfs-lat'); sLon = getDecimalDegFromPrefix('prfs-lon');
        eLat = getDecimalDegFromPrefix('prfe-lat'); eLon = getDecimalDegFromPrefix('prfe-lon');
        if (sLat === null || sLon === null) { notify('Enter start waypoint coordinate.'); return; }
        if (eLat === null || eLon === null) { notify('Enter end waypoint coordinate.'); return; }

        let invStart = vincentyInverse(centerLat, centerLon, sLat, sLon);
        let invEnd = vincentyInverse(centerLat, centerLon, eLat, eLon);
        if (!invStart || !invEnd) { notify('Cannot compute bearing. Check coordinates.'); return; }

        startRad = invStart.az1;
        endRad = invEnd.az1;

        document.getElementById('rf-start-rad-calc').innerHTML = `→ Computed radial <strong style="color:var(--accent-success);">${startRad.toFixed(2)}°</strong> (dist ${(invStart.distance / 1852).toFixed(2)} NM)`;
        document.getElementById('rf-end-rad-calc').innerHTML = `→ Computed radial <strong style="color:var(--accent-warning);">${endRad.toFixed(2)}°</strong> (dist ${(invEnd.distance / 1852).toFixed(2)} NM)`;
    } else {
        startRad = parseFloat(document.getElementById('rf-start-rad').value);
        endRad = parseFloat(document.getElementById('rf-end-rad').value);
        if (isNaN(startRad) || isNaN(endRad)) { notify('Enter start and end radials.'); return; }
    }

    // Normalize radials to 0-360
    startRad = ((startRad % 360) + 360) % 360;
    endRad = ((endRad % 360) + 360) % 360;

    let radiusM = radius * 1852.0;
    let radials = [];

    if (rfDirection === 'cw') {
        let current = startRad;
        while (true) {
            radials.push(current);
            if (current === endRad) break;
            current = (current + interval) % 360;
            let remaining = (endRad - current + 360) % 360;
            if (remaining < interval && remaining > 0) {
                radials.push(endRad);
                break;
            }
            if (current === startRad) break; // Full circle safety
        }
    } else {
        let current = startRad;
        while (true) {
            radials.push(current);
            if (current === endRad) break;
            current = (current - interval + 360) % 360;
            let remaining = (current - endRad + 360) % 360;
            if (remaining < interval && remaining > 0) {
                radials.push(endRad);
                break;
            }
            if (current === startRad) break; // Full circle safety
        }
    }

    rfArcData = [];
    let tbody = document.getElementById('rf-results-tbody');
    let rowsHtml = '';

    for (let i = 0; i < radials.length; i++) {
        let bearing = radials[i];
        let fwd = vincentyForward(centerLat, centerLon, bearing, radiusM);
        let latFmt = formatDecimalDegToDMS(Math.abs(fwd.lat2), true);
        let lonFmt = formatDecimalDegToDMS(Math.abs(fwd.lon2), false);
        let latSign = fwd.lat2 >= 0 ? 'N' : 'S';
        let lonSign = fwd.lon2 >= 0 ? 'E' : 'W';

        let entry = {
            num: i + 1,
            radial: bearing,
            latDec: fwd.lat2,
            lonDec: fwd.lon2,
            latDMS: latSign + ' ' + latFmt.dms.replace(/&deg;/g, '°'),
            lonDMS: lonSign + ' ' + lonFmt.dms.replace(/&deg;/g, '°'),
            latDMM: latSign + ' ' + latFmt.dmm.replace(/&deg;/g, '°'),
            lonDMM: lonSign + ' ' + lonFmt.dmm.replace(/&deg;/g, '°'),
            latDMShtml: latSign + ' ' + latFmt.dms,
            lonDMShtml: lonSign + ' ' + lonFmt.dms,
            latDMMhtml: latSign + ' ' + latFmt.dmm,
            lonDMMhtml: lonSign + ' ' + lonFmt.dmm
        };
        rfArcData.push(entry);

        let radStr = Math.round(bearing).toString().padStart(3, '0');
        rowsHtml += `<tr>
            <td style="text-align:center; color:var(--text-muted);">${entry.num}</td>
            <td style="text-align:center; font-weight:700; color:var(--accent-primary);">${radStr}°</td>
            <td class="mono" style="font-size:12.5px;">${entry.latDMShtml}</td>
            <td class="mono" style="font-size:12.5px;">${entry.lonDMShtml}</td>
            <td class="mono" style="font-size:12.5px; color:var(--accent-cyan);">${entry.latDMMhtml}</td>
            <td class="mono" style="font-size:12.5px; color:var(--accent-cyan);">${entry.lonDMMhtml}</td>
        </tr>`;
    }
    tbody.innerHTML = rowsHtml;

    let summary = document.getElementById('rf-summary');
    let dirStr = rfDirection === 'cw' ? 'CW' : 'CCW';
    summary.innerHTML = `<strong>${radials.length}</strong> points &bull; <strong>${dirStr}</strong> &bull; R${Math.round(startRad).toString().padStart(3, '0')} → R${Math.round(endRad).toString().padStart(3, '0')} &bull; Interval <strong>${interval}°</strong> &bull; Radius <strong>${radius} NM</strong>`;
    summary.style.display = 'block';

    _rfMeta = { centerLat, centerLon, radius, startRad, endRad, dir: rfDirection, wpts: rfInputMode === 'waypoint' ? { sLat, sLon, eLat, eLon } : null };
    drawRFPlot();
}

function drawRFPlot() {
    const s = V.svg(document.getElementById('rf-plot'));
    const empty = document.getElementById('rf-plot-empty');
    if (empty) empty.style.display = rfArcData.length ? 'none' : '';
    if (!s || !rfArcData.length || !_rfMeta) return;
    const m = _rfMeta;
    const pts = [{ lat: m.centerLat, lon: m.centerLon, label: 'CTR', color: V.c('--text-2'), r: 4 }];
    rfArcData.forEach(e => pts.push({ lat: e.latDec, lon: e.lonDec, hidden: true }));
    // full circle extent so the arc sits in context
    [0, 90, 180, 270].forEach(b => { const f = vincentyForward(m.centerLat, m.centerLon, b, m.radius * 1852); pts.push({ lat: f.lat2, lon: f.lon2, hidden: true }); });
    if (m.wpts) {
        pts.push({ lat: m.wpts.sLat, lon: m.wpts.sLon, label: 'S-WPT', color: V.c('--green'), r: 4 });
        pts.push({ lat: m.wpts.eLat, lon: m.wpts.eLon, label: 'E-WPT', color: V.c('--amber'), r: 4 });
    }
    plotLatLon(s, pts, {
        pad: 40,
        draw: ({ X, Y }) => {
            // full circle (faint)
            const circ = [];
            for (let b = 0; b <= 360; b += 5) { const f = vincentyForward(m.centerLat, m.centerLon, b, m.radius * 1852); circ.push(`${X(f.lon2)},${Y(f.lat2)}`); }
            V.el(s.el, 'polyline', { points: circ.join(' '), fill: 'none', stroke: V.c('--viz-axis'), 'stroke-dasharray': '4 5' });
            // radials to start / end
            const first = rfArcData[0], last = rfArcData[rfArcData.length - 1];
            V.el(s.el, 'line', { x1: X(m.centerLon), y1: Y(m.centerLat), x2: X(first.lonDec), y2: Y(first.latDec), stroke: V.c('--green'), 'stroke-dasharray': '4 4' });
            V.el(s.el, 'line', { x1: X(m.centerLon), y1: Y(m.centerLat), x2: X(last.lonDec), y2: Y(last.latDec), stroke: V.c('--amber'), 'stroke-dasharray': '4 4' });
            // arc
            V.el(s.el, 'polyline', { points: rfArcData.map(e => `${X(e.lonDec)},${Y(e.latDec)}`).join(' '), fill: 'none', stroke: V.c('--primary'), 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
            rfArcData.forEach((e, i) => {
                const isEnd = i === 0 || i === rfArcData.length - 1;
                V.el(s.el, 'circle', { cx: X(e.lonDec), cy: Y(e.latDec), r: isEnd ? 6 : 2.5, fill: i === 0 ? V.c('--green') : (i === rfArcData.length - 1 ? V.c('--amber') : V.c('--primary')), stroke: V.c('--surface'), 'stroke-width': isEnd ? 2 : 0 });
            });
            // direction arrow at arc midpoint
            if (rfArcData.length > 2) {
                const mi = Math.floor(rfArcData.length / 2);
                const a = rfArcData[mi - 1], b = rfArcData[mi];
                const ang = Math.atan2(Y(b.latDec) - Y(a.latDec), X(b.lonDec) - X(a.lonDec)) * 180 / Math.PI + 90;
                V.el(s.el, 'path', { d: 'M0 -9 L7 6 L-7 6 Z', fill: V.c('--primary'), transform: `translate(${X(b.lonDec)} ${Y(b.latDec)}) rotate(${ang})` });
            }
            V.label(s, X(first.lonDec), Y(first.latDec) - 16, `R${String(Math.round(first.radial)).padStart(3, '0')}`, V.c('--green'), { size: 10.5 });
            V.label(s, X(last.lonDec), Y(last.latDec) - 16, `R${String(Math.round(last.radial)).padStart(3, '0')}`, V.c('--amber'), { size: 10.5 });
        }
    });
}

function exportRFArc(format) {
    if (rfArcData.length === 0) { notify('No data to export. Click CALCULATE first.'); return; }
    let csv = '';
    if (format === 'dms') {
        csv = '#,Radial,Lat (DMS),Lon (DMS)\n';
        rfArcData.forEach(e => { csv += `${e.num},${Math.round(e.radial).toString().padStart(3, '0')},"${e.latDMS}","${e.lonDMS}"\n`; });
    } else {
        csv = '#,Radial,Lat (DMM),Lon (DMM)\n';
        rfArcData.forEach(e => { csv += `${e.num},${Math.round(e.radial).toString().padStart(3, '0')},"${e.latDMM}","${e.lonDMM}"\n`; });
    }
    downloadText(csv, `RF_Arc_${format.toUpperCase()}.csv`);
}

function exportForeFlight() {
    if (rfArcData.length === 0) { notify('No data to export. Click CALCULATE first.'); return; }

    let prefix = (document.getElementById('rf-ff-prefix').value || 'RFARC').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (prefix.length < 1) prefix = 'RFARC';
    let desc = document.getElementById('rf-ff-desc').value.trim();
    let descStr = desc ? desc : '""';
    let elev = document.getElementById('rf-ff-elev').value.trim();
    let elevStr = elev ? elev : '';

    let csv = 'WAYPOINT_NAME,Waypoint description,Latitude,Longitude,Elevation\n';
    rfArcData.forEach(e => {
        let radStr = Math.round(e.radial).toString().padStart(3, '0');
        let name = `${prefix}_R${radStr}`;
        csv += `${name},${descStr},${e.latDec.toFixed(6)},${e.lonDec.toFixed(6)},${elevStr}\n`;
    });
    downloadText(csv, 'user_waypoints.csv');
}

function clearCoordBoxErr(prefix) {
    ['lat', 'lon'].forEach(ax => {
        ['d', 'm', 's', 'dd', 'dm'].forEach(suf => setFieldInvalid(document.getElementById(`${prefix}-${ax}-${suf}`), false));
        const cbox = document.getElementById(`${prefix}-${ax}-cbox`);
        const err = document.getElementById(`${prefix}-${ax}-err`);
        if (cbox) cbox.classList.remove('has-err');
        if (err) { err.textContent = ''; err.classList.remove('show'); }
    });
}

function clearRFArc() {
    ['d', 'm', 's', 'dd', 'dm'].forEach(suf => {
        clearIds(`prf1-lat-${suf}`, `prf1-lon-${suf}`);
        clearIds(`prfs-lat-${suf}`, `prfs-lon-${suf}`);
        clearIds(`prfe-lat-${suf}`, `prfe-lon-${suf}`);
    });
    ['prf1', 'prfs', 'prfe'].forEach(clearCoordBoxErr);
    clearIds('rf-radius', 'rf-start-rad', 'rf-end-rad');
    document.getElementById('rf-interval').value = '1';
    document.getElementById('rf-results-tbody').innerHTML = '';
    document.getElementById('rf-summary').style.display = 'none';
    document.getElementById('rf-summary').innerHTML = '';
    document.getElementById('rf-start-rad-calc').innerHTML = '';
    document.getElementById('rf-end-rad-calc').innerHTML = '';
    rfArcData = [];
    _rfMeta = null;
    setRFDir('cw');
    setRFInputMode('radial');
}

function clearProjector(mode) {
    ['d', 'm', 's', 'dd', 'dm'].forEach(suf => {
        if (mode === 'modeA') {
            clearIds(`pa1-lat-${suf}`, `pa1-lon-${suf}`, `pa2-lat-${suf}`, `pa2-lon-${suf}`);
        } else if (mode === 'modeB') {
            clearIds(`pb1-lat-${suf}`, `pb1-lon-${suf}`);
        } else if (mode === 'modeO') {
            clearIds(`po1-lat-${suf}`, `po1-lon-${suf}`);
        }
    });
    if (mode === 'modeA') { clearCoordBoxErr('pa1'); clearCoordBoxErr('pa2'); }
    else if (mode === 'modeB') clearCoordBoxErr('pb1');
    else if (mode === 'modeO') clearCoordBoxErr('po1');
    if (mode === 'modeA') {
        clearIds('proj-a-dist');
        document.getElementById('proj-a-azik').textContent = '-- °';
        document.getElementById('proj-a-basedist').textContent = '-- NM';
        document.getElementById('proj-a-totdist').textContent = '-- NM';
        document.getElementById('proj-a-res-dms').innerHTML = '--';
        document.getElementById('proj-a-res-dmm').innerHTML = '--';
        _projA = null;
    } else if (mode === 'modeB') {
        clearIds('proj-b-track', 'proj-b-altA', 'proj-b-altB', 'proj-b-grad', 'proj-b-refA', 'proj-b-refB');
        document.getElementById('proj-b-dist').textContent = '-- NM';
        document.getElementById('proj-b-res-dms').innerHTML = '--';
        document.getElementById('proj-b-res-dmm').innerHTML = '--';
        _projB = null;
    } else if (mode === 'modeO') {
        document.getElementById('proj-o-dist-nm').textContent = '-- NM';
        document.getElementById('proj-o-dist-m').textContent = '-- m';
        document.getElementById('proj-o-dist-ft').textContent = '-- ft';
        document.getElementById('proj-o-dist-km').textContent = '-- km';
        document.getElementById('proj-o-trk').textContent = '-- °';
    }
}

App.register('projector', { onShow() { drawProjPlots(); } });
App.register('rfarc', { onShow() { drawRFPlot(); } });
