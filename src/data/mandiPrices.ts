/**
 * Sample Mandi & Market Price Benchmarks for Andhra Pradesh / Visakhapatnam cluster.
 * Shows farmers how much more they earn selling direct on Farm Trust vs giving to brokers.
 */

export interface MandiPriceItem {
  id: string;
  cropName: string;
  cropTeluguName: string;
  unit: string;
  mandiPrice: number;        // Broker price at APMC mandi
  suggestedMinPrice: number; // Fair direct price min
  suggestedMaxPrice: number; // Fair direct price max
  marketTrend: 'up' | 'down' | 'stable';
  differenceAmount: number;  // Extra profit per kg for farmer
}

export const MANDI_PRICES_TODAY: MandiPriceItem[] = [
  {
    id: 'mandi-1',
    cropName: 'Country Tomatoes',
    cropTeluguName: 'నాటు టమాటాలు',
    unit: 'kg',
    mandiPrice: 18,
    suggestedMinPrice: 28,
    suggestedMaxPrice: 35,
    marketTrend: 'up',
    differenceAmount: 14,
  },
  {
    id: 'mandi-2',
    cropName: 'Sona Masoori Rice',
    cropTeluguName: 'సోనా మసూరి బియ్యం',
    unit: 'kg',
    mandiPrice: 42,
    suggestedMinPrice: 55,
    suggestedMaxPrice: 62,
    marketTrend: 'stable',
    differenceAmount: 16,
  },
  {
    id: 'mandi-3',
    cropName: 'Fresh Cow Milk',
    cropTeluguName: 'తాజా ఆవు పాలు',
    unit: 'L',
    mandiPrice: 40,
    suggestedMinPrice: 58,
    suggestedMaxPrice: 65,
    marketTrend: 'up',
    differenceAmount: 20,
  },
  {
    id: 'mandi-4',
    cropName: 'Native Red Onions',
    cropTeluguName: 'నాటు ఉల్లిపాయలు',
    unit: 'kg',
    mandiPrice: 22,
    suggestedMinPrice: 32,
    suggestedMaxPrice: 38,
    marketTrend: 'down',
    differenceAmount: 12,
  },
  {
    id: 'mandi-5',
    cropName: 'Tender Bhendi (Okra)',
    cropTeluguName: 'తాజా బెండకాయలు',
    unit: 'kg',
    mandiPrice: 24,
    suggestedMinPrice: 35,
    suggestedMaxPrice: 42,
    marketTrend: 'up',
    differenceAmount: 14,
  },
  {
    id: 'mandi-6',
    cropName: 'Banganapalli Mangoes',
    cropTeluguName: 'బంగనపల్లి మామిడి',
    unit: 'kg',
    mandiPrice: 55,
    suggestedMinPrice: 85,
    suggestedMaxPrice: 95,
    marketTrend: 'up',
    differenceAmount: 35,
  },
];
