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

    const { 
      buyer_name, buyer_phone, buyer_line,
      delivery_method, pickup_time, soap_box_count,
      receiver_name, receiver_phone, receiver_address,
      items
    } = req.body;

    if (!delivery_method) {
      throw new Error("缺少取貨方式");
    }
    for (const item of items) {
      const { rows } = await client.query("SELECT stock, name FROM products WHERE id=$1", [item.id]);
      const product = rows[0];
      if (!product) throw new Error(`商品 ${item.id} 不存在`);
      if (product.stock < item.qty)
        throw new Error(`商品「${product.name}」庫存不足（剩 ${product.stock} 件）`);
    }

  // === 取得最新的訂單編號 ===
  const { rows: latestRows } = await client.query("SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 1");
  let newOrderId = 10000; // 初始起始值
  if (latestRows.length > 0 && !isNaN(latestRows[0].order_id)) {
    newOrderId = Number(latestRows[0].order_id) + 1;
  }

  // === 新增訂單 ===
  await client.query(
    `
    INSERT INTO orders (
      order_id, buyer_name, buyer_phone, buyer_line,
      soap_box_count, delivery_method, pickup_time,
      receiver_name, receiver_phone, receiver_address
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
    [
      newOrderId,
      buyer_name, buyer_phone, buyer_line, soap_box_count,
      delivery_method,
      pickup_time || null,
      receiver_name || null,
      receiver_phone || null,
      receiver_address || null
    ]
  );
  const orderId = newOrderId;

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

// ✅ 查詢訂單：可用 order_id 或 buyer_name
app.get("/api/order/search", async (req, res) => {
  const { q } = req.query; // 使用 query string，例如 ?q=10001 或 ?q=王小明
  if (!q) return res.status(400).json({ message: "請輸入查詢關鍵字" });

  try {
    const client = await pool.connect();
    let result;

    // === 共同的 SELECT 欄位（新增取貨資訊） ===
    const baseSelect = `
      SELECT 
        o.order_id,
        o.buyer_name,
        o.buyer_phone,
        o.buyer_line,
        o.soap_box_count,
        o.delivery_method,
        o.pickup_time,
        o.receiver_name,
        o.receiver_phone,
        o.receiver_address,
        p.name AS product_name,
        p.price,
        oi.quantity
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.id
    `;

    if (/^\d+$/.test(q)) {
      // 🔍 若是數字 → 用訂單編號查詢
      result = await client.query(
        `${baseSelect}
         WHERE o.order_id = $1
         ORDER BY o.order_id DESC`,
        [q]
      );
    } else {
      // 🔍 若是文字 → 用姓名查詢
      result = await client.query(
        `${baseSelect}
         WHERE o.buyer_name ILIKE $1
         ORDER BY o.order_id DESC`,
        [`%${q}%`]
      );
    }

    client.release();

    if (result.rows.length === 0)
      return res.status(404).json({ message: "查無訂單" });

    res.json(result.rows);

  } catch (err) {
    console.error("❌ 查詢訂單失敗", err);
    res.status(500).json({ message: "伺服器錯誤" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));
