// =========================================================
// Scene3D — small Three.js wrapper used by PAPI / ILS / VOR views
// - Three.js is lazy-loaded only when a 3D view is opened
// - Touch + mouse orbit (1 finger / left drag), pinch / wheel zoom,
//   pan (2 fingers / right drag / shift drag), double-tap reset
// - Renders on demand only (battery friendly on tablets / phones)
// - Labels are HTML overlays (crisp text, theme aware)
// =========================================================

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
let _threePromise = null;

function loadThree() {
    if (window.THREE) return Promise.resolve(window.THREE);
    if (_threePromise) return _threePromise;
    _threePromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = THREE_URL;
        s.async = true;
        s.onload = () => resolve(window.THREE);
        s.onerror = () => { _threePromise = null; s.remove(); reject(new Error('Three.js failed to load')); };
        document.head.appendChild(s);
    });
    return _threePromise;
}

function show3DError(host, msg) {
    host.innerHTML = `<div class="viz-empty"><div><svg class="i"><use href="#ic-cube"/></svg>${msg || '3D view needs an internet connection the first time it loads.'}<br><span style="font-size:12px;">Use the 2D view meanwhile.</span></div></div>`;
}

class Scene3D {
    constructor(host, opts = {}) {
        const T = THREE;
        this.host = host;
        this.opts = opts;
        host.innerHTML = '';

        this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: false });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        host.appendChild(this.renderer.domElement);

        this.labelLayer = document.createElement('div');
        this.labelLayer.className = 'labels';
        this.labelsVisible = opts.labelsVisible !== false;
        if (!this.labelsVisible) this.labelLayer.classList.add('hidden');
        host.appendChild(this.labelLayer);

        this.scene = new T.Scene();
        this.scene.fog = new T.Fog(0x000000, 1000, 5000);
        this.applyTheme();
        this.camera = new T.PerspectiveCamera(42, 1, 0.05, 200000);

        this.hemi = new T.HemisphereLight(0xdfe9ff, 0x2a3140, 0.8);
        this.scene.add(this.hemi);
        this.sun = new T.DirectionalLight(0xffffff, 0.7);
        this.sun.position.set(0.6, 1, 0.35);
        this.scene.add(this.sun);

        this.root = new T.Group();
        this.scene.add(this.root);
        this.labels = [];

        // camera orbit state
        this.target = new T.Vector3();
        this.az = 0.6; this.el = 0.45; this.dist = 100;
        this.defaultView = { az: this.az, el: this.el, dist: this.dist, target: this.target.clone() };
        this.minDist = 0.1; this.maxDist = 1e6;

        this._bindControls();
        this._ro = new ResizeObserver(() => this.resize());
        this._ro.observe(host);
        this.resize();
        Scene3D.all.push(this);
    }

    static refreshAllThemes() { Scene3D.all.forEach(s => { s.applyTheme(); if (s.onTheme) s.onTheme(); s.requestRender(); }); }

    // Background + horizon fog follow the page theme
    applyTheme() {
        const bg = new THREE.Color(getThemeColor('--viz-bg') || '#0b111b');
        this.scene.background = bg;
        this.scene.fog.color = bg;
    }

    // ---------- View ----------
    setView(v, makeDefault = true) {
        if (v.az !== undefined) this.az = v.az;
        if (v.el !== undefined) this.el = v.el;
        if (v.dist !== undefined) this.dist = v.dist;
        if (v.target) this.target.copy(v.target);
        if (v.minDist !== undefined) this.minDist = v.minDist;
        if (v.maxDist !== undefined) this.maxDist = v.maxDist;
        if (makeDefault) this.defaultView = { az: this.az, el: this.el, dist: this.dist, target: this.target.clone() };
        this.requestRender();
    }
    resetView() {
        const d = this.defaultView;
        this.az = d.az; this.el = d.el; this.dist = d.dist; this.target.copy(d.target);
        this.requestRender();
    }
    toggleLabels(btn) {
        this.labelsVisible = !this.labelsVisible;
        this.labelLayer.classList.toggle('hidden', !this.labelsVisible);
        if (btn) {
            btn.classList.toggle('active', this.labelsVisible);
            btn.textContent = this.labelsVisible ? 'Hide Labels' : 'Show Labels';
        }
    }

    // ---------- Content ----------
    clear() {
        this.root.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
        });
        while (this.root.children.length) this.root.remove(this.root.children[0]);
        this.labelLayer.innerHTML = '';
        this.labels = [];
    }
    add(obj) { this.root.add(obj); return obj; }
    label(text, pos, cls = '') {
        const el = document.createElement('div');
        el.className = 'lbl3d ' + cls;
        el.textContent = text;
        this.labelLayer.appendChild(el);
        this.labels.push({ el, pos: pos.clone ? pos.clone() : new THREE.Vector3(pos[0], pos[1], pos[2]) });
        return el;
    }

    // ---------- Render ----------
    requestRender() {
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => { this._raf = null; this.render(); });
    }
    render() {
        const w = this.host.clientWidth, h = this.host.clientHeight;
        if (!w || !h) return;
        const ce = Math.cos(this.el);
        // pull the camera back on portrait / narrow screens so wide scenes still fit
        const aspect = w / h;
        const dist = this.dist * (aspect < 1.3 ? Math.min(1.3 / aspect, 2.2) : 1);
        this.camera.position.set(
            this.target.x + dist * ce * Math.sin(this.az),
            this.target.y + dist * Math.sin(this.el),
            this.target.z + dist * ce * Math.cos(this.az)
        );
        this.camera.near = Math.max(0.01, dist / 2000);
        this.camera.far = dist * 60 + 1000;
        this.scene.fog.near = dist * 1.2;
        this.scene.fog.far = dist * 4.5;
        this.camera.updateProjectionMatrix();
        this.camera.lookAt(this.target);
        this.renderer.render(this.scene, this.camera);

        const v = new THREE.Vector3();
        for (const l of this.labels) {
            v.copy(l.pos).project(this.camera);
            if (v.z > 1 || v.z < -1) { l.el.style.display = 'none'; continue; }
            const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h;
            if (x < -60 || x > w + 60 || y < -20 || y > h + 30) { l.el.style.display = 'none'; continue; }
            l.el.style.display = '';
            l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) translateY(-6px)`;
        }
    }
    resize() {
        const w = this.host.clientWidth, h = this.host.clientHeight;
        if (!w || !h) return;
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.requestRender();
    }

    // ---------- Controls ----------
    _bindControls() {
        const el = this.renderer.domElement;
        const ptrs = new Map();
        let last = null, lastPinch = null, lastMid = null, mode = null, lastTap = 0;

        const pan = (dx, dy) => {
            const k = this.dist * 0.0016;
            const rx = Math.cos(this.az), rz = -Math.sin(this.az);
            const fx = -Math.sin(this.az), fz = -Math.cos(this.az);
            this.target.x += (-dx * rx + dy * fx) * k;
            this.target.z += (-dx * rz + dy * fz) * k;
        };

        el.addEventListener('pointerdown', e => {
            el.setPointerCapture(e.pointerId);
            ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
            last = { x: e.clientX, y: e.clientY };
            mode = (e.button === 2 || e.shiftKey) ? 'pan' : 'rotate';
            if (ptrs.size === 2) {
                const [a, b] = [...ptrs.values()];
                lastPinch = Math.hypot(a.x - b.x, a.y - b.y);
                lastMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            }
            const now = Date.now();
            if (e.pointerType === 'touch' && now - lastTap < 300 && ptrs.size === 1) this.resetView();
            lastTap = now;
        });
        el.addEventListener('pointermove', e => {
            if (!ptrs.has(e.pointerId)) return;
            ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (ptrs.size === 2) {
                const [a, b] = [...ptrs.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                if (lastPinch) this.dist = Math.min(this.maxDist, Math.max(this.minDist, this.dist * lastPinch / d));
                if (lastMid) pan(mid.x - lastMid.x, mid.y - lastMid.y);
                lastPinch = d; lastMid = mid;
                this.requestRender();
                return;
            }
            if (!last) return;
            const dx = e.clientX - last.x, dy = e.clientY - last.y;
            last = { x: e.clientX, y: e.clientY };
            if (mode === 'pan') pan(dx, dy);
            else {
                this.az -= dx * 0.008;
                this.el = Math.min(1.5, Math.max(0.03, this.el + dy * 0.006));
            }
            this.requestRender();
        });
        const up = e => {
            ptrs.delete(e.pointerId);
            if (ptrs.size < 2) { lastPinch = null; lastMid = null; }
            if (ptrs.size === 1) { const p = [...ptrs.values()][0]; last = { x: p.x, y: p.y }; }
            if (ptrs.size === 0) last = null;
        };
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('contextmenu', e => e.preventDefault());
        el.addEventListener('dblclick', () => this.resetView());
        el.addEventListener('wheel', e => {
            e.preventDefault();
            this.dist = Math.min(this.maxDist, Math.max(this.minDist, this.dist * Math.exp(e.deltaY * 0.0012)));
            this.requestRender();
        }, { passive: false });
    }
}
Scene3D.all = [];

// =========================================================
// Model builders
// =========================================================
const M3 = {
    col(c) { return new THREE.Color(c); },
    mat(color, o = {}) {
        return new THREE.MeshStandardMaterial(Object.assign({ color: new THREE.Color(color), roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide }, o));
    },
    basic(color, o = {}) {
        return new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(color), side: THREE.DoubleSide }, o));
    },
    line(points, color, o = {}) {
        const g = new THREE.BufferGeometry().setFromPoints(points.map(p => p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2])));
        const m = o.dash
            ? new THREE.LineDashedMaterial({ color: new THREE.Color(color), dashSize: o.dash, gapSize: o.gap || o.dash, transparent: true, opacity: o.opacity ?? 1 })
            : new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: o.opacity ?? 1 });
        const l = new THREE.Line(g, m);
        if (o.dash) l.computeLineDistances();
        return l;
    },
    // Thick line as a thin box/tube for visibility
    tube(a, b, radius, color, o = {}) {
        const A = a.isVector3 ? a : new THREE.Vector3(...a), B = b.isVector3 ? b : new THREE.Vector3(...b);
        const len = A.distanceTo(B);
        const g = new THREE.CylinderGeometry(radius, radius, len, 8, 1, true);
        const m = o.basic ? M3.basic(color, { transparent: o.opacity !== undefined, opacity: o.opacity ?? 1 }) : M3.mat(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.35, transparent: o.opacity !== undefined, opacity: o.opacity ?? 1 });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.copy(A).add(B).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
        return mesh;
    },
    sphere(pos, r, color, o = {}) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), M3.mat(color, Object.assign({ emissive: new THREE.Color(color), emissiveIntensity: 0.4 }, o)));
        m.position.set(...(pos.isVector3 ? pos.toArray() : pos));
        return m;
    },
    // Filled polygon from list of [x,y,z]
    poly(points, color, opacity = 0.25, o = {}) {
        const pos = [];
        for (let i = 1; i < points.length - 1; i++) pos.push(...points[0], ...points[i], ...points[i + 1]);
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.computeVertexNormals();
        return new THREE.Mesh(g, M3.basic(color, Object.assign({ transparent: true, opacity, depthWrite: false }, o)));
    },
    // Ground grid
    grid(size, div, color, opacity = 0.35) {
        const g = new THREE.GridHelper(size, div, new THREE.Color(color), new THREE.Color(color));
        g.material.transparent = true; g.material.opacity = opacity; g.material.depthWrite = false;
        return g;
    },
    // Runway along -Z from threshold at z=0. Units: whatever caller uses.
    runway(length, width, opt = {}) {
        const grp = new THREE.Group();
        const asphalt = new THREE.Mesh(new THREE.BoxGeometry(width, opt.thick || width * 0.01, length), M3.mat(opt.color || '#2b313b', { roughness: 0.95, side: THREE.FrontSide }));
        asphalt.position.set(0, (opt.thick || width * 0.01) / 2, -length / 2);
        grp.add(asphalt);
        const y = (opt.thick || width * 0.01) + width * 0.002;
        const white = M3.basic('#f4f6fa');
        // Threshold piano keys
        const keys = 8, kw = width * 0.06, kl = width * 0.75;
        for (let i = 0; i < keys; i++) {
            const side = i < keys / 2 ? -1 : 1;
            const idx = i % (keys / 2);
            const x = side * (width * 0.08 + idx * kw * 1.6 + kw / 2);
            const k = new THREE.Mesh(new THREE.PlaneGeometry(kw, kl), white);
            k.rotation.x = -Math.PI / 2; k.position.set(x, y, -kl / 2 - width * 0.15);
            grp.add(k);
        }
        // Centreline dashes
        const dashL = width * 0.75, gap = width * 0.5, cw = width * 0.02;
        for (let z = -width * 1.4; z > -length + width; z -= dashL + gap) {
            const d = new THREE.Mesh(new THREE.PlaneGeometry(cw, dashL), white);
            d.rotation.x = -Math.PI / 2; d.position.set(0, y, z - dashL / 2);
            grp.add(d);
        }
        // Edge lines
        [-1, 1].forEach(s => {
            const e = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.015, length), white);
            e.rotation.x = -Math.PI / 2; e.position.set(s * width * 0.48, y, -length / 2);
            grp.add(e);
        });
        // Aiming points
        [-1, 1].forEach(s => {
            const a = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.12, width * 1.2), white);
            a.rotation.x = -Math.PI / 2; a.position.set(s * width * 0.2, y, -width * 7);
            grp.add(a);
        });
        return grp;
    },
    // Low-poly airliner, nose toward -Z, wingspan ~ 1 unit * scale
    aircraft(color = '#e8edf5', accent = '#4f8cff', scale = 1) {
        const g = new THREE.Group();
        const body = M3.mat(color, { roughness: 0.45, metalness: 0.25 });
        const acc = M3.mat(accent, { roughness: 0.5, metalness: 0.2 });
        const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.9, 16), body);
        fus.rotation.x = Math.PI / 2; g.add(fus);
        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), body);
        nose.rotation.x = -Math.PI / 2; nose.position.z = -0.45; g.add(nose);
        const tailc = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 16), body);
        tailc.rotation.x = Math.PI / 2; tailc.position.z = 0.56; g.add(tailc);
        const wingShape = new THREE.Shape();
        wingShape.moveTo(0, 0.12); wingShape.lineTo(0.5, -0.1); wingShape.lineTo(0.5, -0.17); wingShape.lineTo(0, -0.07);
        wingShape.lineTo(-0.5, -0.17); wingShape.lineTo(-0.5, -0.1); wingShape.lineTo(0, 0.12);
        const wing = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape, { depth: 0.012, bevelEnabled: false }), body);
        wing.rotation.x = Math.PI / 2; wing.position.set(0, -0.012, 0.02); g.add(wing);
        const tailShape = new THREE.Shape();
        tailShape.moveTo(0, 0.05); tailShape.lineTo(0.18, -0.04); tailShape.lineTo(0.18, -0.08); tailShape.lineTo(0, -0.03);
        tailShape.lineTo(-0.18, -0.08); tailShape.lineTo(-0.18, -0.04); tailShape.lineTo(0, 0.05);
        const hstab = new THREE.Mesh(new THREE.ExtrudeGeometry(tailShape, { depth: 0.008, bevelEnabled: false }), body);
        hstab.rotation.x = Math.PI / 2; hstab.position.set(0, 0.01, 0.55); g.add(hstab);
        const finShape = new THREE.Shape();
        finShape.moveTo(0, 0); finShape.lineTo(0.16, 0); finShape.lineTo(0.2, 0.17); finShape.lineTo(0.12, 0.17); finShape.lineTo(0, 0);
        const fin = new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.008, bevelEnabled: false }), acc);
        fin.rotation.y = -Math.PI / 2; fin.position.set(0.004, 0.03, 0.42); g.add(fin);
        [-0.2, 0.2].forEach(x => {
            const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.14, 12), acc);
            eng.rotation.x = Math.PI / 2; eng.position.set(x, -0.05, -0.02); g.add(eng);
        });
        g.scale.setScalar(scale);
        return g;
    },
    // Navaid / obstacle tower
    tower(height, radius, color, opt = {}) {
        const g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius, height, opt.sides || 12), M3.mat(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.15 }));
        m.position.y = height / 2; g.add(m);
        if (opt.cap !== false) {
            const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.9, 16, 10), M3.mat(color, { emissive: new THREE.Color(color), emissiveIntensity: 0.6 }));
            cap.position.y = height; g.add(cap);
        }
        return g;
    },
    // Horizontal sector fan centred at (cx, y, cz) between bearings in scene angle (radians from -Z, clockwise toward +X)
    fan(cx, cz, y, r, a0, a1, color, opacity = 0.18, steps = 48) {
        const pts = [[cx, y, cz]];
        for (let i = 0; i <= steps; i++) {
            const a = a0 + (a1 - a0) * i / steps;
            pts.push([cx + Math.sin(a) * r, y, cz - Math.cos(a) * r]);
        }
        return M3.poly(pts, color, opacity);
    },
    fanEdge(cx, cz, y, r, a0, a1, color, steps = 64) {
        const pts = [];
        for (let i = 0; i <= steps; i++) {
            const a = a0 + (a1 - a0) * i / steps;
            pts.push(new THREE.Vector3(cx + Math.sin(a) * r, y, cz - Math.cos(a) * r));
        }
        return M3.line(pts, color);
    },
    // Ring (circle) on ground
    ring(cx, cz, y, r, color, opt = {}) {
        const pts = [];
        const n = opt.steps || 128;
        for (let i = 0; i <= n; i++) {
            const a = i / n * Math.PI * 2;
            pts.push(new THREE.Vector3(cx + Math.sin(a) * r, y, cz - Math.cos(a) * r));
        }
        return M3.line(pts, color, opt);
    }
};
