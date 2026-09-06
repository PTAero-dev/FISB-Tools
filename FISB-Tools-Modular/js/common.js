// COMMON - app-wide constants, navigation, formatting utils, theme, card UI, coord validation, morse table, bootstrap

        // --- GLOBAL CONSTANTS ---
        const FT_PER_NM = 6076.12;

        function validateDeg360(el) {
            if (el.value === "") return;
            let val = parseFloat(el.value);
            if (val > 360) el.value = 360;
            if (val < 0) el.value = 0;
        }

        // --- NAVIGATION ---
        function switchTab(tabId, btn) {
            document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
            document.getElementById(tabId).classList.remove('hidden');

            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');

            // Fix Canvas Rendering on Tab Switch
            setTimeout(() => {
                if (tabId === 'tab-papi') { updatePapiDraw('papi1'); updatePapiDraw('papi2'); }
                if (tabId === 'tab-gradient') {
                    document.querySelectorAll('#grad-legs-container .card').forEach(card => {
                        calculateGradient(card.id ? card.id.replace('card-', '') : 'grad');
                    });
                }
                if (tabId === 'tab-vor') { calculateVOR(); calcVorTime(); calcVorSiting(); calcSignalAnalysis(); }
                if (tabId === 'tab-ils') { calcILS(); drawILSCov(); }

            }, 50);
        }

        // --- UTILS ---
        function fmt(num) {
            if (isNaN(num)) return "0";
            return num.toLocaleString("en-US");
        }

        function autoTab(el, max, nextId) {
            if (el.value.length >= max) {
                const next = document.getElementById(nextId);
                if (next) next.focus();
            }
        }

        function formatMinSec(decimalMin) {
            if (isNaN(decimalMin) || !isFinite(decimalMin) || decimalMin < 0) return "--:--";
            let m = Math.floor(decimalMin);
            let s = Math.round((decimalMin - m) * 60);
            if (s === 60) { m++; s = 0; }
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        function clearIds(...ids) {
            let prefix = "";
            ids.forEach(id => {
                if (ids.indexOf(id) === ids.length - 1 && !document.getElementById(id)) {
                    // Last arg might be a prefix for recalc, ignore if element doesn't exist
                    prefix = id;
                    return;
                }
                const el = document.getElementById(id);
                if (el) el.value = "";
            });

            // Trigger recalc if prefix provided
            if (prefix === 'grad' || prefix.startsWith('grad')) calculateGradient(prefix);
            if (prefix === 'papi1' || prefix === 'papi2') calculatePAPI(prefix);
            if (prefix === 'val-ils-dist') calcILS(); // For ILS Profile
            if (prefix === 'fc-dist') drawILSCov(); // For ILS Flt Check
        }

        function getThemeColor(varName) {
            return getComputedStyle(document.body).getPropertyValue(varName).trim();
        }

        const MORSE_CODE = {
            'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
            'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
            'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
            'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
            'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
            '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
            '9': '----.', '0': '-----'
        };

        function toggleTheme() {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            updateThemeIcon();
            
            // Redraw everything
            calculateGradient('grad');
            calculatePAPI('papi1');
            calculatePAPI('papi2');
            calculateVOR();
            drawILSCov();
            calcProjectorO();
            calcProjectorA();
            calcProjectorB();
        }

        function updateThemeIcon() {
            const icon = document.getElementById('theme-icon');
            if (!icon) return;
            const isLight = document.body.classList.contains('light-theme');
            if (isLight) {
                // Moon icon for Night Mode switch
                icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
            } else {
                // Sun icon for Day Mode switch
                icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
            }
        }

        (function() {
            if (localStorage.getItem('theme') === 'light') {
                document.body.classList.add('light-theme');
            }
            setTimeout(updateThemeIcon, 100);
        })();

        function toggleCard(header) {
            let parent = header.parentElement;
            if (!parent.classList.contains('card')) return;

            let children = parent.children;
            let isMinimized = header.classList.contains('minimized-header');

            for (let i = 0; i < children.length; i++) {
                if (children[i] !== header && !children[i].classList.contains('persistent-content')) {
                    if (isMinimized) {
                        children[i].style.display = ''; // Revert to default/inline (Show)
                    } else {
                        children[i].style.display = 'none'; // Force Hide
                    }
                }
            }
            header.classList.toggle('minimized-header');

            // Force refresh for PAPI diagrams if expanding the Reference Guide
            if (isMinimized && header.innerText.includes("Box Reference Guide")) {
                setTimeout(() => {
                    updatePapiDraw('papi1');
                    updatePapiDraw('papi2');
                }, 50);
            }
        }

        function checkCoordLimit(input, max, isDegree) {
            const val = parseFloat(input.value);
            if (isNaN(val)) {
                input.style.borderColor = "";
                return true;
            }

            // If isDegree is true, we allow val == max (e.g., 90 is valid). Use > max.
            // If isDegree is false (default), strictly < max (e.g., 60 is invalid). Use >= max.
            const invalid = isDegree ? (val > max) : (val >= max);

            if (invalid) {
                input.style.borderColor = "var(--accent-danger)";
                return false;
            } else {
                input.style.borderColor = "";
                return true;
            }
        }

        window.onload = function () {
            // Init Coords First (Prioritize new feature)
            if (typeof initCoordRows === 'function') initCoordRows();
            if (typeof initProjectorInputs === 'function') initProjectorInputs();

            switchTab('tab-gradient', document.querySelector('.nav-item.active'));
            try { calculateGradient('grad'); } catch (e) { console.error(e); }
            if (typeof setVorDir === 'function') setVorDir('cw');
            if (typeof calcVorSiting === 'function') calcVorSiting();
            if (typeof calcILS === 'function') calcILS();
            if (typeof drawILSCov === 'function') drawILSCov();
            if (typeof buildMorseRefTable === 'function') buildMorseRefTable();
        }