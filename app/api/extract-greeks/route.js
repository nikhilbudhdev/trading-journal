import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const HEADER_ALIASES = {
  strike:    ['strike'],
  premium:   ['premium', 'mark', 'last', 'mid', 'price'],
  delta:     ['delta'],
  gamma:     ['gamma'],
  theta:     ['theta'],
  vega:      ['vega'],
  iv:        ['iv', 'impliedvol', 'impliedvolatility', 'vol'],
  breakeven: ['be', 'breakeven', 'breakeven'],
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

export async function POST(req) {
  try {
    const { imageBase64, mediaType } = await req.json()
    if (!imageBase64 || !mediaType) {
      return Response.json({ error: 'Missing image data' }, { status: 400 })
    }

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
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
              text: `You are transcribing one row of an options chain from a broker screenshot.
Return ONLY valid JSON, no prose, with these keys:

{
  "columnHeaders": [],
  "optionRow":     [],
  "underlyingPrice": null,
  "optionType": null
}

Rules:
- columnHeaders: every column header visible, left to right, verbatim.
- optionRow: the highlighted/selected strike row — one cell per header, SAME length and order as columnHeaders. Numbers only, strip % and $ and commas. Use null for blank cells.
- underlyingPrice: the current underlying price shown alone with a +/-% change, NOT one of the strikes. null if absent.
- optionType: "call" or "put" if determinable from context, else null.
- Transcribe cells in visual order. Do NOT reorder, skip, or interpret columns.
- optionRow.length MUST equal columnHeaders.length.
- Do not decide which column is delta/theta/etc. Just copy headers and values exactly.`,
            },
          ],
        },
      ],
    })

    const text = msg.content.find(b => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return Response.json({ error: 'No JSON in response' }, { status: 500 })

    const parsed = JSON.parse(jsonMatch[0])
    const { columnHeaders, optionRow, underlyingPrice, optionType: rawOptionType } = parsed

    if (!Array.isArray(columnHeaders) || !Array.isArray(optionRow) ||
        columnHeaders.length === 0 || optionRow.length !== columnHeaders.length) {
      return Response.json({ error: 'Malformed transcription — column/row length mismatch' }, { status: 500 })
    }

    const mapped = mapRow({ columnHeaders, optionRow })

    // IV: broker reports percent (33.43) → convert to fraction (0.3343)
    let iv = mapped.iv != null ? parseFloat(mapped.iv) : null
    if (iv != null && iv > 1.5) iv = iv / 100

    // Derive premium from breakeven + strike when absent
    let premium = mapped.premium != null ? parseFloat(mapped.premium) : null
    if (premium == null && mapped.breakeven != null && mapped.strike != null) {
      premium = Math.abs(parseFloat(mapped.breakeven) - parseFloat(mapped.strike))
      if (isNaN(premium)) premium = null
    }

    const strike     = mapped.strike != null ? parseFloat(mapped.strike) : null
    const delta      = mapped.delta  != null ? parseFloat(mapped.delta)  : null
    const gamma      = mapped.gamma  != null ? parseFloat(mapped.gamma)  : null
    const theta      = mapped.theta  != null ? parseFloat(mapped.theta)  : null
    const vega       = mapped.vega   != null ? parseFloat(mapped.vega)   : null
    const breakeven  = mapped.breakeven != null ? parseFloat(mapped.breakeven) : null
    const stockPrice = underlyingPrice != null ? parseFloat(underlyingPrice) : null

    // optionType fallback: sign of delta
    let optionType = rawOptionType || null
    if (!optionType && delta != null) optionType = delta < 0 ? 'put' : 'call'

    // Validation warnings
    const warnings = []
    if (gamma != null && gamma < 0)           warnings.push('gamma')
    if (vega  != null && vega  < 0)           warnings.push('vega')
    if (theta != null && theta > 0)           warnings.push('theta')
    if (delta != null && Math.abs(delta) > 1) warnings.push('delta')
    if (iv    != null && (iv <= 0 || iv > 5)) warnings.push('iv')

    return Response.json({
      stockPrice, strike, premium, delta, gamma, theta, vega,
      iv, breakeven, optionType, warnings,
    })
  } catch (err) {
    console.error('extract-greeks error:', err)
    return Response.json({ error: err.message || 'Extraction failed' }, { status: 500 })
  }
}
