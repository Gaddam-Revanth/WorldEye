export interface GoldReserve {
  country: string;
  value: number; // official holdings in USD
  tons?: number; // derived estimated weight in metric tons
}

// static fallback sample; real-time data is fetched by service when panel initializes
export const GOLD_RESERVES: GoldReserve[] = [
  { country: 'United States', value: 813300000000, tons: 813300000000 / 600000000 },
  { country: 'Germany', value: 336600000000, tons: 336600000000 / 600000000 },
  { country: 'Italy', value: 245100000000, tons: 245100000000 / 600000000 },
  { country: 'France', value: 243600000000, tons: 243600000000 / 600000000 },
  { country: 'Russia', value: 229900000000, tons: 229900000000 / 600000000 },
  // add more common holders
  { country: 'China', value: 194800000000, tons: 194800000000 / 600000000 },
  { country: 'Switzerland', value: 104000000000, tons: 104000000000 / 600000000 },
  { country: 'Japan', value: 76520000000, tons: 76520000000 / 600000000 },
  { country: 'India', value: 76520000000, tons: 76520000000 / 600000000 },
  { country: 'Netherlands', value: 61290000000, tons: 61290000000 / 600000000 },
];
