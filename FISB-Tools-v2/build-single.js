// Bundle index.html + css/ + js/ into ONE self-contained HTML file.
// Usage:  node build-single.js
// Output: FISB-Tools-v2-single.html (works when opened alone, e.g. on a phone)
const fs = require('fs');
const path = require('path');

const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, href) =>
    `<style>\n${fs.readFileSync(path.join(root, href), 'utf8')}\n</style>`);

html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, src) => {
    // escape any "</script" inside the source so it can't close the inline tag
    const code = fs.readFileSync(path.join(root, src), 'utf8').replace(/<\/script/gi, '<\\/script');
    return `<script>\n/* ${src} */\n${code}\n</script>`;
});

const left = html.match(/(href|src)="(css|js)\/[^"]+"/g);
if (left) { console.error('Unbundled references remain:', left); process.exit(1); }

const outputs = [
    path.join(root, '..', 'dist', 'index.html'),
    path.join(root, '..', 'FISB tools-AEROTHAI_NOV 26.html')
];
outputs.forEach(out => {
    fs.writeFileSync(out, html);
    console.log(`Wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
});
