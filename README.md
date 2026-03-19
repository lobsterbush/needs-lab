# Fundamental Needs Lab

**Authors**: Charles Crabtree (PI), Senior Lecturer, School of Social Sciences, Monash University and K-Club Professor, University College, Korea University.

## Overview

The Fundamental Needs Lab website — a public-facing GitHub Pages site for a research lab focused on deepening our understanding of social attitudes towards individuals enduring deep poverty, particularly those who lack food and shelter. The site features lab information (people, research, publications, advocacy) and interactive global data trackers for food insecurity, homelessness, and Gini coefficients.

## Requirements

- A modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.10+ (only needed for the `update_data.py` homelessness data refresh script)

## Replication Instructions

1. Clone this repository
2. Open `index.html` in a browser, or deploy to GitHub Pages
3. To update bundled homelessness data: `python update_data.py`

## Data Sources

- **Gini Coefficient**: World Bank API (`SI.POV.GINI`)
- **Food Insecurity**: World Bank API / FAO FIES (`SN.ITK.MSFI.ZS`)
- **Homelessness**: OECD Affordable Housing Database (HC3.1), via Our World in Data

## License

Content © Fundamental Needs Lab. Data sourced under open data licenses from the World Bank, FAO, and OECD.
