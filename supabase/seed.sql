-- ============================================================
-- Art of Frames — bootstrap seed for an EMPTY database only.
-- Run AFTER schema.sql on a fresh project. Every insert is
-- guarded so it NEVER overwrites or wipes real data — the real
-- catalog is imported with scripts/seed-products.mjs and
-- scripts/seed-gallery.mjs.
-- ============================================================

insert into categories (id, name, parent_id, sort_order) values
  ('hotel-items', 'Hotel Items', null, 1),
  ('wall-arts',   'Wall Arts',   null, 2),
  ('baby-frames', 'Baby Frames', null, 3),
  ('clocks',      'Clocks',      null, 4),
  ('love-gifts',  'Love Gifts',  null, 5),
  ('mommy-frames','Mommy Frames',null, 6),
  ('coaster',         'Coaster',            'hotel-items', 1),
  ('keytag',          'Keytag',             'hotel-items', 2),
  ('menu',            'Menu',               'hotel-items', 3),
  ('reserved',        'Reserved',           'hotel-items', 4),
  ('sign-boards',     'Sign Boards',        'hotel-items', 5),
  ('table-number',    'Table Number',       'hotel-items', 6),
  ('serviette-holder','Serviette Holder',   'hotel-items', 7),
  ('door-signs',      'Door Signs',         'wall-arts', 1),
  ('hotel',           'Hotel',              'wall-arts', 2),
  ('open-close-welcome','Open Close Welcome','wall-arts', 3),
  ('restroom',        'Restroom',           'wall-arts', 4),
  ('salon',           'Salon',              'wall-arts', 5),
  ('common',          'Common',             'wall-arts', 6)
on conflict (id) do nothing;

-- Products (id kept stable for seed idempotency)
insert into products (id, name, category_id, price, description, badge, engraving, color, features, materials, created_at)
select v.*
from (values

  (
    '11111111-1111-1111-1111-111111111111',
    'Laser-Cut Keytags', 'keytag', 'Rs. 450',
    'Precision-cut wooden keytags engraved with your name, brand, or a message — small keepsakes carrying a lifetime of detail.',
    'Bestseller',
    'Your name, initials, logo or a short message — front or both sides.',
    '#CCA681',
    '["Double-sided engraving","Six wood tones to choose from","Rust-proof keyring included","Volume pricing from 25 pieces"]',
    '["Walnut","Oak","Bamboo","MDF"]',
    '2026-07-10'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Mommy & Me Frames', 'mommy-frames', 'Rs. 2,500',
    'Matching plywood frames that hold the portraits you treasure most — a keepsake pair designed for the bond that matters.',
    'Most Loved',
    'Add names, a date, or a short dedication beneath the photo.',
    '#C77DA6',
    '["Set of two matching frames","Premium plywood with glass front","Easel stand or wall hanging","Complimentary gift wrapping"]',
    '["Plywood","Acrylic glass","Natural finish"]',
    '2026-06-28'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Custom Signboards', 'sign-boards', 'Rs. 6,800',
    'Bespoke signboards laser-cut from premium materials — from storefront statements to wedding-day centerpieces.',
    'Signature Piece',
    'Your logo, lettering or artwork — we refine the design with you first.',
    '#E9A23B',
    '["Sizes up to 4 feet wide","Indoor & weather-ready options","Backlit LED upgrade available","Free design consultation"]',
    '["MDF","Acrylic","Walnut veneer","LED backing"]',
    '2026-07-20'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Slide Cards', 'menu', 'Rs. 350',
    'Slim laser-cut slide cards that carry your brand with quiet confidence — details so fine you can feel the craft.',
    'New',
    'Names, contact details and logos — one side or both.',
    '#0E8C7B',
    '["Business-card dimensions","Smooth-touch finish","Crisp 0.3 mm precision cuts","Available from 50 pieces"]',
    '["HDF","Acrylic","Paper lamination"]',
    '2026-06-15'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Wall Art', 'common', 'Rs. 4,200',
    'Statement wall art that turns any room into a gallery — layered, textured, and cut to tell your story in light and shadow.',
    null,
    'Names, dates, silhouettes — or a design of your own making.',
    '#685558',
    '["Layered 3D depth","Custom sizes and shapes","Ready-to-hang fittings","Made entirely to order"]',
    '["Layered plywood","Acrylic glow layer","Oak edging"]',
    '2026-07-05'
  )
) as v (id, name, category_id, price, description, badge, engraving, color, features, materials, created_at)
where not exists (select 1 from products)
on conflict (id) do nothing;

-- Product gallery images (only when the products row exists)
insert into product_images (product_id, url, sort_order)
select v.product_id, v.url, v.sort_order
from (values
  ('11111111-1111-1111-1111-111111111111', '/images/keytags.webp', 1),
  ('11111111-1111-1111-1111-111111111111', '/images/lasercut-industry-1-1024x683.jpg', 2),
  ('22222222-2222-2222-2222-222222222222', '/images/mommy-frames.webp', 1),
  ('22222222-2222-2222-2222-222222222222', '/images/hero/hero-2.jpeg', 2),
  ('33333333-3333-3333-3333-333333333333', '/images/signboard.webp', 1),
  ('33333333-3333-3333-3333-333333333333', '/images/lasercut-industry-1-1024x683.jpg', 2),
  ('44444444-4444-4444-4444-444444444444', '/images/slide-card.png', 1),
  ('44444444-4444-4444-4444-444444444444', '/images/hero/hero-3.jpeg', 2),
  ('55555555-5555-5555-5555-555555555555', '/images/wallart.webp', 1),
  ('55555555-5555-5555-5555-555555555555', '/images/hero/hero-2.jpeg', 2),
  ('55555555-5555-5555-5555-555555555555', '/images/hero/hero-1.jpeg', 3)
) as v (product_id, url, sort_order)
where exists (select 1 from products p where p.id = v.product_id)
on conflict do nothing;

-- The bootstrap tile's legacy tag "In Action" has no category, so it
-- seeds as uncategorized (category_id NULL).
insert into gallery_items (title, category_id, image_url, color, span)
select v.*
from (values
  ('Laser Cutting', null, '/images/lasercut-industry-1-1024x683.jpg', '#E9A23B', 'col-span-2')
) as v (title, category_id, image_url, color, span)
where not exists (select 1 from gallery_items)
on conflict do nothing;
