// src/App.js
import React from "react";
import "./App.css";
import "./shop.css";
import "./shop-v2.css";
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
import GiftSetsPage from "./GiftSetsPage"; // подарочные сеты (отдельная страница для бота)
import LoginPage from "./LoginPage"; // веб-вход по телефону
import BenefitsPage from "./BenefitsPage"; // страница выгоды подписки
import PartnerCodePage from "./PartnerCodePage"; // ввод кода партнёра после оплаты
import NotFoundPage from "./NotFoundPage"; // страница 404
import WordlePage from "./WordlePage"; // игра «Пятибуквенное слово»

function App() {
  const pathname =
    typeof window !== "undefined"
      ? (window.location.pathname.replace(/\/+$/, "") || "/")
      : "";

  // без условных хуков — просто флаги страниц
  const isSuccessPage =
    pathname === "/success";
  const isSetsPage =
    pathname === "/sets";
  const isSetsReceivedPage =
    pathname === "/sets-received";
  const isRollsPage =
    pathname === "/rolls";
  const isShopPage =
    pathname === "/shop";
  const isDiscountShopPage =
    pathname === "/discount-shop";
  const isProfilePage =
    pathname === "/profile";
  const isSettingsPage =
    pathname === "/settings";
  const isAdminPage =
    pathname === "/admin";
  const isGiftRollsPage =
    pathname === "/gift-rolls";
  const isGiftSetsPage =
    pathname === "/gift-sets";
  const isPaymentPage =
    pathname.startsWith("/pay/");
  const isLoginPage =
    pathname === "/login";
  const isBenefitsPage =
    pathname === "/benefits";
  const isPartnerCodePage =
    pathname === "/partner-code";
  const isLandingPage =
    pathname === "/";
  const isGamePage =
    pathname === "/game";

  if (isGamePage) {
    return <WordlePage />;
  }

  if (isLoginPage) {
    return <LoginPage />;
  }

  if (isBenefitsPage) return <BenefitsPage />;
  if (isPartnerCodePage) return <PartnerCodePage />;
  if (isGiftRollsPage) return <GiftRollsPage />;
  if (isGiftSetsPage) return <GiftSetsPage />;
  if (isAdminPage) return <AdminPage />;
  if (isSettingsPage) return <SettingsPage />;
  if (isProfilePage) return <ProfilePage />;
  if (isDiscountShopPage) return <DiscountShopPage />;
  if (isShopPage) return <ShopPage />;
  if (isPaymentPage) return <PaymentPage />;
  if (isLandingPage) return <LandingPage />;

  if (isSetsReceivedPage) return <SetsReceivedPage />;
  if (isSetsPage) return <SetsPage />;
  if (isRollsPage) return <RollsPage />;
  if (isSuccessPage) return <Success />;

  return <NotFoundPage />;
}

export default App;
