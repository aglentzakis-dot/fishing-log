// Φτιάχνει τον φάκελο www/ για την εφαρμογή Android: το index.html με ΤΟΠΙΚΕΣ βιβλιοθήκες και γραμματοσειρές
// (τίποτα δεν φορτώνεται από CDN), μαζί με τα εικονίδια και τις φωτογραφίες κεφαλίδας.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const www = path.join(root, 'www');
const nm = (...p) => path.join(root, 'node_modules', ...p);

function must(cond, msg){ if(!cond){ console.error('ΣΦΑΛΜΑ: ' + msg); process.exit(1); } }
function copyDir(src, dst){
  fs.mkdirSync(dst, { recursive: true });
  for(const e of fs.readdirSync(src, { withFileTypes: true })){
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if(e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

// 1) index.html με τοπικές βιβλιοθήκες
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function swap(re, to, what){
  must(re.test(html), 'δεν βρέθηκε στο index.html: ' + what);
  html = html.replace(re, to);
}
swap(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">\s*\n?/, '', 'preconnect γραμματοσειρών');
swap(/<link href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/, '<link rel="stylesheet" href="vendor/fonts/fonts.css">', 'γραμματοσειρές Google');
swap(/<link rel="stylesheet" href="https:\/\/unpkg\.com\/leaflet@[^"]*"[^>]*>/, '<link rel="stylesheet" href="vendor/leaflet/leaflet.css">', 'Leaflet CSS');
swap(/<script src="https:\/\/unpkg\.com\/leaflet@[^"]*"[^>]*><\/script>/, '<script src="vendor/leaflet/leaflet.js"></script>', 'Leaflet JS');
swap(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@emailjs\/browser@[^"]*"[^>]*><\/script>/, '<script src="vendor/emailjs/email.min.js"></script>', 'EmailJS');
must(!/https:\/\/(unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/.test(html), 'έμεινε σύνδεσμος CDN στο index.html');
fs.writeFileSync(path.join(www, 'index.html'), html);

// 2) Leaflet
const lf = nm('leaflet', 'dist');
must(fs.existsSync(path.join(lf, 'leaflet.js')), 'λείπει το leaflet (npm install)');
fs.mkdirSync(path.join(www, 'vendor', 'leaflet'), { recursive: true });
fs.copyFileSync(path.join(lf, 'leaflet.js'), path.join(www, 'vendor', 'leaflet', 'leaflet.js'));
fs.copyFileSync(path.join(lf, 'leaflet.css'), path.join(www, 'vendor', 'leaflet', 'leaflet.css'));
copyDir(path.join(lf, 'images'), path.join(www, 'vendor', 'leaflet', 'images'));

// 3) EmailJS
const ej = nm('@emailjs', 'browser', 'dist', 'email.min.js');
must(fs.existsSync(ej), 'λείπει το @emailjs/browser (npm install)');
fs.mkdirSync(path.join(www, 'vendor', 'emailjs'), { recursive: true });
fs.copyFileSync(ej, path.join(www, 'vendor', 'emailjs', 'email.min.js'));

// 4) Γραμματοσειρές (Inter: λατινικά+ελληνικά, Bitter: λατινικά) — αν κάποιο αρχείο λείπει, χρησιμοποιείται η γραμματοσειρά του συστήματος
const fontDir = path.join(www, 'vendor', 'fonts');
fs.mkdirSync(fontDir, { recursive: true });
let css = '/* τοπικές γραμματοσειρές (άδεια SIL OFL) */\n';
const ranges = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  greek: 'U+0370-03FF'
};
function addFont(pkg, family, subset, weight){
  const name = `${pkg}-${subset}-${weight}-normal.woff2`;
  const src = nm('@fontsource', pkg, 'files', name);
  if(!fs.existsSync(src)){ console.warn('προειδοποίηση: λείπει η γραμματοσειρά ' + name); return; }
  fs.copyFileSync(src, path.join(fontDir, name));
  css += `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url('${name}') format('woff2');unicode-range:${ranges[subset]};}\n`;
}
for(const w of [400, 500, 600, 700]){ addFont('inter', 'Inter', 'latin', w); addFont('inter', 'Inter', 'greek', w); }
for(const w of [600, 700, 800]){ addFont('bitter', 'Bitter', 'latin', w); }
fs.writeFileSync(path.join(fontDir, 'fonts.css'), css);

// 5) εικονίδια, manifest, φωτογραφίες κεφαλίδας
const skip = new Set(['package.json', 'package-lock.json', 'capacitor.config.json']);
for(const f of fs.readdirSync(root)){
  const p = path.join(root, f);
  if(fs.statSync(p).isFile() && /\.(png|jpe?g|svg|ico|webp|json)$/i.test(f) && !skip.has(f)) fs.copyFileSync(p, path.join(www, f));
}
if(fs.existsSync(path.join(root, 'header-presets'))) copyDir(path.join(root, 'header-presets'), path.join(www, 'header-presets'));

console.log('Έτοιμο: www/ (' + fs.readdirSync(www).length + ' στοιχεία)');
