import re, os, urllib.request, urllib.parse, ssl
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"
sites={"kidsschole":["https://www.kidsschole.com","https://kidsschole.com","https://www.kidsschole.co.kr","https://m.kidsschole.com"],
       "moongchi":["https://www.moongchibooks.com","https://moongchibooks.com","https://www.moongchi.co.kr","https://moongchi.co.kr","https://www.moongchibooks.co.kr","https://www.mcbooks.co.kr"]}
os.makedirs("out",exist_ok=True)
def get(u):
    r=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":UA}),timeout=20); return r.geturl(), r.read()
for name,urls in sites.items():
    for u in urls:
        try:
            final,b=get(u)
        except Exception as e:
            print(name,u,"ERR",e); continue
        h=b.decode("utf-8","replace"); t=re.search(r"<title>(.*?)</title>",h,re.S)
        print(name,u,"->",final,"title:",(t.group(1).strip()[:80] if t else ""))
        cands=re.findall(r'''(?:src|href|content)=["']([^"']*logo[^"']*\.(?:png|svg|jpg|jpeg|gif|webp)[^"']*)["']''',h,re.I)
        cands+=re.findall(r'''property=["']og:image["'][^>]*content=["']([^"']+)''',h,re.I)
        seen=set()
        for i,c in enumerate(cands[:12]):
            full=urllib.parse.urljoin(final,c)
            if full in seen: continue
            seen.add(full)
            try:
                _,img=get(full); ext=os.path.splitext(urllib.parse.urlparse(full).path)[1] or ".img"
                fn=f"out/{name}-{len(seen)}{ext}"; open(fn,"wb").write(img); print("  saved",fn,len(img),full)
            except Exception as e: print("  imgERR",full,e)
        break
