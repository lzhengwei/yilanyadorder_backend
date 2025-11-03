CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  image_url TEXT
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL
);

INSERT INTO products (name, price, stock, image_url) VALUES
('經典白T', 390, 10, 'https://picsum.photos/200?1'),
('黑色帽T', 890, 5, 'https://picsum.photos/200?2'),
('帆布袋', 250, 8, 'https://picsum.photos/200?3');
