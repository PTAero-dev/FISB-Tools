// =========================================================
// FISB Tools v2 — core: shared constants, utilities, app shell
// Calculation helpers are ported unchanged from v1.1.
// =========================================================

// --- GLOBAL CONSTANTS ---
const FT_PER_NM = 6076.12;

// Apply saved theme as early as possible
(function () {
    try { if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-theme'); } catch (e) { }
})();

function validateDeg360(el) {
    if (el.value === "") return;
    let val = parseFloat(el.value);
    if (val > 360) el.value = 360;
    if (val < 0) el.value = 0;
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
    if (prefix === 'val-ils-dist') calcILS(); // For ILS Profile
    if (prefix === 'fc-dist') drawILSCov(); // For ILS coverage (v1 called undefined drawFltCk)
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

// --- Notifications & files ---
let _toastTimer = null;
function notify(msg, isErr = true) {
    const t = document.getElementById('toast');
    if (!t) { alert(msg); return; }
    t.textContent = msg;
    t.classList.toggle('err', !!isErr);
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

function downloadText(text, filename, type = 'text/csv;charset=utf-8') {
    let blob = new Blob(['﻿' + text], { type });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Morse audio (ident check) ---
let _audioCtx = null;
function playMorse(text) {
    text = (text || '').toUpperCase().trim();
    if (!text) return;
    try {
        _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        const ctx = _audioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        const unit = 0.11; // seconds per dot
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 1020; // navaid ident tone
        gain.gain.value = 0;
        osc.connect(gain).connect(ctx.destination);
        let t = ctx.currentTime + 0.05;
        for (const ch of text) {
            if (ch === ' ') { t += unit * 4; continue; }
            const code = MORSE_CODE[ch];
            if (!code) continue;
            for (const sym of code) {
                const dur = sym === '-' ? unit * 3 : unit;
                gain.gain.setValueAtTime(0, t);
                gain.gain.linearRampToValueAtTime(0.25, t + 0.005);
                gain.gain.setValueAtTime(0.25, t + dur - 0.005);
                gain.gain.linearRampToValueAtTime(0, t + dur);
                t += dur + unit;
            }
            t += unit * 2;
        }
        osc.start();
        osc.stop(t + 0.05);
    } catch (e) { notify('Audio not available on this device'); }
}

// =========================================================
// Drawing helpers (canvas + SVG), theme aware
// =========================================================
const V = {
    c(name) { return getThemeColor(name); },
    // Prepare a HiDPI canvas; returns null if not laid out yet
    canvas(c) {
        if (!c || c.clientWidth === 0) return null;
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const w = c.clientWidth, h = c.clientHeight;
        c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
        const ctx = c.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.font = '12px Inter, sans-serif';
        return { ctx, w, h };
    },
    font(ctx, size = 12, weight = 500, mono = false) {
        ctx.font = `${weight} ${size}px ${mono ? "'JetBrains Mono', monospace" : 'Inter, sans-serif'}`;
    },
    labelsHidden(el) {
        const n = el && (el.canvas || el.el || el);
        return !!(n && n.closest && n.closest('.viz-no-labels'));
    },
    // Rounded label pill on canvas
    pill(ctx, text, x, y, opt = {}) {
        if (V.labelsHidden(ctx)) return;
        const size = opt.size || 11;
        V.font(ctx, size, opt.weight || 700, opt.mono !== false);
        const padX = 6, h = size + 8;
        const tw = ctx.measureText(text).width;
        let bx = x, by = y - h / 2;
        if (opt.align === 'center') bx = x - (tw + padX * 2) / 2;
        else if (opt.align === 'right') bx = x - tw - padX * 2;
        ctx.fillStyle = opt.bg || V.c('--surface');
        ctx.strokeStyle = opt.border || V.c('--border-strong');
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, by, tw + padX * 2, h, 6); else ctx.rect(bx, by, tw + padX * 2, h);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = opt.color || V.c('--text');
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + padX, y + 0.5);
    },
    niceStep(range, target = 5) {
        const raw = range / target;
        const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const n = raw / mag;
        return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
    },
    // --- SVG ---
    NS: 'http://www.w3.org/2000/svg',
    svg(el) {
        if (!el) return null;
        const w = el.clientWidth || el.getBoundingClientRect().width;
        const h = el.clientHeight || parseFloat(el.getAttribute('height')) || 300;
        if (!w) return null;
        el.setAttribute('viewBox', `0 0 ${w} ${h}`);
        while (el.firstChild) el.removeChild(el.firstChild);
        return { el, w, h };
    },
    el(parent, tag, attrs = {}, text) {
        const n = document.createElementNS(V.NS, tag);
        for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
        if (text !== undefined) n.textContent = text;
        parent.appendChild(n);
        return n;
    },
    // compass helpers: bearing (deg, 0 = north, clockwise) → svg x/y
    pt(cx, cy, r, brg) {
        const a = (brg - 90) * Math.PI / 180;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    },
    arcPath(cx, cy, r, fromBrg, sweepDeg, cw) {
        // sweepDeg positive amount; cw true = increasing bearing
        if (sweepDeg >= 359.99) sweepDeg = 359.99;
        const to = cw ? fromBrg + sweepDeg : fromBrg - sweepDeg;
        const [x1, y1] = V.pt(cx, cy, r, fromBrg);
        const [x2, y2] = V.pt(cx, cy, r, to);
        const large = sweepDeg > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${large} ${cw ? 1 : 0} ${x2} ${y2}`;
    },
    // Draw a compass rose into an svg context; returns geometry
    compass(s, opt = {}) {
        const cx = s.w / 2, cy = s.h / 2;
        const r = Math.max(40, Math.min(s.w, s.h) / 2 - (opt.margin || 34));
        const g = V.el(s.el, 'g');
        V.el(g, 'circle', { cx, cy, r, fill: V.c('--surface-2'), stroke: V.c('--border-strong'), 'stroke-width': 1 });
        V.el(g, 'circle', { cx, cy, r: r * 0.66, fill: 'none', stroke: V.c('--viz-grid'), 'stroke-width': 1 });
        V.el(g, 'circle', { cx, cy, r: r * 0.33, fill: 'none', stroke: V.c('--viz-grid'), 'stroke-width': 1 });
        for (let b = 0; b < 360; b += 5) {
            const major = b % 30 === 0;
            const [x1, y1] = V.pt(cx, cy, r, b);
            const [x2, y2] = V.pt(cx, cy, r - (major ? 10 : b % 10 === 0 ? 6 : 3), b);
            V.el(g, 'line', { x1, y1, x2, y2, stroke: major ? V.c('--viz-axis') : V.c('--viz-grid'), 'stroke-width': major ? 1.5 : 1 });
            if (major) {
                const [tx, ty] = V.pt(cx, cy, r + 14, b);
                const lbl = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[b] || String(b / 10).padStart(2, '0');
                V.el(g, 'text', { x: tx, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: ['N', 'E', 'S', 'W'].includes(lbl) ? V.c('--text') : V.c('--muted'), 'font-size': ['N', 'E', 'S', 'W'].includes(lbl) ? 12 : 10, 'font-weight': 700, 'font-family': 'Inter, sans-serif' }, lbl);
            }
        }
        return { cx, cy, r, g };
    },
    radial(s, cx, cy, r0, r1, brg, color, opt = {}) {
        const [x1, y1] = V.pt(cx, cy, r0, brg);
        const [x2, y2] = V.pt(cx, cy, r1, brg);
        return V.el(s.el, 'line', { x1, y1, x2, y2, stroke: color, 'stroke-width': opt.width || 2, 'stroke-dasharray': opt.dash || null, 'stroke-linecap': 'round' });
    },
    label(s, x, y, text, color, opt = {}) {
        const size = opt.size || 11;
        const g = V.el(s.el, 'g', { 'class': 'viz-lbl' });
        const t = V.el(g, 'text', { x, y, 'text-anchor': opt.anchor || 'middle', 'dominant-baseline': 'central', fill: color || V.c('--text'), 'font-size': size, 'font-weight': opt.weight || 700, 'font-family': opt.mono === false ? 'Inter, sans-serif' : "'JetBrains Mono', monospace" }, text);
        if (opt.bg !== false) {
            const bb = t.getBBox ? t.getBBox() : null;
            if (bb && bb.width) {
                const rect = document.createElementNS(V.NS, 'rect');
                rect.setAttribute('x', bb.x - 5); rect.setAttribute('y', bb.y - 3);
                rect.setAttribute('width', bb.width + 10); rect.setAttribute('height', bb.height + 6);
                rect.setAttribute('rx', 5);
                rect.setAttribute('fill', V.c('--surface'));
                rect.setAttribute('stroke', opt.stroke || V.c('--border-strong'));
                g.insertBefore(rect, t);
            }
        }
        return g;
    },
    plane(s, x, y, hdg, color, size = 18) {
        // simple top-view aircraft glyph pointing along heading (deg)
        const g = V.el(s.el, 'g', { transform: `translate(${x} ${y}) rotate(${hdg}) scale(${size / 24})` });
        V.el(g, 'path', { d: 'M0 -11 C1.2 -11 1.6 -9 1.6 -7 L1.6 -2 L10 3 L10 5 L1.6 2.5 L1.2 8 L4 10 L4 11.5 L0 10.6 L-4 11.5 L-4 10 L-1.2 8 L-1.6 2.5 L-10 5 L-10 3 L-1.6 -2 L-1.6 -7 C-1.6 -9 -1.2 -11 0 -11 Z', fill: color, stroke: V.c('--surface'), 'stroke-width': 1.2 });
        return g;
    }
};

// =========================================================
// THEME
// =========================================================
function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    try { localStorage.setItem('theme', isLight ? 'light' : 'dark'); } catch (e) { }
    updateThemeIcon();
    document.querySelector('meta[name=theme-color]').setAttribute('content', isLight ? '#eef2f7' : '#0a0e16');
    App.redrawActive();
    if (window.Scene3D) Scene3D.refreshAllThemes();
}

function updateThemeIcon() {
    const isLight = document.body.classList.contains('light-theme');
    document.querySelectorAll('.theme-btn use').forEach(u => u.setAttribute('href', isLight ? '#ic-moon' : '#ic-sun'));
}

// =========================================================
// APP SHELL: tools, panes (sub-tabs), routing, responsive nav
// =========================================================
const App = {
    tools: {},        // name -> { onShow(pane), onPane(pane), redraw(pane) }
    current: null,
    panes: {},        // tool -> active pane name

    register(name, def) { this.tools[name] = def || {}; },

    show(tool, pane, opts = {}) {
        const page = document.querySelector(`.page[data-tool="${tool}"]`);
        if (!page) return;
        document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p === page));
        document.querySelectorAll('[data-tool]').forEach(b => {
            if (b.classList.contains('page')) return;
            b.classList.toggle('active', b.dataset.tool === tool);
        });
        const moreBtn = document.querySelector('#bottomnav [data-more]');
        if (moreBtn) moreBtn.classList.toggle('active', !['gradient', 'papi', 'vor', 'ils'].includes(tool));

        this.current = tool;
        document.getElementById('page-title').textContent = page.dataset.title;
        document.getElementById('page-sub').textContent = page.dataset.sub || '';
        document.title = `${page.dataset.title} · AEROTHAI_FISB tools_NOV 26`;

        // Sub-tabs
        const panes = page.querySelectorAll(':scope > .pane');
        const bar = document.getElementById('subtabs');
        const wrap = document.getElementById('subtabs-wrap');
        bar.innerHTML = '';
        if (panes.length) {
            wrap.classList.remove('hidden');
            panes.forEach(p => {
                const b = document.createElement('button');
                b.className = 'subtab';
                b.dataset.pane = p.dataset.pane;
                b.textContent = p.dataset.label;
                b.onclick = () => this.showPane(tool, p.dataset.pane);
                bar.appendChild(b);
            });
            const target = pane || this.panes[tool] || panes[0].dataset.pane;
            this.showPane(tool, target, true);
        } else {
            wrap.classList.add('hidden');
            this.setHash(tool);
            const t = this.tools[tool];
            if (t && t.onShow) setTimeout(() => t.onShow(), 30);
        }
        if (!opts.keepScroll) document.getElementById('content').scrollTop = 0;
        try { localStorage.setItem('fisb-last-tool', tool); } catch (e) { }
    },

    showPane(tool, pane, fromShow) {
        const page = document.querySelector(`.page[data-tool="${tool}"]`);
        if (!page) return;
        let found = false;
        page.querySelectorAll(':scope > .pane').forEach(p => {
            const on = p.dataset.pane === pane;
            p.classList.toggle('active', on);
            if (on) found = true;
        });
        if (!found) { const first = page.querySelector(':scope > .pane'); if (first) { first.classList.add('active'); pane = first.dataset.pane; } }
        document.querySelectorAll('#subtabs .subtab').forEach(b => b.classList.toggle('active', b.dataset.pane === pane));
        const active = document.querySelector('#subtabs .subtab.active');
        if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
        this.panes[tool] = pane;
        this.setHash(tool, pane);
        if (!fromShow) document.getElementById('content').scrollTop = 0;
        const t = this.tools[tool];
        setTimeout(() => {
            if (t && t.onPane) t.onPane(pane);
            if (t && t.onShow) t.onShow(pane);
        }, 30);
    },

    setHash(tool, pane) {
        const h = '#' + tool + (pane ? '/' + pane : '');
        if (location.hash !== h) history.replaceState(null, '', h);
    },

    redrawActive() {
        const t = this.tools[this.current];
        if (t && t.onShow) t.onShow(this.panes[this.current]);
    },

    init() {
        document.querySelectorAll('.nav-item[data-tool], #bottomnav [data-tool], .sheet [data-tool]').forEach(b => {
            b.addEventListener('click', () => { this.show(b.dataset.tool); closeSheet(); });
        });
        const more = document.querySelector('#bottomnav [data-more]');
        if (more) more.addEventListener('click', openSheet);

        let rt = null;
        window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => this.redrawActive(), 120); });
        updateThemeIcon();
        initVizPanels();

        // Initial route: hash → last tool → gradient
        let [tool, pane] = (location.hash || '').replace('#', '').split('/');
        if (!this.tools[tool] && !document.querySelector(`.page[data-tool="${tool}"]`)) {
            try { tool = localStorage.getItem('fisb-last-tool'); } catch (e) { tool = null; }
            pane = undefined;
        }
        if (!tool || !document.querySelector(`.page[data-tool="${tool}"]`)) tool = 'gradient';
        this.show(tool, pane);
    }
};

function openSheet() {
    document.getElementById('sheet').classList.add('open');
    document.getElementById('sheet-backdrop').classList.add('open');
}
function closeSheet() {
    document.getElementById('sheet').classList.remove('open');
    document.getElementById('sheet-backdrop').classList.remove('open');
}

// Generic segmented-control helper: mark the button whose data-view matches
function setSegActive(container, attr, value) {
    if (!container) return;
    container.querySelectorAll(`[data-${attr}]`).forEach(b => b.classList.toggle('active', b.dataset[attr] === String(value)));
}

// Toggle floating labels on 2D charts (Canvas & SVG)
function toggle2DLabels(btn) {
    const viz = btn.closest('.viz') || btn.closest('.panel');
    if (!viz) return;
    const hidden = viz.classList.toggle('viz-no-labels');
    btn.textContent = hidden ? 'Show Labels' : 'Hide Labels';
    btn.classList.toggle('active', !hidden);
    App.redrawActive();
}

// Collapsible visualization panels (minimized by default on mobile <= 760px)
function initVizPanels() {
    // Inject Hide/Show Labels button into every 2D .viz container
    document.querySelectorAll('.viz').forEach(viz => {
        if (viz.querySelector('.scene3d') || viz.querySelector('.viz-lbl-btn')) return;
        let tb = viz.querySelector(':scope > .viz-toolbar');
        if (!tb) {
            tb = document.createElement('div');
            tb.className = 'viz-toolbar';
            viz.appendChild(tb);
        }
        const lbtn = document.createElement('button');
        lbtn.type = 'button';
        lbtn.className = 'btn sm active viz-lbl-btn';
        lbtn.title = 'Hide / show chart labels';
        lbtn.textContent = 'Hide Labels';
        lbtn.onclick = function (e) { e.stopPropagation(); toggle2DLabels(this); };
        tb.insertBefore(lbtn, tb.firstChild);
    });

    const isMobile = window.innerWidth <= 760;
    document.querySelectorAll('.panel').forEach(panel => {
        if (panel.classList.contains('leg-card') || panel.classList.contains('viz-panel')) return;
        if (!panel.querySelector('.viz')) return;
        const head = panel.querySelector(':scope > .panel-head');
        if (!head) return;

        panel.classList.add('viz-panel');
        if (!head.querySelector('.spacer')) {
            const sp = document.createElement('span');
            sp.className = 'spacer';
            head.appendChild(sp);
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn sm ghost viz-toggle-btn';
        btn.title = 'Minimize / expand chart';
        btn.innerHTML = `<span class="viz-toggle-lbl">${isMobile ? 'Show Chart' : 'Hide Chart'}</span><svg class="i sm chev"><use href="#ic-chev"/></svg>`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleVizPanel(panel);
        });
        head.appendChild(btn);

        head.addEventListener('click', (e) => {
            if (e.target.closest('.seg, button:not(.viz-toggle-btn), a, input, select')) {
                if (panel.classList.contains('viz-collapsed') && e.target.closest('.seg')) {
                    toggleVizPanel(panel, false);
                }
                return;
            }
            toggleVizPanel(panel);
        });

        if (isMobile) {
            panel.classList.add('viz-collapsed');
        }
    });
}

function toggleVizPanel(el, forceCollapse) {
    const panel = el.closest ? el.closest('.viz-panel') : el;
    if (!panel) return;
    const collapsed = typeof forceCollapse === 'boolean'
        ? (panel.classList.toggle('viz-collapsed', forceCollapse), forceCollapse)
        : panel.classList.toggle('viz-collapsed');
    const lbl = panel.querySelector('.viz-toggle-lbl');
    if (lbl) lbl.textContent = collapsed ? 'Show Chart' : 'Hide Chart';
    if (!collapsed) {
        setTimeout(() => {
            App.redrawActive();
            if (window.Scene3D && Scene3D.all) Scene3D.all.forEach(s => s.resize());
        }, 30);
    }
}
