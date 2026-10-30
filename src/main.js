import { createGlobe } from "./globe.js";
import { openCountry, closeCountry, onClose } from "./modal.js";

const [shapes, countries] = await Promise.all([
  fetch("data/countries.geojson").then((r) => r.json()),
  fetch("data/countries.json").then((r) => r.json()),
]);
const byId = new Map(countries.map((c) => [c.id, c]));

let spinning = false;

function show(id) {
  openCountry(byId.get(id));
  // The URL hash makes each country linkable, e.g. ...#JPN
  history.replaceState(null, "", `#${id}`);
}

function select(id) {
  if (spinning || !byId.has(id)) return;
  globe.flyTo(id);
  show(id);
}

const globe = createGlobe(document.getElementById("globe"), { shapes, countries, onSelect: select });
document.getElementById("loading").remove();

onClose(() => {
  globe.setSelected(null);
  history.replaceState(null, "", location.pathname + location.search);
});

// Random country picker
const randomButton = document.getElementById("random");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
randomButton.addEventListener("click", async () => {
  if (spinning) return;
  const current = location.hash.slice(1);
  const pool = countries.filter((c) => c.latlng?.length === 2 && c.id !== current);
  const pick = pool[Math.floor(Math.random() * pool.length)];

  closeCountry();
  if (reduceMotion.matches) {
    select(pick.id);
    return;
  }
  spinning = true;
  randomButton.disabled = true;
  await globe.spinTo(pick.id);
  spinning = false;
  randomButton.disabled = false;
  show(pick.id);
});

// Search
const search = document.getElementById("search");
const byName = new Map(countries.map((c) => [c.name.toLowerCase(), c.id]));
document.getElementById("country-list").replaceChildren(
  ...countries.map((c) => {
    const option = document.createElement("option");
    option.value = c.name;
    return option;
  }),
);
search.addEventListener("change", () => {
  const id = byName.get(search.value.trim().toLowerCase());
  if (id) {
    select(id);
    search.value = "";
    search.blur();
  }
});

if (location.hash) select(location.hash.slice(1).toUpperCase());
