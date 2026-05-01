document.addEventListener("DOMContentLoaded", async () => {
    await initializeProducts();
    renderFeaturedProducts();
    updateCartBadge();
});
