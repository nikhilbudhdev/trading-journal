export const EXPORT_COLUMNS = [
  'account', 'open_date', 'close_date', 'underlying', 'type', 'side',
  'strike', 'expiry', 'contracts', 'entry_price', 'exit_price',
  'exit_price_source', 'fees', 'risk_at_entry', 'pnl', 'status', 'trade_id'
]

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

export function formatDateLocal(value) {
  if (value === null || value === undefined || value === '') return null
  if (DATE_ONLY_RE.test(value)) return value
  const d = new Date(value)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const hasValue = (v) => v !== null && v !== undefined && v !== ''
const numOrNull = (v) => hasValue(v) ? parseFloat(v) : null

export function buildExportRows(trades, partialsByTradeId, columns) {
  return trades.map(t => {
    const id = t[columns.id]
    const partials = partialsByTradeId[id] || []
    const N = numOrNull(t[columns.contracts]) || 0
    const e = numOrNull(t[columns.premium])
    const isShort = t[columns.direction] === 'short'
    const status = t[columns.status]

    const partialLegs = partials.map(p => ({
      n: numOrNull(p.contracts_exited) || 0,
      p: numOrNull(p.exit_premium),
      pnl: numOrNull(p.pnl) || 0,
      fees: p.fees
    }))
    const sumPartialContracts = partialLegs.reduce((s, leg) => s + leg.n, 0)
    const remaining = N - sumPartialContracts

    const recordedExit = numOrNull(t[columns.exitPrice])
    const finalPnl = numOrNull(t[columns.pnl])
    const isClosed = status === 'closed'

    let p_f = null
    let finalLegSource = null
    if (recordedExit !== null) {
      p_f = recordedExit
      finalLegSource = 'recorded'
    } else if (isClosed && remaining > 0 && finalPnl !== null && e !== null) {
      p_f = isShort ? (e - finalPnl / (remaining * 100)) : (e + finalPnl / (remaining * 100))
      finalLegSource = 'derived'
    }

    let exitPrice = null
    let exitPriceSource = null
    if (N > 0) {
      const sumWeighted = partialLegs.reduce((s, leg) => s + (leg.p !== null ? leg.n * leg.p : 0), 0)
      if (remaining > 0) {
        if (p_f !== null) {
          exitPrice = (sumWeighted + remaining * p_f) / N
          exitPriceSource = finalLegSource
        }
      } else if (partialLegs.length > 0) {
        exitPrice = sumWeighted / N
        exitPriceSource = 'recorded'
      }
    }

    const closingPnlRaw = t[columns.pnl]
    const hasClosingPnl = hasValue(closingPnlRaw)
    const partialPnlSum = partialLegs.reduce((s, leg) => s + leg.pnl, 0)
    const pnl = (hasClosingPnl || partials.length > 0)
      ? (hasClosingPnl ? parseFloat(closingPnlRaw) : 0) + partialPnlSum
      : null

    const parentFeesRaw = t[columns.fees]
    const hasParentFees = hasValue(parentFeesRaw)
    const hasAnyPartialFees = partials.some(p => hasValue(p.fees))
    const fees = (hasParentFees || hasAnyPartialFees)
      ? (hasParentFees ? parseFloat(parentFeesRaw) : 0) + partials.reduce((s, p) => s + (hasValue(p.fees) ? parseFloat(p.fees) : 0), 0)
      : null

    return {
      account: t[columns.account] ?? null,
      open_date: formatDateLocal(t[columns.entryDate]),
      close_date: formatDateLocal(t[columns.exitDate]),
      underlying: t[columns.instrument] ?? null,
      type: t[columns.optionType] ?? null,
      side: t[columns.direction] ?? null,
      strike: numOrNull(t[columns.strike]),
      expiry: formatDateLocal(t[columns.expiry]),
      contracts: N || null,
      entry_price: e,
      exit_price: exitPrice,
      exit_price_source: exitPriceSource,
      fees,
      risk_at_entry: numOrNull(t[columns.riskAtEntry]),
      pnl,
      status: status ?? null,
      trade_id: id ?? null
    }
  })
}

function escapeCell(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return String(value)
  let str = String(value)
  if (/^[=+\-@]/.test(str)) str = `'${str}`
  if (/[",\r\n]/.test(str)) str = `"${str.replace(/"/g, '""')}"`
  return str
}

export function toCsv(rows, columns = EXPORT_COLUMNS) {
  const BOM = '﻿'
  const header = columns.join(',')
  const lines = rows.map(row => columns.map(col => escapeCell(row[col])).join(','))
  return BOM + [header, ...lines].join('\r\n')
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
