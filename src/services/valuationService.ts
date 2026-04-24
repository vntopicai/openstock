export async function getCurrentValuation(symbol: string) {
  return { success: true, data: {} };
}

export async function getValuationHistory(symbol: string, query: any) {
  return { success: true, data: [] };
}

export async function getMarketValuation(scope: string, query: any) {
  return { success: true, data: [] };
}

export async function getSummary(symbol: string) {
  return { success: true, data: {} };
}
