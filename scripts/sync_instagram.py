"""인스타그램 새 게시물을 읽어 홈페이지 행사 데이터(data/events.js)를 갱신한다.

GitHub Actions가 매일 실행한다. 필요한 비밀값:
  IG_ACCESS_TOKEN    인스타그램 장기 토큰 (Instagram API with Instagram Login)
  GEMINI_API_KEY     제미나이 API 키 (aistudio.google.com, 무료)
선택: GEMINI_MODEL 변수 (기본값 gemini-flash-latest)
"""

import base64
import datetime as dt
import io
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import List, Literal

from PIL import Image
from pydantic import BaseModel

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "events.js"
STATE = ROOT / "data" / "instagram-state.json"
IMG_DIR = ROOT / "images" / "events"
PREFIX = "window.EVENTS = "
GRAPH = "https://graph.instagram.com"
KST = dt.timezone(dt.timedelta(hours=9))
LOOKBACK_DAYS = 60  # 이보다 오래된 게시물은 보지 않음
MAX_IMAGES = 4  # 캐러셀에서 제미나이에게 보여줄 사진 수


GEMINI_MODEL = os.environ.get("GEMINI_MODEL") or "gemini-flash-latest"


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
서점 인스타그램 게시물(사진 + 글)을 보고, 홈페이지 '이번 달 소식'이나 '부모교실' 칸에 올릴 내용인지 판단해서 정리해.

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


def http_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.load(r)


def http_bytes(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def ig(path: str, token: str, **params) -> dict:
    params["access_token"] = token
    return http_json(f"{GRAPH}/{path}?{urllib.parse.urlencode(params)}")


def refresh_token(token: str) -> None:
    """장기 토큰은 60일 뒤 만료된다. 매일 갱신해서 만료를 계속 미룬다."""
    try:
        r = http_json(
            f"{GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token={urllib.parse.quote(token)}"
        )
        days = int(r.get("expires_in", 0)) // 86400
        print(f"토큰 갱신됨 (남은 기간 약 {days}일)")
        if r.get("access_token") and r["access_token"] != token:
            print("::warning::새 토큰 문자열이 발급됐어요. 저장소 비밀값 IG_ACCESS_TOKEN을 새 값으로 바꿔야 해요.")
    except Exception as e:  # 갱신 실패해도 오늘 작업은 계속
        print(f"::warning::토큰 갱신 실패: {e}")


def media_images(m: dict, token: str) -> List[str]:
    if m.get("media_type") == "CAROUSEL_ALBUM":
        kids = ig(f"{m['id']}/children", token, fields="media_type,media_url,thumbnail_url").get("data", [])
        urls = [k.get("thumbnail_url") if k.get("media_type") == "VIDEO" else k.get("media_url") for k in kids]
    elif m.get("media_type") == "VIDEO":
        urls = [m.get("thumbnail_url")]
    else:
        urls = [m.get("media_url")]
    return [u for u in urls if u][:MAX_IMAGES]


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


def analyze(key: str, caption: str, posted: str, jpegs: List[bytes]) -> Post:
    parts = [{"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(j).decode()}} for j in jpegs]
    parts.append({"text": f"게시일: {posted}\n\n게시물 글:\n{caption or '(글 없음)'}"})
    body = json.dumps({
        "system_instruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {"responseMimeType": "application/json", "responseSchema": SCHEMA, "temperature": 0.2},
    }).encode()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    for attempt in range(4):
        req = urllib.request.Request(url, data=body, method="POST",
                                     headers={"Content-Type": "application/json", "x-goog-api-key": key})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                out = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < 3:  # 무료 한도·일시 오류면 잠깐 쉬고 다시
                time.sleep(30 * (attempt + 1))
                continue
            raise RuntimeError(f"제미나이 오류 {e.code}: {e.read()[:300]!r}")
    text = "".join(p.get("text", "") for p in out["candidates"][0]["content"]["parts"])
    return Post.model_validate_json(text)


def load_events() -> dict:
    text = DATA.read_text(encoding="utf-8").strip()
    return json.loads(text[len(PREFIX):].rstrip(";"))


def save_events(ev: dict) -> None:
    DATA.write_text(PREFIX + json.dumps(ev, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")


def main() -> int:
    token = os.environ.get("IG_ACCESS_TOKEN")
    if not token:
        print("::error::IG_ACCESS_TOKEN 비밀값이 없어요.")
        return 1
    refresh_token(token)

    state = json.loads(STATE.read_text(encoding="utf-8")) if STATE.exists() else {"seen": []}
    seen = set(state["seen"])
    ev = load_events()
    today = dt.datetime.now(KST).date()
    cutoff = today - dt.timedelta(days=LOOKBACK_DAYS)

    media = ig(
        "me/media", token, fields="id,caption,media_type,media_url,thumbnail_url,permalink,timestamp", limit=25
    ).get("data", [])
    new = [m for m in media if m["id"] not in seen and dt.date.fromisoformat(m["timestamp"][:10]) >= cutoff]
    print(f"최근 게시물 {len(media)}개 중 새 게시물 {len(new)}개")

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("::error::GEMINI_API_KEY 비밀값이 없어요.")
        return 1
    changed = False
    for m in reversed(new):  # 오래된 것부터
        posted = dt.datetime.fromisoformat(m["timestamp"].replace("+0000", "+00:00")).astimezone(KST).date().isoformat()
        print(f"- {posted} {m.get('permalink')}")
        try:
            raws = [http_bytes(u) for u in media_images(m, token)]
            post = analyze(key, m.get("caption", ""), posted, [to_jpeg(r, 1200) for r in raws])
            time.sleep(5)  # 무료 한도(분당 요청 수) 여유
        except Exception as e:
            print(f"::warning::게시물 처리 실패 ({e}): 내일 다시 시도해요.")
            continue
        seen.add(m["id"])
        if post.kind == "other":
            print("  행사 글 아님")
            continue
        img = ""
        if raws:
            IMG_DIR.mkdir(parents=True, exist_ok=True)
            p = IMG_DIR / f"{m['id']}.jpg"
            p.write_bytes(to_jpeg(raws[0], 900))
            img = p.relative_to(ROOT).as_posix()
        item = {
            "id": f"ig-{m['id']}",
            "source": "instagram",
            "kind": post.kind,
            "tag": post.tag,
            "title": post.title,
            "body": post.body,
            "meta": post.meta,
            "image": img,
            "start": post.start,
            "end": post.end,
            "posted": posted,
            "link": m.get("permalink", ""),
        }
        if post.kind == "class":
            item["sessions"] = [s.model_dump() for s in post.sessions]
            if item["sessions"]:
                item["end"] = item["end"] or max(s["date"] for s in item["sessions"])
        ev["items"] = [i for i in ev["items"] if i["id"] != item["id"]] + [item]
        print(f"  추가: [{post.kind}] {post.title}")
        changed = True

    # 끝난 지 60일 넘은 자동 항목은 정리 (직접 넣은 항목은 그대로 둠)
    keep_after = (today - dt.timedelta(days=LOOKBACK_DAYS)).isoformat()
    before = len(ev["items"])
    ev["items"] = [
        i for i in ev["items"]
        if i.get("source") != "instagram" or (i.get("end") or i.get("posted", "")) >= keep_after
    ]
    changed = changed or len(ev["items"]) != before

    if changed:
        ev["updated"] = today.isoformat()
        save_events(ev)
    state["seen"] = sorted(seen)[-300:]
    STATE.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("행사 데이터 갱신됨" if changed else "바뀐 내용 없음")
    return 0


if __name__ == "__main__":
    sys.exit(main())
