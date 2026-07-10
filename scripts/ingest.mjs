// Ingestion open data Assemblée Nationale -> SQLite (data/hemicycle.db)
// Sources: fichiers ZIP statiques officiels (Licence Ouverte Etalab)
//   Scrutins  : /{leg}/loi/scrutins/Scrutins.json.zip
//   Acteurs   : /{leg}/amo/deputes_actifs_mandats_actifs_organes/AMO10_....json.zip (actifs)
//   Historique: /{leg}/amo/tous_acteurs_mandats_organes_xi_legislature/AMO30_....json.zip
import { createRequire } from "node:module";
import { mkdirSync, existsSync, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
const require = createRequire(import.meta.url);
const AdmZip = require("adm-zip");
const Database = require("better-sqlite3");

const ROOT = path.resolve(process.cwd());
const RAW = path.join(ROOT, "data", "raw");
const DB_PATH = path.join(ROOT, "data", "hemicycle.db");
mkdirSync(RAW, { recursive: true });

const BASE = "https://data.assemblee-nationale.fr/static/openData/repository";
const LEGISLATURES = (process.env.LEGISLATURES || "17,16").split(",").map((s) => s.trim());

const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const txt = (x) => (x && typeof x === "object" ? x["#text"] ?? "" : x ?? "");
const str = (x) => {
  if (x == null) return null;
  if (typeof x === "object") return txt(x) || null;
  return x;
};
const num = (x) => {
  const n = parseInt(txt(x), 10);
  return Number.isFinite(n) ? n : null;
};

async function download(url, dest) {
  if (existsSync(dest)) {
    console.log("  (cache) " + path.basename(dest));
    return dest;
  }
  console.log("  download " + url);
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  !! HTTP ${res.status} pour ${url}`);
    return null;
  }
  await pipeline(res.body, createWriteStream(dest));
  return dest;
}

function initDb(db) {
  db.pragma("journal_mode = WAL");
  db.exec(`
    DROP TABLE IF EXISTS votes;
    DROP TABLE IF EXISTS scrutins;
    DROP TABLE IF EXISTS mandats;
    DROP TABLE IF EXISTS deputes;
    DROP TABLE IF EXISTS organes;
    CREATE TABLE organes (
      uid TEXT PRIMARY KEY, code_type TEXT, libelle TEXT, abrege TEXT,
      date_debut TEXT, date_fin TEXT, legislature TEXT
    );
    CREATE TABLE deputes (
      uid TEXT PRIMARY KEY, civ TEXT, prenom TEXT, nom TEXT, profession TEXT,
      fam_socpro TEXT
    );
    CREATE TABLE mandats (
      uid TEXT, legislature TEXT, groupe_uid TEXT,
      dept TEXT, num_dept TEXT, num_circo TEXT,
      PRIMARY KEY (uid, legislature)
    );
    CREATE TABLE scrutins (
      uid TEXT PRIMARY KEY, numero INTEGER, date TEXT, legislature TEXT,
      type_vote TEXT, sort_code TEXT, titre TEXT, objet TEXT, demandeur TEXT,
      nb_votants INTEGER, exprimes INTEGER, pour INTEGER, contre INTEGER,
      abstentions INTEGER, non_votants INTEGER
    );
    CREATE TABLE votes (
      scrutin_uid TEXT, acteur_uid TEXT, groupe_uid TEXT, position TEXT
    );
    CREATE INDEX idx_votes_scrutin ON votes(scrutin_uid);
    CREATE INDEX idx_votes_acteur ON votes(acteur_uid);
    CREATE INDEX idx_votes_groupe ON votes(groupe_uid);
    CREATE INDEX idx_scrutins_leg ON scrutins(legislature);
    CREATE INDEX idx_scrutins_date ON scrutins(date);
    CREATE INDEX idx_mandats_groupe ON mandats(groupe_uid);
    CREATE INDEX idx_mandats_leg ON mandats(legislature);
    CREATE INDEX idx_mandats_uid ON mandats(uid);
  `);
}

function ingestActeursOrganes(db, zipPath, legislature, legList = [legislature]) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const insOrg = db.prepare(
    `INSERT OR REPLACE INTO organes (uid,code_type,libelle,abrege,date_debut,date_fin,legislature)
     VALUES (@uid,@code_type,@libelle,@abrege,@date_debut,@date_fin,@legislature)`
  );
  const insDep = db.prepare(
    `INSERT OR REPLACE INTO deputes (uid,civ,prenom,nom,profession,fam_socpro)
     VALUES (@uid,@civ,@prenom,@nom,@profession,@fam_socpro)`
  );
  const insMan = db.prepare(
    `INSERT OR REPLACE INTO mandats (uid,legislature,groupe_uid,dept,num_dept,num_circo)
     VALUES (@uid,@legislature,@groupe_uid,@dept,@num_dept,@num_circo)`
  );
  let nOrg = 0, nDep = 0;
  const tx = db.transaction(() => {
    for (const e of entries) {
      if (e.isDirectory) continue;
      const name = e.entryName;
      if (name.includes("/organe/")) {
        const o = JSON.parse(zip.readAsText(e)).organe;
        insOrg.run({
          uid: txt(o.uid),
          code_type: o.codeType ?? null,
          libelle: o.libelle ?? null,
          abrege: o.libelleAbrege ?? null,
          date_debut: o.viMoDe?.dateDebut ?? null,
          date_fin: o.viMoDe?.dateFin ?? null,
          legislature: o.legislature ?? legislature,
        });
        nOrg++;
      } else if (name.includes("/acteur/")) {
        const a = JSON.parse(zip.readAsText(e)).acteur;
        const uid = txt(a.uid);
        insDep.run({
          uid,
          civ: str(a.etatCivil?.ident?.civ),
          prenom: str(a.etatCivil?.ident?.prenom),
          nom: str(a.etatCivil?.ident?.nom),
          profession: str(a.profession?.libelleCourant),
          fam_socpro: str(a.profession?.socProcINSEE?.famSocPro),
        });
        const mandats = arr(a.mandats?.mandat);
        for (const leg of legList) {
        const asm = mandats.find(
          (m) => m.typeOrgane === "ASSEMBLEE" && m.legislature === leg
        );
        if (asm) {
          const gp = mandats
            .filter((m) => m.typeOrgane === "GP" && m.legislature === leg)
            .sort(
              (x, y) =>
                (y.dateFin == null ? 1 : 0) - (x.dateFin == null ? 1 : 0) ||
                String(y.dateDebut).localeCompare(String(x.dateDebut))
            )[0];
          const el = asm.election?.lieu;
          insMan.run({
            uid,
            legislature: leg,
            groupe_uid: gp ? txt(gp.organes?.organeRef) || null : null,
            dept: str(el?.departement),
            num_dept: str(el?.numDepartement),
            num_circo: str(el?.numCirco),
          });
        }
        }
        nDep++;
      }
    }
  });
  tx();
  console.log(`  organes:${nOrg} deputes:${nDep}`);
}

function ingestScrutins(db, zipPath, legislature) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);
  const insS = db.prepare(
    `INSERT OR REPLACE INTO scrutins
     (uid,numero,date,legislature,type_vote,sort_code,titre,objet,demandeur,nb_votants,exprimes,pour,contre,abstentions,non_votants)
     VALUES (@uid,@numero,@date,@legislature,@type_vote,@sort_code,@titre,@objet,@demandeur,@nb_votants,@exprimes,@pour,@contre,@abstentions,@non_votants)`
  );
  const insV = db.prepare(
    `INSERT INTO votes (scrutin_uid,acteur_uid,groupe_uid,position) VALUES (?,?,?,?)`
  );
  let nS = 0, nV = 0;
  const tx = db.transaction(() => {
    for (const e of entries) {
      const s = JSON.parse(zip.readAsText(e)).scrutin;
      const d = s.syntheseVote?.decompte ?? {};
      insS.run({
        uid: s.uid,
        numero: num(s.numero),
        date: s.dateScrutin ?? null,
        legislature: s.legislature ?? legislature,
        type_vote: s.typeVote?.libelleTypeVote ?? null,
        sort_code: s.sort?.code ?? null,
        titre: s.titre ?? s.objet?.libelle ?? null,
        objet: s.objet?.libelle ?? null,
        demandeur: s.demandeur?.texte ?? null,
        nb_votants: num(s.syntheseVote?.nombreVotants),
        exprimes: num(s.syntheseVote?.suffragesExprimes),
        pour: num(d.pour),
        contre: num(d.contre),
        abstentions: num(d.abstentions),
        non_votants: num(d.nonVotants),
      });
      nS++;
      for (const g of arr(s.ventilationVotes?.organe?.groupes?.groupe)) {
        const gu = txt(g.organeRef);
        const dn = g.vote?.decompteNominatif ?? {};
        for (const [key, pos] of [
          ["pours", "pour"],
          ["contres", "contre"],
          ["abstentions", "abstention"],
          ["nonVotants", "nonvotant"],
        ]) {
          for (const v of arr(dn[key]?.votant)) {
            insV.run(s.uid, txt(v.acteurRef), gu, pos);
            nV++;
          }
        }
      }
    }
  });
  tx();
  console.log(`  scrutins:${nS} votes:${nV}`);
}

async function main() {
  const db = new Database(DB_PATH);
  initDb(db);
  // Organes (groupes) + scrutins/votes : par législature
  for (const leg of LEGISLATURES) {
    console.log(`\n=== Législature ${leg} ===`);
    const amoUrl = `${BASE}/${leg}/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip`;
    const scrUrl = `${BASE}/${leg}/loi/scrutins/Scrutins.json.zip`;
    const amo = await download(amoUrl, path.join(RAW, `AMO10_${leg}.json.zip`));
    if (amo) ingestActeursOrganes(db, amo, leg, []); // organes uniquement (acteurs via AMO30)
    const scr = await download(scrUrl, path.join(RAW, `Scrutins${leg}.json.zip`));
    if (scr) ingestScrutins(db, scr, leg);
  }

  // Députés + mandats (toutes législatures cibles) via le fichier historique AMO30
  console.log(`\n=== Acteurs historiques (AMO30) → mandats ${LEGISLATURES.join(",")} ===`);
  const amo30Url = `${BASE}/17/amo/tous_acteurs_mandats_organes_xi_legislature/AMO30_tous_acteurs_tous_mandats_tous_organes_historique.json.zip`;
  const amo30 = await download(amo30Url, path.join(RAW, "AMO30.json.zip"));
  if (amo30) ingestActeursOrganes(db, amo30, LEGISLATURES[0], LEGISLATURES);

  db.exec("PRAGMA wal_checkpoint(TRUNCATE);");
  const c = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
  const cm = (l) => db.prepare(`SELECT COUNT(*) n FROM mandats WHERE legislature=?`).get(l).n;
  console.log(`\n== Totaux == organes:${c("organes")} deputes:${c("deputes")} mandats:${c("mandats")} scrutins:${c("scrutins")} votes:${c("votes")}`);
  for (const l of LEGISLATURES) console.log(`   mandats leg ${l}: ${cm(l)}`);
  db.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
