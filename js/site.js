// 가로 넘기기 줄(출판사·이달 소식): 화살표 버튼, 다 보이면 버튼·안내 숨김
function railButtons(rail, hint) {
  var wrap = rail.parentNode, prev = wrap.querySelector(".prev"), next = wrap.querySelector(".next");
  var icon = function (d) { return '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
  prev.innerHTML = icon("M14.5 5.5 8 12l6.5 6.5");
  next.innerHTML = icon("M9.5 5.5 16 12l-6.5 6.5");
  var update = function () {
    var max = rail.scrollWidth - rail.clientWidth;
    wrap.classList.toggle("fits", max <= 2);
    if (hint) hint.hidden = max <= 2;
    prev.disabled = rail.scrollLeft <= 2;          // 맨 앞이면 왼쪽 화살표 흐리게
    next.disabled = rail.scrollLeft >= max - 2;    // 맨 끝이면 오른쪽 화살표 흐리게
  };
  update();
  window.addEventListener("resize", update);
  rail.addEventListener("scroll", update, { passive: true });
  window.addEventListener("load", update);
  // 숨겨져 있다가(비밀번호 화면 등) 보이게 될 때도 다시 계산
  if ("ResizeObserver" in window) new ResizeObserver(update).observe(rail);
  var step = function (dir) {
    var card = rail.firstElementChild, gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    var w = card ? card.getBoundingClientRect().width + gap : rail.clientWidth * 0.8;
    var n = Math.max(1, Math.floor((rail.clientWidth + gap) / w)); // 한 화면에 보이는 카드 수만큼 넘김
    rail.scrollBy({ left: dir * w * n, behavior: "smooth" });
  };
  prev.addEventListener("click", function () { step(-1); });
  next.addEventListener("click", function () { step(1); });
}

// 처음 열 때는 항상 맨 위에서 시작 (브라우저가 이전 위치나 #주소로 내려가지 않게)
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  var go = location.hash && document.referrer.indexOf(location.host) > -1 && /index\.html|\/$/.test(location.pathname) ? location.hash : "";
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  var html = document.documentElement;
  var top = function () { html.style.scrollBehavior = "auto"; window.scrollTo(0, 0); html.style.scrollBehavior = ""; };
  // 섹션 제목이 머리 메뉴 바로 아래 오도록 이동 (카드 아래까지 한 화면에 더 보이게)
  var TIGHT = { news: 1, channels: 1 }; // 이 섹션만 제목을 메뉴 바로 아래로, 나머지는 예전 위치
  var goTo = function (t, smooth) {
    if (!TIGHT[t.id]) { if (!smooth) html.style.scrollBehavior = "auto"; t.scrollIntoView({ behavior: smooth ? "smooth" : "auto" }); if (!smooth) html.style.scrollBehavior = ""; return; }
    var head = document.querySelector("header"), title = t.querySelector("h2") || t;
    var y = title.getBoundingClientRect().top + window.pageYOffset - (head ? head.offsetHeight : 0) - 20;
    if (!smooth) html.style.scrollBehavior = "auto";
    window.scrollTo({ top: Math.max(0, y), behavior: smooth ? "smooth" : "auto" });
    if (!smooth) html.style.scrollBehavior = "";
  };
  // 뒤로 가기로 돌아왔으면 보던 자리(페이지 높이 + 넘겨 둔 가로 줄)로 복원
  var nav = (performance.getEntriesByType && performance.getEntriesByType("navigation")[0]) || {};
  var POS = "bada-pos:" + location.pathname + location.search, saved = null;
  try { saved = nav.type === "back_forward" ? JSON.parse(sessionStorage.getItem(POS) || "null") : null; } catch (e) {}
  var RAILS = ["promo-grid", "pub-rail"];
  window.addEventListener("pagehide", function () {
    var pos = { y: window.pageYOffset, rails: {} };
    RAILS.forEach(function (id) { var r = document.getElementById(id); if (r) pos.rails[id] = r.scrollLeft; });
    try { sessionStorage.setItem(POS, JSON.stringify(pos)); } catch (e) {}
  });
  var land = function () {
    if (saved) {
      RAILS.forEach(function (id) { var r = document.getElementById(id); if (r && saved.rails && saved.rails[id]) r.scrollLeft = saved.rails[id]; });
      html.style.scrollBehavior = "auto"; window.scrollTo(0, saved.y || 0); html.style.scrollBehavior = "";
      return;
    }
    var t = go && document.querySelector(go);
    if (t) goTo(t, false); else top();
  };
  var moved = false;
  ["touchstart", "wheel", "keydown"].forEach(function (ev) { window.addEventListener(ev, function () { moved = true; }, { once: true, passive: true }); });
  land();
  window.addEventListener("load", function () { if (!moved) land(); });
  // 브라우저가 페이지를 통째로 기억해 둔 경우(뒤로 가기)는 그 위치 그대로 둠
  // 메뉴를 눌러도 주소창에 #이 남지 않게
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var t = document.querySelector(a.getAttribute("href"));
    if (!t) return;
    e.preventDefault();
    goTo(t, true);
  });
})();

