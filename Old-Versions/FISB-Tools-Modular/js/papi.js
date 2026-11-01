// PAPI TAB (includes embedded Angle Converter card)

        // --- PAPI MODULE ---
        // --- PAPI MODE SWITCHING ---
        function setPapiMode(mode) {
            const stdContainer = document.getElementById('papi-std-container');
            const ilsContainer = document.getElementById('papi-ils-container');
            const stdBtn = document.getElementById('btn-papi-std');
            const ilsBtn = document.getElementById('btn-papi-ils');

            if (mode === 'std') {
                stdContainer.classList.remove('hidden');
                ilsContainer.classList.add('hidden');
                stdBtn.classList.add('active');
                ilsBtn.classList.remove('active');
            } else {
                stdContainer.classList.add('hidden');
                ilsContainer.classList.remove('hidden');
                stdBtn.classList.remove('active');
                ilsBtn.classList.add('active');
            }
        }

        // Initialize PAPI
        (function() {
            // Wait for DOM to be ready
            setTimeout(() => {
                if (document.getElementById('papi-std-container')) {
                    addPapiCard('std');
                    addPapiCard('ils');
                    setPapiMode('std');
                }
            }, 100);
        })();

        let papiOffsetMode = 'dms'; // Default to minutes
        let papiNamingMode = 'AEROTHAI'; // AEROTHAI, ICAO, FAA
        let papiUnitMode = 'deg'; // deg, dms
        let papiCounter = 0; // Global ID counter for dynamic cards
        let lastEditedPapiId = null; // Track which card to show in the global Reference Guide

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
                <div class="card" id="${id}-card" style="margin-bottom:20px; position:relative;">
                    <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; cursor:default;">
                        <span style="display:flex; align-items:center;">
                            <span class="card-title">${title}</span>
                        </span>
                        <div style="display:flex; gap:8px;">
                            ${instanceCount === 0 ? `
                            <button class="btn-mini" onclick="event.stopPropagation(); addPapiCard('${mode}')" title="Add another card of this type">+</button>
                            ` : `
                            <button class="btn-mini danger" onclick="event.stopPropagation(); removePapiCard('${id}')" title="Delete this card">✕</button>
                            `}
                        </div>
                    </div>

                    <div class="card-content">
                        <div class="grid-3-col" style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:15px; margin-bottom:15px;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">ICAO /<br class="mobile-br"> Ident</label>
                                <input type="text" id="${id}-id" maxlength="4" style="text-transform: uppercase;"
                                    placeholder="RWY" oninput="this.value=this.value.toUpperCase(); updatePapiDraw('${id}')">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">Comm. Angle (°)</label>
                                <input type="number" inputmode="decimal" id="${id}-ca" step="0.01" value="3.00"
                                    oninput="calculatePAPI('${id}')">
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">Tolerance (±°)</label>
                                <input type="number" inputmode="decimal" id="${id}-tol" placeholder="0.00" step="0.01" value="0.1"
                                    oninput="calculatePAPI('${id}')">
                            </div>
                        </div>

                        <div class="grid-2-col" style="display:grid; grid-template-columns: 4fr 1fr; gap:15px; margin-bottom:15px;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">Offsets CA. (Box 1 → 4)</label>
                                <div id="${id}-offsets" class="offset-display" onclick="togglePapiOffsets('${id}')" style="cursor:pointer;" title="Click to Switch Degree/Minutes">
                                    <!-- Content injected by JS -->
                                </div>
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">OPS</label>
                                <div id="${id}-ops" class="ops-display">--°</div>
                            </div>
                        </div>

                        <table class="modern-table">
                            <thead>
                                <tr style="cursor:pointer; user-select:none;">
                                    <th class="papi-h1" onclick="cycleCardNaming('${id}')" title="Click to Cycle Naming">AEROTHAI</th>
                                    <th class="papi-h2" onclick="toggleCardUnit('${id}')" style="text-align: center;" title="Click to Toggle Unit">Degree Decimal</th>
                                    <th>Tolerance Range</th>
                                </tr>
                            </thead>
                            <tbody id="${id}-tbody"></tbody>
                        </table>

                        <div style="text-align:right; margin-top:15px;">
                            <button class="btn-mini danger" onclick="event.stopPropagation(); document.getElementById('${id}-id').value=''; document.getElementById('${id}-ca').value=''; calculatePAPI('${id}');">CLEAR</button>
                        </div>
                    </div>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', cardHtml);
            
            // Set initial settings on card
            const card = document.getElementById(id + '-card');
            card.dataset.mode = mode;
            card.dataset.naming = 'AEROTHAI';
            card.dataset.unit = 'deg';
            card.dataset.offsetUnit = 'dms';
            
            // Initial render
            setTimeout(() => {
                renderPapiOffsets(id);
                calculatePAPI(id);
            }, 10);
        }

        function removePapiCard(id) {
            const card = document.getElementById(id + '-card');
            if (card) card.remove();
        }

        function cycleCardNaming(id) {
            const card = document.getElementById(id + '-card');
            if (!card) return;
            const modes = ['AEROTHAI', 'ICAO', 'FAA'];
            let current = card.dataset.naming || 'AEROTHAI';
            let idx = modes.indexOf(current);
            let next = modes[(idx + 1) % modes.length];
            card.dataset.naming = next;
            
            // Update this card's header only
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

            let minutes = [];
            if (mode === 'std') {
                let diff = 20; // Default 20'
                if (caVal > 4 && caVal <= 7) diff = 30;
                else if (caVal > 7) diff = 60;
                minutes = [-1.5 * diff, -0.5 * diff, 0.5 * diff, 1.5 * diff];
            } else {
                minutes = [-35, -15, 15, 35];
            }

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

        setTimeout(() => {
            renderPapiOffsets('papi1');
            renderPapiOffsets('papi2');
        }, 100);

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

            let offsetsMinutes = [];
            if (mode === 'std') {
                let diff = 20; // Default 20'
                if (caVal > 4 && caVal <= 7) diff = 30;
                else if (caVal > 7) diff = 60;
                offsetsMinutes = [-1.5 * diff, -0.5 * diff, 0.5 * diff, 1.5 * diff];
            } else {
                offsetsMinutes = [-35, -15, 15, 35];
            }

            const namingMap = {
                'AEROTHAI': ['Box 1', 'Box 2', 'Box 3', 'Box 4'],
                'ICAO': ['A', 'B', 'C', 'D'],
                'FAA': ['#4', '#3', '#2', '#1']
            };

            offsetsMinutes.forEach((offsetMin, index) => {
                let offsetDeg = offsetMin / 60;
                let decimalDeg = caVal + offsetDeg;
                
                // Format Value based on Unit Mode
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

                let row = `<tr>
                <td style="color:var(--text-muted);">${rowLabel}</td>
                <td style="${colorClass} font-family:'JetBrains Mono', monospace; text-align: center;">${displayVal}</td>
                <td style="font-family:'JetBrains Mono', monospace; color:var(--text-muted);">${rangeStr}</td>
            </tr>`;
                tbody.innerHTML += row;

                // Calculate OPS based on Box 1
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
            // Update identifying tracker for the global Ref Guide
            lastEditedPapiId = id;
            syncReferenceGuide(id);
        }

        function syncReferenceGuide(id) {
            // Target the global canvases in the Box Reference Guide
            const card = document.getElementById(id + '-card');
            const mode = card ? card.dataset.mode : 'std';
            
            const globalCanvasId = (mode === 'std') ? 'papi1Canvas' : 'papi2Canvas';
            const globalCanvas = document.getElementById(globalCanvasId);
            if (!globalCanvas) return;

            // Use the same drawing logic but for the larger global canvas
            const dpr = window.devicePixelRatio || 1;
            globalCanvas.width = globalCanvas.clientWidth * dpr;
            globalCanvas.height = globalCanvas.clientHeight * dpr;
            const ctx = globalCanvas.getContext('2d');
            ctx.scale(dpr, dpr);
            const w = globalCanvas.clientWidth;
            const h = globalCanvas.clientHeight;

            const idInput = document.getElementById(id + '-id');
            const idText = (idInput && idInput.value) ? idInput.value.toUpperCase() : "RWY";
            const color = (mode === 'ils') ? '#f59e0b' : '#10b981';

            ctx.clearRect(0, 0, w, h);
            
            const labelColor = getThemeColor('--text-main') || '#eef1f5';
            const mutedText = getThemeColor('--text-muted') || '#8b9bb4';

            // Draw Full Detail Runway
            const rwyY = h * 0.8; const rwyH = 40;
            const padX = 40;
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(padX, rwyY, w - 2*padX, rwyH);
            ctx.strokeStyle = "#475569"; ctx.strokeRect(padX, rwyY, w - 2*padX, rwyH);

            ctx.fillStyle = labelColor; ctx.font = "bold 16px Inter"; ctx.textAlign = "center";
            ctx.fillText(idText, padX + 30, rwyY + rwyH/2 + 6);

            // Boxes
            const boxSize = 24; const boxGap = 15;
            for(let i=0; i<4; i++) {
                ctx.fillStyle = color;
                let x = padX + 120;
                let y = (rwyY - 30 - boxSize) - ((3-i)*(boxSize+boxGap));
                ctx.fillRect(x, y, boxSize, boxSize);
                ctx.fillStyle = mutedText; ctx.font = "12px Inter"; ctx.textAlign = "left";
                ctx.fillText("Box "+(i+1), x + boxSize + 10, y + 18);
            }
            
            ctx.fillStyle = labelColor; ctx.font = "bold 14px Inter"; ctx.textAlign = "center";
            ctx.fillText("LANDING DIRECTION →", w/2, h - 10);
        }

        // --- ANGLE CONVERTER ---
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