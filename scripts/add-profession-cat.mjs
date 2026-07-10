// Migration ciblée : ajoute deputes.fam_socpro (catégorie socio-pro INSEE) et
// la remplit depuis les fichiers acteurs, sans ré-ingérer les votes.
import Database from "better-sqlite3";
import AdmZip from "adm-zip";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "hemicycle.db");
const RAW = path.join(__dirname, "..", "data", "raw");

const db = new Database(DB);

const cols = db.prepare("PRAGMA table_info(deputes)").all();
if (!cols.some((c) => c.name === "fam_socpro")) {
  db.exec("ALTER TABLE deputes ADD COLUMN fam_socpro TEXT");
  console.log("Colonne fam_socpro ajoutée.");
}

const upd = db.prepare("UPDATE deputes SET fam_socpro = ? WHERE uid = ?");
const zips = ["AMO30.json.zip", "AMO10_17.json.zip", "AMO10_16.json.zip"].filter((f) =>
  fs.existsSync(path.join(RAW, f))
);

let updated = 0;
const tx = db.transaction((entries, zip) => {
  for (const e of entries) {
    if (e.isDirectory || !e.entryName.includes("/acteur/")) continue;
    const a = JSON.parse(zip.readAsText(e)).acteur;
    const uid = a && typeof a.uid === "object" ? a.uid?.["#text"] : a?.uid;
    let fam = a?.profession?.socProcINSEE?.famSocPro;
    if (fam && typeof fam === "object") fam = fam["#text"];
    if (typeof fam === "string" && fam && typeof uid === "string" && uid) {
      const r = upd.run(fam, uid);
      updated += r.changes;
    }
  }
});

for (const f of zips) {
  const zip = new AdmZip(path.join(RAW, f));
  tx(zip.getEntries(), zip);
  console.log(`Traité ${f}`);
}

const withCat = db.prepare("SELECT COUNT(*) n FROM deputes WHERE fam_socpro IS NOT NULL").get().n;
console.log(`Mises à jour : ${updated} lignes · ${withCat} députés avec catégorie.`);
db.close();
