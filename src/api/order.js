// src/api/order.js
// Next.js API route: /api/order

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  const { telegram_id, product_id, product_name, price, code } = req.body;

  if (!telegram_id || !product_id || !product_name || price === undefined || price === null) {
    return res.status(400).json({ error: "Некорректные или неполные данные заказа" });
  }

  const TELEGRAM_WEBHOOK_URL =
    "https://api.watbot.ru/hook/3679113:lNF976LZ8w7ok2w4LHOuxt1X9YqVNGKxbBFbi8uGlUCTyLV3";

  try {
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

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Ошибка при отправке: ${response.status} — ${errorText}`);
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Ошибка webhook:", err.message);
    return res.status(500).json({ error: "Не удалось отправить заказ" });
  }
}
