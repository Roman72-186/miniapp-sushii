// /api/order.js  — Vercel Serverless Function (CommonJS)

const TELEGRAM_WEBHOOK_URL =
  "https://api.watbot.ru/hook/3679113:lNF976LZ8w7ok2w4LHOuxt1X9YqVNGKxbBFbi8uGlUCTyLV3";

// Универсальный парсер: Buffer | string | object -> object
function parseJsonBody(req) {
  try {
    if (!req.body) return {};
    if (typeof req.body === "string") return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString("utf8"));
    // Vercel может уже отдать объект, если content-type корректный
    if (typeof req.body === "object") return req.body;
    return {};
  } catch (e) {
    return {};
  }
}

module.exports = async (req, res) => {
  // Разрешаем только POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  try {
    const { telegram_id, product_id, product_name, price, code } = parseJsonBody(req);

    // Мягкая валидация — вернём 400 с причинами, чтобы проще было отладить
    const missing = [];
    if (!telegram_id) missing.push("telegram_id");
    if (!product_id) missing.push("product_id");
    if (!product_name) missing.push("product_name");
    if (price === undefined || price === null) missing.push("price");

    if (missing.length) {
      return res.status(400).json({ error: `Поля отсутствуют: ${missing.join(", ")}` });
    }

    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_id,
        product_id,
        product_name,
        price,
        code: code ?? ""
      })
    });

    const text = await response.text().catch(() => "");

    if (!response.ok) {
      console.error("Webhook error:", response.status, text);
      return res.status(502).json({
        error: `Webhook ${response.status}${response.statusText ? " " + response.statusText : ""}`,
        body: text || null
      });
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Не удалось отправить заказ" });
  }
};
