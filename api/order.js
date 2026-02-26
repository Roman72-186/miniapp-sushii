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

    // Валидация — product_name обязателен, telegram_id опционален
    if (!product_name) {
      return res.status(400).json({ error: "Поле отсутствует: product_name" });
    }

    // Отправляем уведомление в Telegram через WATBOT
    const response = await fetch(TELEGRAM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_id: telegram_id || "",
        product_id: product_id || "",
        product_name,
        price: price ?? 0,
        code: code ?? ""
      })
    });

    const text = await response.text().catch(() => "");

    if (!response.ok) {
      console.error("Webhook error:", response.status, text);
      return res.status(502).json({
        success: false,
        error: `Webhook ${response.status}${response.statusText ? " " + response.statusText : ""}`,
        body: text || null
      });
    }

    return res.status(200).json({
      success: true,
      status: "ok"
    });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Не удалось обработать заказ" });
  }
};
