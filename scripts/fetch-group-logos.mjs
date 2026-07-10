// Télécharge les logos de partis (Wikimedia Commons, via Special:FilePath) en
// PNG normalisé dans public/groupes/, et écrit le manifeste src/data/group-logos.json.
// Les fichiers Commons ci-dessous ont été vérifiés via Wikidata (propriété P154).
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "groupes");
const MANIFEST = join(ROOT, "src", "data", "group-logos.json");

// abrege -> nom de fichier Commons (vérifié via P154, sauf SOC = candidat).
const LOGOS = {
  RN: "Logo Rassemblement National.svg",
  EPR: "Renaissance-logotype-officiel.svg",
  "LFI-NFP": "LFI Logo 2024.svg",
  SOC: "Logo du Parti socialiste.png",
  DR: "Les Républicains - logo (France, 2023).svg",
  EcoS: "Europe Ecologie-Les Verts Logo.svg",
  Dem: "MoDem logo 2019.svg",
  HOR: "Logo Parti Politique Horizons - 2021.svg",
  GDR: "Logo – Parti communiste français (2018).svg",
  UDR: "UDR logo.png",
};

const UA = { "User-Agent": "hemicycle/1.0 (logos import)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(OUT_DIR, { recursive: true });

async function download(abrege, file) {
  const dest = join(OUT_DIR, `${abrege}.png`);
  if (existsSync(dest)) { console.log(`• ${abrege}: déjà présent`); return; }
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    file
  )}?width=240`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: UA });
    const ct = res.headers.get("content-type") || "";
    if (res.ok && ct.startsWith("image/")) {
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      console.log(`✓ ${abrege}: ${(buf.length / 1024).toFixed(0)} ko`);
      return;
    }
    if (res.status === 429 && attempt < 4) {
      console.log(`  ${abrege}: 429, nouvelle tentative dans ${attempt * 5}s…`);
      await sleep(attempt * 5000);
      continue;
    }
    console.log(`✗ ${abrege}: ${res.status} ${ct} (${file})`);
    return;
  }
}

for (const [abrege, file] of Object.entries(LOGOS)) {
  await download(abrege, file);
  await sleep(1800);
}

// Manifeste construit à partir des fichiers réellement présents.
const manifest = {};
for (const abrege of Object.keys(LOGOS)) {
  if (existsSync(join(OUT_DIR, `${abrege}.png`))) manifest[abrege] = `/groupes/${abrege}.png`;
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Manifeste : ${Object.keys(manifest).length} logos -> ${MANIFEST}`);
