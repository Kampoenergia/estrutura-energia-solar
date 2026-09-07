// Referência interna legada. Não enviar para a página pública.
const PRICE_PER_PANEL = 1500;
const FINANCE_RATE_START = 0.018; // parâmetro interno; não é exibido no site
const FINANCE_MONTHS = 72;
const POST_SOLAR_BILL = 60;
function priceInstallment(principal, rate, months) { const p = Number(principal) || 0; const i = Number(rate) || 0; const n = Number(months) || FINANCE_MONTHS; if (p <= 0 || n <= 0) return 0; if (i <= 0) return p / n; return p * i / (1 - Math.pow(1 + i, -n)); }
function solarEstimate(conta, propertyType = 'comercial') {
  const bill = Math.max(150, Number(conta) || 0);
  const tariffs = { residencial: 0.82, comercial: 0.86, industrial: 0.95, rural: 0.86 };
  const tariff = tariffs[propertyType] || tariffs.comercial;
  const kwh = bill / tariff;
  // Calibração informada: uma conta de R$ 500 corresponde a 10 placas.
  const panels = Math.max(3, Math.round(bill / 50));
  const kwp = Math.round(panels * 0.55 * 10) / 10;
  const remainingBill = Math.min(POST_SOLAR_BILL, Math.round(bill * 100) / 100);
  const economyMonth = Math.max(0, Math.round((bill - remainingBill) * 100) / 100);
  const economyYear = Math.round(economyMonth * 12 * 100) / 100;
  const systemValue = panels * PRICE_PER_PANEL;
  const financingInstallment = Math.round(priceInstallment(systemValue, FINANCE_RATE_START, FINANCE_MONTHS) * 100) / 100;
  const paybackMonths = economyMonth > 0 ? Math.round((systemValue / economyMonth) * 10) / 10 : 0;
  return { contaEst: Math.round(bill), tariff, kwhEst: Math.round(kwh), systemKwp: kwp, panels, economyMonth, economyYear, remainingBill, systemValue, financingMonths: FINANCE_MONTHS, financingInstallment, paybackMonths, paybackYears: Math.round((paybackMonths / 12) * 10) / 10, pricePerPanel: PRICE_PER_PANEL };
}


module.exports = { solarEstimate, priceInstallment };
