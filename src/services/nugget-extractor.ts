import { JuicyNugget, TranscriptTurn } from '../types/persona';

export class NuggetExtractorService {
  private lastAnalyzedTurnIndex = 0;
  private isProcessing = false;
  private extractedNuggets: JuicyNugget[] = [];

  constructor(private apiKey: string, private onNewNuggets: (nuggets: JuicyNugget[]) => void) {}

  public async analyzeRecentTurns(turns: TranscriptTurn[]): Promise<void> {
    if (!this.apiKey || this.isProcessing) return;
    if (turns.length <= this.lastAnalyzedTurnIndex) return;

    const newTurns = turns.slice(this.lastAnalyzedTurnIndex);
    // Only analyze if there is at least one substantial user answer
    const userText = newTurns.filter((t) => t.speaker === 'user').map((t) => t.text).join(' ');
    if (userText.length < 30) return;

    this.isProcessing = true;
    const currentBatchIndex = turns.length;

    try {
      const dialogueText = newTurns.map((t) => `${t.speaker}: "${t.text}"`).join('\n');

      const prompt = `You are a Lead Investigative Editor analyzing a live interview transcript.
Identify 1-2 "Juicy Nuggets" (unvarnished admissions, surprising conflicts, raw quotes, key metrics, or pivotal emotional turning points) from this recent excerpt:

EXCERPT:
${dialogueText}

Respond ONLY with a valid JSON array matching this format (no markdown formatting, no code blocks):
[
  {
    "category": "admission" | "conflict" | "quote" | "turning_point" | "metric",
    "label": "Short punchy 3-5 word label",
    "quote": "Exact or near-exact high-impact quote from the subject",
    "context": "1-sentence why this matters"
  }
]
If there are no noteworthy revelations yet, return []`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.0-flash'];
      let rawText = '';

      for (const model of candidateModels) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  responseMimeType: 'application/json',
                },
              }),
            }
          );

          if (response.ok) {
            const json = await response.json();
            rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (rawText) break;
          }
        } catch {
          // Fall through to next model
        }
      }

      if (rawText) {
        let cleanJson = rawText.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
        }
        try {
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const freshNuggets: JuicyNugget[] = parsed.map((item) => ({
              id: `nugget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              category: item.category || 'quote',
              label: item.label || 'Key Insight',
              quote: item.quote || '',
              context: item.context || '',
              timestamp: Date.now(),
              pinned: false,
            }));

            this.extractedNuggets.push(...freshNuggets);
            this.onNewNuggets([...this.extractedNuggets]);
          }
        } catch (parseErr) {
          console.warn('[NuggetExtractor] JSON parse note:', parseErr);
        }
      }

      this.lastAnalyzedTurnIndex = currentBatchIndex;
    } catch (e) {
      console.warn('Nugget extraction error (non-fatal):', e);
    } finally {
      this.isProcessing = false;
    }
  }

  public getNuggets(): JuicyNugget[] {
    return this.extractedNuggets;
  }

  public reset(): void {
    this.extractedNuggets = [];
    this.lastAnalyzedTurnIndex = 0;
    this.isProcessing = false;
  }
}
