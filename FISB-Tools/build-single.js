// Bundle index.html + css/ + js/ into self-contained HTML + generate PWA offline assets in dist/
// Usage:  node FISB-Tools-v2/build-single.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const distDir = path.join(root, '..', 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, href) =>
    `<style>\n${fs.readFileSync(path.join(root, href), 'utf8')}\n</style>`);

html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, src) => {
    const code = fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
    return `<script>\n/* ${src} */\n${code}\n</script>`;
});

const left = html.match(/(href|src)="(css|js)\/[^"]+"/g);
if (left) { console.error('Unbundled references remain:', left); process.exit(1); }

const outputs = [
    path.join(distDir, 'index.html'),
    path.join(root, '..', 'FISB tools-AEROTHAI_NOV 26.html')
];
outputs.forEach(out => {
    fs.writeFileSync(out, html);
    console.log(`Wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
});

// --- Generate SVG Icon ---
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#22d3ee"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <path d="M72 256h76l46-138 64 276 46-138h136" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
fs.writeFileSync(path.join(root, 'icon.svg'), iconSvg);
fs.writeFileSync(path.join(distDir, 'icon.svg'), iconSvg);

// --- Generate PNG Icons (192x192 & 512x512) using pure Node zlib ---
function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
        c ^= buf[i];
        for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (c ^ -1) >>> 0;
}
function pngChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
}
function distToSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const l2 = dx * dx + dy * dy;
    let t = l2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const qx = x1 + t * dx, qy = y1 + t * dy;
    return Math.hypot(px - qx, py - qy);
}
function generateIconPNG(size) {
    const raw = Buffer.alloc(size * (size * 4 + 1));
    const pts = [
        [0.14, 0.50], [0.29, 0.50], [0.38, 0.23],
        [0.505, 0.77], [0.595, 0.50], [0.86, 0.50]
    ].map(([x, y]) => [x * size, y * size]);
    const strokeR = size * 0.039;
    const cornerR = size * 0.21;

    for (let y = 0; y < size; y++) {
        const rowOff = y * (size * 4 + 1);
        raw[rowOff] = 0; // filter type 0
        for (let x = 0; x < size; x++) {
            const pOff = rowOff + 1 + x * 4;
            // Rounded rect mask
            const dx = Math.max(cornerR - x, 0, x - (size - 1 - cornerR));
            const dy = Math.max(cornerR - y, 0, y - (size - 1 - cornerR));
            const rDist = Math.hypot(dx, dy);
            if (rDist > cornerR + 0.5) {
                raw[pOff] = 0; raw[pOff + 1] = 0; raw[pOff + 2] = 0; raw[pOff + 3] = 0;
                continue;
            }
            const edgeAlpha = rDist > cornerR - 0.5 ? Math.max(0, Math.min(1, cornerR + 0.5 - rDist)) : 1;

            // Gradient #22d3ee -> #2563eb
            const t = (x + y) / (2 * size);
            let R = Math.round(34 * (1 - t) + 37 * t);
            let G = Math.round(211 * (1 - t) + 99 * t);
            let B = Math.round(238 * (1 - t) + 235 * t);

            // Pulse polyline distance
            let minD = 1e9;
            for (let i = 0; i < pts.length - 1; i++) {
                const d = distToSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
                if (d < minD) minD = d;
            }
            if (minD <= strokeR + 0.8) {
                const w = minD < strokeR - 0.8 ? 1 : Math.max(0, Math.min(1, (strokeR + 0.8 - minD) / 1.6));
                R = Math.round(R * (1 - w) + 255 * w);
                G = Math.round(G * (1 - w) + 255 * w);
                B = Math.round(B * (1 - w) + 255 * w);
            }
            raw[pOff] = R; raw[pOff + 1] = G; raw[pOff + 2] = B;
            raw[pOff + 3] = Math.round(edgeAlpha * 255);
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    const idat = zlib.deflateSync(raw, { level: 9 });
    return Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        pngChunk('IHDR', ihdr),
        pngChunk('IDAT', idat),
        pngChunk('IEND', Buffer.alloc(0))
    ]);
}

[192, 512].forEach(sz => {
    const png = generateIconPNG(sz);
    fs.writeFileSync(path.join(root, `icon-${sz}.png`), png);
    fs.writeFileSync(path.join(distDir, `icon-${sz}.png`), png);
});

['manifest.webmanifest', 'sw.js'].forEach(f => {
    fs.copyFileSync(path.join(root, f), path.join(distDir, f));
});
console.log('Generated PWA icons, manifest.webmanifest, and sw.js in dist/');
