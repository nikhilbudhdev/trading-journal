import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req) {
  try {
    const { imageBase64, mediaType } = await req.json()

    if (!imageBase64 || !mediaType) {
      return Response.json({ error: 'Missing image data' }, { status: 400 })
    }

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
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
              text: 'Extract option data from this broker screenshot. Return ONLY a valid JSON object with exactly these keys (numeric values only, null if not clearly visible): {"stockPrice": null, "strike": null, "premium": null, "delta": null, "gamma": null, "theta": null, "vega": null}. Definitions: stockPrice = the current underlying stock/index price (e.g. SPY at 450.23); strike = the option strike price (e.g. the 450 in "450 Call" or "450 Put") — this is DIFFERENT from stockPrice; premium = the option price/mid-price (use mid if bid/ask shown); delta = sensitivity to underlying move (negative for puts, e.g. -0.45); gamma = rate of delta change (always positive); theta = daily time decay (always negative, e.g. -0.05); vega = sensitivity to a 1-point change in implied volatility (always positive for long options, e.g. 0.12). Do not include any explanation or extra text — just the JSON.',
            },
          ],
        },
      ],
    })

    const raw = msg.content[0].text.trim()
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return Response.json({ error: 'No JSON in response' }, { status: 500 })

    const extracted = JSON.parse(jsonMatch[0])
    return Response.json(extracted)
  } catch (err) {
    console.error('extract-greeks error:', err)
    return Response.json({ error: err.message || 'Extraction failed' }, { status: 500 })
  }
}
