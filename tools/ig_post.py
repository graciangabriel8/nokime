#!/usr/bin/env python3
"""Posts what social/posts.json queues, at the time it queues it. Run by .github/workflows/instagram.yml (stdlib only).

    python3 tools/ig_post.py                  # every entry due within [now - 3 h, now + 5 h 30]: wait for its minute, post it
    python3 tools/ig_post.py --id <id>        # one entry, at once, whatever its time (a manual run)
    python3 tools/ig_post.py --dry-run        # validation, selection and the live media check; nothing that needs a token
    python3 tools/ig_post.py --dry-run --now 2026-10-15T09:00:00+02:00   # the same with a faked clock

GitHub starts scheduled runs hours late, so a run is started early and holds: it sleeps until each entry's "at" (never
more than 5 h 30 in all: GitHub kills a job at 6 h whatever the workflow says, and the last 30 min are for posting).
A scheduled run re-reads social/posts.json from main's tip before each entry and after each wait, and posts an entry
only if it is still there unchanged; entries added while it holds are picked up. Per entry, in order: credentials for
its account (IG_USER_ID_<ACC> and IG_TOKEN_<ACC>, ACC = NOKIME, JOBS or MANAGER; missing = that entry fails), a check
that the keys belong to the entry's account, the duplicate guard (the account's latest 50 posts: one with the same
caption means it is already up), the wait, the live media check (nokime.fr serves each file with the committed bytes
and content type), the guard again, then the Graph API. A scheduled run also fails for an entry whose time passed
(up to 7 days back) beyond any start's reach and which is not on its account.
Exit 1 if any entry failed or was missed, or the queue is invalid; an entry that is already up is not a failure.
The token travels in a POST body (a GET carries it in the query string), and no URL or token is ever printed.
"""
import argparse, datetime, hashlib, http.client, json, os, pathlib, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request, zoneinfo

root = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://nokime.fr/"
API = "https://graph.instagram.com/v23.0/"
ACCOUNTS = {"nokime.manager": "MANAGER", "nokime.jobs": "JOBS", "nokime.fr": "NOKIME"}   # account -> secret suffix
PARIS = zoneinfo.ZoneInfo("Europe/Paris")
BEFORE, AFTER, MAX_WAIT = 3 * 3600, 19800, 19800   # seconds: how late a run may still post, how far ahead it may wait (5 h 30)
TOO_LATE = 340 * 60   # seconds into a run after which nothing is published: GitHub kills a job at 360 min
SETTLE = 120       # seconds held after a post (or an attempt), so the next queued run's duplicate guard sees it in the account's list
MISSED = 7 * 86400  # seconds back a scheduled run looks for entries no start reached
UA = "nokime-ig-post"
KEYS = {"id", "account", "at", "type", "media", "cover", "caption"}
ID = re.compile(r"[a-z0-9][a-z0-9._-]*")
PATH = re.compile(r"social/(?:[A-Za-z0-9_-][A-Za-z0-9._-]*/)*[A-Za-z0-9_-][A-Za-z0-9._-]*")
CI = os.environ.get("GITHUB_ACTIONS") == "true"


# ---- the queue (check.py runs the same rules) ------------------------------------------------------------------

class DiskTree:   # the files of a checkout
    def __init__(self, base): self.base = base
    def read(self, rel): return (self.base / rel).read_bytes()

class GitTree:   # the files of a commit (a file only: a directory is not one)
    def __init__(self, ref): self.ref = ref
    def read(self, rel):
        r = subprocess.run(["git", "-C", str(root), "cat-file", "blob", "%s:%s" % (self.ref, rel)], capture_output=True, timeout=60)
        if r.returncode: raise OSError("%s is not a file in %s" % (rel, self.ref))
        return r.stdout

