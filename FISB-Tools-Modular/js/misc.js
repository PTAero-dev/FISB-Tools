// CONVERTERS TAB (Fuel, Units, Altimeter, Morse Decoder)

        // --- CONVERTERS MODULE ---
        function calcFuel(src) {
            let sg = parseFloat(document.getElementById('fuel-sg').value) || 0.8;
            if (sg <= 0) sg = 0.8;

            let lit = parseFloat(document.getElementById('fuel-liters').value);
            let gal = parseFloat(document.getElementById('fuel-gal').value);
            let lbs = parseFloat(document.getElementById('fuel-lbs').value);
            let kg = parseFloat(document.getElementById('fuel-kg').value);

            // Normalize to Liters first
            let baseLiters = 0;

            if (src === 'liters') baseLiters = lit;
            else if (src === 'gal') baseLiters = gal * 3.78541;
            else if (src === 'kg') baseLiters = kg / sg;
            else if (src === 'lbs') baseLiters = (lbs * 0.453592) / sg;
            else if (src === 'sg') {
                // If SG changes, re-calc based on what's filled. Default to Liters if available.
                if (!isNaN(lit)) baseLiters = lit;
                else if (!isNaN(gal)) baseLiters = gal * 3.78541;
                // ... simplistic approach: just use liters as master if SG changes
            }

            if (isNaN(baseLiters)) return;

            // Update all others
            if (src !== 'liters') document.getElementById('fuel-liters').value = baseLiters.toFixed(2);
            if (src !== 'gal') document.getElementById('fuel-gal').value = (baseLiters / 3.78541).toFixed(2);
            if (src !== 'kg') document.getElementById('fuel-kg').value = (baseLiters * sg).toFixed(2);
            if (src !== 'lbs') document.getElementById('fuel-lbs').value = ((baseLiters * sg) * 2.20462).toFixed(2);
        }

        function convDist(src) {
            const val = parseFloat(document.getElementById(`u-${src}`).value);
            if (isNaN(val)) return;

            let nm = 0;
            if (src === 'nm') nm = val;
            else if (src === 'm') nm = val / 1852;
            else if (src === 'ft') nm = val / 6076.12;
            else if (src === 'km') nm = val / 1.852;

            if (src !== 'nm') document.getElementById('u-nm').value = nm.toFixed(4);
            if (src !== 'm') document.getElementById('u-m').value = (nm * 1852).toFixed(2);
            if (src !== 'ft') document.getElementById('u-ft').value = (nm * 6076.12).toFixed(2);
            if (src !== 'km') document.getElementById('u-km').value = (nm * 1.852).toFixed(4);
        }

        function convSpeed(src) {
            const val = parseFloat(document.getElementById(`u-${src}`).value);
            if (isNaN(val)) return;

            let kts = 0; // Base
            if (src === 'kts') kts = val;
            else if (src === 'mph') kts = val / 1.15078;
            else if (src === 'kph') kts = val / 1.852;
            else if (src === 'mps') kts = val * 1.94384;

            if (src !== 'kts') document.getElementById('u-kts').value = kts.toFixed(2);
            if (src !== 'mph') document.getElementById('u-mph').value = (kts * 1.15078).toFixed(2);
            if (src !== 'kph') document.getElementById('u-kph').value = (kts * 1.852).toFixed(2);
            if (src !== 'mps') document.getElementById('u-mps').value = (kts / 1.94384).toFixed(2);
        }

        function convPress(src) {
            const val = parseFloat(document.getElementById(`u-${src}`).value);
            if (isNaN(val)) return;
            if (src === 'hpa') document.getElementById('u-inhg').value = (val * 0.02953).toFixed(3);
            else document.getElementById('u-hpa').value = (val * 33.8639).toFixed(1);
        }

        function convGrad(src) {
            const val = parseFloat(document.getElementById(`u-grad-${src}`).value);
            if (isNaN(val)) return;
            if (src === 'pct') {
                const deg = Math.atan(val / 100) * (180 / Math.PI);
                document.getElementById('u-grad-deg').value = deg.toFixed(2);
            } else {
                const pct = Math.tan(val * Math.PI / 180) * 100;
                document.getElementById('u-grad-pct').value = pct.toFixed(2);
            }
        }

        function calcAltimeter() {
            const qnh = parseFloat(document.getElementById('alt-qnh').value);
            const read = parseFloat(document.getElementById('alt-read').value);

            // Valid QNH required for correction
            if (!isNaN(qnh)) {
                // Formula: (Standard - QNH) * 30ft per hPa
                // If QNH < 1013, we are low pressure, so add to altitude?
                // Rule: High to Low, Look Out Below. 
                // If Indicated is 7000 at 1010. Real pressure at that level is lower than standard? 
                // Let's stick to the prompt formula: (1013.25 - QNH) * 30
                // Example: 1010 QNH. Diff = (3.25) * 30 = +97.5 ft.
                // PAlt = 7000 + 97.5 = 7097.5 ft. Correct.

                let diff = (1013.25 - qnh) * 30;
                let sign = diff >= 0 ? "+" : "";
                document.getElementById('alt-corr').innerText = `${sign}${Math.round(diff)} ft`;

                if (!isNaN(read)) {
                    let pAlt = read + diff;
                    document.getElementById('alt-palt').innerText = `${Math.round(pAlt).toLocaleString()} ft`;
                } else {
                    document.getElementById('alt-palt').innerText = "-- ft";
                }
            } else {
                document.getElementById('alt-corr').innerText = "-- ft";
                document.getElementById('alt-palt').innerText = "-- ft";
            }
        }

        // --- MORSE CODE DECODER MODULE ---
        // Build reverse lookup: morse pattern -> character
        const MORSE_REVERSE = {};
        for (const [char, code] of Object.entries(MORSE_CODE)) {
            MORSE_REVERSE[code] = char;
        }

        function decodeMorseInput() {
            const input = document.getElementById('morse-decode-input').value;
            const outputEl = document.getElementById('morse-decode-output');
            const breakdownEl = document.getElementById('morse-breakdown');

            if (!input.trim()) {
                outputEl.textContent = '—';
                breakdownEl.innerHTML = '';
                return;
            }

            // Split by / or double-space for word boundaries, then by single space for letters
            const words = input.trim().split(/\s*\/\s*|\s{2,}/);
            let decoded = '';
            let breakdownHTML = '';

            words.forEach((word, wIdx) => {
                if (wIdx > 0) {
                    decoded += ' ';
                    breakdownHTML += '<div style="width:12px;"></div>';
                }
                const letters = word.trim().split(/\s+/);
                letters.forEach(code => {
                    if (!code) return;
                    const char = MORSE_REVERSE[code];
                    if (char) {
                        decoded += char;
                        breakdownHTML += `<div style="display:flex; flex-direction:column; align-items:center; background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.2); border-radius:6px; padding:4px 6px; min-width:32px;">`;
                        breakdownHTML += `<span style="font-size:0.65rem; color:var(--text-muted); font-family:'JetBrains Mono',monospace;">${code}</span>`;
                        breakdownHTML += `<span style="font-size:0.95rem; font-weight:700; color:var(--accent-primary);">${char}</span>`;
                        breakdownHTML += `</div>`;
                    } else {
                        decoded += '?';
                        breakdownHTML += `<div style="display:flex; flex-direction:column; align-items:center; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); border-radius:6px; padding:4px 6px; min-width:32px;">`;
                        breakdownHTML += `<span style="font-size:0.65rem; color:var(--accent-danger); font-family:'JetBrains Mono',monospace;">${code}</span>`;
                        breakdownHTML += `<span style="font-size:0.95rem; font-weight:700; color:var(--accent-danger);">?</span>`;
                        breakdownHTML += `</div>`;
                    }
                });
            });

            outputEl.textContent = decoded || '—';
            breakdownEl.innerHTML = breakdownHTML;
        }

        function encodeMorseInput() {
            const input = document.getElementById('morse-encode-input').value.toUpperCase();
            const outputEl = document.getElementById('morse-encode-output');

            if (!input.trim()) {
                outputEl.textContent = '—';
                return;
            }

            let morse = '';
            for (let i = 0; i < input.length; i++) {
                const char = input[i];
                if (char === ' ') {
                    morse += ' / ';
                } else if (MORSE_CODE[char]) {
                    morse += MORSE_CODE[char] + '  ';
                }
            }
            outputEl.textContent = morse.trim() || '—';
        }

        function clearMorseDecoder() {
            document.getElementById('morse-decode-input').value = '';
            document.getElementById('morse-decode-output').textContent = '—';
            document.getElementById('morse-breakdown').innerHTML = '';
            document.getElementById('morse-encode-input').value = '';
            document.getElementById('morse-encode-output').textContent = '—';
        }

        function copyMorseResult() {
            const text = document.getElementById('morse-decode-output').textContent;
            if (text && text !== '—') {
                navigator.clipboard.writeText(text).then(() => {
                    // Brief visual feedback
                    const btn = event.target;
                    const orig = btn.textContent;
                    btn.textContent = '✓';
                    btn.style.color = 'var(--accent-success)';
                    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 800);
                });
            }
        }

        // Build morse reference table on load
        function buildMorseRefTable() {
            const container = document.getElementById('morse-ref-table');
            if (!container) return;
            let html = '';
            for (const [char, code] of Object.entries(MORSE_CODE)) {
                html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:3px 6px; background:rgba(255,255,255,0.03); border-radius:4px; border:1px solid var(--border-light);">`;
                html += `<span style="font-weight:700; color:var(--text-main);">${char}</span>`;
                html += `<span style="color:var(--accent-cyan); font-size:0.8rem;">${code}</span>`;
                html += `</div>`;
            }
            container.innerHTML = html;
        }