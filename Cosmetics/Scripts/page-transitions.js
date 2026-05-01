/**
 * Page transitions: dark veil fades in before navigation (no white flash through html opacity).
 * Load immediately after core.js on every page.
 */
(function () {
    /** Slightly longer than CSS veil opacity transition + buffer */
    const VEIL_FALLBACK_MS = 480;

    document.documentElement.classList.add("js-page-transitions");

    function prefersReducedMotion() {
        return (
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
    }

    function startPageExit(done) {
        if (prefersReducedMotion()) {
            done();
            return;
        }
        const veil = document.createElement("div");
        veil.className = "page-transition-veil";
        veil.setAttribute("aria-hidden", "true");
        document.body.appendChild(veil);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                veil.classList.add("is-visible");
            });
        });

        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            done();
        };

        const timer = setTimeout(finish, VEIL_FALLBACK_MS);

        veil.addEventListener(
            "transitionend",
            function onEnd(ev) {
                if (ev.target !== veil || ev.propertyName !== "opacity") return;
                clearTimeout(timer);
                veil.removeEventListener("transitionend", onEnd);
                finish();
            },
            { once: true }
        );
    }

    window.startPageExit = startPageExit;

    document.addEventListener(
        "click",
        function (e) {
            if (e.defaultPrevented) return;
            if (e.button !== 0) return;
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

            const a = e.target.closest("a[href]");
            if (!a) return;
            if (a.target === "_blank" || a.download) return;

            const href = a.getAttribute("href");
            if (
                !href ||
                href === "#" ||
                href.startsWith("mailto:") ||
                href.startsWith("tel:") ||
                href.startsWith("javascript:")
            ) {
                return;
            }

            let url;
            try {
                url = new URL(href, window.location.href);
            } catch {
                return;
            }

            if (url.origin !== window.location.origin) return;
            if (!url.pathname.endsWith(".html")) return;

            const baseNow = window.location.href.replace(/#.*$/, "");
            const baseUrl = url.href.replace(/#.*$/, "");
            if (
                window.location.pathname === url.pathname &&
                url.hash &&
                baseUrl === baseNow
            ) {
                return;
            }

            if (prefersReducedMotion()) return;

            e.preventDefault();
            startPageExit(() => {
                window.location.href = url.href;
            });
        },
        false
    );
})();