def jpeg_size(data):
    """(width, height) from the first SOF header of a JPEG, or None when it is not one."""
    if data[:2] != b"\xff\xd8": return None
    i = 2
    while i + 4 <= len(data):
        if data[i] != 0xFF: return None
        while i < len(data) and data[i] == 0xFF: i += 1   # fill bytes
        if i >= len(data): return None
        m = data[i]; i += 1
        if m == 0x01 or 0xD0 <= m <= 0xD8: continue   # no length field
        if m == 0xD9: return None
        if 0xC0 <= m <= 0xCF and m not in (0xC4, 0xC8, 0xCC):   # a frame header: length, precision, height, width
            if i + 7 > len(data): return None
            return int.from_bytes(data[i + 5:i + 7], "big"), int.from_bytes(data[i + 3:i + 5], "big")
        if i + 2 > len(data): return None
        i += int.from_bytes(data[i:i + 2], "big")
    return None

def parse_at(s):
    if not isinstance(s, str): raise ValueError("not a string")
    d = datetime.datetime.fromisoformat(s[:-1] + "+00:00" if s.endswith("Z") else s)
    if d.tzinfo is None or d.utcoffset() is None: raise ValueError("no UTC offset")
    return d

def flat(s):   # captions compared loosely: Instagram may rewrite no-break spaces
    return " ".join((s or "").split())

def load_queue(tree, tracked=None):
    """(entries, errors) for social/posts.json in tree (a DiskTree or a GitTree). tracked: the set of git-tracked paths, or None to skip that rule."""
    errs = []
    try: queue = json.loads(tree.read("social/posts.json").decode("utf-8"))
    except (OSError, ValueError) as e: return [], ["social/posts.json cannot be read: %s" % e]
    if not isinstance(queue, list): return [], ["social/posts.json must be a JSON list"]
    ids, captions = set(), {}
    for n, e in enumerate(queue, 1):
        if not isinstance(e, dict): errs.append("entry %d is not an object" % n); continue
        label = "entry %s" % (e["id"] if isinstance(e.get("id"), str) and e["id"] else n)
        def bad(msg): errs.append("%s: %s" % (label, msg))
        if KEYS - {"cover"} - set(e): bad("missing " + ", ".join(sorted(KEYS - {"cover"} - set(e))))
        if set(e) - KEYS: bad("unknown key " + ", ".join(sorted(set(e) - KEYS)))
        if not (isinstance(e.get("id"), str) and ID.fullmatch(e["id"])): bad("id must be lowercase letters, digits, . _ -")
        elif e["id"] in ids: bad("id used twice")
        else: ids.add(e["id"])
        if not (isinstance(e.get("account"), str) and e["account"] in ACCOUNTS): bad("account must be one of " + ", ".join(sorted(ACCOUNTS)))
        try: d = parse_at(e.get("at"))
        except ValueError as err: bad('"at" must be an ISO time with a UTC offset, e.g. 2026-10-15T15:30:00+02:00 (%s)' % err)
        else:
            p = d.astimezone(PARIS)
            if d.utcoffset() != p.utcoffset(): bad('"at" says %s but Paris is %s on that day: write %s' % (d.strftime("%z"), p.strftime("%z"), p.isoformat()))
        kind, media = e.get("type"), e.get("media")
        if kind not in ("carousel", "reel", "image"): bad('type must be "carousel", "reel" or "image"')
        if not (isinstance(media, list) and media and all(isinstance(m, str) for m in media)): bad("media must be a list of paths"); media = []
        files = [(m, "media") for m in media]
        if "cover" in e:
            if kind != "reel" or not isinstance(e["cover"], str): bad("cover is for a reel, and is one path")
            else: files.append((e["cover"], "cover"))
        ok = []
        for m, role in files:
            if not PATH.fullmatch(m): bad("%s is not a plain path under social/" % m); continue
            try: data = tree.read(m)
            except (OSError, subprocess.SubprocessError): bad("%s does not exist" % m); continue
            if tracked is not None and m not in tracked: bad("%s is not tracked by git" % m)
            else: ok.append((m, role, data))
        if kind == "carousel":
            if not 2 <= len(media) <= 10: bad("a carousel has 2 to 10 pictures, this has %d" % len(media))
            if len(set(media)) != len(media): bad("a picture is listed twice")
        elif kind == "reel":
            if len(media) != 1: bad("a reel has exactly one video, this has %d" % len(media))
        elif kind == "image":
            if len(media) != 1: bad("an image post has exactly one picture, this has %d" % len(media))
        for m, role, data in ok:
            if kind == "reel" and role == "media":
                if not m.endswith(".mp4") or data[4:8] != b"ftyp": bad("%s is not an .mp4 video" % m)
            elif kind in ("carousel", "image"):
                if jpeg_size(data) != (1080, 1350): bad("%s is %s, not a 1080x1350 JPEG" % (m, "%dx%d" % jpeg_size(data) if jpeg_size(data) else "not a JPEG"))
            elif jpeg_size(data) is None: bad("cover %s is not a JPEG" % m)
        cap = e.get("caption")
        if not isinstance(cap, str) or not cap.strip(): bad("caption is missing or empty")
        else:
            if len(cap) > 2200: bad("caption is %d characters, Instagram takes 2200" % len(cap))
            if "#" in cap: bad("caption holds a #")
            key = (str(e.get("account")), flat(cap))
            if key in captions: bad("caption is the same as entry %s's: the duplicate guard would treat the later one as already posted" % captions[key])
            else: captions[key] = e.get("id", n)
    return queue, errs


