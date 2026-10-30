// Downloads country shapes + facts and writes the static data the site loads.
// Run with: npm run data
import { mkdir, writeFile } from "node:fs/promises";

const SHAPES_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson";
const FACTS_URL =
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";
const OUT_DIR = new URL("../public/data/", import.meta.url);

// Natural Earth codes that differ from the ISO codes used in the facts dataset.
const CODE_OVERRIDES = { KOS: "UNK" };

// Below this area (km²) a country also gets a clickable dot, since its shape is hard to hit.
const SMALL_AREA_KM2 = 2500;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

const round = (n) => Math.round(n * 1000) / 1000;
const roundCoords = (c) => (typeof c[0] === "number" ? c.map(round) : c.map(roundCoords));

const [shapes, facts] = await Promise.all([fetchJson(SHAPES_URL), fetchJson(FACTS_URL)]);

const countries = facts
  .map((c) => ({
    id: c.cca3,
    iso2: c.cca2.toLowerCase(),
    name: c.name.common,
    officialName: c.name.official,
    capital: c.capital ?? [],
    region: c.region,
    subregion: c.subregion ?? "",
    area: c.area,
    languages: Object.values(c.languages ?? {}),
    currencies: Object.values(c.currencies ?? {}).map((cur) =>
      cur.symbol ? `${cur.name} (${cur.symbol})` : cur.name,
    ),
    independent: Boolean(c.independent),
    unMember: Boolean(c.unMember),
    latlng: c.latlng,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const byId = new Map(countries.map((c) => [c.id, c]));
const withShape = new Set();

const features = shapes.features.map((f) => {
  const p = f.properties;
  const id = [CODE_OVERRIDES[p.ADM0_A3], p.ISO_A3_EH, p.ADM0_A3, p.ISO_A3].find((code) =>
    byId.has(code),
  );
  if (id) withShape.add(id);
  return {
    type: "Feature",
    // Unmatched shapes (e.g. Somaliland, N. Cyprus) are drawn but not clickable.
    properties: { id: id ?? null, name: id ? byId.get(id).name : p.NAME },
    geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
  };
});

for (const c of countries) {
  c.marker = !withShape.has(c.id) || c.area < SMALL_AREA_KM2;
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(
  new URL("countries.geojson", OUT_DIR),
  JSON.stringify({ type: "FeatureCollection", features }),
);
await writeFile(new URL("countries.json", OUT_DIR), JSON.stringify(countries));

const markers = countries.filter((c) => c.marker).length;
console.log(
  `Wrote ${features.length} shapes and ${countries.length} countries (${markers} shown as dots).`,
);
