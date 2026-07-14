#!/usr/bin/env python3
import re
from pathlib import Path

html = Path("index.html").read_text(encoding="utf-8")
js = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in Path("js").glob("*.js"))
text = html + "\n" + js
classes = set()
for m in re.finditer(r'class="([^"]+)"', text):
    classes.update(m.group(1).split())
for m in re.finditer(r"class='([^']+)'", text):
    classes.update(m.group(1).split())
for m in re.finditer(r'class=\\"([^\\"]+)\\"', text):
    classes.update(m.group(1).split())

css = Path("css/tailwind.css").read_text(encoding="utf-8") + "\n" + Path("css/styles.css").read_text(encoding="utf-8")


def in_css(cls: str) -> bool:
    if cls in css:
        return True
    esc = (
        cls.replace(":", "\\:")
        .replace("/", "\\/")
        .replace(".", "\\.")
        .replace("[", "\\[")
        .replace("]", "\\]")
        .replace("%", "\\%")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .replace(",", "\\,")
    )
    return esc in css


utils = sorted(
    c
    for c in classes
    if re.search(
        r"^(sm:|md:|lg:|xl:|2xl:|dark:|hover:|focus:|w-|h-|p[xyltrb]?-|m[xyltrb]?-|text-|bg-|border|flex|grid|gap-|rounded|hidden|block|inline|absolute|relative|fixed|inset|z-|max-|min-|object-|overflow|opacity-|transition|duration|leading|tracking|font-|items-|justify-|col-|row-|space-|top-|bottom-|left-|right-|translate|from-|via-|to-|aspect-|shadow|ring-|whitespace|underline|pointer-|select-|cursor-|backdrop|blur|sr-|grow|shrink|basis-|table|list-|appearance|resize|scroll|snap|touch|fill-|stroke-|order-|self-|place-|content-|columns-|break-|box-|float-|clear-|isolate|visible|invisible|static|sticky|antialiased|uppercase|lowercase|capitalize|truncate|line-clamp|decoration-|outline|divide-|prose|container|group|!)",
        c,
    )
    or ":" in c
    or "/" in c
    or "[" in c
)
missing = [c for c in utils if not in_css(c)]
print("utils", len(utils), "missing", len(missing))
for c in missing:
    print(" MISSING", c)
