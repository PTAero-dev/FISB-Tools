// GEO-UTILS - shared WGS-84 Vincenty geodesy engine + coordinate-input template, used by Waypoint Projector AND RF Arc tabs

        // --- WAYPOINT PROJECTOR ---
        const RAD = Math.PI / 180;
        const DEG = 180 / Math.PI;

        function getCoordInputHTML(prefix, labelSuffix) {
            return `
            <div style="display:flex; flex-wrap:wrap; gap:10px;">
                <div style="flex:1; min-width:250px; background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px; font-weight:bold;">LAT ${labelSuffix}</div>
                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <input type="text" inputmode="decimal" id="${prefix}-lat-d" placeholder="Deg" maxlength="2" class="vp-input" style="flex:1; height:32px;" oninput="checkCoordLimit(this,90,true); autoTab(this,2,'${prefix}-lat-m'); calcProjDMS('${prefix}-lat', true)">
                        <input type="text" inputmode="decimal" id="${prefix}-lat-m" placeholder="Min" maxlength="2" class="vp-input" style="flex:1; height:32px;" oninput="checkCoordLimit(this,59,false); autoTab(this,2,'${prefix}-lat-s'); calcProjDMS('${prefix}-lat', true)">
                        <input type="text" inputmode="decimal" id="${prefix}-lat-s" placeholder="Sec.ss" maxlength="5" class="vp-input" style="flex:1.5; height:32px;" oninput="calcProjDMS('${prefix}-lat', true)">
                    </div>
                    <div style="display:flex; gap:5px;">
                        <input type="text" inputmode="decimal" id="${prefix}-lat-dd" placeholder="Deg" maxlength="2" class="vp-input" style="flex:0.8; height:32px; background:rgba(59,130,246,0.1);" oninput="checkCoordLimit(this,90,true); autoTab(this,2,'${prefix}-lat-dm'); calcProjDMM('${prefix}-lat', true)">
                        <input type="text" inputmode="decimal" id="${prefix}-lat-dm" placeholder="Min.mm" maxlength="5" class="vp-input" style="flex:1.5; height:32px; background:rgba(59,130,246,0.1);" oninput="calcProjDMM('${prefix}-lat', true)">
                    </div>
                </div>
                <div style="flex:1; min-width:250px; background:rgba(255,255,255,0.03); padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px; font-weight:bold;">LONG ${labelSuffix}</div>
                    <div style="display:flex; gap:5px; margin-bottom:5px;">
                        <input type="text" inputmode="decimal" id="${prefix}-lon-d" placeholder="Deg" maxlength="3" class="vp-input" style="flex:1; height:32px;" oninput="checkCoordLimit(this,180,true); autoTab(this,3,'${prefix}-lon-m'); calcProjDMS('${prefix}-lon', false)">
                        <input type="text" inputmode="decimal" id="${prefix}-lon-m" placeholder="Min" maxlength="2" class="vp-input" style="flex:1; height:32px;" oninput="checkCoordLimit(this,59,false); autoTab(this,2,'${prefix}-lon-s'); calcProjDMS('${prefix}-lon', false)">
                        <input type="text" inputmode="decimal" id="${prefix}-lon-s" placeholder="Sec.ss" maxlength="5" class="vp-input" style="flex:1.5; height:32px;" oninput="calcProjDMS('${prefix}-lon', false)">
                    </div>
                    <div style="display:flex; gap:5px;">
                        <input type="text" inputmode="decimal" id="${prefix}-lon-dd" placeholder="Deg" maxlength="3" class="vp-input" style="flex:0.8; height:32px; background:rgba(59,130,246,0.1);" oninput="checkCoordLimit(this,180,true); autoTab(this,3,'${prefix}-lon-dm'); calcProjDMM('${prefix}-lon', false)">
                        <input type="text" inputmode="decimal" id="${prefix}-lon-dm" placeholder="Min.mm" maxlength="5" class="vp-input" style="flex:1.5; height:32px; background:rgba(59,130,246,0.1);" oninput="calcProjDMM('${prefix}-lon', false)">
                    </div>
                </div>
            </div>`;
        }

        function initProjectorInputs() {
            document.getElementById('proj-o-ptA').innerHTML = getCoordInputHTML('po1', '');
            document.getElementById('proj-a-ptA').innerHTML = getCoordInputHTML('pa1', '(A)');
            document.getElementById('proj-a-ptB').innerHTML = getCoordInputHTML('pa2', '(B)');
            document.getElementById('proj-b-ptA').innerHTML = getCoordInputHTML('pb1', '(A)');
            document.getElementById('proj-rf-center').innerHTML = getCoordInputHTML('prf1', '(Center)');
            document.getElementById('proj-rf-start-wpt').innerHTML = getCoordInputHTML('prfs', '(Start)');
            document.getElementById('proj-rf-end-wpt').innerHTML = getCoordInputHTML('prfe', '(End)');
        }

        function calcProjDMS(prefix, isLat) {
            let d = parseFloat(document.getElementById(`${prefix}-d`).value) || 0;
            let m = parseFloat(document.getElementById(`${prefix}-m`).value) || 0;
            let s = parseFloat(document.getElementById(`${prefix}-s`).value) || 0;
            let mm = m + (s / 60);

            const degPad = isLat ? 2 : 3;
            document.getElementById(`${prefix}-dd`).value = String(d).padStart(degPad, "0");
            let mmFixed = mm.toFixed(2);
            let [mmInt, mmDec] = mmFixed.split(".");
            document.getElementById(`${prefix}-dm`).value = mmInt.padStart(2, "0") + "." + mmDec;

            if (prefix.startsWith('po')) calcProjectorO();
            else if (prefix.startsWith('pa')) calcProjectorA();
            else if (prefix.startsWith('pb')) calcProjectorB();
        }

        function calcProjDMM(prefix, isLat) {
            let dStr = document.getElementById(`${prefix}-dd`).value;
            let mmStr = document.getElementById(`${prefix}-dm`).value;
            let d = parseFloat(dStr) || 0;
            let mm = parseFloat(mmStr) || 0;
            let m = Math.floor(mm);
            let s = (mm - m) * 60;

            const degPad = isLat ? 2 : 3;
            // Only update fields dynamically if they aren't fully empty strings, enabling partial entry
            if (dStr !== "" || mmStr !== "") {
                document.getElementById(`${prefix}-d`).value = String(d).padStart(degPad, "0");
                document.getElementById(`${prefix}-m`).value = String(m).padStart(2, "0");
                let sFixed = s.toFixed(2);
                let [sInt, sDec] = sFixed.split(".");
                document.getElementById(`${prefix}-s`).value = sInt.padStart(2, "0") + "." + sDec;
            }

            if (prefix.startsWith('po')) calcProjectorO();
            else if (prefix.startsWith('pa')) calcProjectorA();
            else if (prefix.startsWith('pb')) calcProjectorB();
        }

        function getDecimalDegFromPrefixLoose(prefix) {
            let dstr = document.getElementById(`${prefix}-dd`).value;
            let dmstr = document.getElementById(`${prefix}-dm`).value;
            if (!dstr && !dmstr) return null;
            return (parseFloat(dstr) || 0) + ((parseFloat(dmstr) || 0) / 60);
        }

        function getDecimalDegFromPrefix(prefix) {
            let dstr = document.getElementById(`${prefix}-dd`).value;
            let dmstr = document.getElementById(`${prefix}-dm`).value;
            if (!dstr && !dmstr) return null;
            return (parseFloat(dstr) || 0) + ((parseFloat(dmstr) || 0) / 60);
        }

        function formatDecimalDegToDMS(decDeg, isLat) {
            let d = Math.floor(decDeg), rem = (decDeg - d) * 60;
            let m = Math.floor(rem), s = (rem - m) * 60;
            let pad = isLat ? 2 : 3;
            let dStr = String(d).padStart(pad, '0'), mStr = String(m).padStart(2, '0');
            let sStr = s.toFixed(2).padStart(5, '0');
            let dmStr = rem.toFixed(2).padStart(5, '0');
            return { dms: `${dStr}&deg; ${mStr}' ${sStr}"`, dmm: `${dStr}&deg; ${dmStr}'` };
        }

        function vincentyForward(lat1Deg, lon1Deg, alpha1Deg, s) {
            const a = 6378137.0, b = 6356752.314245, f = 1 / 298.257223563;
            let lat1 = lat1Deg * RAD, lon1 = lon1Deg * RAD, alpha1 = alpha1Deg * RAD;
            let sinAlpha1 = Math.sin(alpha1), cosAlpha1 = Math.cos(alpha1);
            let tanU1 = (1 - f) * Math.tan(lat1), cosU1 = 1 / Math.sqrt(1 + tanU1 * tanU1), sinU1 = tanU1 * cosU1;
            let sigma1 = Math.atan2(tanU1, cosAlpha1);
            let sinAlpha = cosU1 * sinAlpha1, cosSqAlpha = 1 - sinAlpha * sinAlpha;
            let uSq = cosSqAlpha * (a * a - b * b) / (b * b);
            let A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
            let B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
            let sigma = s / (b * A), sigmaP = 2 * Math.PI, cos2SigmaM, sinSigma, cosSigma;
            while (Math.abs(sigma - sigmaP) > 1e-12) {
                cos2SigmaM = Math.cos(2 * sigma1 + sigma);
                sinSigma = Math.sin(sigma); cosSigma = Math.cos(sigma);
                let deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
                sigmaP = sigma; sigma = s / (b * A) + deltaSigma;
            }
            let tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
            let lat2 = Math.atan2(sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1, (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp));
            let lambda = Math.atan2(sinSigma * sinAlpha1, cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1);
            let C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
            let L = lambda - (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
            let lon2 = (lon1 + L + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
            return { lat2: lat2 * DEG, lon2: lon2 * DEG };
        }

        function vincentyInverse(lat1Deg, lon1Deg, lat2Deg, lon2Deg) {
            const a = 6378137.0, b = 6356752.314245, f = 1 / 298.257223563;
            let lat1 = lat1Deg * RAD, lon1 = lon1Deg * RAD, lat2 = lat2Deg * RAD, lon2 = lon2Deg * RAD;
            let L = lon2 - lon1, U1 = Math.atan((1 - f) * Math.tan(lat1)), U2 = Math.atan((1 - f) * Math.tan(lat2));
            let sinU1 = Math.sin(U1), cosU1 = Math.cos(U1), sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);
            let lambda = L, lambdaP = 2 * Math.PI, iterLimit = 100;
            let sinLambda, cosLambda, sinSigma, cosSigma, sigma, sinAlpha, cosSqAlpha, cos2SigmaM;
            do {
                sinLambda = Math.sin(lambda); cosLambda = Math.cos(lambda);
                sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
                if (sinSigma === 0) return { distance: 0, az1: 0 };
                cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda; sigma = Math.atan2(sinSigma, cosSigma);
                sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma; cosSqAlpha = 1 - sinAlpha * sinAlpha;
                cos2SigmaM = cosSqAlpha === 0 ? 0 : cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha;
                let C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
                lambdaP = lambda; lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
            } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);
            if (iterLimit === 0) return null;
            let uSq = cosSqAlpha * (a * a - b * b) / (b * b);
            let A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
            let B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
            let deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
            let s = b * A * (sigma - deltaSigma);
            let az1 = Math.atan2(cosU2 * sinLambda, cosU1 * sinU2 - sinU1 * cosU2 * cosLambda);
            return { distance: s, az1: (az1 * DEG + 360) % 360 };
        }