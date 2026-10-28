// 오픈 전 임시 잠금: 들어올 때마다(새 탭·새 방문) 비밀번호를 넣어야 사이트가 보임. 오픈할 때 이 파일과 각 페이지의 gate.js 줄을 지우면 됨.
(function () {
  var KEY = "bada-open", HASH = "ac4584b90286aec1085d8c45ce6c667fd81ec6fa46248ba10f9a5d354aad9710";
  try { if (sessionStorage.getItem(KEY) === HASH) return; } catch (e) {}
  var st = document.createElement("style");
  st.textContent = "body>*:not(#gate){display:none!important}#gate{position:fixed;inset:0;display:grid;place-items:center;background:#EAF6F8;font-family:'Gowun Dodum',sans-serif;color:#17324D;padding:16px;z-index:99}#gate form{background:#fff;border-radius:20px;padding:28px 24px;max-width:340px;width:100%;text-align:center;box-shadow:0 6px 0 #BFE3EC}#gate h1{font-family:Jua,sans-serif;font-weight:400;font-size:26px;margin:0 0 6px}#gate p{margin:0 0 16px;color:#4C6A80}#gate input{width:100%;box-sizing:border-box;font-size:18px;padding:12px;border:2px solid #CFE4EA;border-radius:12px;text-align:center}#gate button{margin-top:12px;width:100%;font-family:Jua,sans-serif;font-size:18px;padding:12px;border:0;border-radius:999px;background:#FFC83D;color:#17324D}#gate .err{color:#D9534F;min-height:1.4em;margin:8px 0 0}";
  document.head.appendChild(st);
  document.addEventListener("DOMContentLoaded", function () {
    var g = document.createElement("div"); g.id = "gate";
    g.innerHTML = '<form><h1>영종책바다</h1><p>홈페이지 준비 중이에요.</p><input type="password" inputmode="numeric" autocomplete="off" placeholder="비밀번호" aria-label="비밀번호"><button type="submit">들어가기</button><p class="err"></p></form>';
    document.body.appendChild(g);
    var f = g.querySelector("form"), i = g.querySelector("input");
    i.focus();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(i.value.trim())).then(function (b) {
        var h = Array.prototype.map.call(new Uint8Array(b), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
        if (h === HASH) { try { sessionStorage.setItem(KEY, h); } catch (e) {} g.remove(); st.remove(); window.scrollTo(0, 0); window.dispatchEvent(new Event("resize")); }
        else { g.querySelector(".err").textContent = "비밀번호가 맞지 않아요."; i.select(); }
      });
    });
  });
})();
