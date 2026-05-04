document.addEventListener("DOMContentLoaded", async () => {
    setCatalogLoading(true);
    try {
        await initializeProducts();
        renderShopGrid();
    } finally {
        setCatalogLoading(false);
    }
    updateCartBadge();
});
