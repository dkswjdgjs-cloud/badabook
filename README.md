# 영종 책바다 어린이서점 홈페이지

인천 영종도 어린이서점 '영종 책바다'의 홍보용 정적 홈페이지입니다.
이벤트·부모교실 안내, 매장 정보, 네이버 블로그·인스타그램·카카오 채널 연결을 담고 있습니다. 온라인 판매 기능은 없습니다.

- `index.html`: 페이지 한 장 (외부 라이브러리 없음, 글꼴은 Google Fonts)
- `images/`: 로고, 매장 사진, 이벤트 포스터
- 배포: GitHub Pages (main 브랜치 루트)

매장: 인천 영종구 하늘중앙로 193, 조양타워 3층 · 032-751-5490

## 출판사별 책 소개 고치기
- 책 목록은 `data/books.js` 한 파일에 있습니다. 출판사·책을 추가/수정하면 홈 카드, 출판사 페이지(`publisher.html?p=...`), 책 상세 페이지(`book.html?id=...`)에 모두 반영됩니다.
- 책 이미지는 `images/books/`에 넣고 `image` 항목에 경로를 적습니다.

## 행사 자동 반영 (인스타그램)

매일 오전 7시에 GitHub Actions(`.github/workflows/instagram-sync.yml`)가 `scripts/sync_instagram.py`를 실행해요.
인스타그램 새 게시물을 Claude가 읽고, 행사·부모교실 글이면 `data/events.js`에 추가해요. 사진은 `images/events/`에 저장돼요.
기간이 지난 행사는 홈페이지에서 자동으로 빠지거나 "종료"로 표시돼요.

- 필요한 비밀값(Settings → Secrets and variables → Actions): `IG_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`
- 바로 돌려보기: Actions 탭 → "인스타그램 행사 자동 반영" → Run workflow
- 직접 넣은 항목(`"source": "manual"`)은 자동 작업이 건드리지 않아요. 잘못 올라간 항목은 `data/events.js`에서 지우면 돼요.
