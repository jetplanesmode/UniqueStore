document.addEventListener("DOMContentLoaded", async () => {
    setCatalogLoading(true);
    try {
        await initializeProducts();
        renderFeaturedProducts();
    } finally {
        setCatalogLoading(false);
    }
    updateCartBadge();
});
