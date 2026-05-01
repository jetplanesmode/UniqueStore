/**
 * Checkout page: summary, payment panels, place order → confirmation.html
 * Depends on: core.js, cart.js
 */

const PAYMENT_LABELS = {
    cod: "Cash on delivery",
    wallet: "e-Wallet (GCash / Maya)",
};

function syncPaymentPanels() {
    const selected = document.querySelector(
        'input[name="paymentMethod"]:checked'
    );
    document.querySelectorAll(".payment-panel").forEach((panel) => {
        panel.classList.add("hidden");
    });
    if (!selected) return;
    const panel = document.getElementById("payment-panel-" + selected.value);
    if (panel) panel.classList.remove("hidden");
}

function renderCheckoutSummary() {
    const el = document.getElementById("checkout-summary");
    const form = document.getElementById("checkout-form");
    if (!el) return;
    const { subtotal, lines } = getCartTotals();
    if (lines.length === 0) {
        el.innerHTML =
            '<div class="checkout-empty">' +
            '<p>Your cart is empty.</p>' +
            '<a class="cart-link-btn" href="shop.html">Browse shop</a>' +
            "</div>";
        if (form) form.classList.add("hidden");
        return;
    }
    if (form) form.classList.remove("hidden");
    syncPaymentPanels();
    const rows = lines.map((ln) => {
        return `
            <div class="checkout-summary-line">
                <span class="checkout-sum-name">${escapeHtml(ln.name)} × ${ln.quantity}</span>
                <span class="checkout-sum-price">${formatPhp(ln.lineTotal)}</span>
            </div>`;
    });
    el.innerHTML =
        '<h3 class="checkout-summary-title">Order summary</h3>' +
        '<div class="checkout-summary-lines">' +
        rows.join("") +
        "</div>" +
        '<p class="checkout-summary-total">Subtotal: <strong>' +
        formatPhp(subtotal) +
        "</strong></p>";
}

function placeOrder(event) {
    event.preventDefault();
    const cart = getCart();
    if (cart.length === 0) {
        alert("Your cart is empty.");
        window.location.href = "shop.html";
        return false;
    }
    const fullname = document.getElementById("checkout-fullname").value.trim();
    const email = document.getElementById("checkout-email").value.trim();
    if (!fullname || !email) return false;

    const paymentInput = document.querySelector(
        'input[name="paymentMethod"]:checked'
    );
    if (!paymentInput) {
        alert("Please choose a payment method.");
        return false;
    }
    const paymentMethod = paymentInput.value;
    const paymentLabel = PAYMENT_LABELS[paymentMethod] || paymentMethod;

    const { subtotal, lines } = getCartTotals();
    const orderId = generateOrderId();
    const shipping = {
        fullname,
        email,
        phone: document.getElementById("checkout-phone").value.trim(),
        address: document.getElementById("checkout-address").value.trim(),
        address2: document.getElementById("checkout-address2").value.trim(),
        city: document.getElementById("checkout-city").value.trim(),
        state: document.getElementById("checkout-state").value.trim(),
        zip: document.getElementById("checkout-zip").value.trim(),
        country: document.getElementById("checkout-country").value.trim(),
        notes: document.getElementById("checkout-notes").value.trim(),
    };

    const payment = {
        method: paymentMethod,
        label: paymentLabel,
    };

    try {
        localStorage.setItem(
            "lastOrder",
            JSON.stringify({
                orderId,
                placedAt: new Date().toISOString(),
                subtotal,
                lines,
                shipping,
                payment,
            })
        );
    } catch (e) {
        /* ignore quota errors */
    }

    saveCart([]);
    updateCartBadge();
    renderCart();

    const formEl = document.getElementById("checkout-form");
    if (formEl) formEl.reset();

    const go = () => {
        window.location.href = "confirmation.html";
    };
    if (typeof window.startPageExit === "function") {
        window.startPageExit(go);
    } else {
        go();
    }
    return false;
}
