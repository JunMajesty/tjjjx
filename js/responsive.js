/* 手机上让 iframe 自己长高
   原站用一个 6000px 高的 iframe 硬撑内容，宽度一收窄就会被裁掉。
   这里只在小屏生效：读 iframe 里文档的实际高度，回写到 iframe 上。
   同源页面才能读到 contentDocument，跨域的会静默跳过。 */
(function () {
    var BREAK = 820;
    var timers = [];

    function scrollH(doc) {
        var b = doc.body, h = doc.documentElement;
        return Math.max(
            b ? b.scrollHeight : 0,
            b ? b.offsetHeight : 0,
            h ? h.scrollHeight : 0,
            h ? h.offsetHeight : 0
        );
    }

    function fit(f) {
        try {
            var doc = f.contentDocument;
            if (!doc || !doc.documentElement) return;
            var h = scrollH(doc);
            if (!h) return;
            var cur = parseFloat(f.style.height) || 0;
            if (Math.abs(cur - h) > 4) f.style.height = h + "px";
        } catch (e) { /* 跨域就算了 */ }
    }

    function watch(f) {
        try {
            var body = f.contentDocument && f.contentDocument.body;
            if (!body || !window.ResizeObserver) return;
            if (f.__ro) f.__ro.disconnect();  // iframe 换页后旧文档已失效，重新挂
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
        // 图片是懒加载/慢网时高度会二次变化，补几拍
        [400, 1000, 2500].forEach(function (t) {
            timers.push(setTimeout(apply, t));
        });
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
