/**
 * Product detail modal (Home + Shop).
 * Depends on: core.js, catalog.js (normalizeProduct), cart.js (addToCartByProductIndex)
 */

let modalProductIndex = null;

function openModal(index) {
    const products = JSON.parse(localStorage.getItem("products"));
    const product = normalizeProduct(products[index]);
    modalProductIndex = index;
    const modalImg = document.getElementById("modal-image");
    modalImg.src = product.image;
    modalImg.alt = product.name;
    document.getElementById("modal-name").innerText = product.name;
    document.getElementById("modal-short-description").innerText =
        product.shortDescription;
    const detailedEl = document.getElementById("modal-detailed-descriptions");
    const rawDetailed = Array.isArray(product.detailedDescriptions)
        ? product.detailedDescriptions.filter(
              (x) => typeof x === "string" && x.trim()
          )
        : [];
    const paragraphs = dedupeDetailedAgainstShort(
        product.shortDescription,
        rawDetailed
    );
    if (detailedEl) {
        detailedEl.innerHTML = paragraphs
            .map((para) => `<p>${escapeHtml(para.trim())}</p>`)
            .join("");
    }
    document.getElementById("modal-price").innerText = formatPhp(product.price);
    document.getElementById("product-modal").classList.remove("hidden");
}

function closeModal() {
    modalProductIndex = null;
    document.getElementById("product-modal").classList.add("hidden");
}

function addCurrentProductToCart() {
    if (modalProductIndex === null) return;
    addToCartByProductIndex(modalProductIndex);
    closeModal();
}
