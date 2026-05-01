/**
 * Order confirmation page — reads lastOrder from localStorage.
 * Depends on: core.js (escapeHtml)
 */

function renderConfirmationFromStorage() {
    const confirmEl = document.getElementById("confirmation-root");
    if (!confirmEl) return;

    let data = null;
    try {
        const raw = localStorage.getItem("lastOrder");
        data = raw ? JSON.parse(raw) : null;
    } catch (e) {
        data = null;
    }

    if (!data || !data.orderId) {
        confirmEl.innerHTML =
            '<div class="confirmation-card">' +
            "<p>No recent order found.</p>" +
            '<a class="cart-link-btn" href="shop.html">Continue shopping</a>' +
            "</div>";
        return;
    }

    const email = data.shipping && data.shipping.email ? data.shipping.email : "";
    const fullname =
        data.shipping && data.shipping.fullname ? data.shipping.fullname : "";
    const shipping = data.shipping || {};
    const paymentMethod =
        data.payment && data.payment.method ? data.payment.method : "";
    const paymentLabel =
        data.payment && data.payment.label ? data.payment.label : "";

    confirmEl.innerHTML =
        '<div class="confirmation-card">' +
        '<p class="confirmation-brand">Auréa Collection</p>' +
        "<h2>Thank you for your order</h2>" +
        '<p class="confirmation-order-id">Order <strong>' +
        escapeHtml(data.orderId) +
        "</strong></p>" +
        '<p class="confirmation-msg">We\'ve received your order and sent a confirmation to <strong>' +
        escapeHtml(email) +
        "</strong>.</p>" +
        '<div class="confirmation-details">' +
        "<p><strong>Ship to:</strong> " +
        escapeHtml(fullname) +
        "<br>" +
        escapeHtml(shipping.address || "") +
        (shipping.address2
            ? "<br>" + escapeHtml(shipping.address2)
            : "") +
        "<br>" +
        escapeHtml(shipping.city || "") +
        ", " +
        escapeHtml(shipping.state || "") +
        " " +
        escapeHtml(shipping.zip || "") +
        "<br>" +
        escapeHtml(shipping.country || "") +
        "</p>" +
        '<p class="confirmation-payment"><strong>Payment:</strong> ' +
        escapeHtml(paymentLabel) +
        (paymentMethod === "wallet"
            ? "<br><span class=\"confirmation-pay-hint\">Watch your email for GCash / Maya payment instructions.</span>"
            : "<br><span class=\"confirmation-pay-hint\">Have cash ready for the courier on delivery.</span>") +
        "</p>" +
        '<p class="confirmation-total"><strong>Order total:</strong> ' +
        formatPhp(Number(data.subtotal || 0)) +
        "</p>" +
        "</div>" +
        '<div class="confirmation-actions">' +
        '<a class="cart-link-btn" href="index.html">Continue shopping</a>' +
        "</div>" +
        "</div>";
}
