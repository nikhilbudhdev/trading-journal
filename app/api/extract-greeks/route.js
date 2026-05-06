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
              text: 'Extract option Greeks from this broker screenshot. Return ONLY a valid JSON object with exactly these keys (numeric values only, null if the field is not clearly visible): {"stockPrice": null, "premium": null, "delta": null, "gamma": null}. For premium, use the mid price if bid/ask is shown. Delta for puts is typically negative (e.g. -0.45). Do not include any explanation or extra text — just the JSON.',
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
