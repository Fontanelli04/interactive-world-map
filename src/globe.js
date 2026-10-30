import Globe from "globe.gl";

const OCEAN = "#1d3557";
const BORDER = "rgba(255, 255, 255, 0.55)";
const UNCLICKABLE = "#5c6b80";
const REGION_COLORS = {
  Africa: "#f2c879",
  Americas: "#8cc7a1",
  Asia: "#f19c8f",
  Europe: "#93b5e1",
  Oceania: "#c7a4dd",
  Antarctic: "#e8eef4",
};

// Mix a hex colour towards white (amount > 0) or black (amount < 0).
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  const mix = (c) => Math.round(c + (target - c) * Math.abs(amount));
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

// A stable per-country variation in -0.12..0.12 so neighbours in the same region stand apart.
function variation(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return ((h % 7) - 3) * 0.04;
}

export function createGlobe(element, { shapes, countries, onSelect }) {
  const byId = new Map(countries.map((c) => [c.id, c]));
  const colorOf = (id) => REGION_COLORS[byId.get(id)?.region] ?? UNCLICKABLE;
  let hovered = null;

  const globe = new Globe(element)
    .backgroundColor("#0b1626")
    .showAtmosphere(true)
    .atmosphereColor("#9cc3ff")
    .atmosphereAltitude(0.12)
    // Shapes
    .polygonsData(shapes.features)
    .polygonCapColor((f) => {
      const id = f.properties.id;
      if (!id) return UNCLICKABLE;
      return f === hovered ? shade(colorOf(id), 0.45) : shade(colorOf(id), variation(id));
    })
    .polygonSideColor(() => "rgba(0, 0, 0, 0.15)")
    .polygonStrokeColor(() => BORDER)
    .polygonAltitude((f) => (f === hovered ? 0.02 : 0.006))
    .polygonsTransitionDuration(150)
    .polygonLabel((f) => f.properties.name)
    .onPolygonHover((f) => {
      hovered = f?.properties.id ? f : null;
      element.style.cursor = hovered ? "pointer" : "grab";
      globe.polygonCapColor(globe.polygonCapColor()).polygonAltitude(globe.polygonAltitude());
    })
    .onPolygonClick((f) => f.properties.id && onSelect(f.properties.id))
    // Dots for micro-states and territories without a shape of their own
    .labelsData(countries.filter((c) => c.marker && c.latlng?.length === 2))
    .labelLat((c) => c.latlng[0])
    .labelLng((c) => c.latlng[1])
    .labelText(() => "")
    .labelDotRadius(0.45)
    .labelAltitude(0.008)
    .labelColor((c) => colorOf(c.id))
    .labelLabel((c) => c.name)
    .onLabelHover((c) => (element.style.cursor = c ? "pointer" : "grab"))
    .onLabelClick((c) => onSelect(c.id));

  globe.globeMaterial().color.set(OCEAN);
  globe.globeMaterial().shininess = 0;

  const controls = globe.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.35;
  // Stop spinning once the user grabs the globe.
  controls.addEventListener("start", () => (controls.autoRotate = false));

  globe.pointOfView({ lat: 25, lng: 10, altitude: 2.4 });

  const resize = () => globe.width(window.innerWidth).height(window.innerHeight);
  window.addEventListener("resize", resize);
  resize();

  return {
    flyTo(id) {
      const c = byId.get(id);
      if (!c?.latlng) return;
      controls.autoRotate = false;
      globe.pointOfView({ lat: c.latlng[0], lng: c.latlng[1], altitude: 1.6 }, 1000);
    },
  };
}
