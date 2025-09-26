import React, { useEffect, useMemo, useState } from "react";

function Success() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const product = params.get("product") || "Заказ";

  const [env, setEnv] = useState({
    inTelegram: false,
    platform: "unknown",
    version: "unknown",
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (tg) {
      try { tg.ready(); } catch {}
      // покажем кнопку «Назад» от Telegram, и повесим на неё закрытие
      try {
        tg.BackButton.show();
        tg.BackButton.onClick(() => safeClose());
      } catch {}

      setEnv({
        inTelegram: true,
        platform: tg.platform || "unknown",
        version: tg.version || "unknown",
      });
    } else {
      setEnv({ inTelegram: false, platform: "no-tg", version: "n/a" });
    }

    // отписка на всякий случай
    return () => {
      try { window.Telegram?.WebApp?.BackButton?.hide(); } catch {}
    };
  }, []);

  const safeClose = () => {
    const tg = window.Telegram?.WebApp;

    // лёгкий хаптик
    try { tg?.HapticFeedback?.impactOccurred?.("medium"); } catch {}

    // Покажем подтверждение и в колбэке закроем
    if (tg?.showAlert) {
      tg.showAlert("Спасибо! Заказ принят. Возвращаемся в Telegram.", () => {
        try { tg.close(); } catch {}
        // ещё пара подстраховок
        setTimeout(() => { try { tg.requestClose?.(); } catch {} }, 80);
        setTimeout(() => { try { tg.close(); } catch {} }, 200);
      });
      // резерв, если колбэк не сработал
      setTimeout(() => { try { tg.requestClose?.(); } catch {} }, 600);
      setTimeout(() => { try { tg.close(); } catch {} }, 1200);
    } else {
      // вне Telegram
      alert("Спасибо! Заказ принят.");
      try { window.close(); } catch {}
    }
  };

  return (
    <div className="app" style={{ padding: 16, textAlign: "center" }}>
      {/* Диагностика окружения (в проде можно скрыть) */}
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
        {env.inTelegram
          ? `Telegram WebApp: OK • platform=${env.platform} • version=${env.version}`
          : "Telegram WebApp не обнаружен (страница, вероятно, открыта вне Telegram)"}
      </div>

      <div className="header">
        <img src="/logo.jpg" alt="Sushi House Logo" className="logo" />
        <span>Sushi House</span>
      </div>

      <div style={{ maxWidth: 520, margin: "24px auto" }}>
        <h2>✅ Заказ принят</h2>
        <p style={{ marginTop: 8 }}>
          Спасибо! Мы получили ваш заказ{product ? `: «${product}»` : ""}.
        </p>

        <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={safeClose}>Закрыть мини-приложение</button>
          <a href="/" style={{ display: "inline-block" }}>
            <button type="button">Вернуться в меню</button>
          </a>
        </div>
      </div>

      <footer className="footer">
        <img src="/logo.jpg" alt="Sushi House" className="footer-logo" />
        <div className="footer-info">
          <p><b>📞 Телефон:</b> +7 (401) 290-27-90</p>
          <p><b>⏰ Время работы:</b> 10:00 – 22:00</p>
          <p><b>📍 Адрес:</b> г. Калининград, ул. Ю.Гагарина, д. 16Б</p>
        </div>
      </footer>
    </div>
  );
}

export default Success;
