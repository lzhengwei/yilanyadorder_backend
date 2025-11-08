import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

app.get("/api/products", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM products ORDER BY id ASC");
  res.json(rows);
});

app.post("/api/order", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { buyer_name, buyer_phone, buyer_line, items } = req.body;

    for (const item of items) {
      const { rows } = await client.query("SELECT stock, name FROM products WHERE id=$1", [item.id]);
      const product = rows[0];
      if (!product) throw new Error(`商品 ${item.id} 不存在`);
      if (product.stock < item.qty)
        throw new Error(`商品「${product.name}」庫存不足（剩 ${product.stock} 件）`);
    }

    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (buyer_name, buyer_phone, buyer_line)
       VALUES ($1, $2, $3) RETURNING id`,
      [buyer_name, buyer_phone, buyer_line]
    );
    const orderId = orderRows[0].id;

    for (const item of items) {
      await client.query("UPDATE products SET stock = stock - $1 WHERE id = $2", [item.qty, item.id]);
      await client.query(
        "INSERT INTO order_items (order_id, product_id, quantity) VALUES ($1, $2, $3)",
        [orderId, item.id, item.qty]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "訂單建立成功", order_id: orderId });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
