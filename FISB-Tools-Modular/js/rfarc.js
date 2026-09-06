// RF ARC TAB (uses geo-utils.js)

        // --- RF ARC (Radius to Fix) ---
        let rfDirection = 'cw';
        let rfInputMode = 'radial'; // 'radial' or 'waypoint'
        let rfArcData = []; // Stored for export

        function setRFDir(dir) {
            rfDirection = dir;
            document.getElementById('rf-dir-cw').classList.toggle('active', dir === 'cw');
            document.getElementById('rf-dir-ccw').classList.toggle('active', dir === 'ccw');
        }

        function setRFInputMode(mode) {
            rfInputMode = mode;
            document.getElementById('rf-mode-rad').classList.toggle('active', mode === 'radial');
            document.getElementById('rf-mode-wpt').classList.toggle('active', mode === 'waypoint');
            // Toggle visibility
            document.getElementById('rf-rad-start-grp').style.display = (mode === 'radial') ? '' : 'none';
            document.getElementById('rf-rad-end-grp').style.display = (mode === 'radial') ? '' : 'none';
            document.getElementById('rf-wpt-inputs').style.display = (mode === 'waypoint') ? 'block' : 'none';
        }

        function calcRFArc() {
            let centerLat = getDecimalDegFromPrefix('prf1-lat');
            let centerLon = getDecimalDegFromPrefix('prf1-lon');
            if (centerLat === null || centerLon === null) { alert('Enter center coordinate.'); return; }

            let radius = parseFloat(document.getElementById('rf-radius').value);
            let startRad, endRad;
            let interval = parseFloat(document.getElementById('rf-interval').value);

            if (isNaN(radius) || radius <= 0) { alert('Enter a valid radius.'); return; }
            if (isNaN(interval) || interval < 1) { interval = 1; document.getElementById('rf-interval').value = 1; }

            if (rfInputMode === 'waypoint') {
                // Calculate bearings from center to start/end waypoints
                let sLat = getDecimalDegFromPrefix('prfs-lat'), sLon = getDecimalDegFromPrefix('prfs-lon');
                let eLat = getDecimalDegFromPrefix('prfe-lat'), eLon = getDecimalDegFromPrefix('prfe-lon');
                if (sLat === null || sLon === null) { alert('Enter start waypoint coordinate.'); return; }
                if (eLat === null || eLon === null) { alert('Enter end waypoint coordinate.'); return; }

                let invStart = vincentyInverse(centerLat, centerLon, sLat, sLon);
                let invEnd = vincentyInverse(centerLat, centerLon, eLat, eLon);
                if (!invStart || !invEnd) { alert('Cannot compute bearing. Check coordinates.'); return; }

                startRad = invStart.az1;
                endRad = invEnd.az1;

                // Show computed radials
                document.getElementById('rf-start-rad-calc').innerHTML = `→ Computed Radial: <strong style="color:var(--accent-success);">${startRad.toFixed(2)}°</strong> (dist: ${(invStart.distance / 1852).toFixed(2)} NM)`;
                document.getElementById('rf-end-rad-calc').innerHTML = `→ Computed Radial: <strong style="color:var(--accent-warning);">${endRad.toFixed(2)}°</strong> (dist: ${(invEnd.distance / 1852).toFixed(2)} NM)`;
            } else {
                startRad = parseFloat(document.getElementById('rf-start-rad').value);
                endRad = parseFloat(document.getElementById('rf-end-rad').value);
                if (isNaN(startRad) || isNaN(endRad)) { alert('Enter start and end radials.'); return; }
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
                    // Check if we've passed the end radial
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
                    // Check if we've passed the end radial
                    let remaining = (current - endRad + 360) % 360;
                    if (remaining < interval && remaining > 0) {
                        radials.push(endRad);
                        break;
                    }
                    if (current === startRad) break; // Full circle safety
                }
            }

            // Calculate coordinates at each radial
            rfArcData = [];
            let tbody = document.getElementById('rf-results-tbody');
            tbody.innerHTML = '';

            for (let i = 0; i < radials.length; i++) {
                let bearing = radials[i];
                let fwd = vincentyForward(centerLat, centerLon, bearing, radiusM);
                let latFmt = formatDecimalDegToDMS(Math.abs(fwd.lat2), true);
                let lonFmt = formatDecimalDegToDMS(Math.abs(fwd.lon2), false);

                // Add N/S, E/W prefix
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
                let row = `<tr>
                    <td style="text-align:center; color:var(--text-muted);">${entry.num}</td>
                    <td style="text-align:center; font-weight:700; color:var(--accent-primary);">${radStr}°</td>
                    <td style="font-family:'JetBrains Mono',monospace; font-size:0.85rem;">${entry.latDMShtml}</td>
                    <td style="font-family:'JetBrains Mono',monospace; font-size:0.85rem;">${entry.lonDMShtml}</td>
                    <td style="font-family:'JetBrains Mono',monospace; font-size:0.85rem; color:var(--accent-cyan);">${entry.latDMMhtml}</td>
                    <td style="font-family:'JetBrains Mono',monospace; font-size:0.85rem; color:var(--accent-cyan);">${entry.lonDMMhtml}</td>
                </tr>`;
                tbody.innerHTML += row;
            }

            // Summary
            let summary = document.getElementById('rf-summary');
            let dirStr = rfDirection === 'cw' ? 'CW' : 'CCW';
            summary.innerHTML = `<strong>${radials.length}</strong> points generated &bull; <strong>${dirStr}</strong> &bull; R${Math.round(startRad).toString().padStart(3, '0')} → R${Math.round(endRad).toString().padStart(3, '0')} &bull; Interval <strong>${interval}°</strong> &bull; Radius <strong>${radius} NM</strong>`;
            summary.style.display = 'block';
        }

        function exportRFArc(format) {
            if (rfArcData.length === 0) { alert('No data to export. Click CALCULATE first.'); return; }

            let csv = '';
            if (format === 'dms') {
                csv = '#,Radial,Lat (DMS),Lon (DMS)\n';
                rfArcData.forEach(e => {
                    csv += `${e.num},${Math.round(e.radial).toString().padStart(3, '0')},"${e.latDMS}","${e.lonDMS}"\n`;
                });
            } else {
                csv = '#,Radial,Lat (DMM),Lon (DMM)\n';
                rfArcData.forEach(e => {
                    csv += `${e.num},${Math.round(e.radial).toString().padStart(3, '0')},"${e.latDMM}","${e.lonDMM}"\n`;
                });
            }

            let blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = `RF_Arc_${format.toUpperCase()}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }

        function exportForeFlight() {
            if (rfArcData.length === 0) { alert('No data to export. Click CALCULATE first.'); return; }

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
                // Ensure name is at least 3 chars and all caps (already enforced)
                csv += `${name},${descStr},${e.latDec.toFixed(6)},${e.lonDec.toFixed(6)},${elevStr}\n`;
            });

            let blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'user_waypoints.csv';
            a.click();
            URL.revokeObjectURL(url);
        }


        function clearRFArc() {
            ['d', 'm', 's', 'dd', 'dm'].forEach(suf => {
                clearIds(`prf1-lat-${suf}`, `prf1-lon-${suf}`);
                clearIds(`prfs-lat-${suf}`, `prfs-lon-${suf}`);
                clearIds(`prfe-lat-${suf}`, `prfe-lon-${suf}`);
            });
            clearIds('rf-radius', 'rf-start-rad', 'rf-end-rad');
            document.getElementById('rf-interval').value = '1';
            document.getElementById('rf-results-tbody').innerHTML = '';
            document.getElementById('rf-summary').style.display = 'none';
            document.getElementById('rf-summary').innerHTML = '';
            document.getElementById('rf-start-rad-calc').innerHTML = '';
            document.getElementById('rf-end-rad-calc').innerHTML = '';
            rfArcData = [];
            setRFDir('cw');
            setRFInputMode('radial');
        }