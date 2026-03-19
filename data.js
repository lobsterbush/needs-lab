/* Fundamental Needs Lab — Data Tracker Engine */
(function () {
    'use strict';

    const GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
    const WB_BASE = 'https://api.worldbank.org/v2/country/all/indicator/';

    /* ===== State ===== */
    const state = {
        gini: { raw: [], map: null, geoJson: null, layer: null },
        food: { raw: [], map: null, geoJson: null, layer: null },
        homeless: { raw: [] },
        geoJsonData: null,
        sortCol: null,
        sortDir: 1
    };

    /* ===== Tab switching ===== */
    document.querySelectorAll('.tracker-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tracker-tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            document.querySelectorAll('.tracker-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const panel = document.getElementById('panel-' + tab.dataset.tab);
            panel.classList.add('active');

            /* Invalidate map sizes on tab switch */
            setTimeout(() => {
                if (tab.dataset.tab === 'gini' && state.gini.map) state.gini.map.invalidateSize();
                if (tab.dataset.tab === 'food' && state.food.map) state.food.map.invalidateSize();
            }, 100);
        });
    });

    /* ===== Fetch World Bank data (all pages) ===== */
    async function fetchWB(indicator, dateRange) {
        const all = [];
        let page = 1;
        let pages = 1;
        while (page <= pages) {
            const url = `${WB_BASE}${indicator}?format=json&per_page=1000&date=${dateRange}&page=${page}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json[1]) break;
            pages = json[0].pages;
            json[1].forEach(d => {
                if (d.value !== null) {
                    all.push({
                        country: d.country.value,
                        iso3: d.countryiso3code,
                        value: Math.round(d.value * 10) / 10,
                        year: parseInt(d.date)
                    });
                }
            });
            page++;
        }
        return all;
    }

    /* ===== Get best value for a given year (most recent <= year) ===== */
    function bestForYear(data, targetYear) {
        const byCountry = {};
        data.forEach(d => {
            if (d.year > targetYear) return;
            if (!byCountry[d.iso3] || d.year > byCountry[d.iso3].year) {
                byCountry[d.iso3] = d;
            }
        });
        return Object.values(byCountry);
    }

    /* ===== Color scales ===== */
    function giniColor(v) {
        if (v == null) return '#e5dfd6';
        if (v < 25) return '#d4edda';
        if (v < 30) return '#a8d5a2';
        if (v < 35) return '#ffeaa7';
        if (v < 40) return '#fdcb6e';
        if (v < 45) return '#f39c12';
        if (v < 50) return '#e17055';
        return '#d63031';
    }

    function foodColor(v) {
        if (v == null) return '#e5dfd6';
        if (v < 10) return '#d4edda';
        if (v < 20) return '#a8d5a2';
        if (v < 30) return '#ffeaa7';
        if (v < 40) return '#fdcb6e';
        if (v < 50) return '#f39c12';
        if (v < 60) return '#e17055';
        return '#d63031';
    }

    /* ===== Create Leaflet map ===== */
    function createMap(containerId) {
        const map = L.map(containerId, {
            center: [20, 0],
            zoom: 2,
            minZoom: 1,
            maxZoom: 6,
            scrollWheelZoom: true,
            worldCopyJump: true
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);
        return map;
    }

    /* ===== Render choropleth ===== */
    function renderChoropleth(tracker, data, colorFn, labelName) {
        if (!state.geoJsonData) return;
        const lookup = {};
        data.forEach(d => { lookup[d.iso3] = d; });

        if (state[tracker].layer) {
            state[tracker].map.removeLayer(state[tracker].layer);
        }

        state[tracker].layer = L.geoJSON(state.geoJsonData, {
            style: feature => {
                const iso = feature.properties.ISO_A3;
                const d = lookup[iso];
                return {
                    fillColor: d ? colorFn(d.value) : '#e5dfd6',
                    weight: 0.5,
                    opacity: 1,
                    color: '#ccc',
                    fillOpacity: 0.8
                };
            },
            onEachFeature: (feature, layer) => {
                const iso = feature.properties.ISO_A3;
                const d = lookup[iso];
                const name = feature.properties.ADMIN || feature.properties.NAME;
                if (d) {
                    layer.bindTooltip(`<strong>${name}</strong><br>${labelName}: ${d.value} (${d.year})`, { sticky: true });
                } else {
                    layer.bindTooltip(`<strong>${name}</strong><br>No data`, { sticky: true });
                }
            }
        }).addTo(state[tracker].map);
    }

    /* ===== Render data table ===== */
    function renderTable(tableId, data, searchId) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = data.map(d =>
            `<tr><td>${d.country}</td><td>${d.value}</td><td>${d.year}</td></tr>`
        ).join('');

        /* Search */
        const searchEl = document.getElementById(searchId);
        if (searchEl) {
            searchEl.oninput = () => {
                const q = searchEl.value.toLowerCase();
                const filtered = data.filter(d => d.country.toLowerCase().includes(q));
                tbody.innerHTML = filtered.map(d =>
                    `<tr><td>${d.country}</td><td>${d.value}</td><td>${d.year}</td></tr>`
                ).join('');
            };
        }

        /* Sort */
        document.querySelectorAll(`#${tableId} th`).forEach(th => {
            th.onclick = () => {
                const col = th.dataset.sort;
                if (state.sortCol === col) { state.sortDir *= -1; } else { state.sortCol = col; state.sortDir = 1; }
                const sorted = [...data].sort((a, b) => {
                    const av = col === 'country' ? a.country : a[col];
                    const bv = col === 'country' ? b.country : b[col];
                    if (typeof av === 'string') return av.localeCompare(bv) * state.sortDir;
                    return (av - bv) * state.sortDir;
                });
                const q = searchEl ? searchEl.value.toLowerCase() : '';
                const filtered = q ? sorted.filter(d => d.country.toLowerCase().includes(q)) : sorted;
                tbody.innerHTML = filtered.map(d =>
                    `<tr><td>${d.country}</td><td>${d.value}</td><td>${d.year}</td></tr>`
                ).join('');
            };
        });
    }

    /* ===== Bar chart ===== */
    function renderBars(containerId, data) {
        const sorted = [...data].sort((a, b) => b.value - a.value);
        const max = sorted[0] ? sorted[0].value : 100;
        const el = document.getElementById(containerId);
        el.innerHTML = sorted.map(d => {
            const pct = Math.max((d.value / max) * 100, 0.5);
            const note = d.notes ? ` (${d.notes})` : '';
            return `<div class="bar-row">
                <span class="bar-label" title="${d.country}">${d.country}</span>
                <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
                <span class="bar-value">${d.value}</span>
            </div>`;
        }).join('');
    }

    /* ===== Initialize ===== */
    async function init() {
        /* Load GeoJSON */
        try {
            const geoRes = await fetch(GEOJSON_URL);
            state.geoJsonData = await geoRes.json();
        } catch (e) {
            console.warn('Could not load GeoJSON:', e);
        }

        /* Gini tracker */
        const giniMapEl = document.getElementById('gini-map');
        if (giniMapEl) {
            state.gini.map = createMap('gini-map');
            try {
                state.gini.raw = await fetchWB('SI.POV.GINI', '2000:2024');
                const year = parseInt(document.getElementById('gini-year').value);
                const data = bestForYear(state.gini.raw, year);
                renderChoropleth('gini', data, giniColor, 'Gini');
                renderTable('gini-table', data.sort((a, b) => b.value - a.value), 'gini-search');
            } catch (e) {
                console.error('Gini fetch error:', e);
            }

            document.getElementById('gini-year').addEventListener('input', function () {
                const y = parseInt(this.value);
                document.getElementById('gini-year-label').textContent = y;
                const data = bestForYear(state.gini.raw, y);
                renderChoropleth('gini', data, giniColor, 'Gini');
                renderTable('gini-table', data.sort((a, b) => b.value - a.value), 'gini-search');
            });
        }

        /* Food insecurity tracker */
        const foodMapEl = document.getElementById('food-map');
        if (foodMapEl) {
            state.food.map = createMap('food-map');
            try {
                state.food.raw = await fetchWB('SN.ITK.MSFI.ZS', '2014:2024');
                const year = parseInt(document.getElementById('food-year').value);
                const data = bestForYear(state.food.raw, year);
                renderChoropleth('food', data, foodColor, 'Food Insecurity (%)');
                renderTable('food-table', data.sort((a, b) => b.value - a.value), 'food-search');
            } catch (e) {
                console.error('Food insecurity fetch error:', e);
            }

            document.getElementById('food-year').addEventListener('input', function () {
                const y = parseInt(this.value);
                document.getElementById('food-year-label').textContent = y;
                const data = bestForYear(state.food.raw, y);
                renderChoropleth('food', data, foodColor, 'Food Insecurity (%)');
                renderTable('food-table', data.sort((a, b) => b.value - a.value), 'food-search');
            });
        }

        /* Homelessness tracker */
        const homelessBarsEl = document.getElementById('homeless-bars');
        if (homelessBarsEl) {
            try {
                const res = await fetch('data/homelessness.json');
                state.homeless.raw = await res.json();
                renderBars('homeless-bars', state.homeless.raw);
                renderTable('homeless-table', [...state.homeless.raw].sort((a, b) => b.value - a.value), 'homeless-search');
            } catch (e) {
                homelessBarsEl.innerHTML = '<p style="color:var(--text-muted);">Could not load homelessness data.</p>';
                console.error('Homelessness data error:', e);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
