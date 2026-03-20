/* Fundamental Needs Lab — Data Tracker Engine */
(function () {
    'use strict';

    /* Use a lightweight 110m Natural Earth GeoJSON (~800KB vs 24MB) */
    const GEOJSON_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
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

            /* Invalidate map sizes on tab switch — multiple delays for reliability */
            [50, 150, 300, 500].forEach(delay => {
                setTimeout(() => {
                    if (tab.dataset.tab === 'gini' && state.gini.map) state.gini.map.invalidateSize();
                    if (tab.dataset.tab === 'food' && state.food.map) state.food.map.invalidateSize();
                }, delay);
            });
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
                /* Skip aggregates (regions, world, etc.) — they have no ISO3 code or have special codes */
                if (d.value === null || !d.countryiso3code || d.countryiso3code.length !== 3) return;
                if (d.country.id && d.country.id.length !== 2) return; /* WB aggregates have 3+ char country IDs */
                all.push({
                    country: d.country.value,
                    iso3: d.countryiso3code,
                    value: Math.round(d.value * 10) / 10,
                    year: parseInt(d.date)
                });
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

    /* ===== Color scales (sequential, site-palette aligned) ===== */
    const GINI_SCALE = [
        { max: 25, color: '#d4e6f1', label: '< 25' },
        { max: 30, color: '#a9cce3', label: '25–30' },
        { max: 35, color: '#7fb3d3', label: '30–35' },
        { max: 40, color: '#d4973b', label: '35–40' },
        { max: 45, color: '#c17a28', label: '40–45' },
        { max: 50, color: '#a35d1f', label: '45–50' },
        { max: Infinity, color: '#7a3a10', label: '50+' }
    ];
    function giniColor(v) {
        if (v == null) return '#e8e4de';
        for (const s of GINI_SCALE) if (v < s.max) return s.color;
        return GINI_SCALE[GINI_SCALE.length - 1].color;
    }

    const FOOD_SCALE = [
        { max: 10, color: '#d4e6f1', label: '< 10%' },
        { max: 20, color: '#a9cce3', label: '10–20%' },
        { max: 30, color: '#7fb3d3', label: '20–30%' },
        { max: 40, color: '#d4973b', label: '30–40%' },
        { max: 50, color: '#c17a28', label: '40–50%' },
        { max: 60, color: '#a35d1f', label: '50–60%' },
        { max: Infinity, color: '#7a3a10', label: '60%+' }
    ];
    function foodColor(v) {
        if (v == null) return '#e8e4de';
        for (const s of FOOD_SCALE) if (v < s.max) return s.color;
        return FOOD_SCALE[FOOD_SCALE.length - 1].color;
    }

    /* ===== Legend ===== */
    function addLegend(map, scale, title) {
        const legend = L.control({ position: 'bottomleft' });
        legend.onAdd = function () {
            const div = L.DomUtil.create('div', 'map-legend');
            let html = `<div style="font-family:var(--font-mono,'SF Mono',monospace);font-size:0.55rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#5a5a6a;margin-bottom:6px;">${title}</div>`;
            for (const s of scale) {
                html += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"><span style="width:14px;height:10px;border-radius:2px;background:${s.color};display:inline-block;"></span><span style="font-size:0.6rem;color:#5a5a6a;">${s.label}</span></div>`;
            }
            html += `<div style="display:flex;align-items:center;gap:6px;margin-top:2px;"><span style="width:14px;height:10px;border-radius:2px;background:#e8e4de;display:inline-block;"></span><span style="font-size:0.6rem;color:#7a7a8e;">No data</span></div>`;
            div.innerHTML = html;
            return div;
        };
        legend.addTo(map);
    }

    /* ===== Create Leaflet map ===== */
    function createMap(containerId) {
        const southWest = L.latLng(-60, -180);
        const northEast = L.latLng(85, 180);
        const bounds = L.latLngBounds(southWest, northEast);

        const el = document.getElementById(containerId);
        if (el) el.innerHTML = '';

        const map = L.map(containerId, {
            center: [20, 15],
            zoom: 2,
            minZoom: 2,
            maxZoom: 6,
            scrollWheelZoom: false,
            worldCopyJump: false,
            maxBounds: bounds,
            maxBoundsViscosity: 1.0,
            zoomControl: true,
            attributionControl: false /* No tile layer = no attribution needed */
        });

        /* No tile layer — plain background. The choropleth IS the map.
           This eliminates the stripe artifacts from tile/GeoJSON misalignment. */

        requestAnimationFrame(() => map.invalidateSize());
        [100, 300, 600, 1000].forEach(d => setTimeout(() => map.invalidateSize(), d));

        return map;
    }

    /* ===== ISO 3166-1 numeric → alpha-3 mapping for world-atlas TopoJSON ===== */
    const N2A={'004':'AFG','008':'ALB','012':'DZA','016':'ASM','020':'AND','024':'AGO','028':'ATG','031':'AZE','032':'ARG','036':'AUS','040':'AUT','044':'BHS','048':'BHR','050':'BGD','051':'ARM','052':'BRB','056':'BEL','060':'BMU','064':'BTN','068':'BOL','070':'BIH','072':'BWA','076':'BRA','084':'BLZ','090':'SLB','092':'VGB','096':'BRN','100':'BGR','104':'MMR','108':'BDI','112':'BLR','116':'KHM','120':'CMR','124':'CAN','132':'CPV','140':'CAF','144':'LKA','148':'TCD','152':'CHL','156':'CHN','158':'TWN','170':'COL','174':'COM','178':'COG','180':'COD','184':'COK','188':'CRI','191':'HRV','192':'CUB','196':'CYP','203':'CZE','204':'BEN','208':'DNK','212':'DMA','214':'DOM','218':'ECU','222':'SLV','226':'GNQ','231':'ETH','232':'ERI','233':'EST','242':'FJI','246':'FIN','250':'FRA','258':'PYF','262':'DJI','266':'GAB','268':'GEO','270':'GMB','275':'PSE','276':'DEU','288':'GHA','296':'KIR','300':'GRC','304':'GRL','308':'GRD','316':'GUM','320':'GTM','324':'GIN','328':'GUY','332':'HTI','340':'HND','344':'HKG','348':'HUN','352':'ISL','356':'IND','360':'IDN','364':'IRN','368':'IRQ','372':'IRL','376':'ISR','380':'ITA','384':'CIV','388':'JAM','392':'JPN','398':'KAZ','400':'JOR','404':'KEN','408':'PRK','410':'KOR','414':'KWT','417':'KGZ','418':'LAO','422':'LBN','426':'LSO','428':'LVA','430':'LBR','434':'LBY','438':'LIE','440':'LTU','442':'LUX','446':'MAC','450':'MDG','454':'MWI','458':'MYS','462':'MDV','466':'MLI','470':'MLT','474':'MTQ','478':'MRT','480':'MUS','484':'MEX','492':'MCO','496':'MNG','498':'MDA','499':'MNE','504':'MAR','508':'MOZ','512':'OMN','516':'NAM','520':'NRU','524':'NPL','528':'NLD','540':'NCL','548':'VUT','554':'NZL','558':'NIC','562':'NER','566':'NGA','570':'NIU','578':'NOR','583':'FSM','584':'MHL','585':'PLW','586':'PAK','591':'PAN','598':'PNG','600':'PRY','604':'PER','608':'PHL','616':'POL','620':'PRT','630':'PRI','634':'QAT','642':'ROU','643':'RUS','646':'RWA','659':'KNA','662':'LCA','670':'VCT','674':'SMR','678':'STP','682':'SAU','686':'SEN','688':'SRB','690':'SYC','694':'SLE','702':'SGP','703':'SVK','704':'VNM','705':'SVN','706':'SOM','710':'ZAF','716':'ZWE','720':'YEM','724':'ESP','728':'SSD','729':'SDN','732':'ESH','740':'SUR','748':'SWZ','752':'SWE','756':'CHE','760':'SYR','762':'TJK','764':'THA','768':'TGO','776':'TON','780':'TTO','784':'ARE','788':'TUN','792':'TUR','795':'TKM','798':'TUV','800':'UGA','804':'UKR','807':'MKD','818':'EGY','826':'GBR','834':'TZA','840':'USA','854':'BFA','858':'URY','860':'UZB','862':'VEN','882':'WSM','887':'YEM','894':'ZMB','-99':'CYN','900':'XKX'};

    /* ===== Render choropleth ===== */
    function renderChoropleth(tracker, data, colorFn, labelName) {
        if (!state.geoJsonData) return;
        const lookup = {};
        data.forEach(d => { lookup[d.iso3] = d; });

        if (state[tracker].layer) {
            state[tracker].map.removeLayer(state[tracker].layer);
        }

        /* Filter out non-country features (bounding boxes, antimeridian lines, etc.) */
        const filteredGeo = {
            type: 'FeatureCollection',
            features: state.geoJsonData.features.filter(f => {
                /* Must have a valid numeric or mapped ID */
                const id = f.id || (f.properties && f.properties.ISO_A3);
                if (!id) return false;
                /* Skip features with ID '-99' (unmapped/disputed) unless they map to something */
                if (id === '-99' && !N2A['-99']) return false;
                /* Skip Antarctica (ATA / 010) */
                if (id === '010' || id === 'ATA') return false;
                /* Skip any feature that spans more than 160° longitude (wrapper/antimeridian artifact) */
                if (f.bbox) {
                    if (Math.abs(f.bbox[2] - f.bbox[0]) > 160) return false;
                }
                /* Also check geometry coordinates directly */
                try {
                    const coords = f.geometry.coordinates.flat(3);
                    let minLon = Infinity, maxLon = -Infinity;
                    for (let i = 0; i < coords.length; i += 2) {
                        if (coords[i] < minLon) minLon = coords[i];
                        if (coords[i] > maxLon) maxLon = coords[i];
                    }
                    if (maxLon - minLon > 300) return false; /* Wraps around the world */
                } catch(e) {}
                return true;
            })
        };

        state[tracker].layer = L.geoJSON(filteredGeo, {
            style: feature => {
                const iso = feature.properties.ISO_A3 || N2A[feature.id] || feature.id;
                const d = lookup[iso];
                return {
                    fillColor: d ? colorFn(d.value) : '#e8e4de',
                    weight: 0.8,
                    opacity: 1,
                    color: '#fff',
                    fillOpacity: 0.9
                };
            },
            onEachFeature: (feature, layer) => {
                const iso = feature.properties.ISO_A3 || N2A[feature.id] || feature.id;
                const d = lookup[iso];
                const name = feature.properties.ADMIN || feature.properties.name || feature.properties.NAME || iso;
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

    /* ===== Show loading/error in map container ===== */
    function showMapStatus(containerId, msg) {
        const el = document.getElementById(containerId);
        if (el && !el._leaflet_id) {
            el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.9rem;">${msg}</div>`;
        }
    }

    /* ===== Initialize ===== */
    async function init() {
        /* Show loading states immediately */
        showMapStatus('gini-map', 'Loading map data…');
        showMapStatus('food-map', 'Loading map data…');

        /* Ensure initial map gets sized correctly after DOM paints */
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (state.gini.map) state.gini.map.invalidateSize();
                if (state.food.map) state.food.map.invalidateSize();
            }, 200);
        });

        /* Load TopoJSON and convert to GeoJSON */
        try {
            const geoRes = await fetch(GEOJSON_URL);
            const topo = await geoRes.json();
            /* world-atlas@2 uses TopoJSON; convert with topojson-client inline */
            if (topo.type === 'Topology' && window.topojson) {
                const objKey = Object.keys(topo.objects)[0];
                state.geoJsonData = topojson.feature(topo, topo.objects[objKey]);
            } else if (topo.type === 'FeatureCollection') {
                state.geoJsonData = topo;
            } else if (topo.type === 'Topology') {
                /* topojson-client not loaded yet — load it */
                await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js');
                const objKey = Object.keys(topo.objects)[0];
                state.geoJsonData = topojson.feature(topo, topo.objects[objKey]);
            }
        } catch (e) {
            console.warn('Could not load GeoJSON:', e);
        }

        /* Gini tracker */
        const giniMapEl = document.getElementById('gini-map');
        if (giniMapEl) {
            state.gini.map = createMap('gini-map');
            addLegend(state.gini.map, GINI_SCALE, 'Gini Index');
            try {
                state.gini.raw = await fetchWB('SI.POV.GINI', '2000:2024');
                const year = parseInt(document.getElementById('gini-year').value);
                const data = bestForYear(state.gini.raw, year);
                renderChoropleth('gini', data, giniColor, 'Gini');
                renderTable('gini-table', data.sort((a, b) => b.value - a.value), 'gini-search');
            } catch (e) {
                showMapStatus('gini-map', 'Could not load Gini data. Try refreshing.');
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
            addLegend(state.food.map, FOOD_SCALE, 'Food Insecurity');
            try {
                state.food.raw = await fetchWB('SN.ITK.MSFI.ZS', '2014:2024');
                const year = parseInt(document.getElementById('food-year').value);
                const data = bestForYear(state.food.raw, year);
                renderChoropleth('food', data, foodColor, 'Food Insecurity (%)');
                renderTable('food-table', data.sort((a, b) => b.value - a.value), 'food-search');
            } catch (e) {
                showMapStatus('food-map', 'Could not load food insecurity data. Try refreshing.');
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
                const homelessData = await res.json();
                state.homeless.raw = homelessData.oecd_per_100k || [];
                state.homeless.global = homelessData.global_estimates || [];
                /* Render OECD data (bar chart + table) */
                renderBars('homeless-bars', state.homeless.raw);
                renderTable('homeless-table', [...state.homeless.raw].sort((a, b) => b.value - a.value), 'homeless-search');
                /* Render global estimates table */
                const globalEl = document.getElementById('global-homeless-bars');
                if (globalEl && state.homeless.global.length) {
                    const globalForBars = state.homeless.global.map(d => ({
                        country: d.country,
                        value: d.per_10k,
                        year: d.year
                    }));
                    renderBars('global-homeless-bars', globalForBars);
                    const globalForTable = state.homeless.global.map(d => ({
                        country: d.country,
                        value: (d.homeless_population / 1000000).toFixed(1) + 'M',
                        year: d.year
                    }));
                    renderTable('global-homeless-table', state.homeless.global.map(d => ({
                        country: d.country,
                        value: d.per_10k,
                        year: d.year
                    })).sort((a, b) => b.value - a.value), 'global-homeless-search');
                }
            } catch (e) {
                homelessBarsEl.innerHTML = '<p style="color:var(--warm-gray-light);">Could not load homelessness data.</p>';
                console.error('Homelessness data error:', e);
            }
        }
    }

    /* ===== Load external script dynamically ===== */
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
