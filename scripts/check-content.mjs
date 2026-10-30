// Validates the profile files in public/data/content/ and lists countries that still lack one.
// Run with: npm run check
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const DATA_DIR = new URL("../public/data/", import.meta.url);
const TABS = ["history", "culture", "politics", "economy"];

const countries = JSON.parse(await readFile(new URL("countries.json", DATA_DIR), "utf8"));
const missing = [];
const invalid = [];

for (const c of countries) {
  const file = new URL(`content/${c.id}.json`, DATA_DIR);
  if (!existsSync(file)) {
    missing.push(`${c.id} ${c.name}`);
    continue;
  }
  try {
    const content = JSON.parse(await readFile(file, "utf8"));
    for (const tab of TABS) {
      const sections = content[tab];
      if (!Array.isArray(sections) || sections.length === 0) throw new Error(`"${tab}" is empty`);
      for (const s of sections) {
        if (typeof s.heading !== "string" || !Array.isArray(s.paragraphs) || s.paragraphs.length === 0) {
          throw new Error(`bad section in "${tab}"`);
        }
      }
    }
  } catch (error) {
    invalid.push(`${c.id} ${c.name}: ${error.message}`);
  }
}

console.log(`${countries.length - missing.length - invalid.length}/${countries.length} profiles OK.`);
if (invalid.length) console.log(`\nInvalid:\n  ${invalid.join("\n  ")}`);
if (missing.length) console.log(`\nMissing (${missing.length}):\n  ${missing.join("\n  ")}`);
process.exitCode = invalid.length ? 1 : 0;
