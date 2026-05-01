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

function addProduct(event) {
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
    const image = document.getElementById("product-image").value.trim();

    if (!detailedDescriptions.length) {
        alert("Please enter a detailed description (one or more paragraphs).");
        return;
    }

    const products = JSON.parse(localStorage.getItem("products"));
    products.push({
        name,
        shortDescription,
        detailedDescriptions,
        price,
        image,
    });
    localStorage.setItem("products", JSON.stringify(products));
    document.getElementById("add-product-form").reset();
    renderShopGrid();
    updateAdminProductList();
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
            <td><img src="${product.image}" alt="${product.name}" style="width:50px;"></td>
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

function deleteProduct(index) {
    const products = JSON.parse(localStorage.getItem("products"));
    const removed = products[index];
    products.splice(index, 1);
    localStorage.setItem("products", JSON.stringify(products));
    if (removed) removeCartLinesForProductName(removed.name);
    updateAdminProductList();
    renderShopGrid();
}
