// VOR TOOLS TAB (Orbit Cal, Prediction, VOR Siting, and embedded Signal Analysis/FSPL card)

        // --- VOR MODULE ---
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
                if (MORSE_CODE[char]) {
                    code += MORSE_CODE[char] + "   "; // 3 spaces between chars
                }
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
                // FIXED: Input is "Final Crs", use Reciprocal Radial
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
            // 1. FINISH TIME (Cross Final Crs at)
            const startTimeVal = document.getElementById('vor-startTime').value;
            const finishEl = document.getElementById('vor-finishTime');
            const fullOrbitEtaEl = document.getElementById('vor-full-orbit-eta');

            // Parse start time
            let startH = NaN, startM = NaN;
            if (startTimeVal && startTimeVal.includes(':')) {
                const parts = startTimeVal.split(':');
                startH = parseInt(parts[0], 10);
                startM = parseInt(parts[1], 10);
            }
            const validStartTime = !isNaN(startH) && !isNaN(startM);

            // Get Cross Final Crs time (target time)
            let crossTimeStr = document.getElementById('vor-time-target').innerText;
            // Get Full Orbit time
            let fullTimeStr = document.getElementById('vor-total-time').innerText;

            // Calculate Cross Final Crs at (ETA for crossing final course)
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

            // Calculate Full Orbit Complete at (ETA for full orbit)
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

            // CRITICAL: Always update header after time calc
            updateVorHeader();
        }

        // ===== PREDICTION CARD =====
        let predDirection = 'cw';

        function setPredDir(dir) {
            predDirection = dir;
            const cwBtn = document.getElementById('pred-dir-cw');
            const ccwBtn = document.getElementById('pred-dir-ccw');
            
            cwBtn.classList.toggle('active', dir === 'cw');
            cwBtn.classList.toggle('cw', dir === 'cw');
            
            ccwBtn.classList.toggle('active', dir === 'ccw');
            ccwBtn.classList.toggle('ccw', dir === 'ccw');

            // Set current time when direction is selected
            const now = new Date();
            const hh = now.getUTCHours().toString().padStart(2, '0');
            const mm = now.getUTCMinutes().toString().padStart(2, '0');
            document.getElementById('pred-startTime').value = `${hh}:${mm}`;
            calcTimeToRadial();
            calcRadialFromTime();
        }

        function updatePrediction() {
            // Clear outputs and recalculate both modes
            document.getElementById('pred-header-info').innerHTML = "";
            document.getElementById('pred-result-time').innerText = "--:-- min";
            document.getElementById('pred-result-eta').innerText = "";
            document.getElementById('pred-result-rad').innerText = "--°";
            document.getElementById('pred-result-rad-eta').innerText = "";
            calcTimeToRadial();
            calcRadialFromTime();
        }

        // Sync Orbit Dist, Gnd Speed, and Direction from Orbit Cal card
        function syncPredFromOrbitCal() {
            const orbitDist = document.getElementById('vor-dist').value;
            const orbitSpeed = document.getElementById('vor-speed').value;
            if (orbitDist) document.getElementById('pred-orbitDist').value = orbitDist;
            if (orbitSpeed) document.getElementById('pred-speed').value = orbitSpeed;
            
            // Sync Direction
            setPredDir(vorDirection);
            
            calcTimeToRadial();
            calcRadialFromTime();
        }

        // Get orbit rate (degrees per minute) from Prediction card inputs
        function getPredDegPerMin() {
            const dist = parseFloat(document.getElementById('pred-orbitDist').value) || 0;
            const speed = parseFloat(document.getElementById('pred-speed').value) || 0;
            if (dist <= 0 || speed <= 0) return 0;

            // Calculate full orbit time in minutes
            const circumference = 2 * Math.PI * dist;
            const totalMin = (circumference / speed) * 60;
            return (totalMin > 0) ? 360 / totalMin : 0;
        }

        // Parse start time and start radial from initial values
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

        // Mode 1: Input Target Radial → Calculate Time
        function calcTimeToRadial() {
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

            // Calculate degrees to travel
            let deltaDeg = 0;
            if (predDirection === 'cw') {
                deltaDeg = (targetRad - startRad + 360) % 360;
            } else {
                deltaDeg = (startRad - targetRad + 360) % 360;
            }
            if (deltaDeg === 0) deltaDeg = 360; // Full orbit if same radial

            // Calculate time
            const timeMin = deltaDeg / degPerMin;
            const mins = Math.floor(timeMin);
            const secs = Math.round((timeMin - mins) * 60);
            resultTime.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} min`;

            // Calculate ETA if start time valid
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

                // Update header
                const dirStr = predDirection === 'cw' ? 'CW' : 'CCW';
                headerInfo.innerHTML = `<span style="color:var(--text-main)">${dirStr}</span> &bull; R${targetRad.toFixed(0).padStart(3, '0')} in <span style="color:var(--accent-warning)">${mins}:${secs.toString().padStart(2, '0')}</span> (${etaH}:${etaM} UTC)`;
            } else {
                resultEta.innerText = "";
            }
        }

        // Mode 2: Input Time → Calculate Radial
        function calcRadialFromTime() {
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

            // Calculate new radial
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

            // Calculate ETA if start time valid
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
                    // Full ETA
                    if (fullTimeStr && !fullTimeStr.includes("--") && fullTimeStr !== "00:00") {
                        const [fDurM, fDurS] = fullTimeStr.split(':').map(n => parseInt(n, 10));
                        let d = new Date(); d.setUTCHours(startH); d.setUTCMinutes(startM); d.setSeconds(0);
                        d.setMinutes(d.getMinutes() + fDurM); d.setSeconds(d.getSeconds() + fDurS);
                        fullEta = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
                    }
                    // Cross ETA
                    if (crossTimeStr && !crossTimeStr.includes("--") && crossTimeStr !== "--:--") {
                        const [cDurM, cDurS] = crossTimeStr.split(':').map(n => parseInt(n, 10));
                        let d = new Date(); d.setUTCHours(startH); d.setUTCMinutes(startM); d.setSeconds(0);
                        d.setMinutes(d.getMinutes() + cDurM); d.setSeconds(d.getSeconds() + cDurS);
                        crossEta = `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
                    }
                }
            }

            headerInfo.innerHTML = `<span style="color:var(--text-main)">${dirStr}</span> &bull; Time <span style="color:var(--text-main)">${fullTimeStr}</span> min. &bull; Full Orbit <span style="color:var(--accent-warning)">${fullEta}</span> UTC &bull; X <span style="color:var(--accent-cyan)">${crossEta}</span> UTC`;
        }

        function drawVorArc(startDeg, deltaDeg, dir) {
            const c = document.getElementById('vorVizCanvas');
            if (!c) return;
            const dpr = window.devicePixelRatio || 1;
            const rect = c.getBoundingClientRect();
            c.width = rect.width * dpr;
            c.height = rect.height * dpr;
            const ctx = c.getContext('2d');
            ctx.scale(dpr, dpr);
            const w = rect.width; const h = rect.height;

            ctx.clearRect(0, 0, w, h);
            if (deltaDeg === 0) return;

            const pad = 20; const barW = w - (pad * 2); const y = h / 2;
            const progressPct = deltaDeg / 360;
            const progW = barW * progressPct;

            // Flip positions based on direction
            // CW: Start left → Target right
            // CCW: Start right → Target left
            const isCW = (dir === 'cw');
            const startX = isCW ? pad : (pad + barW);
            const targetX = isCW ? (pad + progW) : (pad + barW - progW);

            // Base Line
            ctx.beginPath(); ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.1)";
            ctx.moveTo(pad, y); ctx.lineTo(pad + barW, y); ctx.stroke();

            // Progress Line
            ctx.beginPath(); ctx.lineWidth = 4; ctx.strokeStyle = "#3b82f6";
            if (isCW) {
                ctx.moveTo(startX, y); ctx.lineTo(targetX, y);
            } else {
                ctx.moveTo(targetX, y); ctx.lineTo(startX, y);
            }
            ctx.stroke();

            // Start Dot
            ctx.fillStyle = "#06b6d4"; ctx.beginPath(); ctx.arc(startX, y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#eef1f5"; ctx.font = "10px Inter"; ctx.textAlign = "center";
            ctx.fillText("START", startX, y - 12);

            // Target Dot
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(targetX, y, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillText("TARGET", targetX, y - 12);
        }

        // --- VSAT SITING MODULE ---
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

            // Apply override if provided
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

        function calcVorSiting() {
            const txtId = document.getElementById('vsat-id').value || "VOR";
            const rObsRaw = document.getElementById('vsat-rObs').value;
            document.getElementById('vsat-profile-header').innerText = rObsRaw ? `${txtId} Profile (R-${rObsRaw})` : `${txtId} Profile View`;

            const hStationRaw = document.getElementById('vsat-hStation').value;
            const dObsRaw = document.getElementById('vsat-dObs').value;
            const hObsRaw = document.getElementById('vsat-hObs').value;
            const dAcftRaw = document.getElementById('vsat-dAcft').value;

            const canvas = document.getElementById('vsatCanvas');
            if (hStationRaw === "" || dObsRaw === "" || hObsRaw === "") {
                document.getElementById('vsat-angleVal').innerHTML = "--°";
                document.getElementById('vsat-overlayAngle').innerText = "WAITING DATA";
                document.getElementById('vsat-flatAlt').innerText = "--";
                document.getElementById('vsat-curvedAlt').innerText = "--";
                document.getElementById('vsat-angleNote').style.display = 'none';
                document.getElementById('vsat-diffVal').innerHTML = "";
                if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

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

            // UI Updates
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
                ovAngle.style.color = "var(--accent-warning)";
                ovAngle.style.borderColor = "var(--accent-warning)";
            } else if (resCurved.usedHorizon) {
                ovAngle.innerHTML = `HORIZON LIM: ${resMain.angleDeg.toFixed(2)}°`;
                ovAngle.style.color = "var(--accent-danger)";
                ovAngle.style.borderColor = "var(--accent-danger)";
            } else {
                ovAngle.innerHTML = `SCREENING: ${resMain.angleDeg.toFixed(2)}°`;
                ovAngle.style.color = "var(--accent-cyan)";
                ovAngle.style.borderColor = "var(--accent-cyan)";
            }

            if (dAcftRaw !== "") {
                document.getElementById('vsat-flatAlt').innerText = fmt(Math.ceil(resFlat.alt)) + " ft";
                document.getElementById('vsat-curvedAlt').innerText = fmt(Math.ceil(resCurved.alt)) + " ft";

                let ecVal = 0.883 * Math.pow(dAcft, 2);
                document.getElementById('vsat-diffVal').innerHTML = `Earth Curvature (Ec): <span style="color:var(--accent-cyan);">+${fmt(Math.round(ecVal))} ft</span>`;

                drawVorSiting(hStation, hObs, dObs, dAcft, resMain.alt, vsatUseCurvature, (resMain.usedAngleDeg * Math.PI / 180), txtId, rObsRaw);
            } else {
                document.getElementById('vsat-flatAlt').innerText = "--";
                document.getElementById('vsat-curvedAlt').innerText = "--";
                document.getElementById('vsat-diffVal').innerHTML = "";
                drawVorSiting(hStation, hObs, dObs, 0, null, vsatUseCurvature, (resMain.usedAngleDeg * Math.PI / 180), txtId, rObsRaw);
            }
        }

        function drawVorSiting(hS, hO, dO, dA, hA_calc, curved, angleRad, id, obsRad) {
            const c = document.getElementById('vsatCanvas');
            if (!c) return;

            // Retina
            const dpr = window.devicePixelRatio || 1;
            // Check if visible, if hidden (tab switch), might be 0 size
            if (c.clientWidth === 0) return;

            c.width = c.clientWidth * dpr;
            c.height = c.clientHeight * dpr;

            const ctx = c.getContext('2d');
            ctx.scale(dpr, dpr);
            const w = c.clientWidth;
            const h = c.clientHeight;

            ctx.clearRect(0, 0, w, h);

            const padLeft = 50; const padRight = 30; const padBot = 30; const padTop = 30;
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

            // Ground Line
            ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i <= 50; i++) {
                let d = (i / 50) * maxDist; let drop = curved ? -(Math.pow(d * FT_PER_NM, 2) / (2 * EARTH_RADIUS_FT)) : 0;
                if (i === 0) ctx.moveTo(toX(d), toY(drop)); else ctx.lineTo(toX(d), toY(drop));
            }
            ctx.stroke();

            // Station
            const sX = toX(0); const sY = toY(hS);
            ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(sX, toY(0)); ctx.lineTo(sX, sY); ctx.stroke();
            ctx.fillStyle = "#06b6d4"; ctx.font = "bold 12px Inter"; ctx.textAlign = "left";
            ctx.fillText(id, sX + 5, toY(0) - 5);

            // Obstacle
            let oBase = curved ? -(Math.pow(dO * FT_PER_NM, 2) / (2 * EARTH_RADIUS_FT)) : 0;
            const oX = toX(dO); const oY = toY(hO + oBase);
            ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(oX, toY(oBase)); ctx.lineTo(oX, oY); ctx.stroke();
            ctx.fillStyle = "#f59e0b"; ctx.textAlign = "center"; ctx.fillText("OBST", oX, toY(oBase) + 15);
            if (obsRad) ctx.fillText(`R${obsRad}`, oX, toY(oBase) + 28);

            // LOS Line
            ctx.strokeStyle = "rgba(239, 68, 68, 0.5)"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
            ctx.beginPath();
            for (let i = 0; i <= 50; i++) {
                let d = (i / 50) * maxDist; let distFt = d * FT_PER_NM; let y_flat = hS + (distFt * Math.tan(angleRad));
                if (i === 0) ctx.moveTo(toX(d), toY(y_flat)); else ctx.lineTo(toX(d), toY(y_flat));
            }
            ctx.stroke(); ctx.setLineDash([]);

            // LOS Area
            ctx.fillStyle = "rgba(239, 68, 68, 0.1)";
            ctx.beginPath(); ctx.moveTo(sX, sY);
            for (let i = 0; i <= 50; i++) {
                let d = (i / 50) * maxDist; let distFt = d * FT_PER_NM; let y_flat = hS + (distFt * Math.tan(angleRad));
                ctx.lineTo(toX(d), toY(y_flat));
            }
            for (let i = 50; i >= 0; i--) {
                let d = (i / 50) * maxDist; let drop = curved ? -(Math.pow(d * FT_PER_NM, 2) / (2 * EARTH_RADIUS_FT)) : 0;
                ctx.lineTo(toX(d), toY(drop));
            }
            ctx.fill();

            // Aircraft
            if (dA > 0 && hA_calc !== null) {
                const aX = toX(dA);
                let dropAtAcft = curved ? (Math.pow(dA * FT_PER_NM, 2) / (2 * EARTH_RADIUS_FT)) : 0;
                let visualY = hA_calc - dropAtAcft; let canvasY = toY(visualY);

                // Vertical dashed line from aircraft to ground
                ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                ctx.beginPath(); ctx.moveTo(aX, canvasY); ctx.lineTo(aX, toY(0)); ctx.stroke(); ctx.setLineDash([]);

                // Aircraft triangle marker
                ctx.fillStyle = "#10b981";
                ctx.beginPath();
                ctx.moveTo(aX, canvasY - 6); ctx.lineTo(aX - 6, canvasY + 6); ctx.lineTo(aX + 6, canvasY + 6);
                ctx.closePath();
                ctx.fill();

                // Altitude label
                ctx.fillStyle = "#eef1f5"; ctx.font = "bold 11px Inter"; ctx.textAlign = "left";
                ctx.fillText(`${fmt(Math.ceil(hA_calc))} ft`, aX + 8, canvasY);

                // Distance label below ground line
                ctx.fillStyle = "#10b981"; ctx.font = "bold 11px Inter"; ctx.textAlign = "center";
                ctx.fillText(`ACFT`, aX, toY(0) + 15);
                ctx.fillText(`${dA} NM`, aX, toY(0) + 28);
            }
        }

        // --- FSPL / SIGNAL ANALYSIS MODULE ---
        const NM_TO_KM = 1.852;
        const FSPL_SYS_LOSS = 3; // dB, hardcoded (cables, connectors, atmospheric)
        const FSPL_ANT_GAIN = 0; // dBi, isotropic assumed
        const VOR_RX_SENS = -93;  // dBm, per RTCA DO-196
        const DME_RX_SENS = -93;  // dBm, per RTCA DO-189/TSO-C66
        const DME_XPDR_SENS = -86; // dBm, ground transponder per ICAO Annex 10
        const DME_INTERR_POWER = 1000; // W, standard airborne interrogator

        let fsplMode = 'vor'; // 'vor' or 'dme'

        function setFsplMode(mode) {
            fsplMode = mode;
            document.getElementById('btn-fspl-vor').className = (mode === 'vor') ? 'papi-mode-btn active' : 'papi-mode-btn';
            document.getElementById('btn-fspl-dme').className = (mode === 'dme') ? 'papi-mode-btn active' : 'papi-mode-btn';
            // Toggle DME two-way section
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
            }
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

            // Auto-derive DME frequency
            const dmeFreqEl = document.getElementById('fspl-dmeFreq');
            if (dmeFreqEl) {
                if (!isNaN(vorFreq) && vorFreq >= 108.0 && vorFreq <= 117.95) {
                    dmeFreqEl.textContent = getDmeFreqFromVor(vorFreq) + ' MHz';
                } else {
                    dmeFreqEl.textContent = '--';
                }
            }

            // Independent needCalc per system
            const needBase = !isNaN(vorFreq) && !isNaN(dist) && vorFreq > 0 && dist > 0;
            const needVorCalc = needBase && !isNaN(vorTxPower) && vorTxPower > 0;
            const needDmeCalc = needBase && !isNaN(dmeTxPower) && dmeTxPower > 0;

            // --- VOR one-way ---
            const vorResult = needVorCalc ? calcLinkBudget(vorTxPower, vorFreq, dist) : null;
            const vorMargin = vorResult ? (vorResult.rxPower - VOR_RX_SENS) : null;
            const vorMaxRange = needVorCalc ? calcMaxRangeNm(vorTxPower, vorFreq, VOR_RX_SENS) : null;

            // --- DME two-way ---
            const dmeFreq = !isNaN(vorFreq) ? getDmeFreqFromVor(vorFreq) : 0;
            // Downlink: Ground transponder → Aircraft (uses DME ground TX power)
            const dmeDown = (needDmeCalc && dmeFreq > 0) ? calcLinkBudget(dmeTxPower, dmeFreq, dist) : null;
            const dmeDownMargin = dmeDown ? (dmeDown.rxPower - DME_RX_SENS) : null;
            // Uplink: Aircraft interrogator → Ground transponder (hardcoded interrogator power)
            const dmeUp = (needDmeCalc && dmeFreq > 0) ? calcLinkBudget(DME_INTERR_POWER, dmeFreq, dist) : null;
            const dmeUpMargin = dmeUp ? (dmeUp.rxPower - DME_XPDR_SENS) : null;
            // Weak link
            const dmeWeakMargin = (dmeDownMargin !== null && dmeUpMargin !== null) ? Math.min(dmeDownMargin, dmeUpMargin) : null;
            const dmeMaxDown = (needDmeCalc && dmeFreq > 0) ? calcMaxRangeNm(dmeTxPower, dmeFreq, DME_RX_SENS) : null;
            const dmeMaxUp = (needDmeCalc && dmeFreq > 0) ? calcMaxRangeNm(DME_INTERR_POWER, dmeFreq, DME_XPDR_SENS) : null;
            const dmeMaxRange = (dmeMaxDown !== null && dmeMaxUp !== null) ? Math.min(dmeMaxDown, dmeMaxUp) : null;

            // --- Update UI based on mode ---
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
                // DME mode — show weakest leg
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

                // DME two-way detail
                const upEl = document.getElementById('fspl-dme-upMargin');
                const downEl = document.getElementById('fspl-dme-downMargin');
                const weakEl = document.getElementById('fspl-dme-weakLink');
                if (upEl) {
                    upEl.textContent = dmeUpMargin !== null ? dmeUpMargin.toFixed(1) + ' dB' : '--';
                    upEl.className = 'result-value ' + (dmeUpMargin !== null ? getMarginClass(dmeUpMargin).cls : '');
                }
                if (downEl) {
                    downEl.textContent = dmeDownMargin !== null ? dmeDownMargin.toFixed(1) + ' dB' : '--';
                    downEl.className = 'result-value ' + (dmeDownMargin !== null ? getMarginClass(dmeDownMargin).cls : '');
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

            // --- Draw canvas ---
            drawSignalCurve(vorFreq, dmeFreq, vorTxPower, dmeTxPower, vorMaxRange, dmeMaxRange);
        }

        function drawSignalCurve(vorFreq, dmeFreq, vorTxPower, dmeTxPower, vorMaxNm, dmeMaxNm) {
            const c = document.getElementById('fsplCanvas');
            if (!c || c.clientWidth === 0) return;

            const dpr = window.devicePixelRatio || 1;
            c.width = c.clientWidth * dpr;
            c.height = c.clientHeight * dpr;
            const ctx = c.getContext('2d');
            ctx.scale(dpr, dpr);
            const w = c.clientWidth, h = c.clientHeight;
            ctx.clearRect(0, 0, w, h);

            if (!vorFreq || vorFreq <= 0 || (!vorTxPower && !dmeTxPower)) return;

            const padL = 55, padR = 20, padT = 15, padB = 35;
            const dw = w - padL - padR, dh = h - padT - padB;

            // Determine axis ranges — use the higher TX power for Y-axis scaling
            const maxDist = Math.max(vorMaxNm || 200, dmeMaxNm || 50, 50) * 1.3;
            const txDbm = wattsTodBm(Math.max(vorTxPower || 1, dmeTxPower || 1));
            const minDbm = Math.min(VOR_RX_SENS, DME_RX_SENS, DME_XPDR_SENS) - 15;
            const maxDbm = txDbm - 20;

            const toX = d => padL + (d / maxDist) * dw;
            const toY = dbm => padT + ((maxDbm - dbm) / (maxDbm - minDbm)) * dh;

            // Grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
            for (let d = 0; d <= maxDist; d += Math.ceil(maxDist / 5)) {
                ctx.beginPath(); ctx.moveTo(toX(d), padT); ctx.lineTo(toX(d), h - padB); ctx.stroke();
            }

            // Axes
            ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(padL, h - padB); ctx.lineTo(w - padR, h - padB); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, h - padB); ctx.stroke();

            // Axis labels
            ctx.fillStyle = 'var(--text-muted)'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
            for (let d = 0; d <= maxDist; d += Math.ceil(maxDist / 5)) {
                ctx.fillText(Math.round(d) + '', toX(d), h - padB + 15);
            }
            ctx.fillText('Distance (NM)', padL + dw / 2, h - 5);

            ctx.textAlign = 'right';
            const dbmStep = Math.ceil((maxDbm - minDbm) / 5 / 10) * 10;
            for (let dbm = Math.floor(minDbm / 10) * 10; dbm <= maxDbm; dbm += dbmStep) {
                ctx.fillText(dbm + '', padL - 5, toY(dbm) + 3);
            }
            ctx.save(); ctx.translate(12, padT + dh / 2); ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center'; ctx.fillText('Signal (dBm)', 0, 0); ctx.restore();

            // RX sensitivity threshold line
            ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)';
            ctx.beginPath(); ctx.moveTo(padL, toY(VOR_RX_SENS)); ctx.lineTo(w - padR, toY(VOR_RX_SENS)); ctx.stroke();
            ctx.fillStyle = 'rgba(6, 182, 212, 0.7)'; ctx.textAlign = 'left'; ctx.font = '9px Inter';
            ctx.fillText('RX Sens ' + VOR_RX_SENS + ' dBm', padL + 3, toY(VOR_RX_SENS) - 4);
            ctx.setLineDash([]);

            // VOR signal curve (cyan)
            const steps = 80;
            if (vorTxPower > 0) {
            ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let i = 1; i <= steps; i++) {
                const d = (i / steps) * maxDist;
                const lb = calcLinkBudget(vorTxPower, vorFreq, d);
                const y = toY(lb.rxPower);
                if (i === 1) ctx.moveTo(toX(d), y); else ctx.lineTo(toX(d), y);
            }
            ctx.stroke();
            // Label
            ctx.fillStyle = '#06b6d4'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'left';
            const vorLabelD = maxDist * 0.15;
            const vorLabelLb = calcLinkBudget(vorTxPower, vorFreq, vorLabelD);
            ctx.fillText('VOR (' + Math.round(vorFreq) + ' MHz)', toX(vorLabelD) + 5, toY(vorLabelLb.rxPower) - 6);
            }

            // DME signal curve (amber) — downlink (weaker leg typically)
            if (dmeFreq > 0 && dmeTxPower > 0) {
                ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2.5;
                ctx.beginPath();
                for (let i = 1; i <= steps; i++) {
                    const d = (i / steps) * maxDist;
                    const lb = calcLinkBudget(dmeTxPower, dmeFreq, d);
                    const y = toY(lb.rxPower);
                    if (i === 1) ctx.moveTo(toX(d), y); else ctx.lineTo(toX(d), y);
                }
                ctx.stroke();
                // Label
                ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 10px Inter';
                const dmeLabelD = maxDist * 0.15;
                const dmeLabelLb = calcLinkBudget(dmeTxPower, dmeFreq, dmeLabelD);
                ctx.fillText('DME (' + dmeFreq + ' MHz)', toX(dmeLabelD) + 5, toY(dmeLabelLb.rxPower) + 14);

                // Shade the gap between curves at distance entered
                const distVal = parseFloat(document.getElementById('fspl-dist').value);
                if (!isNaN(distVal) && distVal > 0 && distVal <= maxDist) {
                    const xLine = toX(distVal);
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
                    ctx.beginPath(); ctx.moveTo(xLine, padT); ctx.lineTo(xLine, h - padB); ctx.stroke();
                    ctx.setLineDash([]);
                    // Mark points
                    const vorPt = vorTxPower > 0 ? calcLinkBudget(vorTxPower, vorFreq, distVal) : null;
                    const dmePt = calcLinkBudget(dmeTxPower, dmeFreq, distVal);
                    if (vorPt) { ctx.fillStyle = '#06b6d4'; ctx.beginPath(); ctx.arc(xLine, toY(vorPt.rxPower), 4, 0, Math.PI * 2); ctx.fill(); }
                    ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(xLine, toY(dmePt.rxPower), 4, 0, Math.PI * 2); ctx.fill();
                    // Gap arrow (only when both curves are present)
                    if (vorPt) {
                    const gap = vorPt.rxPower - dmePt.rxPower;
                    if (gap > 2) {
                        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
                        ctx.fillRect(xLine - 12, toY(vorPt.rxPower), 24, toY(dmePt.rxPower) - toY(vorPt.rxPower));
                        ctx.fillStyle = '#ef4444'; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'center';
                        ctx.fillText('Δ' + gap.toFixed(0) + 'dB', xLine, (toY(vorPt.rxPower) + toY(dmePt.rxPower)) / 2 + 3);
                    }
                    }
                }
            }
        }