export interface GoldReserve {
  country: string;
  value: number; // official holdings in USD
}

// static fallback sample; real-time data is fetched by service when panel initializes
export const GOLD_RESERVES: GoldReserve[] = [
  { country: 'United States', value: 813300000000 },
  { country: 'Germany', value: 336600000000 },
  { country: 'Italy', value: 245100000000 },
  { country: 'France', value: 243600000000 },
  { country: 'Russia', value: 229900000000 },
];
