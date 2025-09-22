import React from "react";
import "./App.css";

function Delivery() {
  return (
    <div className="page">
      <h2>Доставка и оплата</h2>
      <p>Мы доставляем суши по Калининграду в пределах зоны доставки:</p>

      <div className="map-block">
        <iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3Af5c39d8ee9142bbff72107e936bfdb9cb598d0cc5c22bf8be122fa4b9710d1e8&amp;source=constructor" width="540" height="438" frameborder="0" title="Карта доставки"></iframe>
      </div>

      <div className="delivery-info">
        <h3>Наши адреса</h3>
        <ul>
          <li>📍 Калининград, ул. Ю.Гагарина, д. 16Б — ☎ +7 (401) 290-27-90 — ⏰ 10:00-22:00</li>
          <li>📍 Калининград, ул. Согласия, д. 46 — ☎ +7 (401) 290-27-90 — ⏰ 10:00-22:00</li>
          <li>📍 Калининград, ул. Автомобильная, д. 12Б — ☎ +7 (401) 290-27-90 — ⏰ 10:00-22:00</li>
        </ul>

        <h3>Самовывоз</h3>
        <p>Доступен из любой точки города. Минимальной суммы заказа для самовывоза нет.</p>
      </div>
    </div>
  );
}

export default Delivery;
