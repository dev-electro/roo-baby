// ROO — Cloudflare Worker
// Deploy: wrangler deploy
// Set secret: wrangler secret put GEMINI_API_KEY

const PROMPT = `You are ROO, the world's most advanced baby cry expert powered by Gemma 4.
Analyze the provided audio/image with deep precision.

ACOUSTIC SIGNATURES:

HUNGER ("neh" pattern):
- Gradual soft onset, builds over time
- Rhythmic 0.5-1s intervals with brief pauses  
- Pitch: 400-600 Hz, regular, medium intensity
- Stops briefly then resumes — searching pattern

PAIN (alarm cry):
- SUDDEN maximum intensity from first millisecond
- Very high pitch 600-800 Hz, piercing
- Long cry → breath-hold pause → repeat
- Urgent, no rhythm — pure distress signal

TIRED (whiny complaint):
- Low-medium intensity, whiny nasal quality
- Fades at end of each cry, irregular rhythm
- Pitch 300-450 Hz, moaning quality
- Heavy, drooping — exhaustion signal

DISCOMFORT (fussy middle):
- Medium sustained intensity, continuous
- Pitch 400-500 Hz, mixed grunting
- No clear peaks or pauses
- Persistent, won't stop easily

BURPING (strained effort):
- Short 2-3 second bursts with grunting
- Variable pitch that drops mid-cry
- Straining sounds clearly audible
- Effort-based pattern

VISUAL SIGNALS (if image provided):
- HUNGER: rooting reflex, hands toward mouth, lip smacking
- PAIN: scrunched face, tightly shut eyes, red/flushed skin
- TIRED: droopy eyelids, glassy eyes, limp posture
- DISCOMFORT: arched back, pulling legs, grimacing
- PRE-CRY: any of above without full crying yet

Think step by step:
1. Analyze onset characteristics
2. Measure rhythm and pattern  
3. Estimate pitch and intensity
4. Check visual signals if image present
5. Match to category
6. Calculate confidence

Respond ONLY in this exact JSON — no other text:
{
  "category": "HUNGER",
  "confidence": 89,
  "severity": "MEDIUM",
  "reasoning": "Rhythmic pattern with gradual buildup, rooting reflex visible",
  "parent_action": "Feed baby now. Try breastfeeding or bottle immediately.",
  "response_sound": "heartbeat",
  "pre_cry": false,
  "pre_cry_message": null
}

severity: LOW | MEDIUM | HIGH | CRITICAL
response_sound: heartbeat | whitenoise | lullaby | shush`;

async function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default {
  async fetch(request, env) {
    // CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const formData = await request.formData();
      const parts = [];

      // Add audio if present
      if (formData.has('audio')) {
        const audioFile = formData.get('audio');
        const audioBuffer = await audioFile.arrayBuffer();
        const base64Audio = await toBase64(audioBuffer);
        parts.push({
          inlineData: {
            mimeType: audioFile.type || 'audio/wav',
            data: base64Audio
          }
        });
      }

      // Add image if present
      if (formData.has('image')) {
        const imageFile = formData.get('image');
        const imageBuffer = await imageFile.arrayBuffer();
        const base64Image = await toBase64(imageBuffer);
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        });
      }

      // Add prompt
      parts.push({ text: PROMPT });

      // Call Gemini API with Gemma 4 E4B
      const apiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-e4b-it:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 400,
            }
          })
        }
      );

      const data = await apiResponse.json();

      // Extract text from response
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON from response
      let result;
      try {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}') + 1;
        result = JSON.parse(text.slice(start, end));
      } catch {
        result = {
          category: 'UNKNOWN',
          confidence: 0,
          severity: 'LOW',
          reasoning: 'Analysis unclear. Please try again.',
          parent_action: 'Re-record in a quieter environment.',
          response_sound: 'whitenoise',
          pre_cry: false,
          pre_cry_message: null
        };
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
};
