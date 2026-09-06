// COORDINATES TAB

        // --- COORDINATE CONVERTER MODULE ---
        const COORD_ROW_COUNT = 24; // Increased for grid view

        function validateCompoundLimit(idx, isLat, isDMS) {
            let d, m, s, mm;
            let maxDeg = isLat ? 90 : 180;
            let valid = true;

            if (isDMS) {
                d = parseFloat(document.getElementById(`c-d-${idx}`).value) || 0;
                m = parseFloat(document.getElementById(`c-m-${idx}`).value) || 0;
                s = parseFloat(document.getElementById(`c-s-${idx}`).value) || 0;
                // Check
                if (d > maxDeg) valid = false;
                if (d === maxDeg && (m > 0 || s > 0)) valid = false;

                // Style
                const elD = document.getElementById(`c-d-${idx}`);
                const elM = document.getElementById(`c-m-${idx}`);
                const elS = document.getElementById(`c-s-${idx}`);

                const color = valid ? "" : "var(--accent-danger)";
                if (d > maxDeg || (d === maxDeg && (m > 0 || s > 0))) elD.style.borderColor = color;
                if (d === maxDeg && m > 0) elM.style.borderColor = color;
                if (d === maxDeg && s > 0) elS.style.borderColor = color;

                // If valid, clear borders (unless individual check failed, but this overrides)
                if (valid) {
                    elD.style.borderColor = "";
                    elM.style.borderColor = "";
                    elS.style.borderColor = "";
                }
            } else {
                // DMM
                d = parseFloat(document.getElementById(`c-dd-${idx}`).value) || 0;
                mm = parseFloat(document.getElementById(`c-dm-${idx}`).value) || 0;

                if (d > maxDeg) valid = false;
                if (d === maxDeg && mm > 0) valid = false;

                const elD = document.getElementById(`c-dd-${idx}`);
                const elMM = document.getElementById(`c-dm-${idx}`);
                const color = valid ? "" : "var(--accent-danger)";

                if (d > maxDeg || (d === maxDeg && mm > 0)) elD.style.borderColor = color;
                if (d === maxDeg && mm > 0) elMM.style.borderColor = color;
                if (valid) {
                    elD.style.borderColor = "";
                    elMM.style.borderColor = "";
                }
            }
            return valid;
        }

        function initCoordRows() {
            const container = document.getElementById("coord-rows-container");
            if (!container) return;
            container.innerHTML = "";

            // 12 Waypoints (Paired Rows)
            for (let i = 1; i <= 12; i++) {
                const latId = 2 * i - 1;
                const longId = 2 * i;

                // Waypoint Card
                let card = document.createElement("div");
                card.className = "coord-card";
                card.style.cssText = "background: var(--bg-card); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 15px; display: flex; flex-direction: column; gap: 10px; max-width: 100%; box-sizing: border-box; box-shadow: var(--shadow-card);";

                // Header
                let header = document.createElement("div");
                header.innerText = `WAYPOINT ${i}`;
                header.style.cssText = "color: var(--accent-primary); font-weight: 700; font-size: 0.8rem; letter-spacing: 1px; margin-bottom: 5px;";
                card.appendChild(header);

                // --- ROW 1: DMS INPUTS (Input Flow) ---
                let row1 = document.createElement("div");
                row1.style.cssText = "display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap;";

                // LAT DMS
                let latDms = `
                    <div style="flex: 1; min-width: 250px;">
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px; font-weight:bold;">LAT (DMS)</div>
                        <div style="display:flex; gap:5px;">
                            <input type="text" inputmode="decimal" id="c-d-${latId}" placeholder="Deg" maxlength="2" class="vp-input" style="flex:1; text-align:center; background:rgba(0,0,0,0.2); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="checkCoordLimit(this, 90, true); autoTab(this, 2, 'c-m-${latId}'); calcCoordDMS(${latId})">
                            <input type="text" inputmode="decimal" id="c-m-${latId}" placeholder="Min" maxlength="2" class="vp-input" style="flex:1; text-align:center; background:rgba(0,0,0,0.2); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="if(checkCoordLimit(this, 60)) autoTab(this, 2, 'c-s-${latId}'); calcCoordDMS(${latId})">
                            <input type="text" inputmode="decimal" id="c-s-${latId}" placeholder="Sec" maxlength="5" class="vp-input" style="flex:1.2; text-align:center; background:rgba(0,0,0,0.2); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="checkCoordLimit(this, 60); autoTab(this, 5, 'c-d-${longId}'); calcCoordDMS(${latId})">
                        </div>
                    </div>
                `;

                // LONG DMS
                let longDms = `
                    <div style="flex: 1; min-width: 250px;">
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px; font-weight:bold;">LONG (DMS)</div>
                        <div style="display:flex; gap:5px;">
                            <input type="text" inputmode="decimal" id="c-d-${longId}" placeholder="Deg" maxlength="3" class="vp-input" style="flex:1; text-align:center; background:rgba(0,0,0,0.2); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="checkCoordLimit(this, 180, true); autoTab(this, 3, 'c-m-${longId}'); calcCoordDMS(${longId})">
                            <input type="text" inputmode="decimal" id="c-m-${longId}" placeholder="Min" maxlength="2" class="vp-input" style="flex:1; text-align:center; background:rgba(0,0,0,0.2); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="if(checkCoordLimit(this, 60)) autoTab(this, 2, 'c-s-${longId}'); calcCoordDMS(${longId})">
                            <input type="text" inputmode="decimal" id="c-s-${longId}" placeholder="Sec" maxlength="5" class="vp-input" style="flex:1.2; text-align:center; background:rgba(0,0,0,0.2); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="checkCoordLimit(this, 60); calcCoordDMS(${longId})">
                        </div>
                    </div>
                `;

                // Clear DMS Button
                let btnHtml = `
                    <div style="padding-bottom: 2px;">
                        <button class="btn-mini danger" onclick="clearIds('c-d-${latId}','c-m-${latId}','c-s-${latId}','c-d-${longId}','c-m-${longId}','c-s-${longId}'); clearIds('c-dd-${latId}','c-dm-${latId}','c-dd-${longId}','c-dm-${longId}');" style="padding: 8px 12px; height: 32px;" title="Clear DMS">&times;</button>
                    </div>
                `;

                row1.innerHTML = latDms + longDms + btnHtml;
                card.appendChild(row1);

                // --- ROW 2: DMM OUTPUTS (Result) ---
                let row2 = document.createElement("div");
                row2.style.cssText = "display: flex; gap: 15px; align-items: flex-end; flex-wrap: wrap; margin-top: 5px; padding-top: 15px; border-top: 1px dashed rgba(255,255,255,0.1);";

                // LAT DMM
                let latDmm = `
                     <div style="flex: 1; min-width: 250px;">
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px; font-weight:bold;">LAT (DMM)</div>
                        <div style="display:flex; gap:5px;">
                            <input type="text" id="c-dd-${latId}" placeholder="Deg" maxlength="2" class="vp-input" style="flex:0.8; text-align:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="checkCoordLimit(this, 90, true); autoTab(this, 2, 'c-dm-${latId}'); calcCoordDMM(${latId})">
                            <input type="text" id="c-dm-${latId}" placeholder="Min.mm" maxlength="5" class="vp-input" style="flex:1.5; text-align:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="autoTab(this, 5, 'c-dd-${longId}'); calcCoordDMM(${latId})">
                        </div>
                    </div>
                `;

                // LONG DMM
                let longDmm = `
                     <div style="flex: 1; min-width: 250px;">
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px; font-weight:bold;">LONG (DMM)</div>
                        <div style="display:flex; gap:5px;">
                            <input type="text" id="c-dd-${longId}" placeholder="Deg" maxlength="3" class="vp-input" style="flex:0.8; text-align:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="checkCoordLimit(this, 180, true); autoTab(this, 3, 'c-dm-${longId}'); calcCoordDMM(${longId})">
                            <input type="text" id="c-dm-${longId}" placeholder="Min.mm" maxlength="5" class="vp-input" style="flex:1.5; text-align:center; background:rgba(255,255,255,0.05); border:1px solid var(--border-light); color:var(--text-main); height:32px;" oninput="calcCoordDMM(${longId})">
                        </div>
                    </div>
                `;

                // Clear Button
                let clearHtml = `
                    <div style="padding-bottom: 2px;">
                         <button class="btn-mini danger" onclick="clearCoordRow(${latId}); clearCoordRow(${longId});" style="padding: 8px 12px; height: 32px;" title="Clear Waypoint">&times;</button>
                    </div>
                `;

                row2.innerHTML = latDmm + longDmm + clearHtml;
                card.appendChild(row2);

                container.appendChild(card);
            }
        }

        function calcCoordDMS(idx) {
            // Source: DMS -> Target: DMM
            let d = parseFloat(document.getElementById(`c-d-${idx}`).value);
            let m = parseFloat(document.getElementById(`c-m-${idx}`).value);
            let s = parseFloat(document.getElementById(`c-s-${idx}`).value);

            if (isNaN(d)) d = 0; // Allow 0 deg
            if (isNaN(m) && isNaN(s)) return; // Don't update if only Deg entered

            // Logic: DMM Deg = DMS Deg. DMM Min = Min + (Sec / 60)
            let mm = (m || 0) + ((s || 0) / 60);

            // Formatting
            const isLat = (idx % 2 !== 0);
            const degPad = isLat ? 2 : 3;

            // DMM Deg
            document.getElementById(`c-dd-${idx}`).value = String(d).padStart(degPad, "0");

            // DMM Min (06.xxxx)
            let mmFixed = mm.toFixed(2);
            let [mmInt, mmDec] = mmFixed.split(".");
            document.getElementById(`c-dm-${idx}`).value = mmInt.padStart(2, "0") + "." + mmDec;
            validateCompoundLimit(idx, isLat, true);
        }

        function calcCoordDMM(idx) {
            // Source: DMM -> Target: DMS
            let d = parseFloat(document.getElementById(`c-dd-${idx}`).value);
            let mm = parseFloat(document.getElementById(`c-dm-${idx}`).value);

            if (isNaN(d)) d = 0;
            if (isNaN(mm)) return;

            // Logic: DMS Deg = DMM Deg. DMS Min = floor(mm). DMS Sec = (mm - min) * 60
            let m = Math.floor(mm);
            let s = (mm - m) * 60;

            const isLat = (idx % 2 !== 0);
            const degPad = isLat ? 2 : 3;

            document.getElementById(`c-d-${idx}`).value = String(d).padStart(degPad, "0");
            document.getElementById(`c-m-${idx}`).value = String(m).padStart(2, "0");

            let sFixed = s.toFixed(2);
            let [sInt, sDec] = sFixed.split(".");
            document.getElementById(`c-s-${idx}`).value = sInt.padStart(2, "0") + "." + sDec;
            validateCompoundLimit(idx, isLat, false);
        }
        function clearCoordRow(idx) {
            clearIds(`c-d-${idx}`, `c-m-${idx}`, `c-s-${idx}`, `c-dd-${idx}`, `c-dm-${idx}`);
        }

        function clearAllCoords() {
            for (let i = 1; i <= COORD_ROW_COUNT; i++) {
                clearCoordRow(i);
            }
        }

        // --- CSV EXPORT/IMPORT (ForeFlight Format) ---
        function exportCoordsCSV() {
            let prefix = (document.getElementById('coord-ff-prefix').value || 'WPT').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
            if (prefix.length < 1) prefix = 'WPT';

            let csv = 'WAYPOINT_NAME,Waypoint description,Latitude,Longitude,Elevation\n';
            let wptCount = 0;

            for (let i = 1; i <= COORD_ROW_COUNT; i += 2) {
                // Odd row = lat, Even row = lon
                let latD = parseFloat(document.getElementById(`c-d-${i}`).value);
                let latM = parseFloat(document.getElementById(`c-m-${i}`).value);
                let latS = parseFloat(document.getElementById(`c-s-${i}`).value);
                let lonD = parseFloat(document.getElementById(`c-d-${i + 1}`).value);
                let lonM = parseFloat(document.getElementById(`c-m-${i + 1}`).value);
                let lonS = parseFloat(document.getElementById(`c-s-${i + 1}`).value);

                // Skip if both lat and lon are empty
                if (isNaN(latD) && isNaN(latM) && isNaN(latS) && isNaN(lonD) && isNaN(lonM) && isNaN(lonS)) continue;

                // Convert DMS to decimal degrees
                let latDec = (latD || 0) + ((latM || 0) / 60) + ((latS || 0) / 3600);
                let lonDec = (lonD || 0) + ((lonM || 0) / 60) + ((lonS || 0) / 3600);

                wptCount++;
                let name = `${prefix}_${String(wptCount).padStart(3, '0')}`;
                csv += `${name},"",${latDec.toFixed(6)},${lonDec.toFixed(6)},\n`;
            }

            if (wptCount === 0) { alert('No coordinates to export. Enter some data first.'); return; }

            let blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'user_waypoints.csv';
            a.click();
            URL.revokeObjectURL(url);
        }

        function exportCoordsDMSDMM() {
            let csv = '#,Lat (DMS),Lon (DMS),Lat (DMM),Lon (DMM)\n';
            let wptCount = 0;

            for (let i = 1; i <= COORD_ROW_COUNT; i += 2) {
                let latD = document.getElementById(`c-d-${i}`).value;
                let latM = document.getElementById(`c-m-${i}`).value;
                let latS = document.getElementById(`c-s-${i}`).value;
                let lonD = document.getElementById(`c-d-${i + 1}`).value;
                let lonM = document.getElementById(`c-m-${i + 1}`).value;
                let lonS = document.getElementById(`c-s-${i + 1}`).value;
                let latDD = document.getElementById(`c-dd-${i}`).value;
                let latDM = document.getElementById(`c-dm-${i}`).value;
                let lonDD = document.getElementById(`c-dd-${i + 1}`).value;
                let lonDM = document.getElementById(`c-dm-${i + 1}`).value;

                if (!latD && !latM && !latS && !lonD && !lonM && !lonS) continue;

                wptCount++;
                let latDmsStr = `N ${(latD || '00').toString().padStart(2, '0')}° ${(latM || '00').toString().padStart(2, '0')}' ${(latS || '00.00')}\"`;
                let lonDmsStr = `E ${(lonD || '000').toString().padStart(3, '0')}° ${(lonM || '00').toString().padStart(2, '0')}' ${(lonS || '00.00')}\"`;
                let latDmmStr = `N ${(latDD || '00').toString().padStart(2, '0')}° ${(latDM || '00.00')}'`;
                let lonDmmStr = `E ${(lonDD || '000').toString().padStart(3, '0')}° ${(lonDM || '00.00')}'`;
                csv += `${wptCount},"${latDmsStr}","${lonDmsStr}","${latDmmStr}","${lonDmmStr}"\n`;
            }

            if (wptCount === 0) { alert('No coordinates to export.'); return; }
            let blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'coordinates_DMS_DMM.csv';
            a.click();
            URL.revokeObjectURL(url);
        }

        function importCoordsCSV(input) {
            const file = input.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                const text = e.target.result;
                const lines = text.replace(/\uFEFF/, '').split('\n');

                // Clear existing first
                clearAllCoords();

                // Detect format by header
                let header = lines[0].trim().toLowerCase();
                let isForeFlight = header.includes('waypoint_name');

                if (isForeFlight) {
                    // ForeFlight format: WAYPOINT_NAME,desc,Lat,Lon,Elev
                    let pairIdx = 0;
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        let cols = lines[i].split(',');
                        let latDec = parseFloat(cols[2]);
                        let lonDec = parseFloat(cols[3]);
                        if (isNaN(latDec) || isNaN(lonDec)) continue;

                        pairIdx++;
                        let latRow = (pairIdx * 2) - 1; // odd rows
                        let lonRow = pairIdx * 2;       // even rows
                        if (latRow > COORD_ROW_COUNT) break;

                        // Convert decimal degrees to DMS for latitude
                        let latAbs = Math.abs(latDec);
                        let latDeg = Math.floor(latAbs);
                        let latRem = (latAbs - latDeg) * 60;
                        let latMin = Math.floor(latRem);
                        let latSec = (latRem - latMin) * 60;

                        document.getElementById(`c-d-${latRow}`).value = String(latDeg).padStart(2, '0');
                        document.getElementById(`c-m-${latRow}`).value = String(latMin).padStart(2, '0');
                        document.getElementById(`c-s-${latRow}`).value = latSec.toFixed(2).padStart(5, '0');
                        calcCoordDMS(latRow);

                        // Convert decimal degrees to DMS for longitude
                        let lonAbs = Math.abs(lonDec);
                        let lonDeg = Math.floor(lonAbs);
                        let lonRem = (lonAbs - lonDeg) * 60;
                        let lonMin = Math.floor(lonRem);
                        let lonSec = (lonRem - lonMin) * 60;

                        document.getElementById(`c-d-${lonRow}`).value = String(lonDeg).padStart(3, '0');
                        document.getElementById(`c-m-${lonRow}`).value = String(lonMin).padStart(2, '0');
                        document.getElementById(`c-s-${lonRow}`).value = lonSec.toFixed(2).padStart(5, '0');
                        calcCoordDMS(lonRow);
                    }
                } else {
                    // Legacy format: Waypoint,Row,DMS_Deg,DMS_Min,DMS_Sec,DMM_Deg,DMM_Min
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        const cols = lines[i].split(',');
                        let targetRow = parseInt(cols[1]);
                        if (isNaN(targetRow) || targetRow > COORD_ROW_COUNT) targetRow = i;
                        if (document.getElementById(`c-d-${targetRow}`)) {
                            document.getElementById(`c-d-${targetRow}`).value = cols[2] || '';
                            document.getElementById(`c-m-${targetRow}`).value = cols[3] || '';
                            document.getElementById(`c-s-${targetRow}`).value = cols[4] || '';
                            calcCoordDMS(targetRow);
                        }
                    }
                }

                input.value = '';
                alert('Import Successful!');
            };
            reader.readAsText(file);
        }