// 첫 화면 영업 중 표시 (월~금 10:30~18:30, 토 09:30~17:30, 일 휴무)
(function () {
  var el = document.getElementById("open-now"); if (!el) return;
  var H = { 1: [630, 1110], 2: [630, 1110], 3: [630, 1110], 4: [630, 1110], 5: [630, 1110], 6: [570, 1050] };
  var k = new Date(Date.now() + (new Date().getTimezoneOffset() + 540) * 60000); // 한국 시간
  var m = k.getHours() * 60 + k.getMinutes(), h = H[k.getDay()];
  var t = function (x) { return Math.floor(x / 60) + ":" + ("0" + (x % 60)).slice(-2); };
  if (h && m >= h[0] && m < h[1]) { el.textContent = "지금 영업 중 · " + t(h[1]) + "까지"; el.classList.add("on"); return; }
  if (h && m < h[0]) { el.textContent = "오늘 " + t(h[0]) + " 문 열어요"; return; }
  for (var i = 1; i <= 7; i++) { var d = (k.getDay() + i) % 7; if (H[d]) { el.textContent = "영업 종료 · " + (i === 1 ? "내일" : ["일", "월", "화", "수", "목", "금", "토"][d] + "요일") + " " + t(H[d][0]) + " 오픈"; return; } }
})();

// 처음 열 때는 항상 맨 위에서 시작 (브라우저가 이전 위치나 #주소로 내려가지 않게)
(function () {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  var go = location.hash && document.referrer.indexOf(location.host) > -1 && /index\.html|\/$/.test(location.pathname) ? location.hash : "";
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  var html = document.documentElement;
  var top = function () { html.style.scrollBehavior = "auto"; window.scrollTo(0, 0); html.style.scrollBehavior = ""; };
  var land = function () {
    var t = go && document.querySelector(go);
    if (t) t.scrollIntoView(); else top();
  };
  var moved = false;
  ["touchstart", "wheel", "keydown"].forEach(function (ev) { window.addEventListener(ev, function () { moved = true; }, { once: true, passive: true }); });
  land();
  window.addEventListener("load", function () { if (!moved) land(); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) top(); });
  // 메뉴를 눌러도 주소창에 #이 남지 않게
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var t = document.querySelector(a.getAttribute("href"));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: "smooth" });
  });
})();

