// ILS ANALYSIS TAB (Profile, Coverage, and embedded DDM to uA converter card)

        // --- ILS MODULE ---
        function updateILSMorse(ident) {
            const morseEl = document.getElementById('ils-morse');
            const minInfoEl = document.getElementById('ils-min-info');

            if (!morseEl) return;
            let code = "";
            for (let char of ident.toUpperCase()) {
                if (MORSE_CODE[char]) code += MORSE_CODE[char] + "   ";
            }
            morseEl.textContent = code;

            // Update Minimized Info - REMOVED PER USER REQUEST
            if (minInfoEl) {
                minInfoEl.innerText = "";
            }
        }

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
            const c = document.getElementById('ilsCanvas');
            if (!c) return;
            const dpr = window.devicePixelRatio || 1;
            if (c.clientWidth === 0) return;
            c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
            const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
            const w = c.clientWidth; const h = c.clientHeight;

            ctx.clearRect(0, 0, w, h);
            if (distNM <= 0) return;

            const labelColor = getThemeColor('--text-main') || '#eef1f5';

            // Increased padding to prevent clipping (Right 80px for GP Capture label, Left 60px for TCH)
            const padLeft = 60; const padRight = 80; const padTop = 50; const padBot = 30;
            const drawW = w - padLeft - padRight; const drawH = h - padTop - padBot;

            // X Scale
            const scaleX = drawW / (distNM * 1.1);
            const toX = (nm) => padLeft + (nm * scaleX);

            // Y Scale (Max Height: HAT)
            const maxY = hat * 1.3;
            const scaleY = drawH / maxY;
            const toY = (alt) => (h - padBot) - (alt * scaleY);

            // Ground Line
            ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(padLeft, h - padBot); ctx.lineTo(w - padRight, h - padBot); ctx.stroke();

            // Threshold Marker (x=0)
            const xThr = toX(0);
            ctx.fillStyle = "#e5e7eb"; ctx.font = "bold 11px Inter"; ctx.textAlign = "center";
            ctx.fillText("THR", xThr, h - 10);
            ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(xThr, h - padBot - 5); ctx.lineTo(xThr, h - padBot + 5); ctx.stroke();

            // TCH Point
            const yTch = toY(tch);
            ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(xThr, yTch, 3, 0, Math.PI * 2); ctx.fill();
            // TCH Label (Shifted slightly right to avoid left edge clipping if needed)
            ctx.fillStyle = "#f59e0b"; ctx.textAlign = "right"; ctx.font = "bold 11px Inter";
            ctx.fillText(`TCH ${tch}'`, xThr - 5, yTch - 5);

            // GP Angle Label - MOVED BETWEEN GROUND AND GP LINE
            const yGround = h - padBot;
            const yLabel = (yTch + yGround) / 2;
            ctx.fillStyle = "#f59e0b"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
            ctx.fillText(`${gpa}°`, xThr + 20, yLabel);

            // Target Point (GP Capture)
            const xTarget = toX(distNM);
            const yTarget = toY(hat);

            // Glide Path Line (TCH -> Target)
            ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(xThr, yTch); ctx.lineTo(xTarget, yTarget); ctx.stroke();

            // Dashed Drop Line (Target -> Ground)
            ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(xTarget, yTarget); ctx.lineTo(xTarget, h - padBot); ctx.stroke();
            ctx.setLineDash([]);

            // Target Point Marker (Prominent)
            ctx.fillStyle = "#10b981"; // Success Green
            ctx.beginPath(); ctx.arc(xTarget, yTarget, 6, 0, Math.PI * 2); ctx.fill();

            // Labels at Target (GP Capture)
            const labelX = xTarget + 10;
            const labelY = yTarget;

            // "GP Capture: XXXX' MSL" - Large, Prominent
            ctx.fillStyle = labelColor; ctx.textAlign = "left"; ctx.font = "bold 14px Inter";
            ctx.fillText(`GP Capture:`, labelX, labelY - 5);
            ctx.font = "bold 14px Inter";
            ctx.fillText(`${fmt(Math.round(targetMSL))}' MSL`, labelX, labelY + 12);

            // "XX NM / XXXX' HAT" - Smaller, Muted
            ctx.fillStyle = "#9ca3af"; ctx.font = "11px Inter";
            ctx.fillText(`${distNM.toFixed(1)} NM / ${fmt(Math.round(hat))}' HAT`, labelX, labelY + 28);
        }

        // --- ILS COVERAGE (OVERHAULED) ---
        let covMode = 'loc'; // 'loc' or 'gs'
        function setCovMode(mode) {
            covMode = mode;
            document.getElementById('btn-cov-loc').className = (mode === 'loc') ? 'btn-mini active' : 'btn-mini';
            document.getElementById('btn-cov-gs').className = (mode === 'gs') ? 'btn-mini active' : 'btn-mini';
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

            // Reset Outputs
            if (isNaN(crs)) {
                if (document.getElementById('fc-radial')) document.getElementById('fc-radial').innerText = "--";
                if (document.getElementById('fc-left')) document.getElementById('fc-left').innerText = "--";
                if (document.getElementById('fc-right')) document.getElementById('fc-right').innerText = "--";
                if (document.getElementById('fc-time')) document.getElementById('fc-time').innerText = "--:--";
                if (c) {
                    const ctx = c.getContext('2d');
                    ctx.clearRect(0, 0, c.width, c.height);
                }
                return;
            }

            // Calculations
            const limit = (covMode === 'loc') ? 40 : 8;
            const inboundRad = (crs + 180) % 360;
            const leftLim = (inboundRad - limit + 360) % 360;
            const rightLim = (inboundRad + limit + 360) % 360;

            // Adjust 0 to 360 for display
            const fmtRad = (r) => "R" + Math.round(r === 0 ? 360 : r).toString().padStart(3, '0');

            if (document.getElementById('fc-radial')) document.getElementById('fc-radial').innerText = fmtRad(inboundRad);
            if (document.getElementById('fc-left')) document.getElementById('fc-left').innerText = fmtRad(leftLim);
            if (document.getElementById('fc-right')) document.getElementById('fc-right').innerText = fmtRad(rightLim);

            // Time Calc & Finish Time
            if (!isNaN(dist) && !isNaN(gs) && gs > 0) {
                const totalAngle = limit * 2;
                const arcDist = (totalAngle / 360) * 2 * Math.PI * dist;
                const timeHrs = arcDist / gs;
                const timeMin = timeHrs * 60;
                if (document.getElementById('fc-time')) document.getElementById('fc-time').innerText = formatMinSec(timeMin) + " min";

                // Finish Time
                const startTimeInput = document.getElementById('fc-start-time');
                // Regex for 4 digits (HHMM)
                let timeStr = startTimeInput ? startTimeInput.value : "";

                if (timeStr && (/^\d{4}$/.test(timeStr) || /^\d{6}$/.test(timeStr))) {
                    let hStr = timeStr.substring(0, 2);
                    let mStr = timeStr.substring(2, 4);
                    let startH = parseInt(hStr);
                    let startM = parseInt(mStr);

                    // Handle Seconds if present (Round Up Minutes)
                    if (timeStr.length === 6) {
                        let sStr = timeStr.substring(4, 6);
                        let startS = parseInt(sStr);
                        if (startS > 0) {
                            startM++;
                            if (startM >= 60) {
                                startM = 0;
                                startH++;
                                if (startH >= 24) startH = 0;
                            }
                        }
                    }

                    // Validate
                    if (startH >= 0 && startH < 24 && startM >= 0 && startM < 60) {
                        const totalMin = (startH * 60) + startM + timeMin;

                        // Calculate UTC Finish Time
                        const endH = Math.floor(totalMin / 60) % 24;
                        const endM = Math.floor(totalMin % 60);
                        const utcTimeString = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

                        // Calculate Local Finish Time
                        const now = new Date();
                        const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), startH, startM, 0));
                        startDate.setMinutes(startDate.getMinutes() + timeMin);

                        const localH = startDate.getHours().toString().padStart(2, '0');
                        const localM = startDate.getMinutes().toString().padStart(2, '0');
                        const localTimeString = `${localH}:${localM}`;

                        if (document.getElementById('fc-end-time-utc')) {
                            document.getElementById('fc-end-time-utc').innerText = utcTimeString;
                        }
                        if (document.getElementById('fc-end-time-local')) {
                            document.getElementById('fc-end-time-local').innerText = localTimeString;
                        }
                        // Legacy cleanup
                        if (document.getElementById('fc-end-time')) {
                            document.getElementById('fc-end-time').style.display = 'none';
                        }


                    } else {
                        // Invalid time
                        if (document.getElementById('fc-end-time-utc')) document.getElementById('fc-end-time-utc').innerText = "Inv";
                        if (document.getElementById('fc-end-time-local')) document.getElementById('fc-end-time-local').innerText = "Inv";
                    }
                } else {
                    if (document.getElementById('fc-end-time-utc')) document.getElementById('fc-end-time-utc').innerText = "--:--";
                    if (document.getElementById('fc-end-time-local')) document.getElementById('fc-end-time-local').innerText = "--:--";
                }

            } else {
                if (document.getElementById('fc-time')) document.getElementById('fc-time').innerText = "--:--";
                if (document.getElementById('fc-end-time-utc')) document.getElementById('fc-end-time-utc').innerText = "--:--";
                if (document.getElementById('fc-end-time-local')) document.getElementById('fc-end-time-local').innerText = "--:--";
            }

            // Visualization
            if (!c) return;
            const dpr = window.devicePixelRatio || 1;
            c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
            const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
            const w = c.clientWidth; const h = c.clientHeight;
            const cx = w / 2; const cy = h / 2;
            const r = Math.min(w, h) * 0.4;

            ctx.clearRect(0, 0, w, h);

            const labelColor = getThemeColor('--text-main') || '#eef1f5';
            const mutedText = getThemeColor('--text-muted') || '#9ca3af';
            const borderColor = getThemeColor('--border-light') || 'rgba(255,255,255,0.2)';

            // Compass Ring
            ctx.strokeStyle = borderColor; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

            // Cardinal Points
            ctx.fillStyle = mutedText; ctx.font = "10px Inter"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("N", cx, cy - r - 10);
            ctx.fillText("S", cx, cy + r + 10);
            ctx.fillText("E", cx + r + 10, cy);
            ctx.fillText("W", cx - r - 10, cy);

            // Convert deg to radians (Canvas 0 is East/Right, degrees usually 0 North)
            // Compass 0 (North) -> Canvas -90 (3*PI/2)
            const toRad = (deg) => (deg - 90) * (Math.PI / 180);

            // Sector Wedge
            const startAng = toRad(leftLim);
            const endAng = toRad(rightLim);

            ctx.fillStyle = "rgba(6, 182, 212, 0.2)"; // Cyan transparent
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAng, endAng);
            ctx.closePath();
            ctx.fill();

            // Sector Limit Lines (Dashed)
            ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(startAng) * r, cy + Math.sin(startAng) * r); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(endAng) * r, cy + Math.sin(endAng) * r); ctx.stroke();
            ctx.setLineDash([]);

            // Limit Labels
            ctx.fillStyle = "#06b6d4"; ctx.font = "bold 10px Inter";
            ctx.fillText(fmtRad(leftLim), cx + Math.cos(startAng) * (r + 15), cy + Math.sin(startAng) * (r + 15));
            ctx.fillText(fmtRad(rightLim), cx + Math.cos(endAng) * (r + 15), cy + Math.sin(endAng) * (r + 15));

            // LOC Course Line (Green) - Show Centerline (Inbound Radial)
            const crsAng = toRad(inboundRad);
            ctx.strokeStyle = "#10b981"; ctx.lineWidth = 2; // Green
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(crsAng) * (r - 10), cy + Math.sin(crsAng) * (r - 10)); ctx.stroke();

            // Label LOC Course - MOVED TO TOP LEFT (User Request)
            const crsLabel = Math.round(crs).toString().padStart(3, '0');
            ctx.fillStyle = "#10b981"; ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.font = "bold 14px Inter";
            ctx.fillText(`LOC CRS ${crsLabel}`, 10, 10);
        }

        function setNowUTC() {
            const now = new Date();
            const h = now.getUTCHours().toString().padStart(2, '0');
            const m = now.getUTCMinutes().toString().padStart(2, '0');
            const timeStr = `${h}${m}`;
            const input = document.getElementById('fc-start-time');
            if (input) {
                input.value = timeStr;
                drawILSCov(); // Update calcs
            }
        }

        // --- DDM TO MICROAMPERE CONVERTER MODULE ---
        // ICAO Annex 10: LOC FSD = 0.155 DDM = 150 µA; GS FSD = 0.175 DDM = 150 µA
        const DDM_CONFIG = {
            loc: { fsdDDM: 0.155, fsdUA: 150 },  // scale = 150/0.155 = 967.742 µA/DDM
            gs:  { fsdDDM: 0.175, fsdUA: 150 }   // scale = 150/0.175 = 857.143 µA/DDM
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
            // Map -150..+150 µA to bar position
            const pct = Math.min(Math.max(uaVal / 150, -1), 1); // clamp to -1..+1
            const absPct = Math.abs(pct) * 50; // max 50% width

            if (pct >= 0) {
                barEl.style.left = '50%';
                barEl.style.right = 'auto';
                barEl.style.width = absPct + '%';
            } else {
                barEl.style.left = (50 - absPct) + '%';
                barEl.style.right = 'auto';
                barEl.style.width = absPct + '%';
            }
        }

        function clearDDMConverter() {
            ['ddm-loc-ddm','ddm-loc-ua','ddm-gs-ddm','ddm-gs-ua'].forEach(id => {
                document.getElementById(id).value = '';
            });
            updateDDMBar(document.getElementById('ddm-loc-bar'), 0);
            updateDDMBar(document.getElementById('ddm-gs-bar'), 0);
        }