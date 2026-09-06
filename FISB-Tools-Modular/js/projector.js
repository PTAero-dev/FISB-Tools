// WAYPOINT PROJECTOR TAB (uses geo-utils.js)

        function calcProjectorO() {
            let latA = getDecimalDegFromPrefixLoose('po1-lat'), lonA = getDecimalDegFromPrefixLoose('po1-lon');
            if (latA === null && lonA === null) return;
            // If one is null, treat it as 0
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

        function calcProjectorA() {
            let latA = getDecimalDegFromPrefix('pa1-lat'), lonA = getDecimalDegFromPrefix('pa1-lon');
            let latB = getDecimalDegFromPrefix('pa2-lat'), lonB = getDecimalDegFromPrefix('pa2-lon');
            let distStr = document.getElementById('proj-a-dist').value;
            if (latA === null || lonA === null || latB === null || lonB === null || distStr === "") return;

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
        }

        function toggleProjBMode() {
            let mode = document.getElementById('proj-b-mode').value;
            document.getElementById('proj-b-grad-inputs').style.display = (mode === 'gradient') ? 'flex' : 'none';
            document.getElementById('proj-b-ref-inputs').style.display = (mode === 'reference') ? 'flex' : 'none';
            calcProjectorB();
        }

        function calcProjectorB() {
            let latA = getDecimalDegFromPrefix('pb1-lat'), lonA = getDecimalDegFromPrefix('pb1-lon');
            let trkStr = document.getElementById('proj-b-track').value;
            if (latA === null || lonA === null || trkStr === "") return;
            let trk = parseFloat(trkStr), mode = document.getElementById('proj-b-mode').value, distNM = 0;

            if (mode === 'gradient') {
                let altA = parseFloat(document.getElementById('proj-b-altA').value);
                let altB = parseFloat(document.getElementById('proj-b-altB').value);
                let grad = parseFloat(document.getElementById('proj-b-grad').value);
                if (isNaN(altA) || isNaN(altB) || isNaN(grad) || grad === 0) return;
                distNM = Math.abs(altB - altA) / ((grad / 100.0) * 6076.115);
            } else {
                let d1 = parseFloat(document.getElementById('proj-b-refA').value), d2 = parseFloat(document.getElementById('proj-b-refB').value);
                if (isNaN(d1) || isNaN(d2)) return;
                distNM = Math.abs(d1 - d2);
            }

            let formatNumber = num => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('proj-b-dist').textContent = formatNumber(distNM) + ' NM';

            let fwd = vincentyForward(latA, lonA, trk, distNM * 1852.0);
            let resLat = formatDecimalDegToDMS(fwd.lat2, true), resLon = formatDecimalDegToDMS(fwd.lon2, false);
            document.getElementById('proj-b-res-dms').innerHTML = `${resLat.dms} <span style="color:var(--text-muted);">|</span> ${resLon.dms}`;
            document.getElementById('proj-b-res-dmm').innerHTML = `${resLat.dmm} <span style="color:var(--text-muted);">|</span> ${resLon.dmm}`;
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
            if (mode === 'modeA') {
                clearIds('proj-a-dist');
                document.getElementById('proj-a-azik').textContent = '-- °';
                document.getElementById('proj-a-basedist').textContent = '-- NM';
                document.getElementById('proj-a-totdist').textContent = '-- NM';
                document.getElementById('proj-a-res-dms').innerHTML = '--';
                document.getElementById('proj-a-res-dmm').innerHTML = '--';
            } else if (mode === 'modeB') {
                clearIds('proj-b-track', 'proj-b-altA', 'proj-b-altB', 'proj-b-grad', 'proj-b-refA', 'proj-b-refB');
                document.getElementById('proj-b-dist').textContent = '-- NM';
                document.getElementById('proj-b-res-dms').innerHTML = '--';
                document.getElementById('proj-b-res-dmm').innerHTML = '--';
            } else if (mode === 'modeO') {
                document.getElementById('proj-o-dist-nm').textContent = '-- NM';
                document.getElementById('proj-o-dist-m').textContent = '-- m';
                document.getElementById('proj-o-dist-ft').textContent = '-- ft';
                document.getElementById('proj-o-dist-km').textContent = '-- km';
                document.getElementById('proj-o-trk').textContent = '-- °';
            }
        }