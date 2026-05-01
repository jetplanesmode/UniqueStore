/**
 * Product catalog: sample data, migrations, storage seeding, shop/home grids.
 * Depends on: core.js (escapeHtml). Load Scripts/sample-products-fallback.js before this script (optional but recommended for file://).
 */

const PLACEHOLDER_IMAGE_MARKERS = ["via.placeholder.com", "placehold.it"];

/** Filled by loadSampleProducts() from data/product-item.json or Scripts/sample-products-fallback.js */
let sampleProducts = [];

const SAMPLE_PRODUCTS_JSON = "data/product-item.json";

async function loadSampleProducts() {
    if (sampleProducts.length > 0) return;

    const urls = [];
    try {
        urls.push(new URL(SAMPLE_PRODUCTS_JSON, window.location.href).href);
    } catch (_) {
        urls.push(SAMPLE_PRODUCTS_JSON);
    }
    if (!urls.includes(SAMPLE_PRODUCTS_JSON)) {
        urls.push(SAMPLE_PRODUCTS_JSON);
    }

    for (const url of urls) {
        try {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) continue;
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                sampleProducts = data;
                return;
            }
        } catch (_) {
            /* try next url */
        }
    }

    const fb = window.__aureaSampleProductsFallback;
    if (Array.isArray(fb) && fb.length > 0) {
        console.warn(
            "[catalog] Using fallback catalog (could not fetch data/product-item.json)."
        );
        sampleProducts = JSON.parse(JSON.stringify(fb));
        return;
    }

    console.warn(
        "[catalog] No sample products loaded. Serve the Cosmetics folder over HTTP and ensure data/product-item.json exists, or load Scripts/sample-products-fallback.js before catalog.js."
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

    const { description: _omit, detailedDescription: _omitSingular, ...rest } =
        p;
    return {
        ...rest,
        shortDescription,
        detailedDescriptions,
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
    const fallbacks = sampleProducts.map((p) => p.image);
    let changed = false;
    const next = products.map((p, i) => {
        const bad =
            !p.image ||
            PLACEHOLDER_IMAGE_MARKERS.some((m) => String(p.image).includes(m));
        if (bad) {
            changed = true;
            return { ...p, image: fallbacks[i % fallbacks.length] };
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

async function initializeProducts() {
    await loadSampleProducts();
    const stored = JSON.parse(localStorage.getItem("products")) || [];
    if (stored.length === 0) {
        localStorage.setItem("products", JSON.stringify(sampleProducts));
    } else {
        let working = stored;
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

function renderFeaturedProducts() {
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const container = document.getElementById("featured-products");
    if (!container) return;
    container.innerHTML = "";
    const featured = products.slice(0, 3);
    featured.forEach((product, index) => {
        const card = document.createElement("div");
        card.className = "product-card";
        const rawShort = getProductShortDescription(product);
        const taglineBlock = rawShort
            ? `<p class="product-card-tagline" title="${escapeHtml(rawShort)}">${escapeHtml(rawShort)}</p>`
            : "";
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="product-card-price">${formatPhp(product.price)}</p>
            ${taglineBlock}
            <div class="product-card-actions">
                <button type="button">View Details</button>
                <button type="button" onclick="event.stopPropagation(); addToCartByProductIndex(${index})">Add to Cart</button>
            </div>
        `;
        card.addEventListener("click", function () {
            openModal(index);
        });
        container.appendChild(card);
    });
}

function renderShopGrid() {
    const products = JSON.parse(localStorage.getItem("products")) || [];
    const productGrid = document.getElementById("product-grid");
    if (!productGrid) return;
    productGrid.innerHTML = "";
    products.forEach((product, index) => {
        const card = document.createElement("div");
        card.className = "product-card";
        const rawShort = getProductShortDescription(product);
        const taglineBlock = rawShort
            ? `<p class="product-card-tagline" title="${escapeHtml(rawShort)}">${escapeHtml(rawShort)}</p>`
            : "";
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p class="product-card-price">${formatPhp(product.price)}</p>
            ${taglineBlock}
            <div class="product-card-actions">
                <button type="button">View Details</button>
                <button type="button" onclick="event.stopPropagation(); addToCartByProductIndex(${index})">Add to Cart</button>
            </div>
        `;
        card.addEventListener("click", function () {
            openModal(index);
        });
        productGrid.appendChild(card);
    });
}