// 이벤트·부모교실: data/events.js 를 읽어 그림 (블로그 자동 동기화가 이 파일을 매일 고침)
(function () {
  var E = window.EVENTS, grid = document.getElementById("promo-grid"), cls = document.getElementById("class-wrap");
  if (!E || (!grid && !cls)) return;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var now = new Date(), today = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2);
  var items = E.items || [];

  if (grid) {
    var t = document.getElementById("news-title"); if (t) t.textContent = (now.getMonth() + 1) + "월 소식";
    // 아침 자동 확인 시각 (data/last-check.js)
    var stamp = document.getElementById("news-updated"), ck = window.EVENTS_CHECKED && new Date(window.EVENTS_CHECKED);
    if (stamp && ck && !isNaN(ck)) {
      var hh = ck.getHours(), mm = ("0" + ck.getMinutes()).slice(-2);
      stamp.textContent = (ck.getMonth() + 1) + "월 " + ck.getDate() + "일 " + (hh < 12 ? "오전 " : "오후 ") + (hh % 12 || 12) + ":" + mm + " 업데이트";
      stamp.hidden = false;
    }
    var live = items.filter(function (it) {
      if (it.kind !== "promo") return false;
      if (it.always) return true;
      if (it.end) return it.end >= today;
      return it.posted ? (Date.parse(today) - Date.parse(it.posted)) / 864e5 <= 30 : false;
    }).sort(function (a, b) {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.always ? 1 : 0) - (b.always ? 1 : 0) || String(b.posted || b.start).localeCompare(String(a.posted || a.start));
    });
    var BLOG = "https://blog.naver.com/badaikidsbook";
    grid.innerHTML = live.map(function (it, i) {
      var href = it.link || BLOG, where = /instagram\.com/.test(href) ? "인스타그램" : "블로그";
      return '<a class="promo' + (i === 0 && !it.always ? " main" : "") + '" href="' + esc(href) + '" target="_blank" rel="noopener">' +
        (it.image ? '<img class="promo-img" src="' + esc(it.image) + '" alt="' + esc(it.title) + '" loading="lazy">' : "") +
        (it.tag ? '<span class="tag">' + esc(it.tag) + '</span>' : "") +
        '<h3>' + esc(it.title) + '</h3>' +
        (it.body ? '<p>' + esc(it.body) + '</p>' : "") +
        (it.meta ? '<p class="meta">' + esc(it.meta) + '</p>' : "") +
        '<span class="more">' + where + (it.link ? "에서 자세히 보기 →" : " 가기 →") + '</span>' +
        '</a>';
    }).join("");
    railButtons(grid, document.getElementById("promo-hint"));
    var empty = document.getElementById("promo-empty"); if (empty) empty.hidden = live.some(function (it) { return !it.always; });
  }

  if (cls) {
    var W = ["일", "월", "화", "수", "목", "금", "토"];
    var groups = items.filter(function (it) { return it.kind === "class" && it.sessions && it.sessions.length; });
    var upcoming = groups.filter(function (g) { return g.sessions.some(function (s) { return s.date >= today; }); });
    var pick = upcoming.length ? upcoming : groups.slice().sort(function (a, b) { return b.sessions[b.sessions.length - 1].date.localeCompare(a.sessions[a.sessions.length - 1].date); }).slice(0, 1);
    var sess = [], poster = "", plink = "";
    pick.forEach(function (g) { if (!poster && g.image) poster = g.image; if (!plink && g.link) plink = g.link; g.sessions.forEach(function (s) { sess.push(s); }); });
    sess.sort(function (a, b) { return a.date.localeCompare(b.date); });
    var colors = ["kelp", "sea", ""];
    var pimg = poster ? '<img class="poster" src="' + esc(poster) + '" alt="부모교실 일정 안내 포스터" loading="lazy">' : "";
    if (pimg && plink) pimg = '<a class="poster-link" href="' + esc(plink) + '" target="_blank" rel="noopener" title="블로그에서 자세히 보기">' + pimg + '</a>';
    cls.innerHTML = pimg +
      '<div class="events">' + sess.map(function (s, i) {
        var d = new Date(s.date + "T00:00:00"), done = s.date < today;
        return '<article class="event' + (done ? " done" : "") + '">' +
          '<div class="date"><div class="m">' + (d.getMonth() + 1) + '월</div><div class="d">' + d.getDate() + '</div><div class="w">' + W[d.getDay()] + (s.time ? " · " + esc(s.time) : "") + '</div></div>' +
          '<div><h3>' + esc(s.title) + (done ? ' <small class="ended">종료</small>' : "") + '</h3>' + (s.info ? '<p class="info">' + esc(s.info) + '</p>' : "") + '</div>' +
          (s.target ? '<span class="age ' + colors[i % 3] + '">' + esc(s.target) + '</span>' : "") +
          '</article>';
      }).join("") + '</div>';
    if (!poster) cls.classList.add("no-poster");
    var note = document.getElementById("class-note");
    if (note) note.textContent = sess.length && !upcoming.length
      ? "이번 부모교실은 끝났어요. 다음 일정은 인스타그램과 블로그에서 먼저 알려드려요."
      : (sess.length ? "" : "다음 부모교실 일정은 인스타그램과 블로그에서 먼저 알려드려요.");
    if (note) note.hidden = !note.textContent;
  }
})();

