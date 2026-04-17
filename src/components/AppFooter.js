import React from 'react';
import { APP_VERSION } from '../version';

export default function AppFooter() {
  return (
    <footer className="footer">
      <img src="/logo.jpg" alt="Sushi House" className="footer-logo" />
      <div className="footer-info">
        <p><b>Телефон:</b> +7 (401) 290-27-90</p>
        <p><b>Время работы:</b> 10:00 – 22:00</p>
        <p><b>Адрес:</b> г. Калининград, ул. Ю.Гагарина, д. 16Б</p>
      </div>
      <p className="footer-version">v{APP_VERSION}</p>
    </footer>
  );
}
