// =========================================================
// Boot — mirrors v1 window.onload (whose undefined showTab() call
// used to abort the rest of the start-up sequence)
// =========================================================
window.addEventListener('DOMContentLoaded', () => {
    const safe = (fn) => { try { fn(); } catch (e) { console.error(e); } };

    safe(initGradient);
    safe(initCoordRows);
    safe(initProjectorInputs);
    safe(() => { addPapiCard('std'); addPapiCard('ils'); });
    safe(buildAngleRows);
    safe(initDDMScales);
    safe(updateTheoUI);
    safe(() => setVorDir('cw'));
    safe(calcVorSiting);
    safe(calcILS);
    safe(drawILSCov);
    safe(buildMorseRefTable);

    App.init();
    setTimeout(() => safe(() => setPapiMode('std')), 60);
});
