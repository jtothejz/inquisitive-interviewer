import { Persona, SynthesizedDraft, TranscriptTurn, JuicyNugget, InterviewBriefingBook } from '../types/persona';
import { ResearchProducerService } from './research-producer';

export class SynthesisService {
  constructor(private apiKey: string) {}

  public async generateDraft(
    persona: Persona,
    transcript: TranscriptTurn[],
    nuggets: JuicyNugget[],
    topic: string,
    customInstructions?: string,
    briefingBook?: InterviewBriefingBook
  ): Promise<SynthesizedDraft> {
    if (!this.apiKey) {
      return this.generateSimulatedDraft(persona, transcript, nuggets, topic, customInstructions, briefingBook);
    }

    const nar = persona.narrator_engine;
    const lex = nar.lexical_filters;
    const banned = lex.banned_words.join(', ');
    const preferred = lex.preferred_verbs.join(', ');
    const schema = nar.output_schema.join('\n');

    const formattedTranscript = transcript
      .map((t) => `${t.speaker}: ${t.text}`)
      .join('\n\n');

    const formattedNuggets = nuggets
      .map((n) => `- [${n.category.toUpperCase()}] "${n.quote}" (${n.context})`)
      .join('\n');

    const researchContext = briefingBook
      ? ResearchProducerService.formatBriefingForPrompt(briefingBook, persona.display_name)
      : 'No external investigative research briefing attached.';

    const systemPrompt = `You are the Lead Master Narrative Writer creating a publication-ready piece in the exact, signature voice and literary philosophy of ${persona.display_name}.

=== NARRATIVE GUIDELINES FOR ${persona.display_name.toUpperCase()} ===
- Narrative Stance: ${nar.narrative_stance}
- Sentence Cadence & Rhythm: ${nar.sentence_cadence}
- Banned Corporate Jargon (NEVER USE): ${banned}
- Preferred Signature Verbs & Actions: ${preferred}

=== REQUIRED OUTPUT STRUCTURE ===
Follow this exact structural blueprint:
${schema}

=== INVESTIGATIVE HOMEWORK & FACT DOSSIER ===
${researchContext}

*CRITICAL JOURNALISTIC INSTRUCTION*: Do not just write a shallow summary of the spoken transcript. Interweave the hard metrics, historical parallels, and industry context from the investigative briefing above into the narrative so the resulting draft reads like a deeply reported, publication-grade feature in The New York Times, The Atlantic, or CBS Sunday Morning!

=== INPUT CONTEXT & REAL-TIME INTERVIEW DATA ===
Topic: ${topic}

Extracted Core Revelations & Golden Nuggets:
${formattedNuggets || 'None formally flagged; pull directly from transcript insights.'}

Raw Transcript:
${formattedTranscript}

${customInstructions ? `Additional Director Request: ${customInstructions}` : ''}

Deliver the complete, polished narrative draft now in full markdown format.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini synthesis API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const draftText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No output generated.';

    return {
      formatId: `draft-${persona.id}-${Date.now()}`,
      personaId: persona.id,
      formatTitle: nar.format_title || `${persona.display_name} Narrative`,
      formatDescription: nar.format_description || `Synthesized in the voice of ${persona.display_name}`,
      content: draftText,
      createdAt: Date.now(),
    };
  }

  public async generateQuotesDeck(
    transcript: TranscriptTurn[],
    nuggets: JuicyNugget[],
    topic: string
  ): Promise<SynthesizedDraft> {
    if (!this.apiKey) {
      return this.generateSimulatedQuotesDeck(transcript, nuggets, topic);
    }

    const formattedTranscript = transcript
      .map((t) => `${t.speaker}: ${t.text}`)
      .join('\n\n');

    const formattedNuggets = nuggets
      .map((n) => `- [${n.category.toUpperCase()}] "${n.quote}" (${n.context})`)
      .join('\n');

    const prompt = `You are an elite editorial curator. From the following interview on "${topic}", extract a "Golden Quotations & Revelation Deck".

Core Extracted Admissions & Nuggets:
${formattedNuggets || 'None flagged during recording; pull directly from transcript.'}

Organize into:
1. 🔥 THE UNVARNISHED TRUTH (Top 3 most candid admissions or unfiltered quotes)
2. ⚔️ THE CORE CONFLICT (The central dilemma or systemic friction revealed)
3. 💡 UNEXPECTED BREAKTHROUGHS / ANECDOTES (Surprising stories, metaphors, or moments of realization)
4. 📌 SOUNDBITES FOR SOCIAL & COPY (5 razor-sharp standalone lines ready for Twitter/LinkedIn/Headlines)

Raw Transcript:
${formattedTranscript}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Quotes deck synthesis error (${response.status})`);
    }

    const data = await response.json();
    const draftText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      formatId: `draft-quotes-${Date.now()}`,
      personaId: 'quotes_curator',
      formatTitle: 'Golden Quotations & Soundbites Deck',
      formatDescription: 'Curated verbatim admissions, soundbites, and conflict points ready for headlines and copy.',
      content: draftText,
      createdAt: Date.now(),
    };
  }

  private generateSimulatedDraft(
    persona: Persona,
    transcript: TranscriptTurn[],
    nuggets: JuicyNugget[],
    topic: string,
    customInstructions?: string,
    briefingBook?: InterviewBriefingBook
  ): SynthesizedDraft {
    const userAnswers = transcript.filter((t) => t.speaker === 'user').map((t) => t.text);
    const primaryQuote = nuggets[0]?.quote || userAnswers[0] || 'We had to confront the reality before it destroyed us.';
    const nar = persona.narrator_engine;
    const fact = briefingBook?.hardDatapoints?.[0]?.metricOrFact;
    const precedent = briefingBook?.historicalPrecedents?.[0]?.analogyOrCase;

    let content = `# ${nar.format_title.toUpperCase()}: ${topic}\n\n`;
    content += `*Synthesized under the literary framework of ${persona.display_name}*\n\n`;
    if (briefingBook?.summaryAngle) {
      content += `> *Editorial Context: ${briefingBook.summaryAngle}*\n\n`;
    }
    content += `> "${primaryQuote}"\n\n`;

    if (persona.id === 'gonzo_hunter') {
      content += `### 1. THE EDGE OF THE PRECIPICE\n\nThe boardroom was reeking of cold sweat, bad coffee, and corporate panic. Nobody wanted to admit that the machine was breaking down until the receipts started circulating${fact ? `—namely ${fact}` : ''}. When pushed on the panic, the admission came raw: *"${userAnswers[0] || primaryQuote}"*.\n\n`;
      content += `### 2. THE SAVAGE MOMENT OF RECKONING\n\nThere was no graceful brochure transition. There was just the cold realization that playing it safe is the fastest path to getting butchered in the market${precedent ? `, drawing eerie echoes of ${precedent}` : ''}. As the tape reveals, the real fight wasn't about visionary rhetoric—it was about survival.\n\n`;
      content += `### 3. THE GHOST AT THE GAS STATION\n\nYou don't get to rebuild without scorching the altar. Whatever happens next, the quiet truth is out in the open.`;
    } else if (persona.id === 'michael_barbaro') {
      content += `### [THE DAILY SCENE SETTER]\n\n**MICHAEL BARBARO:** From The New York Times, I'm Michael Barbaro. This is *The Daily*.\n\nToday: When the decision was made to dismantle everything and start over, it didn't begin with an announcement. It began in the quiet corners of an organization managing ${fact || 'unprecedented internal friction'}.\n\n`;
      content += `### [THE UNPACKING]\n\n**BARBARO:** What happens when the public story runs up against the private reality? Here is what they told us: *"${userAnswers[0] || primaryQuote}"*.\n\n`;
      content += `### [THE LINGERING QUESTION]\n\n**BARBARO:** Hm. And what comes next is the real test.`;
    } else {
      content += `### 1. THE CENTRAL PARADOX\n\nAt the core of "${topic}" lies a high-stakes dilemma that few leadership teams are willing to confront publicly${fact ? `—anchored by ${fact}` : ''}. The testimony revealed during cross-examination showed a stark departure from standard industry narratives.\n\n`;
      content += `### 2. THE TURNING POINT\n\nKey testimony: *"${userAnswers[0] || primaryQuote}"*.\n\nThis decision marks a fundamental pivot${precedent ? ` reminiscent of ${precedent}` : ''} where trade-offs could no longer be postponed.\n\n`;
      content += `### 3. THE STRATEGIC TAKEAWAY\n\nThe lessons extracted here will define the next chapter of this transformation.`;
    }

    if (briefingBook?.hardDatapoints && briefingBook.hardDatapoints.length > 0) {
      content += `\n\n---\n### 📑 SOURCED INVESTIGATIVE BENCHMARKS\n`;
      for (const dp of briefingBook.hardDatapoints) {
        content += `- **${dp.metricOrFact}**: ${dp.context}\n`;
      }
    }

    if (customInstructions) {
      content += `\n\n---\n*Director Polish Applied: ${customInstructions}*`;
    }

    return {
      formatId: `draft-${persona.id}-${Date.now()}`,
      personaId: persona.id,
      formatTitle: nar.format_title || `${persona.display_name} Narrative`,
      formatDescription: nar.format_description || `Synthesized in the voice of ${persona.display_name}`,
      content: content,
      createdAt: Date.now(),
    };
  }

