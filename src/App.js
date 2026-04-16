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
import FloatingGameWidget from "./components/FloatingGameWidget"; // плавающий виджет игры

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

  // Виджет игры — показывается на всех страницах кроме /game, /login, /admin
  const showGameWidget = !isLoginPage && !isAdminPage && !isGamePage;

  if (isLoginPage) {
    return <LoginPage />;
  }

  const W = showGameWidget ? <FloatingGameWidget /> : null;

  if (isBenefitsPage) return <>{W}<BenefitsPage /></>;
  if (isPartnerCodePage) return <>{W}<PartnerCodePage /></>;
  if (isGiftRollsPage) return <>{W}<GiftRollsPage /></>;
  if (isGiftSetsPage) return <>{W}<GiftSetsPage /></>;
  if (isAdminPage) return <AdminPage />;
  if (isSettingsPage) return <>{W}<SettingsPage /></>;
  if (isProfilePage) return <>{W}<ProfilePage /></>;
  if (isDiscountShopPage) return <>{W}<DiscountShopPage /></>;
  if (isShopPage) return <>{W}<ShopPage /></>;
  if (isPaymentPage) return <>{W}<PaymentPage /></>;
  if (isLandingPage) return <>{W}<LandingPage /></>;

  if (isSetsReceivedPage) return <><SetsReceivedPage />{showGameWidget && <FloatingGameWidget />}</>;
  if (isSetsPage) return <><SetsPage />{showGameWidget && <FloatingGameWidget />}</>;
  if (isRollsPage) return <><RollsPage />{showGameWidget && <FloatingGameWidget />}</>;
  if (isSuccessPage) return <><Success />{showGameWidget && <FloatingGameWidget />}</>;

  return <NotFoundPage />;
}

export default App;
