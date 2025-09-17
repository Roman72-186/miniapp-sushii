// api/order.js
export default async function handler(req, res) {
    if (req.method === "POST") {
      try {
        // URL входящего Webhook WatBot (замени на свой реальный!)
        const WATBOT_WEBHOOK_URL = "https://api.watbot.ru/hook/3661738:D7qMxR26yeQX5YujZstPP3LllAJ4OPIAi5Hko9Y8FkcP330X";
  
        // Пересылаем данные на WatBot
        const response = await fetch(WATBOT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req.body)
        });
  
        const data = await response.json();
  
        res.status(200).json({ status: "ok", watbot: data });
      } catch (err) {
        res.status(500).json({ status: "error", error: err.message });
      }
    } else {
      res.status(405).json({ status: "method not allowed" });
    }
  }
  