// Télécharge la base SQLite déjà construite (publiée chaque nuit par GitHub
// Actions comme « release asset ») vers data/hemicycle.db. Utilisé au build sur
// l'hébergeur (Render free) pour éviter de reconstruire les 200 Mo à chaque fois.
// Configurer l'URL via la variable d'environnement DB_URL.
import { mkdirSync, createWriteStream, statSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";

const URL = process.env.DB_URL;
if (!URL) {
  console.error("DB_URL non définie. Ex : https://github.com/<user>/<repo>/releases/download/data-latest/hemicycle.db");
  process.exit(1);
}
const DEST = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "hemicycle.db");
mkdirSync(path.dirname(DEST), { recursive: true });

console.log("Téléchargement de la base :", URL);
const res = await fetch(URL, { redirect: "follow" });
if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} en téléchargeant ${URL}`);
await pipeline(Readable.fromWeb(res.body), createWriteStream(DEST));
console.log("OK :", (statSync(DEST).size / 1048576).toFixed(0), "Mo →", DEST);