# ---- output, secrets, clock -------------------------------------------------------------------------------------

_secret = set()
def scrub(s):
    for t in _secret: s = s.replace(t, "***")
    return s

def say(msg, level=None):
    msg = scrub(msg).replace("\n", " ")
    print(("::%s::%s" % (level, msg)) if CI and level else ("%s: %s" % (level.upper(), msg) if level else msg), flush=True)

class Fail(Exception): pass

class Clock:   # the real clock, or a faked start that keeps running
    def __init__(self, start=None):
        self.t0, self.base = time.monotonic(), start or datetime.datetime.now(datetime.timezone.utc)
    def elapsed(self): return time.monotonic() - self.t0
    def now(self): return self.base + datetime.timedelta(seconds=self.elapsed())

def paris(d):
    return d.astimezone(PARIS).strftime("%a %d %b %H:%M")


# ---- the site and the Graph API ---------------------------------------------------------------------------------

def live_check(tree, rel, ctype, tries):
    """The file is on nokime.fr with the committed bytes (tree's copy) and content type, or Fail after `tries` attempts a minute apart."""
    want = tree.read(rel)
    size, digest, last = len(want), hashlib.sha256(want).hexdigest(), ""
    for attempt in range(tries):
        if attempt: time.sleep(60)
        code, got, n, same = 0, "", -1, False
        try:
            req = urllib.request.Request(SITE + rel, headers={"User-Agent": UA, "Cache-Control": "no-cache"})
            with urllib.request.urlopen(req, timeout=60) as r:
                code, got, n, h = r.status, (r.headers.get("Content-Type") or "").split(";")[0].strip().lower(), 0, hashlib.sha256()
                while True:
                    chunk = r.read(1 << 20)
                    n += len(chunk); h.update(chunk)
                    if not chunk or n > size: break
                same = h.hexdigest() == digest
        except urllib.error.HTTPError as e: code = e.code
        except (urllib.error.URLError, OSError, http.client.HTTPException) as e: last = "unreachable: %s" % getattr(e, "reason", e); continue
        last = "%s, %s, %s bytes%s; expected %s, %d bytes as committed" % (code or "no answer", got or "no type", n if n >= 0 else "no",
                                                                           ", not the committed content" if n == size and not same else "", ctype, size)
        say("site: %s -> %s" % (rel, last))
        if code == 200 and got == ctype and n == size and same: return
    raise Fail("%s is not live as committed (%s): deploy pending (the deploy gate has not moved live yet)" % (rel, last))

