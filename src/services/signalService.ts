export async function getLatestSignals(symbol: string) {
  return { success: true, data: [] };
}

export async function getSignalHistory(symbol: string, query: any) {
  return { success: true, data: [] };
}

export async function evaluateSignal(body: any) {
  return { success: true, result: {} };
}

export async function getActiveMarketSignals() {
  return { success: true, data: [] };
}
