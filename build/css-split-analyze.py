#!/usr/bin/env python3
"""Analyze CSS block ownership by route group for the Myfate split.

Parses app/globals.css and app/myfate.css into top-level blocks (splitting
@media bodies into individual rules), extracts class tokens from selectors,
maps classes to route groups via an import-reachability scan of app/**,
then reports per-group byte volumes.
"""
import os, re, sys, json
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")

# ── route groups by entry file ──────────────────────────────────────────
ENTRIES = {
    "app/page.tsx": "public",
    "app/login/page.tsx": "login",
    "app/profile/page.tsx": "account",
    "app/orders/page.tsx": "account",
    "app/invitations/page.tsx": "account",
    "app/subscribe/page.tsx": "account",
    "app/celebrity/[id]/page.tsx": None,  # redirect only
}
# every page under app/home/** is the "home" group
# root layout contributes "root" (no components now)

def list_files():
    out = []
    for dirpath, _dirs, files in os.walk(APP):
        for f in files:
            if f.endswith((".tsx", ".ts")):
                out.append(os.path.join(dirpath, f))
    return out

FILES = list_files()
RELPATHS = {os.path.relpath(f, ROOT): f for f in FILES}

IMPORT_RE = re.compile(r'''(?:import[^'"]*?from\s*|import\s*\(\s*|require\(\s*)["'](\.[^"']+)["']''')

def resolve(spec, from_file):
    base = os.path.dirname(from_file)
    cand = os.path.normpath(os.path.join(base, spec))
    for ext in ("", ".tsx", ".ts", "/index.ts", "/index.tsx"):
        c = cand + ext
        if os.path.isfile(c):
            return c
    return None

def route_group_of(relpath):
    if relpath in ENTRIES:
        return ENTRIES[relpath]
    if relpath.startswith("app/home/"):
        return "home"
    if relpath == "app/layout.tsx":
        return "root"
    return None  # component file: group via reachability

# build edges component -> importer, then propagate groups
importers = defaultdict(set)
for rel, path in RELPATHS.items():
    src = open(path, encoding="utf8").read()
    for m in IMPORT_RE.finditer(src):
        tgt = resolve(m.group(1), path)
        if tgt:
            importers[tgt].add(path)

group_cache = {}
def groups_of(path, seen=None):
    if path in group_cache:
        return group_cache[path]
    if seen is None:
        seen = set()
    if path in seen:
        return set()
    seen = seen | {path}
    rel = os.path.relpath(path, ROOT)
    g = route_group_of(rel)
    if g is not None:
        group_cache[path] = {g}
        return {g}
    acc = set()
    for imp in importers.get(path, ()):
        acc |= groups_of(imp, seen)
    group_cache[path] = acc
    return acc

# class usage per component file
CLASS_RE = re.compile(r'className=["\'{]')

# ── CSS parsing ─────────────────────────────────────────────────────────
def parse_blocks(css):
    """Yield (context, selector, body, start, end). context is the @media/@supports prelude."""
    blocks = []
    i, n = 0, len(css)
    ctx = []
    def find_matching(i):  # i at '{'
        depth = 0
        while i < n:
            if css[i] == '{': depth += 1
            elif css[i] == '}':
                depth -= 1
                if depth == 0: return i
            i += 1
        return n
    while i < n:
        m = re.search(r'[{};]', css[i:])
        if not m:
            break
        j = i + m.start()
        ch = css[j]
        if ch == ';':
            i = j + 1
            continue
        if ch == '}':
            if ctx: ctx.pop()
            i = j + 1
            continue
        # '{': selector is text from last terminator to j
        k = j
        while k > 0 and css[k-1] not in '{};':
            k -= 1
        sel = css[k:j].strip()
        end = find_matching(j)
        body = css[j+1:end]
        prelude = ' and '.join(ctx)
        if sel.startswith('@media') or sel.startswith('@supports'):
            ctx.append(sel)
            i = end + 1
            continue
        if sel.startswith('@keyframes') or sel.startswith('@-webkit-keyframes') or sel.startswith('@property') or sel.startswith('@font-face') or sel.startswith('@layer'):
            blocks.append((prelude, sel, body, j, end+1))
            i = end + 1
            continue
        # normal rule: body may itself be flat declarations; also guard nested @ inside
        if '@' in body and re.search(r'@[a-z-]+', body):
            # nested at-rules inside a style rule: treat whole thing as opaque block -> shared
            blocks.append((prelude, sel, body, j, end+1))
            i = end + 1
            continue
        blocks.append((prelude, sel, body, j, end+1))
        i = end + 1
    return blocks

CLASS_TOKEN_RE = re.compile(r'\.([A-Za-z_][A-Za-z0-9_-]+)')

def css_url_ok(body):
    # url() references local assets only — keep everywhere
    return True

def main():
    css_files = ["app/globals.css", "app/myfate.css"]
    all_blocks = []
    for cf in css_files:
        css = open(os.path.join(ROOT, cf), encoding="utf8").read()
        for prelude, sel, body, start, end in parse_blocks(css):
            all_blocks.append({"file": cf, "prelude": prelude, "sel": sel, "body": body, "start": start, "end": end, "size": end - start + 1 if False else (end - start)})

    # map each class token to component groups
    file_class_cache = {}
    def file_classes(path):
        if path in file_class_cache:
            return file_class_cache[path]
        try:
            src = open(path, encoding="utf8").read()
        except Exception:
            src = ""
        toks = set(CLASS_TOKEN_RE.findall(src))
        # crude: tokens appearing anywhere in the file (className strings, template literals)
        file_class_cache[path] = toks
        return toks

    class_groups = defaultdict(set)
    class_seen = defaultdict(int)
    for rel, path in RELPATHS.items():
        toks = file_classes(path)
        g = groups_of(path)
        for t in toks:
            class_groups[t] |= g
            class_seen[t] += 1

    def block_groups(sel):
        toks = set(CLASS_TOKEN_RE.findall(sel))
        if not toks:
            return {"base"}
        gs = set()
        unknown = False
        for t in toks:
            cg = class_groups.get(t)
            if not cg:
                unknown = True
            else:
                gs |= cg
        if unknown or not gs or len(gs) != 1:
            return {"shared"}
        return gs

    vol = defaultdict(int)
    vol_detail = defaultdict(list)
    for b in all_blocks:
        gs = block_groups(b["sel"])
        key = "+".join(sorted(gs))
        vol[key] += b["size"]
        vol_detail[key].append(b)

    for k in sorted(vol, key=lambda x: -vol[x]):
        print(f"{vol[k]:>9}  {k}")

    # save block map for the split step
    with open("/tmp/css-blocks.json", "w") as f:
        json.dump([{**b, "groups": sorted(block_groups(b["sel"]))} for b in all_blocks], f)
    print(f"\ntotal blocks: {len(all_blocks)}")

if __name__ == "__main__":
    main()