def graph(method, path, params, token, what):
    """One Graph API call; the JSON answer, or Fail. Nothing printed holds the URL or the token."""
    body = urllib.parse.urlencode(dict(params, access_token=token))
    if method == "GET": req = urllib.request.Request(API + path + "?" + body, headers={"User-Agent": UA})
    else: req = urllib.request.Request(API + path, data=body.encode(), method="POST", headers={"User-Agent": UA})
    try:
        try:
            with urllib.request.urlopen(req, timeout=60) as r: raw = r.read()
        except urllib.error.HTTPError as e: raw = e.read()
    except (urllib.error.URLError, OSError, http.client.HTTPException) as e: raise Fail("%s: no answer (%s)" % (what, getattr(e, "reason", e)))
    try: d = json.loads(raw)
    except ValueError: raise Fail("%s: Instagram's answer is not JSON: %s" % (what, raw[:200].decode("utf-8", "replace")))
    if not isinstance(d, dict) or "error" in d: raise Fail("%s: Instagram refused: %s" % (what, json.dumps(d)[:400]))
    return d

def wait_ready(cid, token, what):   # Meta: ask once a minute, five minutes at most
    for i in range(1, 7):
        if i > 1: time.sleep(60)
        d = graph("GET", cid, {"fields": "status_code,status"}, token, what + " status")
        say("%s container %s: %s (check %d/6)" % (what, cid, d.get("status_code") or "no status", i))
        if d.get("status_code") == "FINISHED": return
        if d.get("status_code") in ("ERROR", "EXPIRED"): raise Fail("%s container ended as %s: %s" % (what, d["status_code"], d.get("status", "")))
    raise Fail("%s container still not ready after five minutes" % what)

def captions_up(uid, token):
    """The account's latest 50 captions, compared loosely: one call."""
    d = graph("GET", uid + "/media", {"fields": "caption,timestamp,media_product_type", "limit": "50"}, token, "latest posts")
    if not isinstance(d.get("data"), list): raise Fail("latest posts: the list of the account's posts is unreadable, not posting blind")
    return {flat(m.get("caption")) for m in d["data"]}

def already_up(entry, uid, token): return flat(entry["caption"]) in captions_up(uid, token)

def check_account(entry, uid, token, suf):
    """The keys are this entry's account's, or Fail: one read-only call."""
    me = graph("GET", "me", {"fields": "user_id,username"}, token, "account check")
    if me.get("username") != entry["account"] or str(me.get("user_id")) != uid:
        raise Fail("the %s keys belong to @%s, not %s: nothing posted" % (suf, me.get("username"), entry["account"]))

published_attempt = False   # set just before media_publish: from then on the post may be live, whatever comes back

def too_late(clock):
    if clock.elapsed() > TOO_LATE: raise Fail("too close to the 6 h job limit to publish safely; the next start posts it")

def publish(entry, uid, token, clock):
    global published_attempt
    if entry["type"] == "carousel":
        kids = []
        for n, m in enumerate(entry["media"], 1):
            cid = graph("POST", uid + "/media", {"image_url": SITE + m, "is_carousel_item": "true"}, token, "picture %d" % n).get("id")
            if not cid: raise Fail("picture %d: no container id" % n)
            kids.append(cid)
        for n, cid in enumerate(kids, 1): wait_ready(cid, token, "picture %d" % n)
        # the caption belongs to the parent: a child that carries one is accepted and silently ignored
        parent = graph("POST", uid + "/media", {"media_type": "CAROUSEL", "children": ",".join(kids), "caption": entry["caption"]}, token, "carousel").get("id")
    elif entry["type"] == "image":
        parent = graph("POST", uid + "/media", {"image_url": SITE + entry["media"][0], "caption": entry["caption"]}, token, "image").get("id")
    else:
        params = {"media_type": "REELS", "video_url": SITE + entry["media"][0], "caption": entry["caption"], "share_to_feed": "true"}
        if entry.get("cover"): params["cover_url"] = SITE + entry["cover"]
        parent = graph("POST", uid + "/media", params, token, "reel").get("id")
    if not parent: raise Fail("no container id")
    wait_ready(parent, token, entry["type"])
    too_late(clock)   # the containers took time too
    published_attempt = True
    try: done = graph("POST", uid + "/media_publish", {"creation_id": parent}, token, "publish").get("id")
    except Fail as e: raise Fail("%s (it may have gone out: the duplicate guard checks before any retry)" % e)
    if not done: raise Fail("publish: no media id came back (it may have gone out: the duplicate guard checks before any retry)")
    say("published %s as %s" % (entry["id"], done))


