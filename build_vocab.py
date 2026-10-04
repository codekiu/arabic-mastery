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

existing_titles = {(g["title"], g["kind"]) for g in groups}
additional = []
next_number = 301
for raw in (root / "vocab_additional.tsv").read_text(encoding="utf-8").splitlines():
    if not raw.strip():
        continue
    if raw.startswith("@"):
        title, kind = raw[1:].split("¦")
        assert (title, kind) in existing_titles, f"unknown category: {title}"
        additional.append({"title": title, "kind": kind, "items": []})
    else:
        fields = raw.split("¦")
        assert len(fields) == 10 and all(fields), f"invalid additional row: {raw}"
        assert additional, "additional word without category"
        ar, es, *examples = fields
        additional[-1]["items"].append({
            "ar": ar, "es": es, "number": next_number,
            "examples": [[examples[i], examples[i + 1]] for i in range(0, 8, 2)],
        })
        next_number += 1
assert next_number == 501, f"expected 200 additional words, got {next_number - 301}"
all_ar = [t["ar"] for g in groups for t in g["items"]] + [t["ar"] for g in additional for t in g["items"]]
assert len(set(all_ar)) == 480, "duplicate headwords in vocabulary files"

payload = json.dumps(groups, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
assert template.count("/*__EXTRA_DATA__*/") == 1
page = template.replace("/*__EXTRA_DATA__*/", f"groups.push(...{payload});")
additional_payload = json.dumps(additional, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
page = page.replace("/*__ADDITIONAL_DATA__*/", f"for (const addition of {additional_payload}) {{ groups.find(group => group.title === addition.title && group.kind === addition.kind).items.push(...addition.items); }}")
page = page.replace("/*__STUDY_CSS__*/", (root / "study.css").read_text())
page = page.replace("/*__STUDY_JS__*/", (root / "study.js").read_text())
(root / "dist" / "index.html").write_text(page, encoding="utf-8")
print("Built 500 words with four examples each, including 200 additional words.")
