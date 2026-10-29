"""네이버 블로그 새 글을 읽어 홈페이지 행사 데이터(data/events.js)를 갱신한다.

로그인 없이 공개 RSS(rss.blog.naver.com/<아이디>.xml)를 읽는다. GitHub Actions가 매일 실행한다.
필요한 비밀값: GEMINI_API_KEY (aistudio.google.com, 무료)
선택 변수: GEMINI_MODEL (기본 gemini-flash-latest), NAVER_BLOG_ID (기본 badaikidsbook)
"""

import base64
import datetime as dt
import email.utils
import html
import io
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from typing import List, Literal

from PIL import Image
from pydantic import BaseModel

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "events.js"
STATE = ROOT / "data" / "blog-state.json"
IMG_DIR = ROOT / "images" / "events"
PREFIX = "window.EVENTS = "
KST = dt.timezone(dt.timedelta(hours=9))
LOOKBACK_DAYS = 60  # 이보다 오래된 글은 보지 않음
MAX_IMAGES = 3  # 글 하나에서 제미나이에게 보여줄 사진 수
MAX_POSTS = 8  # 한 번에 분석할 최대 글 수 (나머지는 다음 날)
BLOG_ID = os.environ.get("NAVER_BLOG_ID") or "badaikidsbook"
UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"


def fetch(url: str, referer: str = "") -> bytes:
    h = {"User-Agent": UA}
    if referer:
        h["Referer"] = referer
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60) as r:
        return r.read()


class _Text(HTMLParser):
    """블로그 본문에서 글자만 뽑는다."""

    def __init__(self):
        super().__init__()
        self.out, self.skip = [], 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
        if tag in ("p", "br", "div", "li", "tr"):
            self.out.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.out.append(data)


def post_content(log_no: str) -> tuple[str, List[str]]:
    """모바일 블로그 글에서 본문 글자와 사진 주소를 가져온다."""
    url = f"https://m.blog.naver.com/{BLOG_ID}/{log_no}"
    page = fetch(url).decode("utf-8", "replace")
    i = page.find("se-main-container")
    body = page[page.find(">", i) + 1:] if i > -1 else page
    j = body.find("post_footer")
    body = body[:j] if j > -1 else body
    imgs = []
    for u in re.findall(r'(?:data-lazy-src|src)="(https://(?:mblogthumb|postfiles|blogfiles)-phinf\.pstatic\.net/[^"]+)"', body):
        u = html.unescape(u).split("?")[0] + "?type=w966"
        if u not in imgs and not re.search(r"(sticker|emoticon|static/)", u):
            imgs.append(u)
    p = _Text()
    p.feed(body)
    text = re.sub(r"\n\s*\n+", "\n", html.unescape("".join(p.out))).strip()
    return text[:6000], imgs[:MAX_IMAGES]


GEMINI_MODEL = os.environ.get("GEMINI_MODEL") or "gemini-flash-latest"
FALLBACK_MODEL = os.environ.get("GEMINI_FALLBACK_MODEL") or "gemini-flash-lite-latest"


# ---------- 제미나이가 채울 형식 ----------
class Session(BaseModel):
    date: str  # YYYY-MM-DD
    time: str  # 예: "오전 10:30" (모르면 "")
    title: str
    info: str  # 강사, 선물 등
    target: str  # 예: "36개월 미만 자녀 부모"


class Post(BaseModel):
    kind: Literal["promo", "class", "other"]
    title: str
    tag: str
    body: str
    meta: str
    start: str  # YYYY-MM-DD 또는 ""
    end: str  # YYYY-MM-DD 또는 ""
    sessions: List[Session]


