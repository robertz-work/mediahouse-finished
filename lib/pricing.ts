/**
 * Pricing calculator — computes a frozen price snapshot for a campaign item.
 */

import { PERIOD_PRICE_FIELD, type PeriodDays } from "./constants";
import type { MediaPricing } from "./db/mediaRepo";

export interface PriceSnapshot {
  media: number;
  print: number;
  install: number;
  total: number;
}

/**
 * Calculate price for a single campaign item.
 *
 * @param pricing    The media's pricing object
 * @param periodDays One of 30 | 90 | 180 | 365
 * @param addPrint   Whether the client wants print service
 * @param addInstall Whether the client wants installation service
 * @returns PriceSnapshot with frozen prices
 * @throws Error if the requested period is not available in the pricing
 */
export function calculateItemPrice(
  pricing: MediaPricing,
  periodDays: PeriodDays,
  addPrint: boolean,
  addInstall: boolean
): PriceSnapshot {
  const field = PERIOD_PRICE_FIELD[periodDays];
  const mediaPrice = pricing[field];

  if (mediaPrice === undefined || mediaPrice === null) {
    throw new Error(
      `Okres ${periodDays} dni nie jest dostępny dla tego nośnika`
    );
  }

  const print = addPrint && pricing.printCost ? pricing.printCost : 0;
  const install = addInstall && pricing.installCost ? pricing.installCost : 0;

  return {
    media: mediaPrice,
    print,
    install,
    total: mediaPrice + print + install,
  };
}

export function calculateCampaignTotals(
  items: Array<{ priceSnapshot: PriceSnapshot }>
): {
  mediaSubtotal: number;
  printSubtotal: number;
  installSubtotal: number;
  grandTotal: number;
} {
  let mediaSubtotal = 0;
  let printSubtotal = 0;
  let installSubtotal = 0;

  for (const item of items) {
    mediaSubtotal += item.priceSnapshot.media;
    printSubtotal += item.priceSnapshot.print;
    installSubtotal += item.priceSnapshot.install;
  }

  return {
    mediaSubtotal,
    printSubtotal,
    installSubtotal,
    grandTotal: mediaSubtotal + printSubtotal + installSubtotal,
  };
}
