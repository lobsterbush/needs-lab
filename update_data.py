"""Fetch the latest OECD homelessness data and update data/homelessness.json.

This script downloads the homelessness dataset compiled by Our World in Data
(sourced from OECD Affordable Housing Database HC3.1) and converts it to the
JSON format consumed by the site's data tracker.

Usage:
    python update_data.py

Requirements:
    Python 3.10+, pandas, requests (install via: pip install pandas requests)
"""

import json
from pathlib import Path

import pandas as pd
import requests

OWID_CSV_URL = (
    "https://raw.githubusercontent.com/owid/owid-datasets/master/"
    "datasets/Reported%20share%20of%20population%20experiencing%20"
    "homelessness%20-%20OECD/Reported%20share%20of%20population%20"
    "experiencing%20homelessness%20-%20OECD.csv"
)

# Fallback: use the OECD indicator page directly
OWID_GITHUB_URL = (
    "https://raw.githubusercontent.com/owid/etl/master/etl/steps/data/"
    "garden/oecd/2024-11-21/affordable-housing-database/"
)

OUTPUT_PATH = Path(__file__).parent / "data" / "homelessness.json"


def fetch_and_convert() -> list[dict]:
    """Attempt to fetch OWID homelessness CSV and convert to records."""
    try:
        df = pd.read_csv(OWID_CSV_URL)
    except Exception:
        print("Could not fetch OWID CSV. Using existing data/homelessness.json.")
        return []

    # Keep only the most recent observation per country
    df = df.sort_values("Year", ascending=False).drop_duplicates(subset=["Entity"])

    # Determine the value column (name may vary)
    val_cols = [c for c in df.columns if c not in ("Entity", "Year", "Code")]
    if not val_cols:
        print("No value column found in CSV.")
        return []

    val_col = val_cols[0]

    records = []
    for _, row in df.iterrows():
        value = row[val_col]
        if pd.isna(value):
            continue
        # Convert share (0-1) to per-100k if values are small
        if value < 1:
            value = round(value * 100_000, 1)
        else:
            value = round(value, 1)
        records.append({
            "country": row["Entity"],
            "value": value,
            "year": int(row["Year"]),
            "notes": "",
        })

    return records


def main() -> None:
    records = fetch_and_convert()
    if not records:
        print("No new records fetched. Keeping existing file.")
        return

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n"
    )
    print(f"Updated {OUTPUT_PATH} with {len(records)} country records.")


if __name__ == "__main__":
    main()
