CREATE TABLE carts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at DATE NOT NULL,
  updated_at DATE NOT NULL,
  status VARCHAR(32) NOT NULL
);

CREATE TABLE cart_items (
  cart_id UUID REFERENCES carts(id),
  product_id UUID NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (cart_id, product_id)
);

CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  cart_id UUID NOT NULL REFERENCES carts(id),
  payment JSON,
  delivery JSON,
  comments TEXT,
  status VARCHAR(32) NOT null,
  total NUMERIC(10,2) NOT NULL
);