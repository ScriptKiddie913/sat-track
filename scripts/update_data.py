#!/usr/bin/env python3
"""Build local satellite catalog from open public files (no tracking API)."""
import csv
import json
import pathlib
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)

TLE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
SATCAT_URL = "https://celestrak.org/pub/satcat.csv"


def fetch_text(url: str) -> str:
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read().decode("utf-8", errors="replace")


def parse_tle(text: str):
    lines = [l.rstrip() for l in text.splitlines() if l.strip()]
    i = 0
    out = []
    while i + 2 < len(lines):
        name, l1, l2 = lines[i], lines[i + 1], lines[i + 2]
        i += 3
        if not (l1.startswith("1 ") and l2.startswith("2 ")):
            continue
        norad = int(l1[2:7])
        epoch = l1[18:32].strip()
        inc = float(l2[8:16])
        raan = float(l2[17:25])
        ecc = float(f"0.{l2[26:33].strip()}")
        argp = float(l2[34:42])
        ma = float(l2[43:51])
        mm = float(l2[52:63])
        out.append({
            "name": name.strip(),
            "norad": norad,
            "epoch": epoch,
            "inc": inc,
            "raan": raan,
            "ecc": ecc,
            "argPerigee": argp,
            "meanAnomaly": ma,
            "meanMotion": mm,
        })
    return out


def parse_satcat(text: str):
    rows = csv.DictReader(text.splitlines())
    meta = {}
    for r in rows:
        try:
            norad = int(r.get("NORAD_CAT_ID", "0") or 0)
        except ValueError:
            continue
        if norad <= 0:
            continue
        meta[norad] = {
            "country": r.get("OWNER") or "",
            "type": r.get("OBJECT_TYPE") or "",
        }
    return meta


def orbit_class(mm: float) -> str:
    if mm > 11.25:
        return "LEO"
    if 0.99 <= mm <= 1.01:
        return "GEO"
    if 1.01 < mm <= 11.25:
        return "MEO"
    return "HEO"


def main():
    tle_text = fetch_text(TLE_URL)
    satcat_text = fetch_text(SATCAT_URL)
    sats = parse_tle(tle_text)
    meta = parse_satcat(satcat_text)

    for sat in sats:
        m = meta.get(sat["norad"], {})
        sat["country"] = m.get("country", "")
        sat["type"] = m.get("type", "")
        sat["orbitClass"] = orbit_class(sat["meanMotion"])

    out_file = DATA / "satellites.json"
    out_file.write_text(json.dumps(sats, separators=(",", ":")))
    print(f"Wrote {len(sats)} satellites -> {out_file}")


if __name__ == "__main__":
    main()
