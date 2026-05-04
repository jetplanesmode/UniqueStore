/**
 * API base URL for the Express app (no trailing slash).
 *
 * After deploying the API to Render, set RENDER_API_URL to your service URL, e.g.
 *   https://your-service-name.onrender.com
 *
 * Local dev: opening the Cosmetics site from localhost/127.0.0.1 uses http://localhost:3000.
 *
 * Same host for static + API on Render: set RENDER_API_URL to "" (same-origin /api/...).
 */
(function () {
    if (typeof window === "undefined") return;
    if (window.__AUREA_API_BASE__ !== undefined) return;

    /**
     * Production API origin (https, no trailing slash).
     * Example: "https://ecommerce-api-xxxx.onrender.com"
     * Same-origin only: ""
     */
    var RENDER_API_URL = "https://uniquestore.onrender.com";

    var host = window.location.hostname;
    var isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "";

    if (isLocal) {
        window.__AUREA_API_BASE__ = "http://localhost:3000";
        return;
    }

    if (
        RENDER_API_URL &&
        RENDER_API_URL.indexOf("YOUR-SERVICE-NAME") === -1
    ) {
        window.__AUREA_API_BASE__ = RENDER_API_URL.replace(/\/+$/, "");
        return;
    }

    window.__AUREA_API_BASE__ = "";
    if (
        RENDER_API_URL &&
        RENDER_API_URL.indexOf("YOUR-SERVICE-NAME") !== -1
    ) {
        console.warn(
            "[api-config] Set RENDER_API_URL in Cosmetics/Scripts/api-config.js to your Render API URL, or use \"\" if the API is served from this same site."
        );
    }
})();
