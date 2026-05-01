/**
 * Mirrors data/product-item.json. Catalog uses this only when fetch() cannot load
 * that JSON (e.g. opening pages via file://). When serving over HTTP, product-item.json is used.
 * After editing product-item.json, update this file to match if you need offline preview.
 */
window.__aureaSampleProductsFallback = JSON.parse(`[
  {
    "name": "Luxury Lipstick",
    "shortDescription": "Velvet matte color with argan comfort — our signature lip statement for day or evening.",
    "detailedDescriptions": [
      "Luxury Lipstick delivers saturated pigment in a creamy, feather-light formula inspired by European atelier finishes. Each bullet is infused with cold-pressed argan oil and vitamin E so the color stays bold without drying, feathering, or cracking — whether you are at brunch or under evening lights.",
      "The slim bullet is engineered for precision along the cupid's bow and corners. One swipe gives full opacity; blot once for a soft stain, or layer for runway-intensity matte. Fragrance-free base respects sensitive lips.",
      "Curated neutrals and reds flatter warm and cool undertones. Dermatologist-tested. Cruelty-free. Presented in a weighted magnetic case — small enough for your smallest clutch."
    ],
    "price": "29.99",
    "image": "https://picsum.photos/seed/aurea-lipstick/400/500"
  },
  {
    "name": "Silk Foundation",
    "shortDescription": "Second-skin coverage that breathes — luminous, never cakey, buildable from sheer to full.",
    "detailedDescriptions": [
      "Silk Foundation uses micro-fine pigments suspended in a hydrating serum base so it melts into skin instead of sitting on top. Light-diffusing pearls soften the look of pores and fine lines while letting real skin texture show through — the hallmark of modern European complexion artistry.",
      "Oil-free yet nourishing; suitable for combination and normal skin. Apply with fingers for the sheerest veil, a damp sponge for medium coverage, or build in thin layers where you want more discipline around the nose and chin.",
      "Sets to a natural satin finish without oxidizing orange on deeper tones. Shake before use. Non-comedogenic. Replace cap tightly to preserve the silk-fluid texture."
    ],
    "price": "49.99",
    "image": "https://picsum.photos/seed/aurea-foundation/400/500"
  },
  {
    "name": "Exquisite Perfume",
    "shortDescription": "A luminous floral–amber signature — refined projection, unforgettable dry-down.",
    "detailedDescriptions": [
      "Exquisite Perfume opens with sparkling bergamot and dewy pear peel, then unfolds into a heart of jasmine sambac and blush rose absolute harvested at dawn. A ribbon of white musk and pale amber creates a clean, expensive trail without heaviness.",
      "Designed for close encounters: noticeable within arm's length, never overpowering in an elevator. Average longevity 8–10 hours on clothing; reapply the pulse points at dusk for a second act.",
      "Housed in a fluted glass bottle with a magnetic cap. Store away from direct sunlight. Layer with unscented body care so the composition reads true — this is a fragrance meant to feel like your second skin."
    ],
    "price": "89.99",
    "image": "https://picsum.photos/seed/aurea-perfume/400/500"
  }
]`);