  private generateSimulatedQuotesDeck(
    transcript: TranscriptTurn[],
    nuggets: JuicyNugget[],
    topic: string
  ): SynthesizedDraft {
    const userAnswers = transcript.filter((t) => t.speaker === 'user').map((t) => t.text);
    const quotes = nuggets.length > 0
      ? nuggets.map((n) => `> "${n.quote}"\n> — *Context: ${n.context}*`).join('\n\n')
      : userAnswers.slice(0, 3).map((a, i) => `> "${a}"\n> — *Key Admission #${i + 1}*`).join('\n\n');

    const content = `# GOLDEN QUOTATIONS & SOUNDBITES DECK\n## Topic: ${topic}\n\n### 🔥 1. THE UNVARNISHED TRUTH (Top Admissions)\n${quotes || '> "We had to choose between immediate comfort and long-term relevance."\n> — *Primary Turning Point*'}\n\n### ⚔️ 2. THE CORE CONFLICT\n- The internal battle between preserving current stability and embracing disruptive risk.\n- Diverging expectations between executive leadership, team members, and customers.\n\n### 📌 3. STANDALONE SOUNDBITES (Ready for Copy & Headlines)\n1. *"The hardest part wasn't the technology—it was letting go of what used to work."*\n2. *"If you don't cannibalize your own product, someone else gladly will."*\n3. *"We made the call when everyone told us to wait."*`;

    return {
      formatId: `draft-quotes-${Date.now()}`,
      personaId: 'quotes_curator',
      formatTitle: 'Golden Quotations & Soundbites Deck',
      formatDescription: 'Curated verbatim admissions, soundbites, and conflict points ready for headlines and copy.',
      content: content,
      createdAt: Date.now(),
    };
  }
}
