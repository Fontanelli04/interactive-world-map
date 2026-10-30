# Interactive World Map

A 3D globe where every country and territory is clickable. Clicking one opens a profile with its flag, capital, key facts, and History / Culture / Politics / Economy tabs.

Built with [Vite](https://vite.dev) and [globe.gl](https://globe.gl). The output is a fully static site.

## Run locally

```bash
npm install
npm run dev
```

## Data

| What | Source | Command |
|---|---|---|
| Country shapes | [Natural Earth](https://www.naturalearthdata.com) 1:50m admin-0 | `npm run data` |
| Name, capital, region, languages, currency | [mledoze/countries](https://github.com/mledoze/countries) | `npm run data` |
| Flags | [flagcdn.com](https://flagcdn.com) (loaded at runtime) | none |
| Tab texts | AI-written by Claude in Claude Code, one file per country in `public/data/content/` | `npm run check` lists missing ones |

Re-running `npm run data` refreshes `public/data/countries.geojson` and `countries.json`.

### Tab texts

Each country has a file `public/data/content/{ISO3}.json` with this shape:

```json
{
  "history":  [{ "heading": "…", "paragraphs": ["…", "…"] }],
  "culture":  [ … ],
  "politics": [ … ],
  "economy":  [ … ]
}
```

They were written by Claude (in Claude Code, not via the API) and may contain errors; corrections are welcome. `npm run check` validates every file and lists countries that don't have one yet.

## Deploy (free, GitHub Pages)

1. Create a GitHub repository and push this project to the `main` branch.
2. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` builds and publishes the site to `https://<user>.github.io/<repo>/`.

The `dist/` folder from `npm run build` also works as-is on Netlify, Cloudflare Pages or Vercel.