(function () {
  // 모바일 탭 메뉴: 지금 보고 있는 칸 표시
  var links = Array.prototype.slice.call(document.querySelectorAll('nav a[href^="#"]'));
  if (links.length && "IntersectionObserver" in window) {
    var mark = function (id) { links.forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + id); }); };
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); }); }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (a) { var t = document.querySelector(a.getAttribute("href")); if (t) io.observe(t); });
  }
  var D = window.BOOKSHOP; if (!D) return;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function q(k) { return new URLSearchParams(location.search).get(k); }
  function cover(b, p, cls) {
    return b.image
      ? '<img class="' + cls + '" src="' + esc(b.image) + '" alt="' + esc(b.title) + '">'
      : '<div class="' + cls + ' cover-ph" style="--pc:' + p.color + '" aria-hidden="true">' + esc(b.title) + '</div>';
  }
  function findBook(id) {
    for (var i = 0; i < D.publishers.length; i++) for (var j = 0; j < D.publishers[i].books.length; j++)
      if (D.publishers[i].books[j].id === id) return { p: D.publishers[i], b: D.publishers[i].books[j] };
    return null;
  }

  // 홈: 출판사 카드
  var rail = document.getElementById("pub-rail");
  if (rail) {
    rail.innerHTML = D.publishers.map(function (p) {
      return '<a class="pub-card" style="--pc:' + p.color + '" href="publisher.html?p=' + p.id + '">' +
        '<span class="spine" aria-hidden="true"></span><span class="in">' +
        (p.logo ? '<span class="pc-logo"><img src="' + esc(p.logo) + '" alt="' + esc(p.name) + ' 로고" style="width:' + (p.logoW || 140) + 'px"></span>' : '<span class="pc-logo pc-logo-text">' + esc(p.name) + '</span>') +
        '<span class="pc-badge">' + esc(p.badge) + '</span>' +
        '<h3>' + esc(p.name) + '</h3><p>' + esc(p.intro) + '</p>' +
        '<span class="pc-go">책 ' + p.books.length + '종 보기 →</span></span></a>';
    }).join("");
    railButtons(rail);
  }

  // 출판사 페이지: 책 목록
  var pubRoot = document.getElementById("publisher-page");
  if (pubRoot) {
    var p = D.publishers.filter(function (x) { return x.id === q("p"); })[0] || D.publishers[0];
    document.title = p.name + " | 영종 책바다";
    pubRoot.style.setProperty("--pc", p.color);
    pubRoot.innerHTML =
      '<div class="page-head"><div class="wrap">' +
      '<div class="crumb"><a href="index.html#books">출판사별 책 소개</a><span>›</span><span>' + esc(p.name) + '</span></div>' +
      '<div class="page-title">' + (p.logo ? '<span class="pub-logo"><img src="' + esc(p.logo) + '" alt="" style="width:' + Math.round((p.logoW || 140) * 0.75) + 'px"></span>' : '<span class="dot"></span>') + '<h1>' + esc(p.name) + '</h1></div>' +
      '<p class="page-lead">' + esc(p.intro) + '</p>' +
      (D.temporary ? '<p class="temp-note">책 목록은 준비 중이에요. 곧 전체 목록으로 바뀌어요.</p>' : '') +
      '</div></div>' +
      '<section class="band" style="padding-top:24px"><div class="wrap"><ul class="book-list">' +
      p.books.map(function (b) {
        return '<li><a class="book-row" href="book.html?id=' + b.id + '">' + cover(b, p, "thumb") +
          '<div><h2>' + esc(b.title) + '</h2><p class="meta">' + esc([b.age, b.summary].filter(Boolean).join(" · ")) + '</p></div>' +
          '<span class="go">자세히 →</span></a></li>';
      }).join("") + '</ul></div></section>';
  }

  // 책 상세 페이지
  var bookRoot = document.getElementById("book-page");
  if (bookRoot) {
    var r = findBook(q("id")) || { p: D.publishers[0], b: D.publishers[0].books[0] };
    var b = r.b, pp = r.p;
    document.title = b.title + " | 영종 책바다";
    bookRoot.style.setProperty("--pc", pp.color);
    var facts = [["출판사", pp.name], ["대상", b.age], ["구성", b.parts || b.summary]].filter(function (f) { return f[1]; });
    bookRoot.innerHTML =
      '<div class="page-head"><div class="wrap">' +
      '<div class="crumb"><a href="index.html#books">출판사별 책 소개</a><span>›</span><a href="publisher.html?p=' + pp.id + '">' + esc(pp.name) + '</a><span>›</span><span>' + esc(b.title) + '</span></div>' +
      '<div class="page-title"><span class="dot"></span><h1>' + esc(b.title) + '</h1></div>' +
      '</div></div>' +
      '<section class="band" style="padding-top:24px"><div class="wrap book-detail">' + cover(b, pp, "cover") +
      '<div class="detail-body">' +
      '<p class="desc">' + esc(b.desc || b.summary) + '</p>' +
      '<dl class="facts">' + facts.map(function (f) { return '<dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd>'; }).join("") + '</dl>' +
      (b.event ? '<div class="event-box"><b>지금 진행 중인 혜택</b>' + esc(b.event) + '</div>' : '') +
      '<p>견본 도서가 매장에 있어요. 직접 펼쳐 보고 상담받으세요.</p>' +
      '<div class="cta-row"><a class="btn btn-sun" href="https://pf.kakao.com/_FUjhxj" target="_blank" rel="noopener">카카오 채널로 상담하기</a>' +
      '<a class="btn btn-line" href="tel:0327515490">032-751-5490</a></div>' +
      '</div></div></section>';
  }
})();