SYSTEM = """너는 인천 영종도의 어린이 서점 '영종 책바다 어린이서점'의 홈페이지 담당자야.
서점 네이버 블로그 글(사진 + 글)을 보고, 홈페이지 '이번 달 소식'이나 '부모교실' 칸에 올릴 내용인지 판단해서 정리해.

kind 고르는 법:
- promo: 기간이 있는 할인, 사전예약, 사은품, 출판사 이벤트, 신간 입고 행사, 결제 혜택 등 손님이 와서 혜택을 받을 수 있는 소식.
- class: 부모교실, 강연, 체험 수업, 독서 모임처럼 날짜가 정해진 모임. 각 날짜를 sessions에 하나씩 넣어.
- other: 일상 사진, 책 추천만 하는 글, 휴무 공지, 이미 끝난 행사 후기 등 위에 해당하지 않는 것.

쓰는 법:
- 모두 한국어 해요체. 짧고 쉽게. 해시태그와 이모지는 빼.
- title: 20자 안팎의 제목. 책/전집 이름이 있으면 넣어.
- tag: 칸 위에 붙는 짧은 꼬리표. 예: "사전예약 · 10/31(토) 마감", "11월 출판사 이벤트".
- body: 2~3문장. 무엇을, 누구에게, 어떤 혜택인지.
- meta: 가격이나 기간 같은 한 줄 요약. 없으면 "".
- start / end: 기간 시작일과 마감일(YYYY-MM-DD). 게시일 기준으로 연도를 추론해. 마감일이 없으면 end는 "".
- sessions: class일 때만 채우고 나머지는 빈 목록. date는 YYYY-MM-DD.
- 사진과 글에 없는 내용은 지어내지 마. 모르는 칸은 ""로 둬.
- other이면 나머지 칸은 비워도 돼."""


def to_jpeg(raw: bytes, width: int) -> bytes:
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85, optimize=True)
    return buf.getvalue()


S = {"type": "STRING"}
SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "kind": {"type": "STRING", "enum": ["promo", "class", "other"]},
        "title": S, "tag": S, "body": S, "meta": S, "start": S, "end": S,
        "sessions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {"date": S, "time": S, "title": S, "info": S, "target": S},
                "required": ["date", "time", "title", "info", "target"],
            },
        },
    },
    "required": ["kind", "title", "tag", "body", "meta", "start", "end", "sessions"],
}


class QuotaError(Exception):
    """무료 한도 초과: 오늘은 여기까지 하고 내일 이어서."""


