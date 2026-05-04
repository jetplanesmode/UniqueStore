/**
 * Admin dashboard (single page).
 * Depends on: core.js, catalog.js
 */

function syncAdminAuthUI() {
    const loggedIn = sessionStorage.getItem("loggedIn") === "true";
    const loginPanel = document.getElementById("admin-login-panel");
    const authPanel = document.getElementById("admin-authenticated");
    if (!loginPanel || !authPanel) return;
    if (loggedIn) {
        loginPanel.classList.add("hidden");
        authPanel.classList.remove("hidden");
        updateAdminProductList();
    } else {
        loginPanel.classList.remove("hidden");
        authPanel.classList.add("hidden");
    }
}

function adminLogin(event) {
    event.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === "admin" && password === "admin123") {
        sessionStorage.setItem("loggedIn", "true");
        syncAdminAuthUI();
    } else {
        alert("Invalid credentials");
    }
}

function logout() {
    sessionStorage.removeItem("loggedIn");
    const form = document.getElementById("admin-login-form");
    if (form) form.reset();
    syncAdminAuthUI();
}

function apiBaseUrl() {
    if (typeof window.aureaGetApiBase === "function") {
        return window.aureaGetApiBase();
    }
    return String(window.__AUREA_API_BASE__ || "http://localhost:3000").replace(
        /\/$/,
        ""
    );
}

async function addProduct(event) {
    event.preventDefault();
    const name = document.getElementById("product-name").value.trim();
    const shortDescription = document
        .getElementById("product-short-description")
        .value.trim();
    const detailedRaw = document.getElementById(
        "product-detailed-descriptions"
    ).value;
    const detailedDescriptions = parseDetailedDescriptionsInput(detailedRaw);
    const price = document.getElementById("product-price").value;
    const imageUrlsRaw = document.getElementById("product-image-urls").value;
    const category_slug = document
        .getElementById("product-category-slug")
        .value.trim()
        .toLowerCase();

    const image_url = normalizeImageUrlArray({
        image_url: imageUrlsRaw
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
    });

    if (!detailedDescriptions.length) {
        alert("Please enter a detailed description (one or more paragraphs).");
        return;
    }
    if (!category_slug) {
        alert("Please choose a category.");
        return;
    }
    if (image_url.length === 0) {
        alert(
            "Please enter at least one valid https image URL (one per line)."
        );
        return;
    }

    const baseProduct = normalizeProduct({
        name,
        shortDescription,
        detailedDescriptions,
        price,
        image_url,
    });

    setCatalogLoading(true);
    try {
        const res = await fetch(`${apiBaseUrl()}/api/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                price: Number(price),
                category_slug,
                image_urls: normalizeImageUrlArray(baseProduct),
            }),
        });
        if (res.ok) {
            const created = await res.json();
            const products = JSON.parse(localStorage.getItem("products")) || [];
            const row = normalizeProduct({
                ...baseProduct,
                id: created.id,
            });
            products.push(row);
            localStorage.setItem("products", JSON.stringify(products));
            if (typeof window.invalidateSampleProductsCache === "function") {
                window.invalidateSampleProductsCache();
            }
            document.getElementById("add-product-form").reset();
            updateAdminProductList();
            if (typeof renderShopGrid === "function") renderShopGrid();
            return;
        }
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody.error || `Server responded with ${res.status}`;
        if (
            !confirm(
                `${msg}\n\nSave this product on this device only (no API)?`
            )
        ) {
            return;
        }
    } catch (e) {
        console.error(e);
        if (
            !confirm(
                "Could not reach the API. Save this product on this device only?"
            )
        ) {
            return;
        }
    } finally {
        setCatalogLoading(false);
    }

    const products = JSON.parse(localStorage.getItem("products")) || [];
    products.push(baseProduct);
    localStorage.setItem("products", JSON.stringify(products));
    document.getElementById("add-product-form").reset();
    updateAdminProductList();
    if (typeof renderShopGrid === "function") renderShopGrid();
}

function updateAdminProductList() {
    const products = JSON.parse(localStorage.getItem("products"));
    const productList = document.getElementById("product-list");
    if (!productList) return;
    productList.innerHTML = "";
    products.forEach((product, index) => {
        const row = document.createElement("tr");
        const fullShort =
            getProductShortDescription(normalizeProduct(product)) || "—";
        const trunc =
            fullShort.length > 80 ? fullShort.slice(0, 80) + "…" : fullShort;
        row.innerHTML = `
            <td>${product.name}</td>
            <td title="${escapeHtml(fullShort)}">${escapeHtml(trunc)}</td>
            <td>${formatPhp(product.price)}</td>
            <td><img src="${escapeHtml(productPrimaryImageUrl(product))}" alt="${escapeHtml(product.name)}" style="width:50px;"></td>
            <td>
                <button type="button" onclick="editProduct(${index})">Edit</button>
                <button type="button" onclick="deleteProduct(${index})">Delete</button>
            </td>
        `;
        productList.appendChild(row);
    });
}

function editProduct(index) {
    alert("Editing feature not implemented yet.");
}

async function deleteProduct(index) {
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const removed = products[index];
    if (!removed) return;

    if (removed.id) {
        setCatalogLoading(true);
        try {
            const res = await fetch(
                `${apiBaseUrl()}/api/products/${encodeURIComponent(removed.id)}`,
                { method: "DELETE" }
            );
            if (!res.ok && res.status !== 204) {
                const errBody = await res.json().catch(() => ({}));
                const msg = errBody.error || `Delete failed (${res.status})`;
                if (
                    !confirm(
                        `${msg}\n\nRemove from this browser only and keep the server record?`
                    )
                ) {
                    return;
                }
            }
        } catch (e) {
            console.error(e);
            if (
                !confirm(
                    "Could not reach the API. Remove from this browser only?"
                )
            ) {
                return;
            }
        } finally {
            setCatalogLoading(false);
        }
    }

    const next = JSON.parse(localStorage.getItem("products")) || [];
    const victim = next[index];
    next.splice(index, 1);
    localStorage.setItem("products", JSON.stringify(next));
    if (victim) removeCartLinesForProductName(victim.name);
    if (typeof window.invalidateSampleProductsCache === "function") {
        window.invalidateSampleProductsCache();
    }
    updateAdminProductList();
    if (typeof renderShopGrid === "function") renderShopGrid();
}
