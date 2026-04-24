export const VN_MARKET_RULES = {
  HOSE: { priceStep: 100, ceilFloorPct: 0.07, session: { ato: '09:00-09:15', continuous: '09:15-11:30,13:00-14:30', atc: '14:30-14:45' } },
  HNX:  { priceStep: 100, ceilFloorPct: 0.10, session: { continuous: '09:00-11:30,13:00-14:30', atc: '14:30-14:45' } },
  UPCOM:{ priceStep: 100, ceilFloorPct: 0.15, session: { continuous: '09:00-11:30,13:00-14:30' } }
};

export function calculateCeilFloor(refPrice: number, exchange: keyof typeof VN_MARKET_RULES) {
  const { priceStep, ceilFloorPct } = VN_MARKET_RULES[exchange];
  const ceil = Math.ceil((refPrice * (1 + ceilFloorPct)) / priceStep) * priceStep;
  const floor = Math.floor((refPrice * (1 - ceilFloorPct)) / priceStep) * priceStep;
  return { ceil, floor, ref: refPrice };
}
