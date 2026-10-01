#!/usr/bin/env python3
"""Build the self-contained vocabulary page from reviewed vocabulary data."""

import json
from pathlib import Path

root = Path(__file__).resolve().parent
template = (root / "template.html").read_text(encoding="utf-8")
lines = []
for filename in ("vocab_extra.tsv", "vocab_200.tsv"):
    lines += (root / filename).read_text(encoding="utf-8").splitlines() + [""]
groups = []
group = None
term = None

for raw in lines + [""]:
    line = raw.strip()
    if not line:
        if term is not None:
            assert len(term["examples"]) == 4, f"{term['ar']}: expected four examples"
            group["items"].append(term)
            term = None
        continue
    if line.startswith("@"):
        assert term is None
        title, kind = line[1:].split("¦", 1)
        assert kind in ("verb", "noun", "adjective")
        group = {"title": title, "kind": kind, "items": []}
        groups.append(group)
    elif term is None:
        assert group is not None
        ar, es = line.split("¦", 1)
        term = {"ar": ar, "es": es, "examples": []}
    else:
        ar, es = line.split("¦", 1)
        term["examples"].append([ar, es])

assert len(groups) == 30, f"expected 30 extra groups, got {len(groups)}"
assert sum(len(g["items"]) for g in groups) == 280
assert len({t["ar"] for g in groups for t in g["items"]}) == 280

payload = json.dumps(groups, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
assert template.count("/*__EXTRA_DATA__*/") == 1
page = template.replace("/*__EXTRA_DATA__*/", f"groups.push(...{payload});")
page = page.replace("/*__STUDY_CSS__*/", (root / "study.css").read_text())
page = page.replace("/*__STUDY_JS__*/", (root / "study.js").read_text())
(root / "dist" / "index.html").write_text(page, encoding="utf-8")
print(f"Built {sum(len(g['items']) for g in groups)} new words with four examples each.")