# ---- the queue as main has it now -------------------------------------------------------------------------------

def fresh_queue():
    """(entries, GitTree) from main's tip, or Fail: a scheduled run never posts from a copy that may be hours old."""
    last = ""
    for attempt in range(3):
        if attempt: time.sleep(10)
        try: r = subprocess.run(["git", "-C", str(root), "fetch", "--depth=1", "--no-tags", "origin", "main"], capture_output=True, text=True, timeout=60)
        except (OSError, subprocess.SubprocessError) as x: last = type(x).__name__; continue
        if r.returncode == 0: break
        last = (r.stderr.strip().splitlines() or ["git fetch failed"])[-1][:200]
    else: raise Fail("cannot fetch main to re-read the queue (%s): not posting from a copy that may be stale" % last)
    tree = GitTree("FETCH_HEAD")
    queue, errs = load_queue(tree)
    if errs: raise Fail("main's social/posts.json is invalid (%s): nothing posted until it is fixed" % "; ".join(errs[:3]))
    return queue, tree


# ---- one entry --------------------------------------------------------------------------------------------------

def creds(suf):
    uid, token = os.environ.get("IG_USER_ID_" + suf, "").strip(), os.environ.get("IG_TOKEN_" + suf, "").strip()
    if token: _secret.add(token)
    return uid, token

