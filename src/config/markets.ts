import type { Sector, Commodity, MarketSymbol } from '@/types';

export const SECTORS: Sector[] = [
  { symbol: 'XLK', name: 'Tech' },
  { symbol: 'XLF', name: 'Finance' },
  { symbol: 'XLE', name: 'Energy' },
  { symbol: 'XLV', name: 'Health' },
  { symbol: 'XLY', name: 'Consumer' },
  { symbol: 'XLI', name: 'Industrial' },
  { symbol: 'XLP', name: 'Staples' },
  { symbol: 'XLU', name: 'Utilities' },
  { symbol: 'XLB', name: 'Materials' },
  { symbol: 'XLRE', name: 'Real Est' },
  { symbol: 'XLC', name: 'Comms' },
  { symbol: 'SMH', name: 'Semis' },
];

export const COMMODITIES: Commodity[] = [
  // Energy Commodities
  { symbol: 'CL=F', name: 'Crude Oil WTI', display: 'WTI CRUDE' },
  { symbol: 'BZ=F', name: 'Brent Crude', display: 'BRENT' },
  { symbol: 'NG=F', name: 'Natural Gas', display: 'NATGAS' },
  { symbol: 'UGA=F', name: 'Uranium', display: 'URANIUM' },
  
  // Industrial Metals
  { symbol: 'HG=F', name: 'Copper', display: 'COPPER' },
  { symbol: 'AL=F', name: 'Aluminum', display: 'ALUM' },
  { symbol: 'ZN=F', name: 'Zinc', display: 'ZINC' },
  { symbol: 'NI=F', name: 'Nickel', display: 'NICKEL' },
  { symbol: 'SN=F', name: 'Tin', display: 'TIN' },
  
  // Precious Metals
  { symbol: 'GC=F', name: 'Gold', display: 'GOLD' },
  { symbol: 'SI=F', name: 'Silver', display: 'SILVER' },
  { symbol: 'PL=F', name: 'Platinum', display: 'PLAT' },
  { symbol: 'PA=F', name: 'Palladium', display: 'PALLADIUM' },
  
  // Agricultural Commodities
  { symbol: 'ZW=F', name: 'Wheat', display: 'WHEAT' },
  { symbol: 'ZC=F', name: 'Corn', display: 'CORN' },
  { symbol: 'ZS=F', name: 'Soybeans', display: 'SOYBEANS' },
  { symbol: 'ZR=F', name: 'Rice', display: 'RICE' },
  { symbol: 'SB=F', name: 'Sugar', display: 'SUGAR' },
  { symbol: 'CT=F', name: 'Cotton', display: 'COTTON' },
  { symbol: 'CC=F', name: 'Cocoa', display: 'COCOA' },
  { symbol: 'KC=F', name: 'Coffee', display: 'COFFEE' },
  
  // Freight & Market Indicators
  { symbol: '^VIX', name: 'VIX Volatility', display: 'VIX' },
  { symbol: '^BVSP', name: 'Baltic Dry Index', display: 'BDI' },
  
  // Major Energy & Industrial Indices
  { symbol: 'DXY=F', name: 'USD Index', display: 'DXY' },
];

export const MARKET_SYMBOLS: MarketSymbol[] = [
  { symbol: '^GSPC', name: 'S&P 500', display: 'SPX' },
  { symbol: '^DJI', name: 'Dow Jones', display: 'DOW' },
  { symbol: '^IXIC', name: 'NASDAQ', display: 'NDX' },
  { symbol: 'AAPL', name: 'Apple', display: 'AAPL' },
  { symbol: 'MSFT', name: 'Microsoft', display: 'MSFT' },
  { symbol: 'NVDA', name: 'NVIDIA', display: 'NVDA' },
  { symbol: 'GOOGL', name: 'Alphabet', display: 'GOOGL' },
  { symbol: 'AMZN', name: 'Amazon', display: 'AMZN' },
  { symbol: 'META', name: 'Meta', display: 'META' },
  { symbol: 'BRK-B', name: 'Berkshire', display: 'BRK.B' },
  { symbol: 'TSM', name: 'TSMC', display: 'TSM' },
  { symbol: 'LLY', name: 'Eli Lilly', display: 'LLY' },
  { symbol: 'TSLA', name: 'Tesla', display: 'TSLA' },
  { symbol: 'AVGO', name: 'Broadcom', display: 'AVGO' },
  { symbol: 'WMT', name: 'Walmart', display: 'WMT' },
  { symbol: 'JPM', name: 'JPMorgan', display: 'JPM' },
  { symbol: 'V', name: 'Visa', display: 'V' },
  { symbol: 'UNH', name: 'UnitedHealth', display: 'UNH' },
  { symbol: 'NVO', name: 'Novo Nordisk', display: 'NVO' },
  { symbol: 'XOM', name: 'Exxon', display: 'XOM' },
  { symbol: 'MA', name: 'Mastercard', display: 'MA' },
  { symbol: 'ORCL', name: 'Oracle', display: 'ORCL' },
  { symbol: 'PG', name: 'P&G', display: 'PG' },
  { symbol: 'COST', name: 'Costco', display: 'COST' },
  { symbol: 'JNJ', name: 'J&J', display: 'JNJ' },
  { symbol: 'HD', name: 'Home Depot', display: 'HD' },
  { symbol: 'NFLX', name: 'Netflix', display: 'NFLX' },
  { symbol: 'BAC', name: 'BofA', display: 'BAC' },
];

export const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'ripple'] as const;

export const CRYPTO_MAP: Record<string, { name: string; symbol: string }> = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
  ethereum: { name: 'Ethereum', symbol: 'ETH' },
  solana: { name: 'Solana', symbol: 'SOL' },
  ripple: { name: 'XRP', symbol: 'XRP' },
};
