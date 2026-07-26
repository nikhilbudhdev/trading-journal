import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const HEADER_ALIASES = {
  strike:    ['strike'],
  premium:   ['premium', 'mark', 'last', 'mid', 'price', 'bid', 'ask'],
  delta:     ['delta'],
  gamma:     ['gamma'],
  theta:     ['theta'],
  vega:      ['vega'],
  iv:        ['iv', 'impliedvol', 'impliedvolatility', 'vol'],
  breakeven: ['be', 'breakeven'],
}

const norm = s => String(s).toLowerCase().replace(/[^a-z]/g, '')

function mapRow({ columnHeaders, optionRow }) {
  const out = {}
  columnHeaders.forEach((h, i) => {
    const key = Object.keys(HEADER_ALIASES).find(k => HEADER_ALIASES[k].includes(norm(h)))
    if (key && out[key] == null) out[key] = optionRow[i]
  })
  return out
}

// Headers are only trustworthy if they contain letters (text labels like "Delta").
// The model sometimes fakes headers by copying numeric row values with a stray "%" suffix.
function headersLookReal(columnHeaders) {
  if (!Array.isArray(columnHeaders) || columnHeaders.length === 0) return false
  return columnHeaders.some(h => h != null && /[a-zA-Z]/.test(String(h)))
}

export async function POST(req) {
  try {
    const { imageBase64, mediaType } = await req.json()
    if (!imageBase64 || !mediaType) {
      return Response.json({ error: 'Missing image data' }, { status: 400 })
    }

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: imageBase64 },
            },
            {
              type: 'text',
              text: `You are extracting option data from a broker screenshot. Return ONLY valid JSON, no prose.

Provide BOTH of these:

1. columnHeaders + optionRow — ONLY if the screenshot has a proper header row with TEXT LABELS ("Strike", "Delta", "IV" etc.) directly above the data row. If there are no text labels visible (e.g. a compact Greeks card with just numbers), set BOTH to null. Headers must be text — NEVER copy numeric values as headers.

2. fields — Your best semantic interpretation of the values regardless of whether headers exist. Use these patterns to identify each field:
   - stockPrice: current underlying price (usually shown alone with %/change), NOT a strike
   - strike: option strike price (e.g. the 190 in "190 Put")
   - premium: option mid/last/mark price
   - iv: implied volatility, may be % (33.4) or fraction (0.334)
   - delta: in [-1, 1], NEGATIVE for puts, POSITIVE for calls
   - gamma: always small POSITIVE (e.g. 0.016)
   - theta: NEGATIVE for long options (e.g. -0.203)
   - vega: always POSITIVE for long options (e.g. 0.295)
   - breakeven: stock price where P/L = 0

Return JSON in this exact shape:

{
  "columnHeaders": ["Strike","Delta",...] or null,
  "optionRow":     [190,-0.46,...]     or null,
  "fields": {
    "stockPrice": null, "strike": null, "premium": null, "iv": null,
    "delta": null, "gamma": null, "theta": null, "vega": null, "breakeven": null
  },
  "underlyingPrice": null,
  "optionType": "call"|"put"|null
}

Rules:
- Strip $, %, commas from all numbers.
- columnHeaders and optionRow must be equal length if both present; otherwise both must be null.
- ALWAYS populate the "fields" object with your best interpretation.`,
            },
          ],
        },
      ],
    })

    const text = msg.content.find(b => b.type === 'text')?.text ?? ''
    console.log('[extract-greeks] model response:', text)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return Response.json({ error: 'No JSON in response' }, { status: 500 })

    const parsed = JSON.parse(jsonMatch[0])
    const { columnHeaders, optionRow, fields = {}, underlyingPrice, optionType: rawOptionType } = parsed

    // Prefer header-based mapping when headers are real; otherwise use semantic fields.
    let mapped = {}
    let source = 'fields'
    if (headersLookReal(columnHeaders) && Array.isArray(optionRow)) {
      const len = Math.min(columnHeaders.length, optionRow.length)
      mapped = mapRow({ columnHeaders: columnHeaders.slice(0, len), optionRow: optionRow.slice(0, len) })
      source = 'transcription'
    }

    // Merge: transcription takes precedence, semantic fields fill gaps.
    const pick = (k) => mapped[k] != null ? mapped[k] : fields[k]

    // IV: broker reports percent (33.43) → convert to fraction (0.3343)
    let iv = pick('iv')
    iv = iv != null ? parseFloat(iv) : null
    if (iv != null && iv > 1.5) iv = iv / 100

    // Derive premium from breakeven + strike when absent
    let premium = pick('premium')
    premium = premium != null ? parseFloat(premium) : null
    const rawBreakeven = pick('breakeven')
    const rawStrike = pick('strike')
    if (premium == null && rawBreakeven != null && rawStrike != null) {
      premium = Math.abs(parseFloat(rawBreakeven) - parseFloat(rawStrike))
      if (isNaN(premium)) premium = null
    }

    const strike     = rawStrike     != null ? parseFloat(rawStrike)     : null
    const delta      = pick('delta') != null ? parseFloat(pick('delta')) : null
    const gamma      = pick('gamma') != null ? parseFloat(pick('gamma')) : null
    const theta      = pick('theta') != null ? parseFloat(pick('theta')) : null
    const vega       = pick('vega')  != null ? parseFloat(pick('vega'))  : null
    const breakeven  = rawBreakeven  != null ? parseFloat(rawBreakeven)  : null
    const stockPrice = underlyingPrice != null
      ? parseFloat(underlyingPrice)
      : (fields.stockPrice != null ? parseFloat(fields.stockPrice) : null)

    // optionType fallback: sign of delta
    let optionType = rawOptionType || null
    if (!optionType && delta != null) optionType = delta < 0 ? 'put' : 'call'

    const warnings = []
    if (gamma != null && gamma < 0)           warnings.push('gamma')
    if (vega  != null && vega  < 0)           warnings.push('vega')
    if (theta != null && theta > 0)           warnings.push('theta')
    if (delta != null && Math.abs(delta) > 1) warnings.push('delta')
    if (iv    != null && (iv <= 0 || iv > 5)) warnings.push('iv')

    const result = {
      stockPrice, strike, premium, delta, gamma, theta, vega,
      iv, breakeven, optionType, warnings,
      _debug: { columnHeaders, optionRow, fields, mapped, source },
    }
    console.log('[extract-greeks] mapped result:', JSON.stringify(result, null, 2))
    return Response.json(result)
  } catch (err) {
    console.error('extract-greeks error:', err)
    return Response.json({ error: err.message || 'Extraction failed' }, { status: 500 })
  }
}
