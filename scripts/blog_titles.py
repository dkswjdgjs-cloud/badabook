"""블로그 전체 글 제목·카테고리 목록을 출력 (출판사 정리용 일회성 도구)."""
import json, re, urllib.parse, urllib.request, xml.etree.ElementTree as ET

BLOG = "badaikidsbook"
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": f"https://blog.naver.com/{BLOG}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", "replace")


rss = ET.fromstring(get(f"https://rss.blog.naver.com/{BLOG}.xml"))
cats = {}
for it in rss.iter("item"):
    m = re.search(r"/(\d{9,})", it.findtext("link") or "")
    if m:
        cats[m.group(1)] = it.findtext("category") or ""

rows = []
for page in range(1, 40):
    raw = get(f"https://blog.naver.com/PostTitleListAsync.naver?blogId={BLOG}&viewdate=&currentPage={page}&categoryNo=0&parentCategoryNo=0&countPerPage=30")
    raw = raw.replace("\\'", "'")
    data = json.loads(raw)
    items = data.get("postList") or []
    if not items:
        break
    for p in items:
        t = urllib.parse.unquote_plus(p.get("title", ""))
        rows.append((p.get("addDate", ""), p.get("logNo"), p.get("categoryNo"), t))
    if len(items) < 30:
        break

print(f"전체 글 {len(rows)}개")
for d, n, c, t in rows:
    print(f"{d}\t{n}\tcat{c}\t{cats.get(str(n), '')}\t{t}")
