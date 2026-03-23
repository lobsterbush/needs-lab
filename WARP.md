# Fundamental Needs Lab Website

**Status**: Active  
**URL**: https://needslab.org  
**Repo**: lobsterbush/needs-lab (GitHub Pages, main branch)  
**Authors**: Charles Crabtree (PI)

## Description
Public-facing website for the Fundamental Needs Lab. Static HTML/CSS/JS site hosted on GitHub Pages with custom domain (needslab.org via Namecheap DNS).

## Architecture
- Static site: HTML + CSS + vanilla JS (no build system)
- Font: Inter (Google Fonts) — single sans-serif throughout
- Maps: Leaflet.js with world-atlas TopoJSON choropleth (no tile layer)
- Data: World Bank API (Gini, food insecurity), local JSON (homelessness)
- Hosting: GitHub Pages with HTTPS enforced

## Color Palette
- Deep indigo `#1b365d` (accent)
- Near-black `#111827` (text)
- Medium gray `#6b7280` (secondary text)
- White `#ffffff` (background)
- Off-white `#f9fafb` (alternate sections)
- Border gray `#e5e7eb`

## Pages
- `index.html` — Photo slideshow hero, stats banner, about
- `people.html` — Team + alumni grid
- `research.html` — 4 research areas with working papers
- `publications.html` — Published work with DOIs
- `advocacy.html` — Firstgen representation, inline waffle chart
- `data.html` — Interactive Gini/food insecurity maps + homelessness data (OECD + global)

## Key Files
- `styles.css` — Minimal design system (Inter-only typography, subtle fade animations, collapsible tables)
- `script.js` — Nav scroll state, hero slideshow, fade-in observer, stat counters
- `data.js` — World Bank API fetcher, choropleth renderer, bar charts, table sort/search
- `data/homelessness.json` — Structured dataset (OECD per-100k + global estimates)
- `images/hero/` — Unsplash reportage photos (CC0)
- `images/logo.svg` / `favicon.svg` — Shelter + person mark

## Design Notes
- Inspired by socialcatalystlab.org — clean, white, minimal academic aesthetic
- No decorative effects (grain overlay, spring animations, 3D card tilt, magnetic buttons all removed)
- Fade-in animations are fast (0.2s) with minimal travel (8px)

## Known Issues
- Russia missing from choropleth maps (antimeridian polygon filtered to prevent stripe artifact; needs split-polygon TopoJSON to fix properly)
- Hero images are limited to 3 (Unsplash URL-based downloads were unreliable for other subjects)
- Academic figures (campus-rights, names, Morgan) are static PNGs from R with inconsistent styling
