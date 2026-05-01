/**
 * Shopping cart persistence and cart page UI.
 * Depends on: core.js (escapeHtml), catalog.js (renderShopGrid via optional refresh)
 */

const CART_KEY = "cart";

function getCart() {
    const raw = JSON.parse(localStorage.getItem(CART_KEY));
    return Array.isArray(raw) ? raw : [];
}

function saveCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function updateCartBadge() {
    const cart = getCart();
    const n = cart.reduce((sum, line) => sum + line.quantity, 0);
    const el = document.getElementById("cart-badge");
    if (!el) return;
    el.textContent = String(n);
    el.classList.toggle("hidden", n === 0);
}

function addToCartByProductIndex(index) {
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const product = products[index];
    if (!product) return;
    const cart = getCart();
    const i = cart.findIndex((l) => l.name === product.name);
    if (i >= 0) cart[i].quantity += 1;
    else cart.push({ name: product.name, quantity: 1 });
    saveCart(cart);
    updateCartBadge();
    renderCart();
}

function changeCartLine(cartIndex, delta) {
    const cart = getCart();
    const line = cart[cartIndex];
    if (!line) return;
    line.quantity += delta;
    if (line.quantity <= 0) cart.splice(cartIndex, 1);
    saveCart(cart);
    renderCart();
    updateCartBadge();
}

function removeCartLine(cartIndex) {
    const cart = getCart();
    cart.splice(cartIndex, 1);
    saveCart(cart);
    renderCart();
    updateCartBadge();
}

function clearCart() {
    saveCart([]);
    renderCart();
    updateCartBadge();
}

function removeCartLinesForProductName(name) {
    const cart = getCart().filter((l) => l.name !== name);
    saveCart(cart);
    updateCartBadge();
    renderCart();
}

function getCartTotals() {
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const cart = getCart();
    let subtotal = 0;
    const lines = [];
    for (const line of cart) {
        const p = products.find((pr) => pr.name === line.name);
        const unitPrice = p ? parseFloat(String(p.price)) : 0;
        const lineTotal = unitPrice * line.quantity;
        subtotal += lineTotal;
        lines.push({
            name: line.name,
            quantity: line.quantity,
            unitPrice,
            lineTotal,
        });
    }
    return { subtotal, lines };
}

function renderCart() {
    const root = document.getElementById("cart-root");
    if (!root) return;
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const cart = getCart();

    if (cart.length === 0) {
        root.innerHTML =
            '<p class="cart-empty-msg">Your cart is empty.</p>' +
            '<a class="cart-link-btn" href="shop.html">Browse shop</a>';
        return;
    }

    let subtotal = 0;
    const rows = cart.map((line, cartIndex) => {
        const p = products.find((pr) => pr.name === line.name);
        const price = p ? parseFloat(String(p.price)) : 0;
        const lineTotal = price * line.quantity;
        subtotal += lineTotal;
        const thumb = p ? p.image : "";
        const desc = p
            ? escapeHtml(p.name)
            : escapeHtml(line.name) + " <em>(unavailable)</em>";
        return `
            <tr>
                <td class="cart-cell-thumb">${thumb ? `<img src="${escapeHtml(thumb)}" alt="">` : ""}</td>
                <td class="cart-cell-info">${desc}</td>
                <td class="cart-cell-price">${formatPhp(price)}</td>
                <td class="cart-cell-qty">
                    <div class="qty-control">
                        <button type="button" onclick="changeCartLine(${cartIndex}, -1)" aria-label="Decrease">−</button>
                        <span>${line.quantity}</span>
                        <button type="button" onclick="changeCartLine(${cartIndex}, 1)" aria-label="Increase">+</button>
                    </div>
                </td>
                <td class="cart-cell-line">${formatPhp(lineTotal)}</td>
                <td class="cart-cell-remove">
                    <button type="button" onclick="removeCartLine(${cartIndex})">Remove</button>
                </td>
            </tr>`;
    });

    root.innerHTML = `
        <div class="cart-table-wrap">
            <table class="cart-table">
                <thead>
                    <tr>
                        <th class="cart-th-thumb"></th>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>${rows.join("")}</tbody>
            </table>
        </div>
        <div class="cart-footer">
            <p class="cart-subtotal">Subtotal: <strong>${formatPhp(subtotal)}</strong></p>
            <div class="cart-actions">
                <a class="cart-link-btn" href="shop.html">Continue shopping</a>
                <a class="cart-link-btn btn-checkout" href="checkout.html">Proceed to checkout</a>
                <button type="button" onclick="clearCart()">Clear cart</button>
            </div>
        </div>`;
}
