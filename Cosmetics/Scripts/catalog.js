/**
 * Product catalog: API-backed list, migrations, localStorage, shop/home grids.
 * Depends on: core.js (escapeHtml). Catalog data comes from GET /api/product-item (Supabase).
 */

const PLACEHOLDER_IMAGE_MARKERS = ["via.placeholder.com", "placehold.it"];

/** Non-empty strings only; supports legacy single `image` string. */
function normalizeImageUrlArray(p) {
    if (Array.isArray(p.image_url)) {
        return p.image_url
            .filter((x) => typeof x === "string" && x.trim())
            .map((s) => s.trim());
    }
    if (typeof p.image === "string" && p.image.trim()) {
        return [p.image.trim()];
    }
    return [];
}

/** First image for cards, cart thumb, modal hero. */
function productPrimaryImageUrl(p) {
    const urls = normalizeImageUrlArray(p);
    return urls[0] ?? "";
}

/** In-memory cache of the last successful GET /api/product-item response. */
let sampleProducts = [];

/** True when the catalog was loaded from the Express API (overwrites localStorage on success). */
let catalogFromApi = false;

function getApiBase() {
    if (typeof window !== "undefined" && window.__AUREA_API_BASE__) {
        return String(window.__AUREA_API_BASE__).replace(/\/$/, "");
    }
    return "http://localhost:3000";
}

/** Clear cached catalog so the next initializeProducts() refetches (e.g. after admin API writes). */
function invalidateSampleProductsCache() {
    sampleProducts = [];
    catalogFromApi = false;
}

/** Toggle #catalog-loading overlay (home / shop / cart / admin). */
function setCatalogLoading(isLoading) {
    const el = document.getElementById("catalog-loading");
    if (!el) return;
    el.classList.toggle("hidden", !isLoading);
    el.setAttribute("aria-hidden", isLoading ? "false" : "true");
    el.setAttribute("aria-busy", isLoading ? "true" : "false");
}

async function loadSampleProducts() {
    if (sampleProducts.length > 0) return;

    catalogFromApi = false;
    const apiUrl = `${getApiBase()}/api/product-item`;

    try {
        const response = await fetch(apiUrl, { cache: "no-store" });
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                sampleProducts = data;
                catalogFromApi = true;
                return;
            }
        }
    } catch (_) {
        /* network / CORS */
    }

    console.warn(
        "[catalog] Could not load catalog from the API. Start the server (npm start) and set window.__AUREA_API_BASE__ if it is not at http://localhost:3000."
    );
}

