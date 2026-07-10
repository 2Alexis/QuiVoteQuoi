// Convertit le GeoJSON simplifié des départements en chemins SVG pré-projetés,
// stockés dans src/data/departements.json (aucune dépendance au runtime).
// Projection : équirectangulaire corrigée au cosinus de la latitude moyenne de
// la France métropolitaine — suffisant à cette échelle.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "_deps.geojson");
const OUT = path.join(__dirname, "..", "src", "data", "departements.json");

const geo = JSON.parse(fs.readFileSync(SRC, "utf8"));

const LAT0 = 46.6; // centre approximatif
const K = Math.cos((LAT0 * Math.PI) / 180);
const project = ([lon, lat]) => [lon * K, -lat];

// Bornes globales
let minX = Infinity,
  minY = Infinity,
  maxX = -Infinity,
  maxY = -Infinity;
const eachRing = (geom, cb) => {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) for (const ring of poly) cb(ring);
};
for (const f of geo.features) {
  eachRing(f.geometry, (ring) => {
    for (const c of ring) {
      const [x, y] = project(c);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  });
}

const W = 980;
const PAD = 8;
const scale = (W - 2 * PAD) / (maxX - minX);
const H = Math.round((maxY - minY) * scale + 2 * PAD);
const tx = ([x, y]) => [
  +(PAD + (x - minX) * scale).toFixed(1),
  +(PAD + (y - minY) * scale).toFixed(1),
];

const ringToPath = (ring) => {
  let d = "";
  ring.forEach((c, i) => {
    const [x, y] = tx(project(c));
    d += (i === 0 ? "M" : "L") + x + " " + y;
  });
  return d + "Z";
};

const departements = geo.features
  .map((f) => {
    let d = "";
    eachRing(f.geometry, (ring) => {
      d += ringToPath(ring);
    });
    return { code: f.properties.code, nom: f.properties.nom, d };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ width: W, height: H, departements }));
console.log(`Écrit ${departements.length} départements → ${OUT} (viewBox ${W}x${H})`);
