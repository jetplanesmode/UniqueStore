/**
 * Single-file Express API — Supabase (service role) for categories, products, images, orders.
 * Run: npm install && cp .env.example .env  (set real URL + key)  && npm start
 */

import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

for (const p of [
  path.join(REPO_ROOT, '.env'),
  path.join(REPO_ROOT, '.env.local'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '.env.local'),
]) {
  dotenv.config({ path: p, override: true });
}

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const PORT = Number(process.env.PORT) || 3000;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and set values.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const app = express();
app.use(cors());
app.use(express.json());

const PRODUCT_SELECT_WITH_CATEGORY =
  '*, category:categories ( id, name, slug, created_at )';

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/* --- helpers: product images + storefront payload --- */

async function fetchImageUrlsByProductId(productIds) {
  const map = new Map();
  if (!productIds.length) return map;
  const { data: rows, error } = await supabase
    .from('product_images')
    .select('product_id, image_url, is_active, created_at')
    .in('product_id', productIds);
  if (error) throw error;
  const grouped = new Map();
  for (const im of rows ?? []) {
    if (im.is_active === false || !im.image_url) continue;
    const list = grouped.get(im.product_id) ?? [];
    list.push(im);
    grouped.set(im.product_id, list);
  }
  for (const [pid, list] of grouped) {
    list.sort(
      (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
    );
    map.set(
      pid,
      list.map((x) => x.image_url)
    );
  }
  return map;
}

function normalizeImageUrlList(input) {
  if (input == null) return [];
  const arr = Array.isArray(input) ? input : [input];
  const out = [];
  for (const x of arr) {
    if (typeof x !== 'string') continue;
    const s = x.trim();
    if (!s) continue;
    try {
      const u = new URL(s);
      if (u.protocol === 'http:' || u.protocol === 'https:') out.push(s);
    } catch {
      /* skip */
    }
  }
  return out;
}

/** Storefront-shaped catalog rows from Supabase (products + images). */
async function buildCatalogPayloadFromDb() {
  const { data: rows, error } = await supabase
    .from('products')
    .select(`id, name, price, category:categories ( id, name, slug )`)
    .order('name');
  if (error) throw error;
  const ids = (rows ?? []).map((r) => r.id);
  const urlsById = await fetchImageUrlsByProductId(ids);
  return (rows ?? []).map((row) => {
    const catName =
      row.category && typeof row.category.name === 'string'
        ? row.category.name
        : '';
    const urls = urlsById.get(row.id) ?? [];
    return {
      id: row.id,
      name: row.name,
      shortDescription: catName
        ? `A ${catName.toLowerCase()} favorite — ${row.name}.`
        : String(row.name),
      detailedDescriptions: [],
      price: String(row.price),
      image_url: urls,
    };
  });
}

/** GET /api/product-item(s) — storefront catalog from Supabase only. */
const getProductItemCatalog = asyncHandler(async (_req, res) => {
  const built = await buildCatalogPayloadFromDb();
  res.json(built);
});

/* --- health --- */
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/product-item', getProductItemCatalog);
app.get('/api/product-items', getProductItemCatalog);

/* --- categories --- */
app.get(
  '/api/categories',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  '/api/categories/slug/:slug',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', req.params.slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.get(
  '/api/categories/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.post(
  '/api/categories',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('categories')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  })
);

app.patch(
  '/api/categories/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('categories')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.delete(
  '/api/categories/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', req.params.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  })
);

