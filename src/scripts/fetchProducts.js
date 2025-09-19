import fetch from "node-fetch";
import fs from "fs";

const API_URL = "https://api.zenky.io/v2/products";
const API_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMjg1MDZiMWJiZWU3ZDIzMzZlZDRmZTk4MWNkYTViZGI2ODJhYWRkZjg4YmQxNGM1YmIwMmQwY2Q4YzNlNTNkYWUxOTAxYjE2ZjFlNWViOWYiLCJpYXQiOjE3NTI2OTk1MTYuMjY5OTI5LCJuYmYiOjE3NTI2OTk1MTYuMjY5OTMxLCJleHAiOjQxMDI0NDQ3OTkuMDE5MzM0LCJzdWIiOiI5M2YwOGQ1NS1kNGVkLTQ0MTMtOGFkNC1lNDEyZWY2ZTYxYjAiLCJzY29wZXMiOlsic3RvcmVzLm1hbmFnZSIsInN0b3Jlcy51c2Vycy5tYW5hZ2UiLCJzdG9yZXMubm90aWZpY2F0aW9ucy5tYW5hZ2UiLCJzdG9yZXMud2ViaG9va3MubWFuYWdlIiwic3RvcmVzLmxveWFsdHkubWFuYWdlIiwic3RvcmVzLnVuZGVybWluZS5tYW5hZ2UiLCJzYWxlc19jaGFubmVscy5tYW5hZ2UiLCJjYXRhbG9nLm1hbmFnZSIsInByb2R1Y3RzLm1hbmFnZSIsIm9yZGVycy5tYW5hZ2UiLCJjdXN0b21lcnMubWFuYWdlIiwicHJvZmlsZS5tYW5hZ2UiLCJjb250ZW50Lm1hbmFnZSIsInByb2ZpbGUuYWRkcmVzc2VzLm1hbmFnZSIsImJpbGxpbmcubWFuYWdlIl19.UvLDsG7utiG6ykceVVpt7beZodW9wfyF7JmJDIiwEEiVWP4sdhpYHF2wOZsT0d50Sj6BDhFmu4qH6Jeyvi_1HSPH0o-6DCwUojxKtp6LA2V_aIkTpmjMAI3OFDUYFwGpfLJVg-o5S7dJS2fUn-X5KonJ-NMW-KpiPM2CQ8KhmIXijLNaOghj9pSEkLN4Tmkp5VLot1AANwebp3nkL-kDQiPotld2ed4spqCb6UzgQPnTuEbgAJGFTR0hdUgnmpZM_pgrNto4v-oOHhftrrU8xxgxcX49PTGq0QyvSzYHb_4U4WceKWqjmWBWM4ckC9pnAyAQg58w1ArK9DDhBcKmMU4TUixVxvXZHViftZ45Y0tpkUlzjra55QboXpPizjNUQm5BN8zh3nZB5gr6-PfZ19cHX0zm4xfq9qKGq_CLmocra0HC6EoAWtKJ1pCAGiXr2u1_uq8UTj7gdAJsDEGPERsoP4Tjdt0lUCjJeamTxFvwL-QK7tMdMQmOupdjcTSOamVVkVFPJlmgNClDOuYmzYiieVxCgaOZlCOOpDxzIrQd2qQppWiuNbFPTDFaS0s9yk1hvMyvFPjmKq7-uSb3aTDZMdR5iSY4BNOBYiWLvOBLmHj6D-U0wuEjxNHRsSD6hCUwoZOIL9s_IGIob5ofKd73a2GmIhPB9O0evUluVsA";
const STORE_ID = "940eecaf-59d8-46d6-b73d-319cfc5a3d4c";
const CATEGORY_ID = "9f6653e0-d5fe-4f21-97cf-0909d92daea2"; // категория "Роллы"

async function fetchAllProducts() {
  let page = 1;
  let allProducts = [];

  while (true) {
    const response = await fetch(
      `${API_URL}?category_id=${CATEGORY_ID}&page=${page}`,
      {
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "X-Store-Id": STORE_ID,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!data.data || data.data.length === 0) break;

    const products = data.data.map((item, index) => ({
      id: index + 1 + (page - 1) * data.data.length, // локальный ID
      name: item.name,
      description: "", // вместо "Без описания" оставляем пусто
      price: item.price || 0,
      image: `/img/${item.slug}.png` || "/img/placeholder.png"
    }));

    allProducts = [...allProducts, ...products];

    if (!data.meta.pagination.has_next_page) break;
    page++;
  }

  // Генерируем data.js
  const output = `export const products = ${JSON.stringify(allProducts, null, 2)};`;
  fs.writeFileSync("./src/data.js", output, "utf-8");
  console.log("✅ Файл data.js обновлён с", allProducts.length, "товарами");
}

fetchAllProducts();
