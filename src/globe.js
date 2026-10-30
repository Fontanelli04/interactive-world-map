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

// 0 before `from`, 1 after `to`, eased in between.
function smoothstep(from, to, t) {
  const x = Math.min(Math.max((t - from) / (to - from), 0), 1);
  return x * x * (3 - 2 * x);
}

const SPIN_TURNS = 4;
const SPIN_DURATION = 6000;
const SPIN_ALTITUDE = 2.9;
const LANDING_ALTITUDE = 1.5;

export function createGlobe(element, { shapes, countries, onSelect }) {
  const byId = new Map(countries.map((c) => [c.id, c]));
  const colorOf = (id) => REGION_COLORS[byId.get(id)?.region] ?? UNCLICKABLE;
  let hovered = null;
  let selectedId = null;
  const isRaised = (f) => f === hovered || (selectedId && f.properties.id === selectedId);
  const refreshPolygons = () =>
    globe.polygonCapColor(globe.polygonCapColor()).polygonAltitude(globe.polygonAltitude());

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
      return isRaised(f) ? shade(colorOf(id), 0.45) : shade(colorOf(id), variation(id));
    })
    .polygonSideColor(() => "rgba(0, 0, 0, 0.15)")
    .polygonStrokeColor(() => BORDER)
    .polygonAltitude((f) => (isRaised(f) ? 0.02 : 0.006))
    .polygonsTransitionDuration(150)
    .polygonLabel((f) => f.properties.name)
    .onPolygonHover((f) => {
      hovered = f?.properties.id ? f : null;
      element.style.cursor = hovered ? "pointer" : "grab";
      refreshPolygons();
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

  const setSelected = (id) => {
    selectedId = id;
    refreshPolygons();
  };

  return {
    setSelected,

    flyTo(id) {
      const c = byId.get(id);
      if (!c?.latlng) return;
      controls.autoRotate = false;
      setSelected(id);
      globe.pointOfView({ lat: c.latlng[0], lng: c.latlng[1], altitude: 1.6 }, 1000);
    },

    // Roulette-style spin: whirl the globe several turns, slow down, and settle on the country.
    spinTo(id) {
      const c = byId.get(id);
      if (!c?.latlng) return Promise.resolve();
      const [lat, lng] = c.latlng;

      setSelected(null);
      controls.autoRotate = false;
      controls.enabled = false;
      const start = globe.pointOfView();
      // Rotate eastward and land exactly on the target longitude after a few full turns.
      const lngTravel = (((lng - start.lng) % 360) + 360) % 360 + 360 * SPIN_TURNS;

      return new Promise((resolve) => {
        const t0 = performance.now();
        const frame = (now) => {
          const t = Math.min((now - t0) / SPIN_DURATION, 1);
          const spin = 1 - Math.pow(1 - t, 4); // fast start, long slow finish
          const rise = smoothstep(0, 0.15, t);
          const land = smoothstep(0.55, 1, t);
          globe.pointOfView({
            lat: start.lat + (lat - start.lat) * smoothstep(0.35, 1, t),
            lng: start.lng + lngTravel * spin,
            altitude:
              start.altitude +
              (SPIN_ALTITUDE - start.altitude) * rise +
              (LANDING_ALTITUDE - SPIN_ALTITUDE) * land,
          });
          if (t < 1) {
            requestAnimationFrame(frame);
          } else {
            controls.enabled = true;
            setSelected(id);
            resolve();
          }
        };
        requestAnimationFrame(frame);
      });
    },
  };
}
