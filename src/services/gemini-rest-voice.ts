import { Persona, InterviewConfig, TranscriptTurn, JuicyNugget } from '../types/persona';
import { ISpeechRecognition, SpeechRecognitionErrorEvent, SpeechRecognitionEvent } from '../types/speech';
import { ResearchProducerService } from './research-producer';
import { GeminiNeuralTTS } from '../audio/gemini-neural-tts';

export interface RestVoiceCallbacks {
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  onActiveSpeakerChange: (speakerId: string | 'user' | null) => void;
  onTranscriptUpdate: (turns: TranscriptTurn[]) => void;
  onNewNugget: (nugget: JuicyNugget) => void;
  onAudioLevel: (level: number) => void;
  onError: (errorMsg: string) => void;
}

export class GeminiRestVoiceService {
  private isRunning = false;
  private isAiSpeaking = false;
  private isMuted = false;
  private turns: TranscriptTurn[] = [];
  private currentTurnIndex = 0;
  private animInterval: number | null = null;
  private recognition: ISpeechRecognition | null = null;
  private synthesisVoice: SpeechSynthesisVoice | null = null;
  private config: InterviewConfig | null = null;
  private allPersonas: Persona[] = [];
  private neuralTTS: GeminiNeuralTTS;

  constructor(
    private apiKey: string,
    private callbacks: RestVoiceCallbacks
  ) {
    this.neuralTTS = new GeminiNeuralTTS(apiKey);
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stopListening();
    } else if (this.isRunning && !this.isAiSpeaking) {
      this.startListening();
    }
  }

  public async startSession(
    config: InterviewConfig,
    allPersonas: Persona[]
  ): Promise<void> {
    this.isRunning = true;
    this.isAiSpeaking = false;
    this.isMuted = false;
    this.turns = [];
    this.currentTurnIndex = 0;
    this.config = config;
    this.allPersonas = allPersonas;
    this.callbacks.onStatusChange('connecting');

    try {
      // Pick suitable browser synthesis voice
      this.initVoices();

      this.callbacks.onStatusChange('connected');

      // Generate and speak the dynamic opening hook from Gemini Flash
      await this.generateAndSpeakOpeningHook(config, allPersonas);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.callbacks.onError(`Fast Voice Engine error: ${msg}`);
      this.callbacks.onStatusChange('error');
    }
  }

  private initVoices(): void {
    if ('speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Prefer natural English voices
        this.synthesisVoice =
          voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Daniel') || v.name.includes('Samantha'))) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0] ||
          null;
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }

  private startListening(): void {
    if (!this.isRunning || this.isAiSpeaking || this.isMuted || !this.config) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    this.stopListening();

    try {
      const recognizer = new SpeechRecognitionClass();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = 'en-US';

      let speechTimeout: number | null = null;
      let lastFinalTranscript = '';

      recognizer.onresult = (event: SpeechRecognitionEvent) => {
        if (!this.isRunning || this.isAiSpeaking) {
          return;
        }

        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            lastFinalTranscript += ' ' + transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        const currentSpoken = (lastFinalTranscript + ' ' + interimTranscript).trim();

        if (currentSpoken.length > 2) {
          // Check if what was heard is just acoustic bleed of the panel
          if (this.isAcousticEcho(currentSpoken)) {
            console.log('[RestVoice] Rejected acoustic echo of panel speech:', currentSpoken);
            return;
          }

          if (speechTimeout) clearTimeout(speechTimeout);
          // 800ms of natural silence triggers the guest's response automatically
          speechTimeout = window.setTimeout(() => {
            if (this.isRunning && !this.isAiSpeaking && currentSpoken.length > 2 && this.config) {
              if (this.isAcousticEcho(currentSpoken)) {
                return;
              }
              const textToSend = currentSpoken;
              lastFinalTranscript = '';
              this.stopListening();
              this.handleUserAnswer(textToSend, this.config, this.allPersonas);
            }
          }, 800);
        }
      };

      recognizer.onend = () => {
        if (this.isRunning && !this.isAiSpeaking) {
          setTimeout(() => {
            if (this.isRunning && !this.isAiSpeaking) {
              this.startListening();
            }
          }, 250);
        }
      };

      recognizer.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[RestVoice] Speech recognition error:', e.error);
        }
      };

      recognizer.start();
      this.recognition = recognizer;
      console.log('[RestVoice] Studio microphone active & listening for guest voice');
    } catch (e) {
      console.warn('[RestVoice] Speech recognition start note:', e);
    }
  }

  private stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
  }

  private isAcousticEcho(spokenText: string): boolean {
    const cleanSpoken = spokenText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (cleanSpoken.length < 3) return true;

    // Check against the last 2 AI turns
    const recentAiTurns = this.turns.filter((t) => t.speaker !== 'user').slice(-2);
    for (const turn of recentAiTurns) {
      const cleanAi = turn.text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      if (cleanAi.includes(cleanSpoken) || (cleanSpoken.length > 8 && cleanAi.includes(cleanSpoken.slice(0, 15)))) {
        return true;
      }
    }
    return false;
  }

  private getPersonaInquisitorInstruction(persona: Persona): string {
    if (persona.id === 'david_pogue') {
      return `[DAVID POGUE STYLE - The Strategic Naïf & Curious Skeptic]:
- Tone: Warm, energetic, raised-eyebrow wit, disarming simplicity.
- Technique: Strip away PR pretense by contrasting two opposing truths (e.g. "I've heard two completely different versions of this... where is the actual reality?") or by using a relatable everyday analogy.
- Rule: Deliver 1 sentence of sharp, witty context or contrasting observation, then ask exactly 1 focused question confronting the messy human truth.`;
    } else if (persona.id === 'audie_cornish') {
      return `[AUDIE CORNISH STYLE - The Neutral Observer & Margin Mapper]:
- Tone: Calm, authoritative, intellectually grounded, emotionally unflappable.
- Technique: Map the unsaid omission or calculated trade-off. Accept their premise, then test its inherent cost (e.g. "You were operating in a fast-moving crisis. Walk me through the calculus of sacrificing Option A when you knew your team was divided...").
- Rule: Deliver 1 sentence acknowledging the strategic context, then ask 1 razor-sharp question on the systemic consequences.`;
    } else if (persona.id === 'michael_barbaro') {
      return `[MICHAEL BARBARO STYLE - The Daily Chronological Anchor]:
- Tone: Measured, intimate, deliberate, patient.
- Technique: Start with a grounding marker ("Hm."). Actively mirror an evocative, emotionally charged word from their answer, and anchor to the chronological baseline (e.g. "Hm. An absolute logistical nightmare. Take me back to day one—what did that look like in the room?").
- Rule: Keep questions short (under 15 words) and intensely focused on chronology and internal states.`;
    } else if (persona.id === 'kara_swisher') {
      return `[KARA SWISHER STYLE - The Skeptical Power Insider]:
- Tone: Direct, rapid-fire, no-nonsense, confident, allergic to PR fluff.
- Technique: Pierce through corporate spin in one brisk sentence, zeroing in on power dynamics, money, and accountability (e.g. "Let's cut through the board deck. Everyone loves talking about AI, but who was threatening to pull funding?").
- Rule: Deliver 1 punchy truth-telling needle, then ask 1 direct question demand accountability.`;
    } else if (persona.id === 'gonzo_hunter') {
      return `[HUNTER S. THOMPSON (GONZO) STYLE - Savage Moral Interrogator]:
- Tone: High-velocity, savage moral fury, dark humor, appalling metaphors.
- Technique: Attack sanitized doublespeak with an electric observation exposing raw panic or greed (e.g. "That sounds like an excuse cooked up at 3 AM over cold diner coffee. When the board split, who had their back against the wall?").
- Rule: Deliver 1 visceral gonzo sentence, then ask 1 devastating question on who actually bleeds.`;
    } else if (persona.id === 'terry_gross') {
      return `[TERRY GROSS STYLE - The Empathetic Craft Archaeologist]:
- Tone: Empathetic, warm, deeply curious about origins and internal craft.
- Technique: Excavate the private doubt behind the public work (e.g. "When you were sitting alone in the middle of the night with that decision, what was the quiet fear that made you want to start over?").
- Rule: Deliver 1 thoughtful reflection, then ask 1 deeply personal, craft-centered question.`;
    }
    return `[${persona.display_name.toUpperCase()} STYLE]:
- Stance: ${persona.inquisitor_engine.relational_stance}
- Pushback: ${persona.inquisitor_engine.pushback_mechanic}`;
  }

  private async generateAndSpeakOpeningHook(
    config: InterviewConfig,
    allPersonas: Persona[]
  ): Promise<void> {
    const isPanel = config.mode === 'panel';
    const activePersonas = isPanel
      ? allPersonas.filter((p) => config.panelPersonaIds.includes(p.id))
      : allPersonas.filter((p) => p.id === config.primaryPersonaId);

    const firstSpeaker = activePersonas[0] || allPersonas[0];
    const speakerGuidance = this.getPersonaInquisitorInstruction(firstSpeaker);

    const briefingSection = config.briefingBook
      ? `\n${ResearchProducerService.formatBriefingForPrompt(config.briefingBook, firstSpeaker.display_name)}\n`
      : '';

    const isThesisDiscovery = config.interviewGoal !== 'cross_examination';

    const systemPrompt = isPanel
      ? `You are moderating a dynamic, live broadcast interview panel with: ${activePersonas.map((p) => p.display_name).join(', ')}.
Topic: "${config.topic}"
${config.guestName ? `Guest: ${config.guestName}${config.guestRole ? ` (${config.guestRole})` : ''}` : ''}
Subject Dossier:
${config.dossier || 'No specific dossier provided.'}
${briefingSection}
=== INQUISITOR GUIDANCE FOR [${firstSpeaker.display_name}] ===
${speakerGuidance}

=== CORE INSTRUCTIONS ===
1. Have [${firstSpeaker.display_name}] deliver the opening hook question directly to the guest ("you").
${
  isThesisDiscovery
    ? `2. OPEN WITH CURIOSITY AND GENESIS: DO NOT open with an aggressive gotcha or attack.
3. Open by asking about the formative project, workflow failure, or moment that catalyzed this stance on "${config.topic}". What were they actually building or trying to achieve when they realized the conventional approach was broken? What motivated or inspired this insight?`
    : `2. Weaponize your pre-interview homework: inject a real observation, hard metric, tension, or contrasting perspective from your briefing book (1-2 sentences) to provoke immediate depth, followed by 1 sharp opening question.`
}
4. Keep the question crisp, punchy (1-2 sentences), single-barreled.
5. Start with: [${firstSpeaker.display_name}]:`
      : `You are "${firstSpeaker.display_name}," conducting a live in-depth voice interview with the guest.
Topic: "${config.topic}"
${config.guestName ? `Guest: ${config.guestName}${config.guestRole ? ` (${config.guestRole})` : ''}` : ''}
Subject Dossier:
${config.dossier || 'No specific dossier provided.'}
${briefingSection}
=== YOUR SIGNATURE INTERVIEW STYLE ===
${speakerGuidance}

=== CORE INSTRUCTIONS ===
1. Speak directly to the guest ("you").
${
  isThesisDiscovery
    ? `2. OPEN WITH CURIOSITY AND GENESIS: DO NOT open with an aggressive gotcha or attack.
3. Open by asking about the formative project, workflow failure, or moment that catalyzed this stance on "${config.topic}". What were they actually building or trying to achieve when they realized the conventional approach was broken? What motivated or inspired this insight?`
    : `2. Weaponize your pre-interview homework: inject a real observation, hard metric, tension, or premise from your briefing book to provoke thoughtful candor, followed by your signature opening question.`
}
4. Keep the question crisp, punchy (1-2 sentences), single-barreled.
5. Start with: [${firstSpeaker.display_name}]:`;

    const responseText = await this.callGemini(systemPrompt);
    const turnsQueue = this.parseMultiSpeakerTurns(responseText, firstSpeaker, allPersonas);
    this.playQueuedTurns(turnsQueue);
  }

  public async handleUserAnswer(
    userText: string,
    config: InterviewConfig,
    allPersonas: Persona[]
  ): Promise<void> {
    if (!this.isRunning) return;

    // Add user turn to transcript
    const userTurn: TranscriptTurn = {
      id: `turn-user-${Date.now()}`,
      speaker: 'user',
      text: userText,
      timestamp: Date.now(),
      isFinal: true,
    };
    this.turns.push(userTurn);
    this.callbacks.onTranscriptUpdate([...this.turns]);
    this.currentTurnIndex++;

    const isPanel = config.mode === 'panel';
    const activePersonas = isPanel
      ? allPersonas.filter((p) => config.panelPersonaIds.includes(p.id))
      : allPersonas.filter((p) => p.id === config.primaryPersonaId);

    // 1. Determine next speaker: Check if user or directive mentioned an interviewer
    let nextSpeaker = activePersonas[this.currentTurnIndex % activePersonas.length] || activePersonas[0];
    for (const p of activePersonas) {
      if (
        userText.toLowerCase().includes(p.display_name.toLowerCase()) ||
        userText.toLowerCase().includes(p.id.toLowerCase())
      ) {
        nextSpeaker = p;
        break;
      }
    }

    const dialogueHistory = this.turns.map((t) => `${t.speaker}: ${t.text}`).join('\n');
    const speakerGuidance = this.getPersonaInquisitorInstruction(nextSpeaker);

    const otherPanelists = activePersonas.filter((p) => p.id !== nextSpeaker.id);
    const coHostGuide = otherPanelists.length > 0
      ? `Co-hosts in the room: ${otherPanelists.map((p) => p.display_name).join(', ')}.
You may either:
Option A (Single Speaker): [${nextSpeaker.display_name}] delivers an insight-backed question directly to the guest.
Option B (Tag-Team Handoff): [${nextSpeaker.display_name}] offers a quick observation and tosses to [${otherPanelists[0].display_name}], followed immediately by [${otherPanelists[0].display_name}] reacting and grilling the guest.`
      : '';

    const briefingSection = config.briefingBook
      ? `\n${ResearchProducerService.formatBriefingForPrompt(config.briefingBook, nextSpeaker.display_name)}\n`
      : '';

    const isThesisDiscovery = config.interviewGoal !== 'cross_examination';
    let phaseGuidance = '';
    if (isThesisDiscovery) {
      if (this.currentTurnIndex <= 2) {
        phaseGuidance = '\n=== CURRENT ARC: PHASE 1 (GENESIS & ORIGIN DISCOVERY) ===\nProbe the guest\'s formative project, workflow failure, or turning point. How did their thinking evolve from what they initially believed? What motivated or inspired this insight?\n';
      } else if (this.currentTurnIndex <= 4) {
        phaseGuidance = '\n=== CURRENT ARC: PHASE 2 (CONCRETE CRUCIBLE & FRICTION) ===\nDrill into the tangible operational mechanics: What broke down in practice? What were the unexpected edge cases and friction points?\n';
      } else if (this.currentTurnIndex <= 6) {
        phaseGuidance = '\n=== CURRENT ARC: PHASE 3 (STRESS-TESTING & CRITIC THEMES) ===\nPlay devil\'s advocate. Introduce counter-theses or critic objections from the briefing book to test their conviction.\n';
      } else {
        phaseGuidance = '\n=== CURRENT ARC: PHASE 4 (SYNTHESIS & THESIS CRYSTALLIZATION) ===\nHelp crystallize the overarching takeaway, rule of thumb, or framework for their article or writing.\n';
      }
    }

    const prompt = isPanel
      ? `You are moderating a collaborative broadcast interview panel with: ${activePersonas.map((p) => p.display_name).join(', ')}.
Topic: "${config.topic}"
${config.guestName ? `Guest: ${config.guestName}${config.guestRole ? ` (${config.guestRole})` : ''}` : ''}
Subject Context: ${config.dossier || 'Focus on the core topic.'}
${briefingSection}
Dialogue history so far:
${dialogueHistory}

Guest's latest statement:
"${userText}"

=== INQUISITOR GUIDANCE FOR [${nextSpeaker.display_name}] ===
${speakerGuidance}

${coHostGuide}
${phaseGuidance}
=== CRITICAL CONVERSATIONAL RULES ===
1. DO NOT simply paraphrase or restate what the guest just said. Reveal an insight, cite a specific metric/precedent from your briefing book, challenge an assumption, or introduce a razor trapdoor question.
2. Direct all final questions to the guest ("you").
3. Keep each speaker's contribution punchy (1-2 sentences of insight/framing, plus 1 sharp question).
4. Output format: Prefix each speaker with their name in brackets, e.g. [${nextSpeaker.display_name}]:`
      : `You are "${nextSpeaker.display_name}."
Topic: "${config.topic}"
${config.guestName ? `Guest: ${config.guestName}${config.guestRole ? ` (${config.guestRole})` : ''}` : ''}
Subject Context: ${config.dossier || 'Focus on the core topic.'}
${briefingSection}
Dialogue history:
${dialogueHistory}

Guest's latest response:
"${userText}"

=== YOUR INQUISITOR STYLE ===
${speakerGuidance}
${phaseGuidance}
=== CRITICAL RULES ===
1. DO NOT merely echo or restate the guest's words. Weaponize your homework: bring your signature perspective, challenge an assumption using a metric or historical precedent from the briefing book, or hit back at PR spin with a razor question before asking your question.
2. Ask exactly ONE single-barreled question directly to the guest ("you").
3. Ban generic praise ("Great answer", "That is fascinating").
4. Start with: [${nextSpeaker.display_name}]:`;

    try {
      const reply = await this.callGemini(prompt);
      const turnsQueue = this.parseMultiSpeakerTurns(reply, nextSpeaker, allPersonas);
      this.playQueuedTurns(turnsQueue);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.callbacks.onError(`Turn generation error: ${msg}`);
    }
  }

  private async callGemini(prompt: string): Promise<string> {
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.0-flash'];
    let lastError: Error | null = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 300,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Please tell me more about that.';
        } else {
          const err = await res.text();
          lastError = new Error(`Gemini API Error on ${model} (${res.status}): ${err}`);
        }
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
      }
    }

    throw lastError || new Error('All Gemini text generation candidates failed.');
  }

  private parseMultiSpeakerTurns(
    rawText: string,
    defaultSpeaker: Persona,
    allPersonas: Persona[]
  ): Array<{ speakerPersona: Persona; text: string }> {
    const lines = rawText.split('\n');
    const parsedTurns: Array<{ speakerPersona: Persona; text: string }> = [];

    let currentPersona = defaultSpeaker;
    let currentText = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let matched: Persona | null = null;
      let cleanLine = trimmed;

      for (const p of allPersonas) {
        const escaped = p.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^(\\*\\*|\\[|\\()?\\s*${escaped}\\s*(\\*\\*|\\]|\\)|:)*\\s*:?\\s*`, 'i');
        if (regex.test(trimmed)) {
          matched = p;
          cleanLine = trimmed.replace(regex, '').trim();
          break;
        }
      }

      if (matched) {
        if (currentText.trim()) {
          parsedTurns.push({
            speakerPersona: currentPersona,
            text: currentText.trim(),
          });
        }
        currentPersona = matched;
        currentText = cleanLine;
      } else {
        currentText += (currentText ? ' ' : '') + trimmed;
      }
    }

    if (currentText.trim()) {
      parsedTurns.push({
        speakerPersona: currentPersona,
        text: currentText.trim(),
      });
    }

    // Clean artifacts from each turn
    return parsedTurns
      .map((t) => {
        let clean = t.text
          .replace(/^[:*\])\s-]+/, '')
          .replace(/\*+\s*\*+Sentence\s*\d+\s*\(?/gi, '')
          .replace(/\(Sentence\s*\d+\)/gi, '')
          .replace(/^[:*\])\s-]+/, '')
          .trim();
        return {
          speakerPersona: t.speakerPersona,
          text: clean || t.text,
        };
      })
      .filter((t) => t.text.length > 0);
  }

  private playQueuedTurns(
    queue: Array<{ speakerPersona: Persona; text: string }>,
    onComplete?: () => void
  ): void {
    if (queue.length === 0) {
      onComplete?.();
      return;
    }

    const currentTurn = queue[0];
    const remaining = queue.slice(1);

    const aiTurn: TranscriptTurn = {
      id: `turn-ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      speaker: currentTurn.speakerPersona.display_name,
      text: currentTurn.text,
      timestamp: Date.now(),
      isFinal: true,
    };
    this.turns.push(aiTurn);
    this.callbacks.onTranscriptUpdate([...this.turns]);
    this.callbacks.onActiveSpeakerChange(currentTurn.speakerPersona.id);

    // Physically abort microphone capture while AI is speaking
    this.isAiSpeaking = true;
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
    }

    // Attempt Gemini Neural Voice first (natural human voice)
    const persona = currentTurn.speakerPersona;
    const voiceName = persona.voice_name || 'Fenrir';

    this.neuralTTS
      .speak(
        currentTurn.text,
        voiceName,
        (level) => {
          this.callbacks.onAudioLevel(level);
        },
        () => {
          if (remaining.length > 0) {
            setTimeout(() => {
              if (this.isRunning) {
                this.playQueuedTurns(remaining, onComplete);
              }
            }, 300);
          } else {
            this.callbacks.onActiveSpeakerChange(null);
            setTimeout(() => {
              this.isAiSpeaking = false;
              if (this.isRunning) {
                this.startListening();
              }
              onComplete?.();
            }, 500);
          }
        }
      )
      .catch((err) => {
        console.warn('[RestVoice] Neural TTS error, falling back to browser speech:', err);
        this.fallbackBrowserSpeak(currentTurn, remaining, onComplete);
      });
  }

  private fallbackBrowserSpeak(
    currentTurn: { speakerPersona: Persona; text: string },
    remaining: Array<{ speakerPersona: Persona; text: string }>,
    onComplete?: () => void
  ): void {
    this.startAudioAnimation();

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentTurn.text);
      const persona = currentTurn.speakerPersona;

      // Select voice and pitch for persona
      const voices = window.speechSynthesis.getVoices();
      const isFemale = ['audie_cornish', 'kara_swisher', 'terry_gross'].includes(persona.id);
      const preferredVoice =
        voices.find((v) => {
          if (!v.lang.startsWith('en')) return false;
          const name = v.name.toLowerCase();
          if (isFemale) {
            return (
              name.includes('samantha') ||
              name.includes('karen') ||
              name.includes('ava') ||
              name.includes('serena') ||
              name.includes('victoria') ||
              name.includes('female')
            );
          } else {
            return (
              name.includes('daniel') ||
              name.includes('tom') ||
              name.includes('oliver') ||
              name.includes('evan') ||
              name.includes('male') ||
              name.includes('google')
            );
          }
        }) || this.synthesisVoice;

      if (preferredVoice) utterance.voice = preferredVoice;

      if (persona.id === 'gonzo_hunter') {
        utterance.pitch = 0.88;
        utterance.rate = 1.15;
      } else if (persona.id === 'michael_barbaro') {
        utterance.pitch = 0.95;
        utterance.rate = 0.92;
      } else if (persona.id === 'kara_swisher') {
        utterance.pitch = 1.0;
        utterance.rate = 1.18;
      } else if (persona.id === 'david_pogue') {
        utterance.pitch = 1.08;
        utterance.rate = 1.06;
      } else if (persona.id === 'terry_gross') {
        utterance.pitch = 0.94;
        utterance.rate = 0.90;
      } else {
        utterance.pitch = 1.0;
        utterance.rate = 1.02;
      }

      utterance.onend = () => {
        if (remaining.length > 0) {
          setTimeout(() => {
            if (this.isRunning) {
              this.playQueuedTurns(remaining, onComplete);
            }
          }, 300);
        } else {
          this.stopAudioAnimation();
          this.callbacks.onActiveSpeakerChange(null);
          setTimeout(() => {
            this.isAiSpeaking = false;
            if (this.isRunning) {
              this.startListening();
            }
            onComplete?.();
          }, 500);
        }
      };

      utterance.onerror = () => {
        if (remaining.length > 0) {
          setTimeout(() => {
            if (this.isRunning) {
              this.playQueuedTurns(remaining, onComplete);
            }
          }, 300);
        } else {
          this.stopAudioAnimation();
          this.callbacks.onActiveSpeakerChange(null);
          setTimeout(() => {
            this.isAiSpeaking = false;
            if (this.isRunning) {
              this.startListening();
            }
            onComplete?.();
          }, 500);
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        if (remaining.length > 0) {
          this.playQueuedTurns(remaining, onComplete);
        } else {
          this.stopAudioAnimation();
          this.callbacks.onActiveSpeakerChange(null);
          this.isAiSpeaking = false;
          if (this.isRunning) {
            this.startListening();
          }
          onComplete?.();
        }
      }, 3500);
    }
  }

  private startAudioAnimation(): void {
    if (this.animInterval) clearInterval(this.animInterval);
    this.animInterval = window.setInterval(() => {
      const level = 0.35 + Math.random() * 0.55;
      this.callbacks.onAudioLevel(level);
    }, 70);
  }

  private stopAudioAnimation(): void {
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
    this.callbacks.onAudioLevel(0);
  }

  public stop(): TranscriptTurn[] {
    this.isRunning = false;
    this.stopAudioAnimation();
    this.neuralTTS.stop();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    this.callbacks.onStatusChange('disconnected');
    this.callbacks.onActiveSpeakerChange(null);
    return this.turns;
  }
}
