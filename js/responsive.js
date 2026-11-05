/* 手机上让 iframe 自己长高
   原站用一个 6000px 高的 iframe 硬撑内容，宽度一收窄内容就被裁掉。
   只在小屏生效：读 iframe 文档里最后一个元素的底边，回写成 iframe 高度。
   不能用 scrollHeight —— 它至少等于 iframe 视口高（默认 150），
   像"横向标签条"这种只有 40px 的菜单会被撑出 110px 空白。 */
(function () {
    var BREAK = 820;

    function contentH(doc) {
        var b = doc.body;
        if (!b) return 0;
        var max = 0;
        for (var i = 0; i < b.children.length; i++) {
            var el = b.children[i];
            var tag = el.tagName;
            if (tag === "SCRIPT" || tag === "STYLE" || tag === "LINK" ||
                tag === "META" || tag === "NOSCRIPT") continue;
            var r = el.getBoundingClientRect();
            if (r.height > 0 && r.bottom > max) max = r.bottom;
        }
        if (max < 20) {
            max = Math.max(b.scrollHeight || 0, doc.documentElement.scrollHeight || 0);
        }
        return Math.ceil(max + 10);
    }

    function fit(f) {
        try {
            var doc = f.contentDocument;
            if (!doc || !doc.documentElement || !doc.body) return;
            var h = contentH(doc);
            if (!h) return;
            var cur = parseFloat(f.style.height) || 0;
            if (Math.abs(cur - h) > 4) f.style.height = h + "px";
        } catch (e) { /* 跨域就算了 */ }
    }

    function watch(f) {
        try {
            var body = f.contentDocument && f.contentDocument.body;
            if (!body || !window.ResizeObserver) return;
            if (f.__ro) f.__ro.disconnect();  // iframe 换页后旧文档已失效
            var ro = new ResizeObserver(function () { fit(f); });
            ro.observe(body);
            f.__ro = ro;
        } catch (e) {}
    }

    function each(fn) {
        var fs = document.getElementsByTagName("iframe");
        for (var i = 0; i < fs.length; i++) fn(fs[i]);
    }

    function mobile() {
        return window.innerWidth <= BREAK;
    }

    function apply() {
        each(function (f) {
            if (mobile()) {
                if (!f.__orig) {
                    f.__orig = { h: f.getAttribute("height"), sc: f.getAttribute("scrolling") };
                }
                f.style.width = "100%";
                f.removeAttribute("height");
                f.setAttribute("scrolling", "no");
                fit(f);
                watch(f);
            } else if (f.__orig) {
                f.style.height = "";
                f.style.width = "";
                if (f.__orig.h !== null) f.setAttribute("height", f.__orig.h);
                else f.removeAttribute("height");
                if (f.__orig.sc !== null) f.setAttribute("scrolling", f.__orig.sc);
            }
        });
    }

    function bind() {
        each(function (f) {
            if (f.__bound) return;
            f.__bound = true;
            f.addEventListener("load", function () {
                if (!mobile()) return;
                fit(f);
                watch(f);
                setTimeout(function () { fit(f); }, 300);
                setTimeout(function () { fit(f); }, 1200);
            });
        });
    }

    function boot() {
        bind();
        apply();
        [400, 1000, 2500].forEach(function (t) { setTimeout(apply, t); });
    }

    var rt;
    window.addEventListener("resize", function () {
        clearTimeout(rt);
        rt = setTimeout(apply, 150);
    });
    window.addEventListener("load", function () { setTimeout(apply, 50); });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
