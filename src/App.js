// src/App.js
import React from "react";
import "./App.css";
import Success from "./Success"; // страница «Заказ принят»
import SetsPage from "./SetsPage"; // страница сетов по подписке
import SetsReceivedPage from "./SetsReceivedPage"; // страница «сет уже получен»
import RollsPage from "./RollsPage"; // страница подарочных роллов по подписке
import ShopPage from "./ShopPage"; // страница магазина
import DiscountShopPage from "./DiscountShopPage"; // магазин по подписке со скидками
import ProfilePage from "./ProfilePage"; // личный кабинет
import SettingsPage from "./SettingsPage"; // настройки и опции
import LandingPage from "./LandingPage"; // посадочная страница с тарифами
import PaymentPage from "./PaymentPage"; // страница оплаты подписки
import AdminPage from "./AdminPage"; // админка
import GiftRollsPage from "./GiftRollsPage"; // подарочные роллы (отдельная страница для бота)

function App() {
  // без условных хуков — просто флаги страниц
  const isSuccessPage =
    typeof window !== "undefined" && window.location.pathname === "/success";
  const isSetsPage =
    typeof window !== "undefined" && window.location.pathname === "/sets";
  const isSetsReceivedPage =
    typeof window !== "undefined" && window.location.pathname === "/sets-received";
  const isRollsPage =
    typeof window !== "undefined" && window.location.pathname === "/rolls";
  const isShopPage =
    typeof window !== "undefined" && window.location.pathname === "/shop";
  const isDiscountShopPage =
    typeof window !== "undefined" && window.location.pathname === "/discount-shop";
  const isProfilePage =
    typeof window !== "undefined" && window.location.pathname === "/profile";
  const isSettingsPage =
    typeof window !== "undefined" && window.location.pathname === "/settings";
  const isAdminPage =
    typeof window !== "undefined" && window.location.pathname === "/admin";
  const isGiftRollsPage =
    typeof window !== "undefined" && window.location.pathname === "/gift-rolls";
  const isPaymentPage =
    typeof window !== "undefined" && window.location.pathname.startsWith("/pay/");
  const isLandingPage =
    typeof window !== "undefined" &&
    (window.location.pathname === "/" || window.location.pathname === "");

  if (isGiftRollsPage) {
    return <GiftRollsPage />;
  }

  if (isAdminPage) {
    return <AdminPage />;
  }

  if (isSettingsPage) {
    return <SettingsPage />;
  }

  if (isProfilePage) {
    return <ProfilePage />;
  }

  if (isDiscountShopPage) {
    return <DiscountShopPage />;
  }

  if (isShopPage) {
    return <ShopPage />;
  }

  if (isPaymentPage) {
    return <PaymentPage />;
  }

  if (isLandingPage) {
    return <LandingPage />;
  }

  return (
    <div className="app">
      {isSetsReceivedPage ? (
        <SetsReceivedPage />
      ) : isSetsPage ? (
        <SetsPage />
      ) : isRollsPage ? (
        <RollsPage />
      ) : isSuccessPage ? (
        <Success />
      ) : null}
    </div>
  );
}

export default App;
