#!/usr/bin/env python3
"""Merge raw-*.json research files into a single normalized hackathons.json."""
import json, os, re, sys

DATA = os.path.join(os.path.dirname(__file__), "..", "src", "data")
RAW = ["raw-intl-student.json", "raw-intl-vendor.json", "raw-web3-vertical.json", "raw-cn.json"]

CATEGORIES = {"student", "platform", "vendor", "startup", "gov", "web3", "vertical"}
FORMATS = {"online", "hybrid", "onsite"}
FREQS = {"annual", "biannual", "quarterly", "monthly", "oneoff"}
REGIONS = {"intl", "cn"}


def norm(v, allowed, fallback):
    if isinstance(v, str) and v in allowed:
        return v
    return fallback


def clean(item, src):
    it = dict(item)
    it.setdefault("id", re.sub(r"[^a-z0-9]+", "-", str(item.get("name", "x")).lower()).strip("-"))
    it["source_file"] = src
    it["name"] = it.get("name") or it["id"]
    it["nameCn"] = it.get("nameCn") or it["name"]
    it["org"] = it.get("org") or "—"
    it["region"] = norm(it.get("region"), REGIONS, "intl")
    it["category"] = norm(it.get("category"), CATEGORIES, "vendor")
    it["format"] = norm(it.get("format"), FORMATS, "online")
    it["frequency"] = norm(it.get("frequency"), FREQS, "oneoff")
    it["cnFriendly"] = norm(it.get("cnFriendly"), {"yes", "no", "unknown"}, "unknown")
    it["_confidence"] = norm(it.get("_confidence"), {"high", "medium", "low"}, "low")

    for f in ("theme", "description", "requirements", "prize", "location", "url"):
        it[f] = it.get(f) or "—"

    months = it.get("typicalMonths") or []
    it["typicalMonths"] = sorted({int(m) for m in months if isinstance(m, int) and 1 <= m <= 12})

    eds = it.get("editions") or []
    out = []
    for e in eds:
        if not isinstance(e, dict):
            continue
        out.append({
            "year": int(e["year"]) if isinstance(e.get("year"), int) else None,
            "dates": e.get("dates") or "",
            "url": e.get("url") or it["url"],
            "note": e.get("note") or "",
        })
    out = [e for e in out if e["year"]]
    out.sort(key=lambda e: e["year"])
    it["editions"] = out
    it["years"] = sorted({e["year"] for e in out})

    wins = it.get("winners") or []
    it["winners"] = [w for w in wins if isinstance(w, dict) and w.get("project")]
    it["soloAllowed"] = bool(it.get("soloAllowed"))
    return it


def ingest_winners(merged):
    """apply optional winners-add.json (id -> [winner]) with dedupe by (year, project)"""
    p = os.path.join(DATA, "winners-add.json")
    if not os.path.exists(p):
        return
    with open(p, encoding="utf-8") as fh:
        add = json.load(fh)
    touched = 0
    for item in merged:
        extra = add.get(item["id"]) or []
        if not extra:
            continue
        seen = {(w["year"], w["project"]) for w in item["winners"] if w.get("year") and w.get("project")}
        for w in extra:
            key = (w.get("year"), w.get("project"))
            if key in seen:
                continue
            item["winners"].append(
                {
                    "year": w.get("year"),
                    "project": w.get("project") or "—",
                    "team": w.get("team") or None,
                    "what": w.get("what") or "",
                    "why": w.get("why") or "",
                    "url": w.get("url") or None,
                }
            )
            seen.add(key)
            touched += 1
    print(f"ingested winners-add.json: +{touched} winner records")


def main():
    merged, seen = [], {}
    for f in RAW:
        p = os.path.join(DATA, f)
        if not os.path.exists(p):
            print(f"!! missing {f}", file=sys.stderr)
            continue
        with open(p, encoding="utf-8") as fh:
            raw = json.load(fh)
        for item in raw:
            it = clean(item, f)
            if it["id"] in seen:
                # merge editions/winners of duplicates
                prev = seen[it["id"]]
                prev["editions"] = sorted({json.dumps(e, sort_keys=True) for e in prev["editions"] + it["editions"]})
                prev["editions"] = [json.loads(x) for x in prev["editions"]]
                prev["years"] = sorted(set(prev["years"]) | set(it["years"]))
                prev["winners"] += it["winners"]
                continue
            seen[it["id"]] = it
            merged.append(it)

    merged.sort(key=lambda x: (x["region"] != "cn", x["category"], x["name"].lower()))
    ingest_winners(merged)
    out = os.path.join(DATA, "hackathons.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(merged, fh, ensure_ascii=False, indent=1)

    from collections import Counter
    print(f"wrote {len(merged)} hackathons -> {out}")
    print(" by region  :", dict(Counter(x["region"] for x in merged)))
    print(" by category:", dict(Counter(x["category"] for x in merged)))
    print(" by format  :", dict(Counter(x["format"] for x in merged)))
    print(" confidence :", dict(Counter(x["_confidence"] for x in merged)))
    print(" w/ winners :", sum(1 for x in merged if x["winners"]))
    print(" annual     :", sum(1 for x in merged if x["frequency"] == "annual"))


if __name__ == "__main__":
    main()
