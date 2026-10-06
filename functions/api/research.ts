interface Env {
  GEMINI_API_KEY?: string;
}

interface ResearchRequest {
  topic: string;
  guestName?: string;
  guestRole?: string;
  notes?: string;
  apiKey?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = (await context.request.json()) as ResearchRequest;
    const apiKey = body?.apiKey?.trim() || context.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY is not configured on Cloudflare environment or request' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body?.topic || !body.topic.trim()) {
      return new Response(JSON.stringify({ error: 'Missing topic in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { topic, guestName, guestRole, notes } = body;
    const guestIdentifier = [guestName, guestRole].filter(Boolean).join(', ') || 'The Guest';

    const systemInstructions = `You are the Senior Investigative Show Producer and Chief Researcher for an elite journalistic interview show (in the caliber of Fresh Air, The Daily, CBS Sunday Morning, 60 Minutes, and Pivot).

Your mission is to perform thorough "pre-interview homework" on the upcoming guest and topic.
Find real-world facts, hard metrics, industry benchmarks, historical precedents, and counter-theses so the interviewer can speak with deep authority, cite concrete numbers, and challenge spin with receipts.

Output MUST be a single valid JSON object with EXACTLY this structure (no outside commentary, no markdown code fence wrappers):
{
  "guestName": "${guestName || 'The Guest'}",
  "guestTitleOrRole": "${guestRole || ''}",
  "summaryAngle": "Punchy 2-3 sentence summary of the core narrative tension, paradox, or high-stakes dilemma at the heart of this interview.",
  "hardDatapoints": [
    {
      "metricOrFact": "Exact metric, date, financial number, or verifiable fact",
      "context": "Short explanation of where this figure comes from and its significance.",
      "relevance": "How the interviewer should deploy this number in cross-examination."
    }
  ],
  "historicalPrecedents": [
    {
      "analogyOrCase": "Name of real-world historical precedent or corporate parallel",
      "lesson": "What happened in that historical parallel and what lesson emerged.",
      "applicationToGuest": "How the interviewer can draw a direct analogy to the guest's situation."
    }
  ],
  "vulnerabilitiesAndPRSpin": [
    {
      "talkingPoint": "The predictable, polished PR soundbite the guest is coached to give.",
      "underlyingTension": "The uncomfortable, unsaid truth or vulnerability they are avoiding.",
      "razorQuestion": "A piercing, single-barreled question that cuts right through the spin."
    }
  ],
  "counterTheses": [
    "Sharp 1-sentence bear-case or critic objection #1",
    "Sharp 1-sentence bear-case or critic objection #2",
    "Sharp 1-sentence bear-case or critic objection #3"
  ]
}
Provide at least 3-4 hardDatapoints, 2-3 historicalPrecedents, 3 vulnerabilitiesAndPRSpin, and 3 counterTheses.`;

    const userPrompt = `TOPIC TO INVESTIGATE: "${topic.trim()}"
GUEST: ${guestIdentifier}
${notes ? `ADDITIONAL SOURCE NOTES & BACKGROUND:\n${notes.trim()}` : ''}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    // Try search grounding first
    let responseText = '';
    const groundingSources: Array<{ title: string; url: string }> = [];

    try {
      const searchRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2500,
          },
        }),
      });

      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as any;
        const candidate = searchData.candidates?.[0];
        responseText = candidate?.content?.parts?.[0]?.text || '';
        const searchChunks = candidate?.groundingMetadata?.groundingChunks || [];
        for (const chunk of searchChunks) {
          if (chunk.web?.uri && chunk.web?.title) {
            groundingSources.push({ title: chunk.web.title, url: chunk.web.uri });
          }
        }
      }
    } catch {
      // Ignore search error and fall back to direct json mode
    }

    // Fall back to direct JSON mode if search mode didn't produce text
    if (!responseText) {
      const jsonRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${systemInstructions}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
            maxOutputTokens: 2500,
          },
        }),
      });

      if (!jsonRes.ok) {
        const errText = await jsonRes.text();
        return new Response(JSON.stringify({ error: `Gemini API error (${jsonRes.status}): ${errText}` }), {
          status: jsonRes.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const jsonData = (await jsonRes.json()) as any;
      responseText = jsonData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    // Clean JSON
    let clean = responseText.trim();
    const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      clean = codeBlockMatch[1].trim();
    } else {
      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');
      if (start !== -1 && end > start) {
        clean = clean.substring(start, end + 1);
      }
    }

    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      const sanitized = clean
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
      parsed = JSON.parse(sanitized);
    }

    if (groundingSources.length > 0) {
      parsed.groundingSources = groundingSources.slice(0, 5);
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
