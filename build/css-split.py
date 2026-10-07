#!/usr/bin/env python3
"""Split app/globals.css + app/myfate.css into route-level CSS files.

Classification (conservative):
- rules without class selectors -> base (globals.css)
- selector alive iff every class token in it is found (raw substring) in some
  reachable source file, or is composed dynamically via a template prefix
  (is-, mf-skel-, ...); dynamic selectors stay in globals.css
- a block goes to a route group only if every alive selector's classes map to
  exactly that one group; anything else -> globals.css
- blocks whose selectors are all dead (class appears nowhere in sources) are
  dropped; a dropped-block report is printed

Outputs: app/globals.css (base+shared), app/public-home.css, app/home.css,
app/login.css, app/account.css. Run with --dry to only print stats.
"""
import os, re, sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")

ENTRIES = {
    "app/page.tsx": "public",
    "app/login/page.tsx": "login",
    "app/profile/page.tsx": "account",
    "app/orders/page.tsx": "account",
    "app/invitations/page.tsx": "account",
    "app/subscribe/page.tsx": "account",
    "app/celebrity/[id]/page.tsx": None,
}
CSS_FILES = ["app/globals.css"]
OUTPUTS = {
    "public": "public/route-css/public-home.css",
    "login": "public/route-css/login.css",
    "account": "public/route-css/account.css",
    "home": "public/route-css/home.css",
}
# template-literal class prefixes seen in app sources; classes under these are
# composed at runtime, keep them in globals.css (unknown group)
DYNAMIC_PREFIXES = ["is-", "mf-dual-period-", "mf-dual-rhythm-group-", "mf-report-section-", "mf-skel-", "myfate-login-", "profile-"]

# ── source reachability ─────────────────────────────────────────────────
files = []
for dirpath, _d, fs in os.walk(APP):
    for f in fs:
        if f.endswith((".tsx", ".ts")):
            files.append(os.path.join(dirpath, f))
RELPATHS = {os.path.relpath(f, ROOT): f for f in files}

IMPORT_RE = re.compile(r'''(?:import[^'"]*?from\s*|import\s*\(\s*)["'](\.[^"']+)["']''')

def resolve(spec, from_file):
    cand = os.path.normpath(os.path.join(os.path.dirname(from_file), spec))
    for ext in ("", ".tsx", ".ts", "/index.ts", "/index.tsx"):
        if os.path.isfile(cand + ext):
            return cand + ext
    return None

def route_group_of(rel):
    if rel in ENTRIES:
        return ENTRIES[rel]
    if rel.startswith("app/home/"):
        return "home"
    if rel == "app/layout.tsx":
        return "root"
    return None

importers = defaultdict(set)
for rel, path in RELPATHS.items():
    src = open(path, encoding="utf8").read()
    for m in IMPORT_RE.finditer(src):
        t = resolve(m.group(1), path)
        if t:
            importers[t].add(path)

_gc = {}
def groups_of(path):
    if path in _gc:
        return _gc[path]
    rel = os.path.relpath(path, ROOT)
    g = route_group_of(rel)
    if g is not None:
        _gc[path] = {g}
        return {g}
    acc = set()
    for imp in importers.get(path, ()):
        acc |= groups_of(imp)
    _gc[path] = acc
    return acc

FILE_TEXT = {path: open(path, encoding="utf8").read() for path in RELPATHS.values()}
FILE_GROUPS = {path: groups_of(path) for path in RELPATHS.values()}

# Repo-wide raw text index (excluding build output and CSS files themselves):
# a class that exists only in dead/unrouted files must still be kept (shared),
# only classes found nowhere outside CSS are safe to drop.
_repo_texts = []
for dirpath, dirs, fs in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in (".next", "dist", "node_modules", ".wrangler", ".git", "build", ".zcode", ".agents")]
    for f in fs:
        p = os.path.join(dirpath, f)
        if f.endswith((".ts", ".tsx", ".js", ".mjs", ".html", ".md", ".json", ".svg")):
            try:
                _repo_texts.append(open(p, encoding="utf8", errors="ignore").read())
            except Exception:
                pass

