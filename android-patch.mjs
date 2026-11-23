// Μετά το «cap add android»: άδειες, όνομα, εικονίδιο και αριθμός έκδοσης από το index.html.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = path.join(root, 'android', 'app');
function must(c, m){ if(!c){ console.error('ΣΦΑΛΜΑ: ' + m); process.exit(1); } }

// --- έκδοση από το υποσέλιδο του index.html (π.χ. «έκδοση 5.22» → 5.22 → versionCode 50022) ---
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const m = html.match(/Fish IQ\s*·\s*έκδοση\s+(\d+)\.(\d+)/);
must(m, 'δεν βρέθηκε αριθμός έκδοσης στο index.html');
const versionName = `${m[1]}.${m[2]}`;
const versionCode = Number(m[1]) * 10000 + Number(m[2]);

// --- build.gradle ---
const gp = path.join(app, 'build.gradle');
must(fs.existsSync(gp), 'δεν βρέθηκε το android/app/build.gradle');
let g = fs.readFileSync(gp, 'utf8');
const g0 = g;
g = g.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`).replace(/versionName\s+"[^"]*"/, `versionName "${versionName}"`);
must(g !== g0, 'δεν άλλαξε η έκδοση στο build.gradle (άλλαξε η μορφή του αρχείου;)');
fs.writeFileSync(gp, g);

// --- AndroidManifest: τοποθεσία και κάμερα (προαιρετική) ---
const mp = path.join(app, 'src', 'main', 'AndroidManifest.xml');
let man = fs.readFileSync(mp, 'utf8');
const perms = [
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-permission android:name="android.permission.CAMERA" />',
  '<uses-feature android:name="android.hardware.camera" android:required="false" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />'
];
const add = perms.filter(p => !man.includes(p.match(/"([^"]+)"/)[1])).map(p => '    ' + p + '\n').join('');
must(man.includes('<application'), 'δεν βρέθηκε <application στο AndroidManifest');
man = man.replace('<application', add + '    <application');
// Μην επιτρέπεται αντιγραφή ασφαλείας του Android στο σύννεφο της Google χωρίς τον χρήστη: τα δεδομένα μένουν στη συσκευή.
if(!/android:allowBackup=/.test(man)) man = man.replace('<application', '<application android:allowBackup="false"');
else man = man.replace(/android:allowBackup="[^"]*"/, 'android:allowBackup="false"');
fs.writeFileSync(mp, man);

// --- εικονίδιο: απλά PNG σε όλες τις πυκνότητες, χωρίς προσαρμοζόμενο εικονίδιο ---
const icon = path.join(root, 'icon-192.png');
if(fs.existsSync(icon)){
  const res = path.join(app, 'src', 'main', 'res');
  for(const d of fs.readdirSync(res)){
    if(!d.startsWith('mipmap-')) continue;
    const dir = path.join(res, d);
    if(d.includes('anydpi')){
      for(const f of fs.readdirSync(dir)) if(/^ic_launcher.*\.xml$/.test(f)) fs.rmSync(path.join(dir, f));
      continue;
    }
    for(const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']){
      if(fs.existsSync(path.join(dir, n))) fs.copyFileSync(icon, path.join(dir, n));
    }
  }
} else console.warn('προειδοποίηση: λείπει το icon-192.png — μένει το εικονίδιο του Capacitor');

// --- σταθερό κλειδί υπογραφής (αν υπάρχει στα μυστικά του GitHub): κάθε νέο APK εγκαθίσταται πάνω στο προηγούμενο ---
if(process.env.FISHIQ_KS && process.env.FISHIQ_PW){
  let g2 = fs.readFileSync(gp, 'utf8');
  g2 += `
android {
    signingConfigs {
        fishiq {
            storeFile file(System.getenv('FISHIQ_KS'))
            storePassword System.getenv('FISHIQ_PW')
            keyAlias 'fishiq'
            keyPassword System.getenv('FISHIQ_PW')
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.fishiq
        }
    }
}
`;
  fs.writeFileSync(gp, g2);
  console.log('Υπογραφή με το σταθερό κλειδί του Fish IQ.');
} else console.warn('προειδοποίηση: δεν υπάρχει σταθερό κλειδί — προσωρινή υπογραφή (το APK δεν θα εγκαθίσταται πάνω στο παλιό)');

console.log(`Android: έκδοση ${versionName} (κωδικός ${versionCode}), άδειες και εικονίδιο ρυθμίστηκαν.`);
