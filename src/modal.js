const TABS = ["history", "culture", "politics", "economy"];

const dialog = document.getElementById("country-dialog");
const panel = document.getElementById("tab-panel");
const tabButtons = [...dialog.querySelectorAll("[role=tab]")];

let content = null; // loaded text for the open country, or a status string
let activeTab = "history";
let requestId = 0;

const numberFormat = new Intl.NumberFormat("en");

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function renderFacts(c) {
  const facts = [
    ["Region", [c.subregion, c.region].filter(Boolean).join(", ")],
    ["Area", `${numberFormat.format(c.area)} km²`],
    ["Languages", c.languages.join(", ")],
    ["Currency", c.currencies.join(", ")],
    ["Status", c.independent ? (c.unMember ? "Sovereign state, UN member" : "Sovereign state") : "Territory"],
  ].filter(([, value]) => value);

  const list = document.getElementById("country-facts");
  list.replaceChildren(
    ...facts.map(([label, value]) => {
      const item = document.createElement("div");
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = label;
      dd.textContent = value;
      item.append(dt, dd);
      return item;
    }),
  );
}

function renderTab() {
  tabButtons.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === activeTab)));

  if (typeof content === "string") {
    const p = document.createElement("p");
    p.className = "status";
    p.textContent = content;
    panel.replaceChildren(p);
    return;
  }

  panel.replaceChildren(
    ...content[activeTab].flatMap((section) => {
      const h3 = document.createElement("h3");
      h3.textContent = section.heading;
      return [
        h3,
        ...section.paragraphs.map((text) => {
          const p = document.createElement("p");
          p.textContent = text;
          return p;
        }),
      ];
    }),
  );
  panel.scrollTop = 0;
}

async function loadContent(id) {
  const current = ++requestId;
  content = "Loading…";
  renderTab();
  let loaded;
  try {
    const res = await fetch(`data/content/${id}.json`);
    // Some hosts (and the dev server) answer a missing file with an HTML page instead of a 404.
    const isJson = res.headers.get("content-type")?.includes("json");
    loaded = res.ok && isJson ? await res.json() : "No profile has been written for this country yet.";
  } catch {
    loaded = "Couldn't load this profile. Check your connection and try again.";
  }
  if (current === requestId) content = loaded;
  if (current === requestId) renderTab();
}

export function openCountry(c) {
  const flag = document.getElementById("country-flag");
  flag.src = `https://flagcdn.com/${c.iso2}.svg`;
  flag.alt = `Flag of ${c.name}`;
  setText("country-name", c.name);
  setText("country-official", c.officialName !== c.name ? c.officialName : "");
  setText("country-capital", c.capital.join(", ") || "None");
  renderFacts(c);

  activeTab = "history";
  loadContent(c.id);
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

export function onClose(fn) {
  dialog.addEventListener("close", fn);
}

tabButtons.forEach((b) =>
  b.addEventListener("click", () => {
    activeTab = b.dataset.tab;
    renderTab();
  }),
);

// Arrow keys move between tabs.
dialog.querySelector(".tabs").addEventListener("keydown", (e) => {
  const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (!step) return;
  activeTab = TABS[(TABS.indexOf(activeTab) + step + TABS.length) % TABS.length];
  renderTab();
  tabButtons.find((b) => b.dataset.tab === activeTab).focus();
});

dialog.querySelector(".close").addEventListener("click", () => dialog.close());
// Clicking the backdrop (outside the dialog box) closes it.
dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
