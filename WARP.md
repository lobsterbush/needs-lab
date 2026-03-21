# Fundamental Needs Lab Website

**Status**: Active  
**URL**: https://needslab.org  
**Repo**: lobsterbush/needs-lab (GitHub Pages, main branch)  
**Authors**: Charles Crabtree (PI)

## Description
Public-facing website for the Fundamental Needs Lab. Static HTML/CSS/JS site hosted on GitHub Pages with custom domain (needslab.org via Namecheap DNS).

## Architecture
- Static site: HTML + CSS + vanilla JS (no build system)
- Fonts: Playfair Display, Inter, JetBrains Mono (Google Fonts)
- Maps: Leaflet.js with world-atlas TopoJSON choropleth (no tile layer)
- Data: World Bank API (Gini, food insecurity), local JSON (homelessness)
- Hosting: GitHub Pages with HTTPS enforced

## Color Palette
- Deep indigo `#1b365d` (primary/accent)
- Warm amber `#d4973b` (interactive highlights)
- Near-black `#0d1117` (ink/dark sections)
- Warm cream `#faf7f2` (background)
- Linen `#f2ede6` (alternate sections)

## Pages
- `index.html` — Photo slideshow hero, stats banner, about
- `people.html` — Team + alumni with 3D tilt cards
- `research.html` — 4 research areas with oversized numerals
- `publications.html` — Published work with DOIs
- `advocacy.html` — Firstgen representation, inline waffle chart
- `data.html` — Interactive Gini/food insecurity maps + homelessness data (OECD + global)

## Key Files
- `styles.css` — Full design system (editorial typography, spring animations, collapsible tables)
- `script.js` — Scroll animations, hero slideshow, magnetic buttons, card tilt, counters
- `data.js` — World Bank API fetcher, choropleth renderer, bar charts, table sort/search
- `data/homelessness.json` — Structured dataset (OECD per-100k + global estimates)
- `images/hero/` — Unsplash reportage photos (CC0)
- `images/logo.svg` / `favicon.svg` — Shelter + person mark

## Known Issues
- Russia missing from choropleth maps (antimeridian polygon filtered to prevent stripe artifact; needs split-polygon TopoJSON to fix properly)
- Hero images are limited to 3 (Unsplash URL-based downloads were unreliable for other subjects)
- Academic figures (campus-rights, names, Morgan) are static PNGs from R with inconsistent styling