CLASS_TOKEN_RE = re.compile(r'\.([A-Za-z_][A-Za-z0-9_-]+)')

def _contains_token(text, tok):
    # word-boundary match that also refuses hyphen neighbours, so ".active"
    # doesn't match inside "is-active" nor ".report-views" inside "star-report-views"
    return re.search(rf'(?<![\w-]){re.escape(tok)}(?![\w-])', text) is not None

def token_groups(tok):
    """Groups of reachable files whose raw text contains tok.
    (empty, True) = exists in repo but no live route -> keep as shared;
    (empty, False) = not referenced anywhere -> dead."""
    gs = set()
    in_repo = False
    for path, text in FILE_TEXT.items():
        if _contains_token(text, tok):
            in_repo = True
            gs |= FILE_GROUPS[path]
    if gs:
        return gs, True
    if in_repo:
        return {"shared"}, True
    for text in _repo_texts:
        if _contains_token(text, tok):
            return {"shared"}, True
    return set(), False

def is_dynamic(tok):
    return any(tok.startswith(p) and len(tok) > len(p) for p in DYNAMIC_PREFIXES)

# ── CSS parsing ─────────────────────────────────────────────────────────
def parse_css(css):
    """Return ordered items: ('stmt', full, None) or ('block', full, (selectors, ctx))"""
    items = []
    # length-preserving mask so braces/semicolons inside comments or strings
    # never confuse the scanner; slices always come from the original text
    scan = re.sub(r'/\*.*?\*/', lambda m: " " * len(m.group(0)), css, flags=re.S)
    scan = re.sub(r'"[^"\n]*"|\'[^\'\n]*\'', lambda m: " " * len(m.group(0)), scan)
    i, n = 0, len(css)
    ctx = []
    def matching(j):
        depth = 0
        while j < n:
            if scan[j] == '{':
                depth += 1
            elif scan[j] == '}':
                depth -= 1
                if depth == 0:
                    return j
            j += 1
        return n
    buf = 0
    while i < n:
        m = re.search(r'[{};]', scan[i:])
        if not m:
            break
        j = i + m.start()
        ch = css[j]
        if ch == ';':
            stmt = css[buf:j+1]
            if stmt.strip():
                items.append(("stmt", stmt, None))
            i = j + 1
            buf = i
            continue
        if ch == '}':
            if ctx:
                ctx.pop()
            i = j + 1
            buf = i
            continue
        head = css[buf:j].strip()
        end = matching(j)
        if head.startswith("@media") or head.startswith("@supports"):
            ctx.append(head)
            i = j + 1
            buf = i
            continue
        full = css[buf:end+1]
        # comments inside the head must not take part in selector splitting
        head_clean = re.sub(r'/\*.*?\*/', ' ', head, flags=re.S).strip()
        if head_clean.startswith("@"):
            items.append(("block", full, ([], tuple(ctx))))
        else:
            sels = split_selectors(head_clean)
            items.append(("block", full, (sels, tuple(ctx))))
        i = end + 1
        buf = i
    tail = css[buf:]
    if tail.strip():
        items.append(("stmt", tail, None))
    return items

def split_selectors(head):
    return [s.strip() for s in head.split(",")]

_token_cache = {}
def tok_groups_cached(tok):
    if tok not in _token_cache:
        _token_cache[tok] = token_groups(tok)
    return _token_cache[tok]

def selector_groups(sel):
    """Return (alive, groups, dynamic) for one selector."""
    toks = set(CLASS_TOKEN_RE.findall(sel))
    if not toks:
        return True, {"base"}, False
    gs = set()
    dynamic = False
    for t in toks:
        if is_dynamic(t):
            dynamic = True
            continue
        tg, exists = tok_groups_cached(t)
        if not exists:
            return False, set(), False  # dead selector
        gs |= tg
    if dynamic:
        return True, {"shared"}, True
    return True, gs, False

