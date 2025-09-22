// /pages/api/order.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Метод не поддерживается" });
  }

  const { telegram_id, product_id, product_name, price } = req.body;

  try {
    // Отправляем на твой webhook
    const response = await fetch(
      "https://api.watbot.ru/hook/3679113:lNF976LZ8w7ok2w4LHOuxt1X9YqVNGKxbBFbi8uGlUCTyLV3",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id,
          product_id,
          product_name,
          price,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Ошибка при отправке: ${response.status}`);
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Ошибка webhook:", err);
    return res.status(500).json({ error: "Не удалось отправить заказ" });
  }
}