/* --- products --- */
app.get(
  '/api/products',
  asyncHandler(async (req, res) => {
    const expand =
      req.query.expand !== '0' && req.query.expand !== 'false';
    const cols = expand ? PRODUCT_SELECT_WITH_CATEGORY : '*';
    let q = supabase.from('products').select(cols).order('name');
    if (req.query.category_id) {
      q = q.eq('category_id', req.query.category_id);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  '/api/products/:id',
  asyncHandler(async (req, res) => {
    const expand =
      req.query.expand !== '0' && req.query.expand !== 'false';
    const cols = expand ? PRODUCT_SELECT_WITH_CATEGORY : '*';
    const { data, error } = await supabase
      .from('products')
      .select(cols)
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.post(
  '/api/products',
  asyncHandler(async (req, res) => {
    let {
      category_id,
      category_slug,
      name,
      price,
      social_media_url,
      external_shopping_url,
      image_urls,
      images,
    } = req.body;

    const urlsForInsert = normalizeImageUrlList(
      image_urls != null ? image_urls : images
    );

    if (!category_id && category_slug) {
      const { data: cat, error: catErr } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', category_slug)
        .maybeSingle();
      if (catErr) throw catErr;
      if (!cat) {
        return res.status(400).json({ error: 'Unknown category_slug' });
      }
      category_id = cat.id;
    }

    if (!category_id || !name || price == null) {
      return res.status(400).json({
        error:
          'name and price are required, plus category_id or category_slug',
      });
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        category_id,
        name,
        price,
        social_media_url: social_media_url ?? null,
        external_shopping_url: external_shopping_url ?? null,
      })
      .select(PRODUCT_SELECT_WITH_CATEGORY)
      .single();
    if (error) throw error;

    if (urlsForInsert.length > 0) {
      const rows = urlsForInsert.map((image_url) => ({
        product_id: data.id,
        image_url,
        is_active: true,
      }));
      const { error: imgError } = await supabase
        .from('product_images')
        .insert(rows);
      if (imgError) {
        await supabase.from('products').delete().eq('id', data.id);
        throw imgError;
      }
    }

    res.status(201).json(data);
  })
);

app.patch(
  '/api/products/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('products')
      .update(req.body)
      .eq('id', req.params.id)
      .select(PRODUCT_SELECT_WITH_CATEGORY)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.delete(
  '/api/products/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  })
);

/* --- product images --- */
app.get(
  '/api/products/:productId/images',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', req.params.productId);
    if (error) throw error;
    res.json(data);
  })
);

app.post(
  '/api/product-images',
  asyncHandler(async (req, res) => {
    const { product_id, image_url, is_active } = req.body;
    if (!product_id || !image_url) {
      return res
        .status(400)
        .json({ error: 'product_id and image_url are required' });
    }
    const { data, error } = await supabase
      .from('product_images')
      .insert({
        product_id,
        image_url,
        is_active: is_active ?? true,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  })
);

app.patch(
  '/api/product-images/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('product_images')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.delete(
  '/api/product-images/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', req.params.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  })
);

/* --- customers (ids must exist in auth.users when inserting) --- */
app.get(
  '/api/customers',
  asyncHandler(async (_req, res) => {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  '/api/customers/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.post(
  '/api/customers',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('customers')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  })
);

app.patch(
  '/api/customers/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('customers')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.delete(
  '/api/customers/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('customers')
      .delete()
      .eq('id', req.params.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  })
);

/* --- orders --- */
app.get(
  '/api/orders',
  asyncHandler(async (req, res) => {
    let q = supabase.from('orders').select('*').order('created_at', {
      ascending: false,
    });
    if (req.query.customer_id) {
      q = q.eq('customer_id', req.query.customer_id);
    }
    const { data, error } = await q;
    if (error) throw error;
    res.json(data);
  })
);

app.get(
  '/api/orders/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.post(
  '/api/orders',
  asyncHandler(async (req, res) => {
    const { customer_id, items, total_amount } = req.body;
    if (!customer_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'customer_id and items[] are required',
      });
    }
    let total = total_amount;
    if (total == null) {
      total = items.reduce(
        (sum, it) => sum + Number(it.quantity) * Number(it.price),
        0
      );
    }
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({ customer_id, total_amount: total })
      .select()
      .single();
    if (oErr) throw oErr;

    const rows = items.map((it) => ({
      order_id: order.id,
      product_id: it.product_id,
      quantity: it.quantity,
      price: it.price,
    }));
    const { error: iErr } = await supabase.from('order_items').insert(rows);
    if (iErr) {
      await supabase.from('orders').delete().eq('id', order.id);
      throw iErr;
    }
    res.status(201).json(order);
  })
);

app.patch(
  '/api/orders/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('orders')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.delete(
  '/api/orders/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('orders')
      .delete()
      .eq('id', req.params.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  })
);

/* --- order items --- */
app.get(
  '/api/orders/:orderId/items',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', req.params.orderId);
    if (error) throw error;
    res.json(data);
  })
);

app.post(
  '/api/order-items',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('order_items')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  })
);

app.patch(
  '/api/order-items/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('order_items')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  })
);

app.delete(
  '/api/order-items/:id',
  asyncHandler(async (req, res) => {
    const { data, error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', req.params.id)
      .select('id');
    if (error) throw error;
    if (!data?.length) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Health: GET http://localhost:${PORT}/health`);
  console.log(`Storefront catalog JSON: GET http://localhost:${PORT}/api/product-item`);
});
