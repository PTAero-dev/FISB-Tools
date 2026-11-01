// GRADIENT TAB

        // --- GRADIENT MODULE ---
        let gradLegCount = 1; // Track added legs

        function addGradientLeg() {
            gradLegCount++;
            const id = 'grad' + gradLegCount;
            const container = document.getElementById('grad-legs-container');

            // --- AUTO-FILL START ALT FROM PREVIOUS LEG ---
            let prevEndAlt = "";
            let prevEndDist = "";
            const existingCards = Array.from(container.querySelectorAll('.card'));
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
            card.className = 'card';
            card.id = 'card-' + id;

            card.innerHTML = `
                    <div class="card-header minimizable" onclick="toggleCard(this)" title="Click to Minimize/Expand">
                        <div class="card-title">Leg ${existingCards.length + 1} <span id="${id}-header-info" style="font-size:0.9rem; font-weight:400; color:var(--text-muted); margin-left:10px;"></span></div>
                        <div style="display:flex; gap:5px;">
                            <button class="btn-mini danger"
                                onclick="event.stopPropagation(); deleteGradientLeg('${id}');">DELETE</button>
                             <button class="btn-mini" style="background:rgba(255,255,255,0.1);"
                                onclick="event.stopPropagation(); clearIds('${id}-startAlt','${id}-endAlt','${id}-dist','${id}-sdist','${id}-edist','${id}-angle-in','${id}-pct-in', '${id}');">RESET</button>
                        </div>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                         <!-- Row 1: Altitudes & Angle/Gradient -->
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                             <div class="vp-input-group">
                                <label>Start Altitude (ft)</label>
                                <input type="number" inputmode="decimal" id="${id}-startAlt" placeholder="e.g. 3000" value="${prevEndAlt}"
                                    oninput="calculateGradient('${id}', 'sAlt')">
                            </div>
                            <div class="vp-input-group">
                                <label>End Altitude (ft)</label>
                                <input type="number" inputmode="decimal" id="${id}-endAlt" placeholder="e.g. 5000"
                                    oninput="calculateGradient('${id}', 'eAlt')">
                            </div>
                            <div class="vp-input-group">
                                <label>Gradient (%) [Optional]</label>
                                <input type="number" inputmode="decimal" id="${id}-pct-in" placeholder="Calc"
                                    onchange="calculateGradient('${id}', 'pct')" step="0.01"
                                    style="border-color: var(--accent-cyan);">
                            </div>
                            <div class="vp-input-group">
                                <label>Angle (°) [Optional]</label>
                                <input type="number" inputmode="decimal" id="${id}-angle-in" placeholder="Calc"
                                    onchange="calculateGradient('${id}', 'angle')" style="border-color: var(--accent-cyan);">
                            </div>
                        </div>

                         <!-- Row 2: Distances -->
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                             <div class="vp-input-group">
                                <label>Leg Dist (NM)</label>
                                <input type="number" inputmode="decimal" id="${id}-dist" placeholder="e.g. 5.0"
                                    onchange="calculateGradient('${id}', 'dist')">
                            </div>
                            <div class="vp-input-group">
                                <label>Start Dist (NM)</label>
                                <input type="number" inputmode="decimal" id="${id}-sdist" placeholder="--" value="${prevEndDist}"
                                    onchange="calculateGradient('${id}', 'sDist')">
                            </div>
                             <div class="vp-input-group">
                                <label>End Dist (NM)</label>
                                <input type="number" inputmode="decimal" id="${id}-edist" placeholder="--"
                                    onchange="calculateGradient('${id}', 'eDist')">
                            </div>
                        </div>
                    </div>

                    <div class="results-panel">
                        <div class="result-row"><span class="result-label">Status</span><span id="${id}-type"
                                class="result-value">---</span></div>
                        <div class="result-row"><span class="result-label">Alt Change</span><span id="${id}-delta"
                                class="result-value">0 ft</span></div>
                        <div style="height:1px; background:rgba(255,255,255,0.1); margin:10px 0;"></div>
                        <div class="result-row"><span class="result-label">Gradient (ft/NM)</span><span id="${id}-ftnm"
                                class="result-value res-accent">0</span></div>
                        <div class="result-row"><span class="result-label">Gradient (%)</span><span id="${id}-percent"
                                class="result-value res-accent">0.0%</span></div>
                        <div class="result-row"><span class="result-label">Angle (°)</span><span id="${id}-angle"
                                class="result-value res-accent">0.00°</span></div>
                    </div>
                    <canvas id="${id}Canvas" style="height:150px; width:100%; margin-top:10px; background:rgba(0,0,0,0.2); border-radius:4px;"></canvas>
            `;
            container.appendChild(card);
        }

        function deleteGradientLeg(id) {
            const card = document.getElementById('card-' + id);
            if (card) card.remove();
            document.querySelectorAll('#grad-legs-container .card').forEach((c, idx) => {
                const titleEl = c.querySelector('.card-title');
                if (titleEl && titleEl.firstChild && titleEl.firstChild.nodeType === Node.TEXT_NODE) {
                    titleEl.firstChild.textContent = `Leg ${idx + 1} `;
                }
            });
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
                    // Dist changed
                    if (!isNaN(d)) {
                        if (!isNaN(sd)) {
                            // S + D -> E
                            eDistInput.value = (sd + d).toFixed(2);
                        } else if (!isNaN(ed)) {
                            // E - D -> S
                            sDistInput.value = (ed - d).toFixed(2);
                        }
                    }
                } else if (source === 'sDist') {
                    // Start Dist changed
                    if (!isNaN(sd)) {
                        if (!isNaN(d)) {
                            // S + D -> E (Maintain leg length priority if entered)
                            eDistInput.value = (sd + d).toFixed(2);
                        } else if (!isNaN(ed)) {
                            // E - S -> D
                            distInput.value = Math.abs(ed - sd).toFixed(2);
                        }
                    }
                } else if (source === 'eDist') {
                    // End Dist changed
                    if (!isNaN(ed)) {
                        if (!isNaN(d)) {
                            // E - D -> S
                            sDistInput.value = (ed - d).toFixed(2);
                        } else if (!isNaN(sd)) {
                            // E - S -> D
                            distInput.value = Math.abs(ed - sd).toFixed(2);
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

            // --- 2. PERCENT <-> ANGLE SYNC ---
            if (source === 'pct' && !isNaN(pctIn)) {
                // Percent entered → convert to angle degrees
                angIn = Math.atan(pctIn / 100) * (180 / Math.PI);
                if (angleInput) angleInput.value = angIn.toFixed(4);
            } else if (source === 'angle' && !isNaN(angIn)) {
                // Angle entered → convert to percent
                let pctVal = Math.tan(angIn * Math.PI / 180) * 100;
                if (pctInput) pctInput.value = pctVal.toFixed(4);
            }

            // --- 3. SOLVING LOGIC ---
            // Case A: Manual Angle Provided
            if (!isNaN(angIn)) {
                if (!isNaN(sAlt) && !isNaN(d) && source !== 'eAlt') {
                    // Calc E.Alt
                    let rad = angIn * Math.PI / 180;
                    let runFt = d * FT_PER_NM;
                    let rise = Math.tan(rad) * runFt;
                    let newEnd = sAlt + rise;
                    eAltInput.value = Math.round(newEnd);
                }
                else if (!isNaN(sAlt) && !isNaN(eAlt) && isNaN(d)) {
                    // Calc Dist — guard: tan(0) = 0 and tan(≥90°) = huge/undefined
                    let rise = eAlt - sAlt;
                    let rad = angIn * Math.PI / 180;
                    if (rad > 0 && rad < Math.PI / 2) {
                        let runFt = rise / Math.tan(rad);
                        d = runFt / FT_PER_NM;
                        distInput.value = Math.abs(d).toFixed(2);
                    }
                }
            }

            // --- 3. AUTO-SYNC NEXT LEG ---
            // (We keep this simplified: if next leg exists, update its start vals)
            eAlt = parseFloat(eAltInput.value);
            // Parsing prefix to find next ID is tricky if IDs are non-sequential due to deletes.
            // But usually we just look for 'grad' + (current + 1).
            // If that element doesn't exist, we skip.

            const gradCont = document.getElementById('grad-legs-container');
            const allLegCards = gradCont ? Array.from(gradCont.querySelectorAll('.card')) : [];
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
            eAlt = parseFloat(eAltInput.value); // Use updated eAlt
            d = parseFloat(distInput.value);

            const typeEl = document.getElementById(prefix + '-type');
            const deltaEl = document.getElementById(prefix + '-delta');
            const ftnmEl = document.getElementById(prefix + '-ftnm');
            const pctEl = document.getElementById(prefix + '-percent');
            const angEl = document.getElementById(prefix + '-angle');
            const headerInfoEl = document.getElementById(prefix + '-header-info');
            const canvas = document.getElementById(prefix + 'Canvas');

            if (isNaN(sAlt) || isNaN(eAlt) || isNaN(d) || d <= 0) {
                // Reset outputs
                typeEl.textContent = "---"; typeEl.className = "result-value";
                deltaEl.textContent = "0 ft";
                ftnmEl.textContent = "0";
                pctEl.textContent = "0.0%";
                angEl.textContent = "0.00°";
                if (headerInfoEl) headerInfoEl.textContent = "";
                if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            let deltaAlt = eAlt - sAlt;
            let absDelta = Math.abs(deltaAlt);
            let angleDeg = 0;

            if (deltaAlt > 0) {
                typeEl.textContent = "CLIMB"; typeEl.className = "result-value res-success";
            } else if (deltaAlt < 0) {
                typeEl.textContent = "DESCEND"; typeEl.className = "result-value res-danger";
            } else {
                typeEl.textContent = "LEVEL"; typeEl.className = "result-value";
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
                if (angleInput && source !== 'angle' && source !== 'pct') {
                    angleInput.value = angleDeg.toFixed(4);
                }
                if (pctInput && source !== 'angle' && source !== 'pct') {
                    pctInput.value = percent.toFixed(4);
                }

                drawGradientViz(d, absDelta, deltaAlt > 0, angleDeg, prefix + 'Canvas');

                if (headerInfoEl) {
                    let typeStr = (deltaAlt > 0) ? "CLIMB" : (deltaAlt < 0 ? "DESCEND" : "LEVEL");
                    let color = (deltaAlt > 0) ? "var(--accent-success)" : (deltaAlt < 0 ? "var(--accent-danger)" : "var(--text-muted)");
                    headerInfoEl.innerHTML = `<span style="color:${color}; font-weight:700;">${typeStr}</span> ${fmt(Math.round(absDelta))} ft at <span style="color:var(--accent-cyan);">${percent.toFixed(2)}%</span> or <span style="color:var(--accent-cyan);">${angleDeg.toFixed(2)}°</span>`;
                }
            } else {
                drawGradientViz(0, 0, true, 0, prefix + 'Canvas');
                if (headerInfoEl) headerInfoEl.textContent = "";
            }
        }

        function drawGradientViz(runNM, riseFT, isClimb, angleVal, canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;

            // Resize for Retina/HiDPI
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;

            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
            const w = rect.width;
            const h = rect.height;

            ctx.clearRect(0, 0, w, h);
            if (runNM <= 0 || riseFT <= 0) return;

            const pad = 40;
            const dw = w - (pad * 2);
            const dh = h - (pad * 2);
            const startX = pad;
            const startY = h - pad;
            const endX = w - pad;
            const endY = pad;

            ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 3;
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';

            ctx.beginPath();
            if (isClimb) {
                // Climb: Bottom-Left to Top-Right
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
                // Fill Area
                ctx.lineTo(endX, startY);
                ctx.lineTo(startX, startY);
                ctx.fill();
            } else {
                // Descend: Top-Left to Bottom-Right
                ctx.moveTo(startX, pad);
                ctx.lineTo(endX, startY);
                ctx.stroke();
                // Fill Area
                ctx.lineTo(startX, startY);
                ctx.lineTo(startX, pad);
                ctx.fill();
            }

            // Axes
            ctx.strokeStyle = getThemeColor('--border-light') || 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(startX, startY); ctx.lineTo(endX, startY); // X
            ctx.moveTo(startX, startY); ctx.lineTo(startX, pad); // Y
            ctx.stroke();

            // Labels
            ctx.fillStyle = getThemeColor('--text-main') || '#eef1f5'; ctx.font = '12px Inter';
            ctx.textAlign = 'center'; ctx.fillText(`${runNM} NM`, startX + dw / 2, startY + 20);

            ctx.save();
            ctx.translate(startX - 20, startY - dh / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.fillText(`${riseFT} ft`, 0, 0);
            ctx.restore();
        }