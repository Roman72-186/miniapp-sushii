import { useEffect, useState } from 'react';
import { DEFAULT_PRICE_TABLE, pricingToTable } from '../config/tariffs';

export function usePricing(initialPriceTable = DEFAULT_PRICE_TABLE) {
  const [priceTable, setPriceTable] = useState(initialPriceTable);

  useEffect(() => {
    fetch('/api/admin/pricing')
      .then(response => response.json())
      .then(data => {
        if (data.success && data.pricing) {
          setPriceTable(pricingToTable(data.pricing));
        }
      })
      .catch(() => {});
  }, []);

  return priceTable;
}
