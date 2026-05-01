/**
 * Shared utilities used across all pages (no DOM assumptions).
 */

/** Philippine Peso — display only; numeric values in storage stay as decimal strings/numbers. */
function formatPhp(amount) {
    const n =
        typeof amount === "number"
            ? amount
            : parseFloat(String(amount ?? "").replace(/,/g, ""));
    if (!Number.isFinite(n)) {
        return "₱0.00";
    }
    return (
        "₱" +
        n.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
    );
}

function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

function generateOrderId() {
    const t = Date.now().toString(36).toUpperCase();
    const r = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `AUR-${t}-${r}`;
}
