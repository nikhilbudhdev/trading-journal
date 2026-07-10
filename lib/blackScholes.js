// Standard normal CDF (Hart's approximation — error < 7.5e-8)
function normalCDF(x) {
  const t = 1 / (1 + 0.2315419 * Math.abs(x))
  const d = 0.3989423 * Math.exp(-x * x / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))))
  return x > 0 ? 1 - p : p
}

function bsPrice(S, K, T, r, sigma, optionType, q = 0) {
  if (T <= 0) return Math.max(0, optionType === 'call' ? S - K : K - S)
  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT
  if (optionType === 'call') {
    return S * Math.exp(-q * T) * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2)
  }
  return K * Math.exp(-r * T) * normalCDF(-d2) - S * Math.exp(-q * T) * normalCDF(-d1)
}

function bsVega(S, K, T, r, sigma, q = 0) {
  if (T <= 0 || sigma <= 0) return 0
  const d1 = (Math.log(S / K) + (r - q + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T))
  return S * Math.exp(-q * T) * Math.sqrt(T) * (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * d1 * d1)
}

// Solve implied volatility via Newton-Raphson with bisection fallback.
// Returns null if inputs are invalid or the solve fails to converge.
export function solveIV({ S, K, T, r = 0, q = 0, premium, optionType }) {
  if (!S || S <= 0 || !K || K <= 0 || T <= 0 || !premium || premium <= 0) return null

  const intrinsic = Math.max(0, optionType === 'call'
    ? S * Math.exp(-q * T) - K * Math.exp(-r * T)
    : K * Math.exp(-r * T) - S * Math.exp(-q * T))
  if (premium < intrinsic - 0.001) return null

  // Newton-Raphson
  let sigma = 0.3
  for (let i = 0; i < 100; i++) {
    const price = bsPrice(S, K, T, r, sigma, optionType, q)
    const vega = bsVega(S, K, T, r, sigma, q)
    const diff = price - premium
    if (Math.abs(diff) < 0.0001) return Math.max(0.001, Math.min(20, sigma))
    if (vega < 1e-10) break
    sigma = Math.max(0.001, sigma - diff / vega)
  }

  // Bisection fallback
  let lo = 0.0001, hi = 20
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    const price = bsPrice(S, K, T, r, mid, optionType, q)
    if (Math.abs(price - premium) < 0.0001) return mid
    if (price < premium) lo = mid; else hi = mid
  }
  const result = (lo + hi) / 2
  return result > 0.001 ? result : null
}

// Price an option at a future stock price after daysElapsed have passed.
export function optionValueAt({ S, daysElapsed, sigma, K, daysToExpiry, r = 0, q = 0, optionType }) {
  const T = Math.max(0, (daysToExpiry - daysElapsed) / 365)
  if (T <= 0) return Math.max(0, optionType === 'call' ? S - K : K - S)
  return bsPrice(S, K, T, r, sigma, optionType, q)
}

// Ask-side spread buffer applied to forecasted buy-stop entry premium.
// A call bought after a stock rally typically costs less than constant-IV predicts,
// so this overestimate is intentional and conservative.
export const ASK_BUFFER = 1.02

// Forecast the premium you will pay when a buy-stop fires at triggerStock after daysToEntry days.
// Returns null if daysToEntry >= daysToExpiry (trigger would be after expiry).
export function forecastEntryPremium({ triggerStock, daysToEntry, sigma, K, daysToExpiry, r = 0, q = 0, optionType, askBuffer = ASK_BUFFER }) {
  if (!sigma || daysToEntry >= daysToExpiry) return null
  const price = optionValueAt({ S: triggerStock, daysElapsed: daysToEntry, sigma, K, daysToExpiry, r, q, optionType })
  return parseFloat((price * askBuffer).toFixed(2))
}

// Days from startDay until the option's time-value decays below $0.01
// (i.e. it is essentially worthless at the entry stock price with IV held constant).
// Returns null if the option never decays that far before expiry.
export function daysToRuinByTheta({ S, sigma, K, daysToExpiry, r = 0, q = 0, optionType, startDay = 0 }) {
  for (let d = startDay + 1; d <= daysToExpiry; d++) {
    const price = optionValueAt({ S, daysElapsed: d, sigma, K, daysToExpiry, r, q, optionType })
    if (price < 0.01) return d - startDay
  }
  return null
}
