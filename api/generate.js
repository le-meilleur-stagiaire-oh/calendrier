export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ text: '', error: 'GROQ_API_KEY not configured' });

  try {
    const { prompt, imageUrl, imageBase64, mode } = req.body;

    // ── Vision mode ──────────────────────────────────────────────────────────
    if (mode === 'vision') {
      // Groq vision models only support public URLs, not base64
      // If we only have base64 and no URL, return an error
      if (!imageUrl && !imageBase64) {
        return res.status(200).json({ text: '', error: 'No image provided' });
      }

      // Use URL if available, otherwise use base64
      const imageSource = imageUrl || imageBase64;

      // Try llama-4-maverick first (supports vision), fallback to scout
      const visionModels = [
        'meta-llama/llama-4-maverick-17b-128e-instruct',
        'meta-llama/llama-4-scout-17b-16e-instruct',
      ];

      let lastError = null;
      for (const model of visionModels) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{
                role: 'user',
                content: [
                  { type: 'image_url', image_url: { url: imageSource } },
                  { type: 'text', text: prompt },
                ],
              }],
              max_tokens: 1200,
              temperature: 0.7,
              response_format: { type: "json_object" },
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            lastError = data?.error?.message || `Model ${model} error`;
            continue; // try next model
          }

          const text = data?.choices?.[0]?.message?.content || '';
          return res.status(200).json({ text: text.trim(), model });
        } catch (e) {
          lastError = e.message;
          continue;
        }
      }

      return res.status(200).json({ text: '', error: lastError || 'All vision models failed' });
    }

    // ── Standard text mode ───────────────────────────────────────────────────
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(200).json({ text: '', error: data?.error?.message || 'API error' });
    }
    const text = data?.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text: text.trim() });

  } catch (error) {
    return res.status(200).json({ text: '', error: error.message });
  }
}