def analyze(key: str, caption: str, posted: str, jpegs: List[bytes]) -> Post:
    parts = [{"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(j).decode()}} for j in jpegs]
    parts.append({"text": f"게시일: {posted}\n\n블로그 글:\n{caption or '(글 없음)'}"})
    cfg = {"responseMimeType": "application/json", "responseSchema": SCHEMA, "temperature": 0.2,
           "thinkingConfig": {"thinkingLevel": "low"}}  # 생각을 짧게 해서 빨리 답하게
    # 붐빌 때(503·응답 늦음)는 쉬었다 다시, 그래도 안 되면 가벼운 모델로 한 번 더
    plan = [GEMINI_MODEL, GEMINI_MODEL, GEMINI_MODEL, FALLBACK_MODEL, FALLBACK_MODEL]
    out, last = None, None
    for attempt, model in enumerate(plan):
        if attempt:
            time.sleep(min(15 * attempt, 45))
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        body = json.dumps({
            "system_instruction": {"parts": [{"text": SYSTEM}]},
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": cfg,
        }).encode()
        req = urllib.request.Request(url, data=body, method="POST",
                                     headers={"Content-Type": "application/json", "x-goog-api-key": key})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                out = json.load(r)
            if model != GEMINI_MODEL:
                print(f"  ({model} 모델로 분석함)", flush=True)
            break
        except urllib.error.HTTPError as e:
            msg = e.read()[:400].decode("utf-8", "replace")
            print(f"  [{model}] 제미나이 응답 {e.code}: {msg[:160]}", flush=True)
            last = RuntimeError(f"제미나이 오류 {e.code}")
            if e.code == 400 and "thinking" in msg.lower() and "thinkingConfig" in cfg:
                cfg = {k: v for k, v in cfg.items() if k != "thinkingConfig"}  # 이 모델이 설정을 모르면 빼고 다시
                continue
            if e.code in (500, 502, 503, 504):  # 일시 오류
                continue
            if e.code == 429:
                raise QuotaError(msg)
            raise last
        except (TimeoutError, OSError) as e:
            print(f"  [{model}] 제미나이 응답 늦음 ({e})", flush=True)
            last = e
    if out is None:
        raise last or RuntimeError("제미나이 응답 없음")
    text = "".join(p.get("text", "") for p in out["candidates"][0]["content"]["parts"])
    return Post.model_validate_json(text)


COMMON = {"이벤트", "사전예약", "할인", "증정", "특가", "행사", "구매", "사은품", "신간", "영종책바다", "어린이서점"}


def words(t: str) -> set:
    return {w for w in re.findall(r"[가-힣A-Za-z0-9]{2,}", t or "") if w not in COMMON and not re.fullmatch(r"\d+월?", w)}


def _range(it: dict):
    st = it.get("start") or it.get("posted") or ""
    en = it.get("end") or ""
    if not en and st:
        en = (dt.date.fromisoformat(st) + dt.timedelta(days=30)).isoformat()
    return st, en


def _hits(words_of: set, text: str) -> int:
    flat = re.sub(r"\s+", "", text or "")
    return sum(1 for w in words_of if w in flat)


def duplicate_of(item: dict, items: list) -> str:
    """이미 있는 카드(직접 넣은 카드 포함)와 같은 행사면 그 카드 id."""
    for o in items:
        if o["id"] == item["id"] or o.get("kind") != item["kind"]:
            continue
        if item["kind"] == "class":
            a = {x["date"] for x in item.get("sessions") or []}
            b = {x["date"] for x in o.get("sessions") or []}
            if a & b:
                return o["id"]
            continue
        s1, e1 = _range(item)
        s2, e2 = _range(o)
        overlap = o.get("always") or not (s1 and s2) or (s1 <= e2 and s2 <= e1)
        # 띄어쓰기가 달라도 잡히게: 한쪽 제목의 낱말이 다른 쪽 제목(공백 제거)에 2개 이상 들어 있으면 같은 행사
        same = max(_hits(words(item["title"]), o.get("title", "")), _hits(words(o.get("title", "")), item["title"])) >= 2
        if overlap and same:
            return o["id"]
    return ""


def load_events() -> dict:
    text = DATA.read_text(encoding="utf-8").strip()
    return json.loads(text[len(PREFIX):].rstrip(";"))


def save_events(ev: dict) -> None:
    DATA.write_text(PREFIX + json.dumps(ev, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")



def main() -> int:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("::error::GEMINI_API_KEY 비밀값이 없어요.")
        return 1

    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {"seen": []}
    seen = set(state["seen"])
    ev = load_events()
    today = dt.datetime.now(KST).date()
    cutoff = today - dt.timedelta(days=LOOKBACK_DAYS)

    rss = ET.fromstring(fetch(f"https://rss.blog.naver.com/{BLOG_ID}.xml"))
    posts = []
    for it in rss.iter("item"):
        link = (it.findtext("link") or "").strip()
        m = re.search(r"/(\d{9,})", link)
        if not m:
            continue
        when = email.utils.parsedate_to_datetime(it.findtext("pubDate")).astimezone(KST).date()
        posts.append({"id": m.group(1), "title": (it.findtext("title") or "").strip(), "date": when,
                      "link": f"https://blog.naver.com/{BLOG_ID}/{m.group(1)}"})
    new = [p for p in posts if p["id"] not in seen and p["date"] >= cutoff]
    print(f"블로그 최근 글 {len(posts)}개 중 새 글 {len(new)}개")

    changed = False
    new = sorted(new, key=lambda x: x["date"], reverse=True)[:MAX_POSTS]  # 최근 글부터
    for p in sorted(new, key=lambda x: x["date"]):  # 오래된 것부터
        posted = p["date"].isoformat()
        print(f"- {posted} {p['title']} {p['link']}")
        try:
            text, urls = post_content(p["id"])
            raws = []
            for u in urls:
                try:
                    raws.append(fetch(u, referer="https://m.blog.naver.com/"))
                except Exception as e:
                    print(f"  사진 하나 못 받음: {e}")
            jpegs = [to_jpeg(r, 1024) for r in raws]
            post = analyze(key, f"제목: {p['title']}\n\n{text}", posted, jpegs)
            time.sleep(5)  # 무료 한도(분당 요청 수) 여유
        except QuotaError:
            print("::warning::제미나이 무료 한도에 걸렸어요. 남은 글은 다음 실행 때 이어서 해요.")
            break
        except Exception as e:
            print(f"::warning::글 처리 실패 ({e}): 내일 다시 시도해요.")
            continue
        seen.add(p["id"])
        if post.kind == "other":
            print("  행사 글 아님")
            continue
        img = ""
        if raws:
            IMG_DIR.mkdir(parents=True, exist_ok=True)
            f = IMG_DIR / f"blog-{p['id']}.jpg"
            f.write_bytes(to_jpeg(raws[0], 900))
            img = f.relative_to(ROOT).as_posix()
        item = {
            "id": f"blog-{p['id']}",
            "source": "blog",
            "kind": post.kind,
            "tag": post.tag,
            "title": post.title,
            "body": post.body,
            "meta": post.meta,
            "image": img,
            "start": post.start,
            "end": post.end,
            "posted": posted,
            "link": p["link"],
        }
        if post.kind == "class":
            item["sessions"] = [s.model_dump() for s in post.sessions]
            if item["sessions"]:
                item["end"] = item["end"] or max(s["date"] for s in item["sessions"])
        dup = duplicate_of(item, ev["items"])
        old = next((o for o in ev["items"] if o["id"] == dup), None) if dup else None
        if old and old.get("source") == "manual" and old.get("since") and posted > old["since"]:
            # 직접 넣은 카드보다 나중에 올라온 글이면 새 소식이므로 그 카드를 새 글로 바꿈
            print(f"  직접 넣은 카드({dup})보다 새 글이라 교체")
            if old.get("always") and not item["end"]:
                item["always"] = True
            if old.get("featured"):
                item["featured"] = True
            ev["items"] = [o for o in ev["items"] if o["id"] != dup]
            dup = ""
        if dup:
            print(f"  이미 있는 카드({dup})와 같은 행사라 건너뜀")
            for o in ev["items"]:
                if o["id"] == dup and not o.get("link"):
                    o["link"] = p["link"]  # 직접 넣은 카드도 누르면 이 블로그 글로 가게
            if img:
                (ROOT / img).unlink(missing_ok=True)
            changed = True  # 읽은 글 목록은 저장
            continue
        ev["items"] = [i for i in ev["items"] if i["id"] != item["id"]] + [item]
        print(f"  추가: [{post.kind}] {post.title}")
        changed = True

    # 끝난 지 60일 넘은 자동 항목은 정리 (직접 넣은 항목은 그대로 둠)
    keep_after = (today - dt.timedelta(days=LOOKBACK_DAYS)).isoformat()
    before = len(ev["items"])
    ev["items"] = [
        i for i in ev["items"]
        if i.get("source") == "manual" or (i.get("end") or i.get("posted", "")) >= keep_after
    ]
    changed = changed or len(ev["items"]) != before

    if changed:
        ev["updated"] = today.isoformat()
        save_events(ev)
    state["seen"] = sorted(seen)[-300:]
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    # 홈페이지에 "마지막 확인 시각"을 작게 보여 주기 위해 매번 기록
    now = dt.datetime.now(KST).replace(second=0, microsecond=0).isoformat()
    (ROOT / "data" / "last-check.js").write_text(f'window.EVENTS_CHECKED = "{now}";\n', encoding="utf-8")
    print("행사 데이터 갱신됨" if changed else "바뀐 내용 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