// 이벤트·부모교실: data/events.js 를 읽어 그림 (인스타 자동 동기화가 이 파일을 매일 고침)
(function () {
  var E = window.EVENTS, grid = document.getElementById("promo-grid"), cls = document.getElementById("class-wrap");
  if (!E || (!grid && !cls)) return;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var now = new Date(), today = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2);
  var items = E.items || [];

  if (grid) {
    var t = document.getElementById("news-title"); if (t) t.textContent = (now.getMonth() + 1) + "월 소식";
    var live = items.filter(function (it) {
      if (it.kind !== "promo") return false;
      if (it.always) return true;
      if (it.end) return it.end >= today;
      return it.posted ? (Date.parse(today) - Date.parse(it.posted)) / 864e5 <= 30 : false;
    }).sort(function (a, b) {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.always ? 1 : 0) - (b.always ? 1 : 0) || String(b.posted || b.start).localeCompare(String(a.posted || a.start));
    });
    grid.innerHTML = live.map(function (it, i) {
      return '<article class="promo' + (i === 0 && !it.always ? " main" : "") + '">' +
        (it.image ? '<img class="promo-img" src="' + esc(it.image) + '" alt="' + esc(it.title) + '" loading="lazy">' : "") +
        (it.tag ? '<span class="tag">' + esc(it.tag) + '</span>' : "") +
        '<h3>' + esc(it.title) + '</h3>' +
        (it.body ? '<p>' + esc(it.body) + '</p>' : "") +
        (it.meta ? '<p class="meta">' + esc(it.meta) + '</p>' : "") +
        (it.link ? '<p class="meta"><a href="' + esc(it.link) + '" target="_blank" rel="noopener">인스타그램에서 자세히 보기 →</a></p>' : "") +
        '</article>';
    }).join("");
    var empty = document.getElementById("promo-empty"); if (empty) empty.hidden = live.some(function (it) { return !it.always; });
  }

  if (cls) {
    var W = ["일", "월", "화", "수", "목", "금", "토"];
    var groups = items.filter(function (it) { return it.kind === "class" && it.sessions && it.sessions.length; });
    var upcoming = groups.filter(function (g) { return g.sessions.some(function (s) { return s.date >= today; }); });
    var pick = upcoming.length ? upcoming : groups.slice().sort(function (a, b) { return b.sessions[b.sessions.length - 1].date.localeCompare(a.sessions[a.sessions.length - 1].date); }).slice(0, 1);
    var sess = [], poster = "";
    pick.forEach(function (g) { if (!poster && g.image) poster = g.image; g.sessions.forEach(function (s) { sess.push(s); }); });
    sess.sort(function (a, b) { return a.date.localeCompare(b.date); });
    var colors = ["kelp", "sea", ""];
    cls.innerHTML = (poster ? '<img class="poster" src="' + esc(poster) + '" alt="부모교실 일정 안내 포스터" loading="lazy">' : "") +
      '<div class="events">' + sess.map(function (s, i) {
        var d = new Date(s.date + "T00:00:00"), done = s.date < today;
        return '<article class="event' + (done ? " done" : "") + '">' +
          '<div class="date"><div class="m">' + (d.getMonth() + 1) + '월</div><div class="d">' + d.getDate() + '</div><div class="w">' + W[d.getDay()] + (s.time ? " · " + esc(s.time) : "") + '</div></div>' +
          '<div><h3>' + esc(s.title) + (done ? ' <small class="ended">종료</small>' : "") + '</h3>' + (s.info ? '<p class="info">' + esc(s.info) + '</p>' : "") + '</div>' +
          (s.target ? '<span class="age ' + colors[i % 3] + '">' + esc(s.target) + '</span>' : "") +
          (done ? "" : '<a class="apply" href="sms:01075405490?&body=' + encodeURIComponent("[부모교실 신청] " + (d.getMonth() + 1) + "/" + d.getDate() + " " + s.title + " / 이름: / 아이 나이: ") + '">✉ 문자로 신청</a>') +
          '</article>';
      }).join("") + '</div>';
    if (!poster) cls.classList.add("no-poster");
    var note = document.getElementById("class-note");
    if (note) note.textContent = sess.length && !upcoming.length
      ? "이번 부모교실은 끝났어요. 다음 일정은 인스타그램과 블로그에서 먼저 알려드려요."
      : (sess.length ? "" : "다음 부모교실 일정은 인스타그램과 블로그에서 먼저 알려드려요.");
    if (note) note.hidden = !note.textContent;
    var next = sess.filter(function (s) { return s.date >= today; })[0];
    var tc = document.getElementById("tile-class");
    if (tc && next) { var nd = new Date(next.date + "T00:00:00"); tc.textContent = "다음 " + (nd.getMonth() + 1) + "/" + nd.getDate() + "(" + W[nd.getDay()] + ")"; }
  }

  // 첫 화면 행사 배너
  var ban = document.getElementById("ban");
  if (ban) {
    var Wd = ["일", "월", "화", "수", "목", "금", "토"];
    var slides = items.filter(function (it) { return it.kind === "promo" && it.image && !it.always && it.end && it.end >= today; })
      .sort(function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0); })
      .map(function (it) { return { img: it.image, tag: it.tag, title: it.title, body: it.body, meta: it.meta, href: "#news" }; });
    items.forEach(function (it) {
      if (it.kind !== "class" || !it.image || !it.sessions) return;
      var up = it.sessions.filter(function (s) { return s.date >= today; });
      if (!up.length) return;
      slides.push({ img: it.image, tag: "부모교실 · 무료", title: it.title, body: up.map(function (s) { var d = new Date(s.date + "T00:00:00"); return (d.getMonth() + 1) + "/" + d.getDate() + "(" + Wd[d.getDay()] + ") " + s.title; }).join(" · "), meta: "문자로 신청 010-7540-5490", href: "#events" });
    });
    var tn = document.getElementById("tile-news"); if (tn && slides.length) tn.textContent = slides.length + "개 진행 중";
    if (slides.length) {
      document.getElementById("ban-sec").hidden = false;
      ban.innerHTML = slides.map(function (x, i) {
        return '<a class="slide" href="' + x.href + '" aria-label="' + (i + 1) + ' / ' + slides.length + '">' +
          '<span class="s-img"><img src="' + esc(x.img) + '" alt="' + esc(x.title) + '"' + (i ? ' loading="lazy"' : "") + '></span>' +
          '<span class="s-cap">' + (x.tag ? '<span class="tag">' + esc(x.tag) + '</span>' : "") + '<b class="s-title">' + esc(x.title) + '</b>' +
          (x.body ? '<span class="s-body">' + esc(x.body) + '</span>' : "") + (x.meta ? '<span class="s-meta">' + esc(x.meta) + '</span>' : "") +
          '<span class="s-more">자세히 보기 →</span></span></a>';
      }).join("");
      var dots = document.getElementById("ban-dots");
      dots.innerHTML = slides.map(function () { return "<i></i>"; }).join("");
      var cur = 0, timer;
      var mark = function () { Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle("on", i === cur); }); };
      var go = function (i) { cur = (i + slides.length) % slides.length; ban.scrollTo({ left: ban.clientWidth * cur, behavior: "smooth" }); mark(); };
      ban.addEventListener("scroll", function () { var i = Math.round(ban.scrollLeft / ban.clientWidth); if (i !== cur) { cur = i; mark(); } }, { passive: true });
      document.querySelector(".ban-prev").addEventListener("click", function () { go(cur - 1); });
      document.querySelector(".ban-next").addEventListener("click", function () { go(cur + 1); });
      var play = function () { clearInterval(timer); if (slides.length > 1) timer = setInterval(function () { go(cur + 1); }, 6000); };
      ["touchstart", "mouseenter", "focusin"].forEach(function (ev) { ban.addEventListener(ev, function () { clearInterval(timer); }, { passive: true }); });
      ban.addEventListener("mouseleave", play);
      if (slides.length < 2) document.querySelector(".ban-nav").hidden = true;
      mark(); play();
    }
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
        (p.logo ? '<span class="pc-logo"><img src="' + esc(p.logo) + '" alt="' + esc(p.name) + ' 로고" style="width:' + (p.logoW || 140) + 'px"></span>' : '') +
        '<span class="pc-badge">' + esc(p.badge) + '</span>' +
        '<h3>' + esc(p.name) + '</h3><p>' + esc(p.intro) + '</p>' +
        '<span class="pc-go">책 ' + p.books.length + '종 보기 →</span></span></a>';
    }).join("");
    var wrap = rail.parentNode;
    var fit = function () { wrap.classList.toggle("fits", rail.scrollWidth <= rail.clientWidth + 2); };
    fit(); window.addEventListener("resize", fit);
    wrap.querySelector(".prev").addEventListener("click", function () { rail.scrollBy({ left: -rail.clientWidth * 0.8, behavior: "smooth" }); });
    wrap.querySelector(".next").addEventListener("click", function () { rail.scrollBy({ left: rail.clientWidth * 0.8, behavior: "smooth" }); });
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