def classify(head, sels, full):
    """Classify one block into [(group, rule_text)].
    Selector lists whose selectors land in different groups are split into
    per-selector rules so each route file keeps the original cascade order.
    Returns [] when the whole block is dead."""
    body_idx = full.index("{")
    body = full[body_idx:]
    if len(sels) <= 1:
        alive, gs, _dyn = selector_groups(head.strip())
        if not alive:
            return []
        if gs == {"base"} or len(gs) == 1:
            return [(next(iter(gs)), full)]
        return [("shared", full)]
    per = []
    for sel in sels:
        alive, gs, _dyn = selector_groups(sel)
        if not alive:
            continue
        if gs == {"base"}:
            per.append(("base", sel))
        elif len(gs) == 1:
            per.append((next(iter(gs)), sel))
        else:
            per.append(("shared", sel))
    if not per:
        return []
    groups = {g for g, _s in per}
    if len(groups) == 1:
        return [(next(iter(groups)), full)]
    return [(g, sel + " " + body) for g, sel in per]

def main():
    dry = "--dry" in sys.argv
    buckets = defaultdict(list)   # group -> [(order, source_file, full, ctx)]
    dropped = []
    order = 0
    stats = defaultdict(int)
    for cf in CSS_FILES:
        css = open(os.path.join(ROOT, cf), encoding="utf8").read()
        for kind, full, extra in parse_css(css):
            if kind == "stmt":
                buckets["base"].append((order, cf, full, None))
                stats["base"] += len(full)
            else:
                sels, ctx = extra
                head = full.split("{", 1)[0]
                for g, rule in classify(head, sels, full):
                    buckets[g].append((order, cf, rule, ctx))
                    stats[g] += len(rule)
            order += 1

    for g in ["base", "shared", "public", "login", "account", "home", "dropped"]:
        print(f"{stats[g]:>9}  {g}")
    if dropped:
        print(f"\ndropped {len(dropped)} blocks:")
        for cf, head in dropped[:40]:
            print(f"  [{cf}] {head}")
    if dry:
        return

    def emit(group):
        out = []
        open_media = []
        for _o, _cf, full, ctx in sorted(buckets.get(group, []), key=lambda x: x[0]):
            ctx = ctx or ()
            # close/reopen media wrappers when context changes
            k = 0
            while k < len(open_media) and k < len(ctx) and open_media[k] == ctx[k]:
                k += 1
            while len(open_media) > k:
                out.append("}\n")
                open_media.pop()
            while len(open_media) < len(ctx):
                out.append(ctx[len(open_media)] + " {\n")
                open_media.append(ctx[len(open_media)])
            out.append(full.rstrip() + "\n")
            if ctx:
                out.append("}\n")
                open_media.pop()
        while open_media:
            out.append("}\n")
            open_media.pop()
        return "".join(out)

    gout = ["/* 全局基础与跨路由共享样式:reset/tokens/元素基础 + 被多个路由使用的块(保守归类)。",
            "   路由专属样式已拆分至 public-home.css / home.css / login.css / account.css。 */",
            emit("base"), emit("shared")]
    open(os.path.join(ROOT, "app/globals.css"), "w", encoding="utf8").write("\n".join(gout))

    headers = {
        "public": "/* 公开首页专属样式(仅首页渲染树使用;由 app/page.tsx 的 <link> 按需加载) */",
        "home": "/* 工作台(/home/*)专属样式 */",
        "login": "/* 登录页专属样式 */",
        "account": "/* 账户页(/profile /orders /invitations)专属样式 */",
    }
    for g, path in OUTPUTS.items():
        body = emit(g)
        if body.strip():
            open(os.path.join(ROOT, path), "w", encoding="utf8").write(headers[g] + "\n" + body)
        elif os.path.exists(os.path.join(ROOT, path)):
            os.remove(os.path.join(ROOT, path))
    print("written globals +", ", ".join(OUTPUTS.values()))

if __name__ == "__main__":
    main()
