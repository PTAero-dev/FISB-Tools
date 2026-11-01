// THEODOLITE TAB

        // --- THEODOLITE MODULE ---
        let currentTheoMode = 'gen';

        function setTheoMode(mode) {
            currentTheoMode = mode;
            document.getElementById('btn-theo-gen').className = (mode === 'gen') ? 'theo-mode-btn active' : 'theo-mode-btn';
            document.getElementById('btn-theo-setup').className = (mode === 'setup') ? 'theo-mode-btn active' : 'theo-mode-btn';

            document.getElementById('theo-gen-container').classList.toggle('hidden', mode !== 'gen');
            document.getElementById('theo-setup-container').classList.toggle('hidden', mode !== 'setup');

            if (mode === 'gen') {
                updateTheoUI();
                calculateTheodolite();
            } else {
                calculateTheoSetup();
            }
        }

        function updateTheoUI() {
            const mode = document.getElementById('theo-mode').value;
            // Reset all highlights
            ['angle', 'h1', 'x', 'd1'].forEach(suffix => {
                const grp = document.getElementById(`grp-theo-${suffix}`);
                if (grp) grp.style.opacity = '1';
                const inp = document.getElementById(`theo-${suffix}`);
                if (inp) {
                    inp.disabled = false;
                    inp.style.borderColor = "var(--border-light)";
                    inp.style.color = "var(--text-main)";
                    inp.style.background = "rgba(0,0,0,0.2)";
                }
            });

            // Highlight the target to calculate
            const targetSuffix = (mode === 'dist') ? 'd1' : (mode === 'elev') ? 'x' : (mode === 'angle') ? 'angle' : 'h1';
            const tgtGrp = document.getElementById(`grp-theo-${targetSuffix}`);
            if (tgtGrp) tgtGrp.style.opacity = '0.5';
            
            const tgtInp = document.getElementById(`theo-${targetSuffix}`);
            if (tgtInp) {
                tgtInp.disabled = true;
                tgtInp.value = "";
                tgtInp.placeholder = "Calc";
                tgtInp.style.borderColor = "var(--accent-primary)";
                tgtInp.style.color = "var(--accent-primary)";
                tgtInp.style.background = "rgba(59, 130, 246, 0.05)";
            }
        }

        function calculateTheodolite() {
            const mode = document.getElementById('theo-mode').value;
            
            // Raw inputs
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
                    
                    // Also populate the disabled input field visually
                    const targetSuffix = (mode === 'dist') ? 'd1' : (mode === 'elev') ? 'x' : (mode === 'angle') ? 'angle' : 'h1';
                    const inp = document.getElementById(`theo-${targetSuffix}`);
                    if(inp) inp.value = (unit === '°') ? result.toFixed(3) : result.toFixed(2);
                } else {
                    throw new Error();
                }
            } catch (e) {
                resEl.innerText = "--";
                resUnit.innerText = (mode === 'angle') ? "°" : "m";
                formulaEl.innerText = "Formula: --";
            }
        }

        // TAB 2: Setup Optimizer Logic
        function syncTheoFromGen() {
            const mode = document.getElementById('theo-mode').value;
            let aVal, xVal;

            if (mode === 'angle') {
                aVal = document.getElementById('theo-angle').value; 
            } else {
                aVal = document.getElementById('theo-angle').value;
            }

            if (mode === 'elev') {
                xVal = document.getElementById('theo-x').value;
            } else {
                xVal = document.getElementById('theo-x').value;
            }

            if(aVal) document.getElementById('theo-setup-angle').value = (parseFloat(aVal)).toFixed(3);
            if(xVal) document.getElementById('theo-setup-x').value = (parseFloat(xVal)).toFixed(2);

            calculateTheoSetup();
        }

        function calculateTheoSetup() {
            const table = document.getElementById('theo-setup-table');
            if(!table) return;

            const aVal = parseFloat(document.getElementById('theo-setup-angle').value);
            const xVal = parseFloat(document.getElementById('theo-setup-x').value);

            table.innerHTML = "";

            if(isNaN(aVal) || isNaN(xVal) || aVal <= 0 || aVal >= 90) {
                return;
            }

            const aRad = (aVal * Math.PI) / 180;
            const tanA = Math.tan(aRad);

            // Calculate Base Distance (for H = 1.50)
            const baseD = (1.50 - xVal) / tanA;

            // Generate variations
            const heights = [1.45, 1.50, 1.55, 1.60, 1.65, 1.70, 1.75, 1.80];
            let html = "";

            heights.forEach(h => {
                let d = (h - xVal) / tanA;
                if(d < 0) d = 0; // Prevent negative distances if X > H

                let diff = d - baseD;
                let sign = diff > 0 ? "+" : "";
                let diffStr = (h === 1.50) ? "Base" : `<span style="color:${diff > 0 ? 'var(--accent-warning)' : 'var(--accent-success)'}">${sign}${diff.toFixed(2)}</span>`;

                html += `
                    <tr>
                        <td style="font-weight:700;">${h.toFixed(2)} m</td>
                        <td style="text-align:right; color:var(--accent-cyan); font-family:monospace;">${d.toFixed(2)}</td>
                        <td style="text-align:right; font-family:monospace;">${diffStr}</td>
                    </tr>
                `;
            });

            table.innerHTML = html;
        }

        function clearTheodolite() {
            // General Tab
            ['theo-angle', 'theo-h1', 'theo-x', 'theo-d1'].forEach(id => {
                const el = document.getElementById(id);
                // Do not clear if it's currently disabled (it's the target being calculated)
                if (el && !el.disabled) el.value = "";
            });
            
            // Results Panel
            if (document.getElementById('theo-res-val')) document.getElementById('theo-res-val').innerText = "--";
            if (document.getElementById('theo-formula')) document.getElementById('theo-formula').innerText = "Formula: --";
            
            // Clear the calculated target visually too
            const mode = document.getElementById('theo-mode').value;
            const targetSuffix = (mode === 'dist') ? 'd1' : (mode === 'elev') ? 'x' : (mode === 'angle') ? 'angle' : 'h1';
            const inp = document.getElementById(`theo-${targetSuffix}`);
            if(inp && inp.disabled) inp.value = "";

            // Setup Tab
            if (document.getElementById('theo-setup-angle')) document.getElementById('theo-setup-angle').value = "";
            if (document.getElementById('theo-setup-x')) document.getElementById('theo-setup-x').value = "";
            if (document.getElementById('theo-setup-table')) document.getElementById('theo-setup-table').innerHTML = "";
            
        }