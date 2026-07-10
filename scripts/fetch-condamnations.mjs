// Récupère les condamnations judiciaires des députés depuis Wikidata (propriété
// P1399 « condamné pour »), source ouverte et vérifiable — même socle de données
// que casier-politique.fr. Matching STRICT par l'identifiant Assemblée nationale
// (P4123 → uid « PA… »), sans rapprochement approximatif par nom, pour éviter
// toute erreur d'homonymie. Chaque ligne conserve un lien source (Wikipédia/Wikidata).
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(__dirname, "..", "data", "hemicycle.db");

const SPARQL = `
SELECT ?p ?an ?convLabel ?date ?article WHERE {
  ?p p:P39 ?st . ?st ps:P39 wd:Q3044918 .
  ?p wdt:P4123 ?an .
  ?p p:P1399 ?cs . ?cs ps:P1399 ?conv .
  OPTIONAL { ?cs pq:P585 ?date . }
  OPTIONAL { ?article schema:about ?p ; schema:isPartOf <https://fr.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr". }
}`;

async function main() {
  const url =
    "https://query.wikidata.org/sparql?format=json&query=" + encodeURIComponent(SPARQL);
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": "hemicycle-research/1.0" },
  });
  if (!res.ok) throw new Error("Wikidata HTTP " + res.status);
  const rows = (await res.json()).results.bindings;
  console.log("Lignes Wikidata :", rows.length);

  const db = new Database(DB);
  db.exec(`
    DROP TABLE IF EXISTS condamnations;
    CREATE TABLE condamnations (
      uid TEXT, infraction TEXT, date TEXT,
      wikidata_qid TEXT, wikipedia_url TEXT
    );
    CREATE INDEX idx_cond_uid ON condamnations(uid);
  `);
  const depExists = db.prepare("SELECT 1 FROM deputes WHERE uid = ?");
  const ins = db.prepare(
    "INSERT INTO condamnations (uid,infraction,date,wikidata_qid,wikipedia_url) VALUES (?,?,?,?,?)"
  );

  // Dédoublonnage (uid + infraction + date).
  const seen = new Set();
  let inserted = 0;
  const deputes = new Set();
  const tx = db.transaction(() => {
    for (const r of rows) {
      const an = r.an?.value;
      if (!an) continue;
      const uid = "PA" + an;
      if (!depExists.get(uid)) continue; // uniquement nos députés
      const inf = r.convLabel?.value ?? null;
      if (!inf || /^Q\d+$/.test(inf)) continue; // libellé manquant
      const date = r.date?.value ? r.date.value.slice(0, 10) : null;
      const qid = r.p.value.split("/").pop();
      const key = uid + "|" + inf + "|" + (date ?? "");
      if (seen.has(key)) continue;
      seen.add(key);
      ins.run(uid, inf, date, qid, r.article?.value ?? null);
      inserted++;
      deputes.add(uid);
    }
  });
  tx();
  console.log(`Insérées : ${inserted} condamnations · ${deputes.size} députés concernés.`);
  db.close();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
