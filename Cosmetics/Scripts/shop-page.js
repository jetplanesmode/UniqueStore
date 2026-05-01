document.addEventListener("DOMContentLoaded", async () => {
    await initializeProducts();
    renderShopGrid();
    updateCartBadge();
});