def run_entry(e, args, clock, tree):
    """Returns "posted", "skipped" or "dry"; raises Fail. tree: where the entry's files are read from."""
    suf = ACCOUNTS[e["account"]]
    uid, token = creds(suf)
    have = bool(uid and token)
    at = parse_at(e["at"])
    scheduled = not args.id and not args.dry_run
    now = clock.now()
    wait, late = max(0, int((at - now).total_seconds())), int((now - at).total_seconds())
    say("%s (%s, %s) for %s at %s Paris" % (e["id"], e["type"], e["account"], at.astimezone(datetime.timezone.utc).strftime("%F %H:%MZ"), paris(at)))
    if late > 900 and not args.id:
        say("%s: %d min late (the run started late); %s now" % (e["id"], late // 60, "a real run would post" if args.dry_run else "posting"), "warning")
    if not have:
        if not args.dry_run: raise Fail("IG_USER_ID_%s and IG_TOKEN_%s are not both set: no credentials for %s" % (suf, suf, e["account"]))
        say("%s: IG_USER_ID_%s / IG_TOKEN_%s not set; a real run would fail this entry" % (e["id"], suf, suf), "warning")
    if args.dry_run:
        say("%s: would wait %d min, then post" % (e["id"], wait // 60) if wait and not args.id else "%s: would post at once" % e["id"])
    else:
        check_account(e, uid, token, suf)
        if already_up(e, uid, token):
            say("%s: already up (a post with this caption is in the account's latest 50), nothing to do" % e["id"], "notice"); return "skipped"
    if scheduled and wait:
        if clock.elapsed() + wait > MAX_WAIT: say("%s: %d min away, more than this run may hold; a later run posts it" % (e["id"], wait // 60), "notice"); return "skipped"
        say("%s: waiting %d min" % (e["id"], wait // 60))
        while (at - clock.now()).total_seconds() > 0: time.sleep(min(300, max(1, (at - clock.now()).total_seconds())))
        queue, tree = fresh_queue()   # the wait was long: the entry may have been changed or taken out of the queue meanwhile
        if next((x for x in queue if x["id"] == e["id"]), None) != e:
            say("%s: changed or removed after this run started, not posted" % e["id"], "notice"); return "skipped"
    for m in e["media"] + ([e["cover"]] if e.get("cover") else []):
        live_check(tree, m, "video/mp4" if m.endswith(".mp4") else "image/jpeg", 1 if args.dry_run else 5)
    if args.dry_run:
        say("%s: dry run, no call to Instagram" % e["id"]); return "dry"
    too_late(clock)
    if already_up(e, uid, token):   # again: a manual run may have gone out while this one waited
        say("%s: already up, nothing to do" % e["id"], "notice"); return "skipped"
    publish(e, uid, token, clock)
    return "posted"

def missed(queue, clock, args):
    """Entries whose time passed beyond any start's reach (up to 7 days back) and which are not on their account: reported, and counted."""
    now, count, up = clock.now(), 0, {}
    stale = sorted((e for e in queue if now - datetime.timedelta(seconds=MISSED) <= parse_at(e["at"]) < now - datetime.timedelta(seconds=BEFORE)),
                   key=lambda e: parse_at(e["at"]))
    for e in stale:
        when = paris(parse_at(e["at"]))
        if e["account"] not in up:   # one read per account
            uid, token = creds(ACCOUNTS[e["account"]])
            up[e["account"]] = None
            if uid and token and not args.dry_run:
                try: up[e["account"]] = captions_up(uid, token)
                except Fail as f: say("%s: %s" % (e["account"], f), "error")
        seen = up[e["account"]]
        if seen is not None and flat(e["caption"]) in seen: continue
        if args.dry_run: say("%s: past its window (was due %s Paris); a real run fails unless it is on the account" % (e["id"], when), "warning"); continue
        count += 1
        if seen is None: say("%s: missed its window (was due %s Paris) and the account cannot be read, so it is not known to be up; run it by id" % (e["id"], when), "error")
        else: say("%s: missed its window (was due %s Paris) and is not on the account; run it by id" % (e["id"], when), "error")
    return count


def main(argv):
    ap = argparse.ArgumentParser(description="Post the entries of social/posts.json that are due.")
    ap.add_argument("--dry-run", action="store_true", help="validate, select and check the live media; no call that needs a token")
    ap.add_argument("--now", help="fake the clock: an ISO time with a UTC offset (dry run only)")
    ap.add_argument("--id", help="post this entry at once, whatever its time")
    args = ap.parse_args(argv)
    if args.now and not args.dry_run: ap.error("--now fakes the clock and is only for --dry-run")
    try: start = parse_at(args.now) if args.now else None
    except ValueError as err: ap.error("--now: %s" % err)
    for suf in ACCOUNTS.values(): creds(suf)
    tree = DiskTree(root)
    queue, errs = load_queue(tree)
    if errs:
        for m in errs: say(m, "error")
        return 1
    clock = Clock(start)
    scheduled = not args.id and not args.dry_run
    if args.id and not any(e["id"] == args.id for e in queue): say("no entry %s in social/posts.json" % args.id, "error"); return 1
    failed = 0 if args.id else missed(queue, clock, args)
    results, handled, first = [], set(), True
    while True:
        if scheduled:   # before each entry: the queue as main has it now
            try: queue, tree = fresh_queue()
            except Fail as f: failed += 1; say(str(f), "error"); break
        now = clock.now()
        if args.id: due = [e for e in queue if e["id"] == args.id and e["id"] not in handled]
        else: due = sorted((e for e in queue if e["id"] not in handled and now - datetime.timedelta(seconds=BEFORE) <= parse_at(e["at"]) <= now + datetime.timedelta(seconds=AFTER)),
                           key=lambda e: parse_at(e["at"]))
        if first:
            say("%d entr%s in the queue, %d due (now %s UTC; window: %d h back, %s ahead)%s" % (
                len(queue), "y" if len(queue) == 1 else "ies", len(due), now.astimezone(datetime.timezone.utc).strftime("%F %H:%M"),
                BEFORE // 3600, "%d h %d" % divmod(AFTER // 60, 60), ", dry run" if args.dry_run else ""))
            first = False
        if not due: break
        e = due[0]; handled.add(e["id"])
        try: results.append(run_entry(e, args, clock, tree))
        except Fail as f:
            failed += 1; say("%s: %s" % (e["id"], f), "error")
        except Exception as x:
            failed += 1; say("%s: unexpected %s: %s" % (e["id"], type(x).__name__, x), "error")
    if published_attempt or "posted" in results: time.sleep(SETTLE)
    if failed: say("%d problem%s: see above" % (failed, "" if failed == 1 else "s"), "error")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
