import { createGlobe } from "./globe.js";
import { openCountry, onClose } from "./modal.js";

const [shapes, countries] = await Promise.all([
  fetch("data/countries.geojson").then((r) => r.json()),
  fetch("data/countries.json").then((r) => r.json()),
]);
const byId = new Map(countries.map((c) => [c.id, c]));

function select(id) {
  const c = byId.get(id);
  if (!c) return;
  globe.flyTo(id);
  openCountry(c);
  // The URL hash makes each country linkable, e.g. ...#JPN
  history.replaceState(null, "", `#${id}`);
}

const globe = createGlobe(document.getElementById("globe"), { shapes, countries, onSelect: select });
document.getElementById("loading").remove();

onClose(() => history.replaceState(null, "", location.pathname + location.search));

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
