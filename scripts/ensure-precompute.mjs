// Filet de sécurité de perf, exécuté au build APRÈS db:fetch.
//
// Les pages /deputes et /groupes s'appuient sur la table `acteur_last_vote`
// (dernier vote de chaque acteur) pour éviter de rescanner les 1,8 M de votes à
// chaque requête (≈ 800 ms local, ≈ 8-10 s sur le CPU bridé de Render free).
// Cette table est normalement produite par compute-stats lors de la construction
// nocturne. Mais si le « release asset » téléchargé est antérieur à cet ajout,
// l'app retomberait sur le scan lent. On la (re)crée donc ici si elle manque —
// opération idempotente et peu coûteuse — pour rendre le déploiement autonome.
import Database from "better-sqlite3";
import path from "node:path";

const DEST = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "hemicycle.db");
const db = new Database(DEST); // lecture/écriture (au build, le fichier est modifiable)

const has = db
  .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='acteur_last_vote'")
  .get();

if (has) {
  const { n } = db.prepare("SELECT COUNT(*) n FROM acteur_last_vote").get();
  console.log(`acteur_last_vote déjà présente (${n} lignes) — rien à faire.`);
} else {
  console.log("acteur_last_vote absente — construction…");
  const t0 = Date.now();
  db.exec(`
    DROP TABLE IF EXISTS acteur_last_vote;
    CREATE TABLE acteur_last_vote AS
    SELECT v.acteur_uid AS uid, s.legislature AS legislature, MAX(s.date) AS last_date
    FROM votes v JOIN scrutins s ON s.uid = v.scrutin_uid
    GROUP BY v.acteur_uid, s.legislature;
    CREATE INDEX idx_alv ON acteur_last_vote(legislature, uid);
  `);
  const { n } = db.prepare("SELECT COUNT(*) n FROM acteur_last_vote").get();
  console.log(`OK : ${n} lignes en ${((Date.now() - t0) / 1000).toFixed(1)} s.`);
}
db.close();
