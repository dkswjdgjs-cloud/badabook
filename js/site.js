(function () {
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
        (p.logo ? '<span class="pc-logo"><img src="' + esc(p.logo) + '" alt="' + esc(p.name) + ' 로고"></span>' : '') +
        '<span class="pc-badge">' + esc(p.badge) + '</span>' +
        '<div><h3>' + esc(p.name) + '</h3><p>' + esc(p.intro) + '</p></div>' +
        '<span class="pc-go">책 ' + p.books.length + '종 보기 →</span></a>';
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
      '<div class="page-title">' + (p.logo ? '<span class="pub-logo"><img src="' + esc(p.logo) + '" alt=""></span>' : '<span class="dot"></span>') + '<h1>' + esc(p.name) + '</h1></div>' +
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