function parseDetailedDescriptionsInput(text) {
    return text
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function dedupeDetailedAgainstShort(shortDescription, detailedDescriptions) {
    const shortNorm = shortDescription.trim();
    return detailedDescriptions.filter((para) => para.trim() !== shortNorm);
}

function fillDetailedDescriptionsFallback(name, shortDescription) {
    const match = sampleProducts.find((s) => s.name === name);
    if (match && Array.isArray(match.detailedDescriptions)) {
        const fromSample = dedupeDetailedAgainstShort(shortDescription, [
            ...match.detailedDescriptions,
        ]);
        if (fromSample.length > 0) {
            return fromSample;
        }
    }
    return [
        `Formulation, texture, and recommended use are tailored for Auréa Collection standards — ${name} is designed to complement your routine without redundancy.`,
        `Refer to packaging for directions and precautions. For batch or ingredient questions, reach out with your order number after purchase.`,
    ];
}

function normalizeProduct(p) {
    const legacy =
        typeof p.description === "string" ? p.description.trim() : "";
    let shortDescription =
        typeof p.shortDescription === "string"
            ? p.shortDescription.trim()
            : "";
    let detailedDescriptions = Array.isArray(p.detailedDescriptions)
        ? p.detailedDescriptions
              .filter((x) => typeof x === "string" && x.trim())
              .map((s) => s.trim())
        : [];

    if (
        detailedDescriptions.length === 0 &&
        typeof p.detailedDescription === "string"
    ) {
        const sing = p.detailedDescription.trim();
        if (sing) {
            detailedDescriptions = parseDetailedDescriptionsInput(sing);
            if (detailedDescriptions.length === 0) {
                detailedDescriptions = [sing];
            }
        }
    }

    if (!shortDescription && legacy) {
        shortDescription =
            legacy.length > 180 ? legacy.slice(0, 177).trim() + "…" : legacy;
    }
    if (!shortDescription) {
        shortDescription = typeof p.name === "string" ? p.name : "Product";
    }

    if (detailedDescriptions.length === 0 && legacy) {
        if (legacy.trim() !== shortDescription.trim()) {
            detailedDescriptions = [legacy];
        }
    }

    if (detailedDescriptions.length === 0) {
        detailedDescriptions = [
            `Discover ${shortDescription.replace(/\.$/, "")} — crafted for Auréa Collection with attention to texture, wear, and finish.`,
        ];
    }

    detailedDescriptions = dedupeDetailedAgainstShort(
        shortDescription,
        detailedDescriptions
    );

    if (detailedDescriptions.length === 0) {
        const productName =
            typeof p.name === "string" ? p.name : "This product";
        detailedDescriptions = fillDetailedDescriptionsFallback(
            productName,
            shortDescription
        );
    }

    const image_url = normalizeImageUrlArray(p);
    const {
        description: _omit,
        detailedDescription: _omitSingular,
        image: _omitImg,
        image_url: _omitOldArr,
        ...rest
    } = p;
    return {
        ...rest,
        shortDescription,
        detailedDescriptions,
        image_url,
    };
}

function detailedDuplicatesShort(p) {
    const short =
        typeof p.shortDescription === "string"
            ? p.shortDescription.trim()
            : "";
    if (!short || !Array.isArray(p.detailedDescriptions)) return false;
    return p.detailedDescriptions.some(
        (para) => typeof para === "string" && para.trim() === short
    );
}

function needsProductSchemaMigrate(p) {
    const hasSingularDetailed =
        typeof p.detailedDescription === "string" &&
        p.detailedDescription.trim().length > 0;
    const missingArray =
        !Array.isArray(p.detailedDescriptions) ||
        p.detailedDescriptions.length === 0;
    return (
        p.description !== undefined ||
        typeof p.shortDescription !== "string" ||
        missingArray ||
        (hasSingularDetailed && missingArray) ||
        detailedDuplicatesShort(p)
    );
}

function migrateProductsSchema(products) {
    let changed = false;
    const next = products.map((p) => {
        if (needsProductSchemaMigrate(p)) changed = true;
        return normalizeProduct(p);
    });
    return { products: next, changed };
}

function migrateLegacyProductImages(products) {
    const fallbacks = sampleProducts.map((s) => productPrimaryImageUrl(s));
    let changed = false;
    const next = products.map((p, i) => {
        const urls = normalizeImageUrlArray(p);
        const primary = urls[0] || "";
        const bad =
            urls.length === 0 ||
            PLACEHOLDER_IMAGE_MARKERS.some((m) => primary.includes(m));
        if (bad) {
            changed = true;
            const fb = fallbacks[i % fallbacks.length];
            return { ...p, image_url: fb ? [fb] : [] };
        }
        return p;
    });
    return { products: next, changed };
}

function mergeMissingSampleProducts(stored) {
    const sampleNames = new Set(sampleProducts.map((p) => p.name));
    const onlySamples = stored.every((p) => sampleNames.has(p.name));
    if (!onlySamples || stored.length >= sampleProducts.length) {
        return { products: stored, changed: false };
    }
    const have = new Set(stored.map((p) => p.name));
    const merged = [...stored];
    let changed = false;
    for (const sample of sampleProducts) {
        if (!have.has(sample.name)) {
            merged.push(sample);
            have.add(sample.name);
            changed = true;
        }
    }
    return { products: merged, changed };
}

/**
 * Refresh `image_url` from loaded sample JSON when localStorage still has a
 * legacy single `image` or only one URL — needed for card carousels.
 */
function mergeImageUrlsFromSamples(stored) {
    if (!Array.isArray(sampleProducts) || sampleProducts.length === 0) {
        return { products: stored, changed: false };
    }
    const byName = new Map(
        sampleProducts.map((s) => [s.name, normalizeImageUrlArray(s)])
    );
    let changed = false;
    const next = stored.map((p) => {
        const name = typeof p.name === "string" ? p.name : "";
        const sampleUrls = byName.get(name);
        if (!sampleUrls || sampleUrls.length < 2) return p;
        const current = normalizeImageUrlArray(p);
        if (sampleUrls.length > current.length || current.length < 2) {
            changed = true;
            return { ...p, image_url: sampleUrls };
        }
        return p;
    });
    return { products: next, changed };
}

async function initializeProducts() {
    await loadSampleProducts();

    if (catalogFromApi) {
        const normalized = sampleProducts.map((p) => normalizeProduct(p));
        localStorage.setItem("products", JSON.stringify(normalized));
        return;
    }

    const stored = JSON.parse(localStorage.getItem("products")) || [];
    if (stored.length === 0) {
        localStorage.setItem("products", JSON.stringify(sampleProducts));
    } else {
        let working = stored;
        const urlMerge = mergeImageUrlsFromSamples(working);
        if (urlMerge.changed) {
            working = urlMerge.products;
            localStorage.setItem("products", JSON.stringify(working));
        }
        const imgFix = migrateLegacyProductImages(working);
        if (imgFix.changed) {
            working = imgFix.products;
            localStorage.setItem("products", JSON.stringify(working));
        }
        const merged = mergeMissingSampleProducts(working);
        if (merged.changed) {
            localStorage.setItem("products", JSON.stringify(merged.products));
        }
        working = JSON.parse(localStorage.getItem("products")) || [];
        const schema = migrateProductsSchema(working);
        if (schema.changed) {
            localStorage.setItem("products", JSON.stringify(schema.products));
        }
    }
}

function getProductShortDescription(product) {
    if (product.shortDescription) return product.shortDescription;
    if (product.description) return product.description;
    return "";
}

/**
 * One product card: single image, or carousel (prev/next) when multiple `image_url` values.
 * @param {object} product
 * @param {number} productIndex — index in full `products` array (modal / cart)
 */
function buildProductCard(product, productIndex) {
    const card = document.createElement("div");
    card.className = "product-card";

    const media = document.createElement("div");
    media.className = "product-card-media";
    const urls = normalizeImageUrlArray(product);

    if (urls.length === 0) {
        const ph = document.createElement("div");
        ph.className = "product-card-no-image";
        ph.textContent = "No image";
        media.appendChild(ph);
    } else if (urls.length === 1) {
        const img = document.createElement("img");
        img.src = urls[0];
        img.alt = product.name || "";
        media.appendChild(img);
    } else {
        const carousel = document.createElement("div");
        carousel.className = "product-card-carousel";
        const img = document.createElement("img");
        img.className = "product-card-carousel-img";
        img.alt = product.name || "";
        let idx = 0;
        img.src = urls[0];

        const prev = document.createElement("button");
        prev.type = "button";
        prev.className = "carousel-nav carousel-nav--prev";
        prev.setAttribute("aria-label", "Previous image");
        prev.textContent = "‹";

        const next = document.createElement("button");
        next.type = "button";
        next.className = "carousel-nav carousel-nav--next";
        next.setAttribute("aria-label", "Next image");
        next.textContent = "›";

        function go(delta) {
            idx = (idx + delta + urls.length) % urls.length;
            img.src = urls[idx];
        }
        prev.addEventListener("click", (e) => {
            e.stopPropagation();
            go(-1);
        });
        next.addEventListener("click", (e) => {
            e.stopPropagation();
            go(1);
        });

        carousel.appendChild(prev);
        carousel.appendChild(img);
        carousel.appendChild(next);
        media.appendChild(carousel);
    }

    card.appendChild(media);

    const h3 = document.createElement("h3");
    h3.textContent = product.name || "";

    const priceEl = document.createElement("p");
    priceEl.className = "product-card-price";
    priceEl.textContent = formatPhp(product.price);

    card.appendChild(h3);
    card.appendChild(priceEl);

    const rawShort = getProductShortDescription(product);
    if (rawShort) {
        const tag = document.createElement("p");
        tag.className = "product-card-tagline";
        tag.title = rawShort;
        tag.textContent = rawShort;
        card.appendChild(tag);
    }

    const actions = document.createElement("div");
    actions.className = "product-card-actions";

    const btnView = document.createElement("button");
    btnView.type = "button";
    btnView.textContent = "View Details";

    const btnCart = document.createElement("button");
    btnCart.type = "button";
    btnCart.textContent = "Add to Cart";
    btnCart.addEventListener("click", (e) => {
        e.stopPropagation();
        addToCartByProductIndex(productIndex);
    });

    actions.appendChild(btnView);
    actions.appendChild(btnCart);
    card.appendChild(actions);

    card.addEventListener("click", () => openModal(productIndex));

    return card;
}

function renderFeaturedProducts() {
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const container = document.getElementById("featured-products");
    if (!container) return;
    container.innerHTML = "";
    const featured = products.slice(0, 3);
    featured.forEach((product) => {
        const productIndex = products.indexOf(product);
        container.appendChild(buildProductCard(product, productIndex));
    });
}

function renderShopGrid() {
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const productGrid = document.getElementById("product-grid");
    if (!productGrid) return;
    productGrid.innerHTML = "";
    products.forEach((product, index) => {
        productGrid.appendChild(buildProductCard(product, index));
    });
}

if (typeof window !== "undefined") {
    window.aureaGetApiBase = getApiBase;
    window.invalidateSampleProductsCache = invalidateSampleProductsCache;
}
