import { Persona, InterviewConfig, TranscriptTurn } from '../types/persona';
import { PCMPlayer } from '../audio/pcm-player';
import { AudioRecorder } from '../audio/audio-recorder';
import { ResearchProducerService } from './research-producer';

export interface GeminiLiveCallbacks {
  onStatusChange: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
  onActiveSpeakerChange: (speakerId: string | 'user' | null) => void;
  onTranscriptUpdate: (turns: TranscriptTurn[]) => void;
  onError: (errorMsg: string) => void;
  onInputLevel: (level: number) => void;
  onOutputLevel: (level: number) => void;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private pcmPlayer: PCMPlayer;
  private audioRecorder: AudioRecorder;
  private currentTurns: TranscriptTurn[] = [];
  private currentAssistantTurnText = '';
  private currentSpeakerId: string | 'user' | null = null;
  private config: InterviewConfig | null = null;
  private allPersonas: Persona[] = [];

  private liveModel: string = 'models/gemini-2.0-flash-exp';

  constructor(private callbacks: GeminiLiveCallbacks) {
    this.pcmPlayer = new PCMPlayer(24000);
    this.audioRecorder = new AudioRecorder();

    this.pcmPlayer.onAudioLevel = (level) => {
      this.callbacks.onOutputLevel(level);
    };

    this.audioRecorder.onInputLevel = (level) => {
      this.callbacks.onInputLevel(level);
    };

    this.audioRecorder.onAudioData = (base64Pcm16k) => {
      this.sendRealtimeAudio(base64Pcm16k);
    };
  }

  private candidateModels = [
    'models/gemini-2.0-flash-exp',
    'models/gemini-3.8-live',
    'models/gemini-2.0-flash-realtime-exp',
  ];
  private candidateIndex = 0;
  private currentApiKey = '';
  private hasKickoffBeenSent = false;

  public async startSession(
    apiKey: string,
    config: InterviewConfig,
    allPersonas: Persona[],
    modelName?: string
  ): Promise<void> {
    this.currentApiKey = apiKey;
    this.config = config;
    this.allPersonas = allPersonas;
    this.candidateIndex = 0;
    this.hasKickoffBeenSent = false;

    if (modelName) {
      this.candidateModels = [
        modelName,
        'models/gemini-2.0-flash-exp',
        'models/gemini-3.8-live',
        'models/gemini-2.0-flash-realtime-exp',
      ].filter((v, i, a) => a.indexOf(v) === i);
    }
    this.liveModel = this.candidateModels[0];
    this.currentTurns = [];
    this.currentAssistantTurnText = '';
    this.currentSpeakerId = null;

    await this.connectWithModel(this.liveModel);
  }

  private async connectWithModel(modelToUse: string): Promise<void> {
    this.liveModel = modelToUse;
    this.callbacks.onStatusChange('connecting');

    try {
      // Initialize PCM Player and Microphone (unmuted during user gesture)
      await this.pcmPlayer.init().catch((e) => console.warn('[GeminiLive] PCM Player init note:', e));
      this.audioRecorder.start().catch((e) => console.warn('[GeminiLive] Audio recorder start note:', e));

      const host = 'generativelanguage.googleapis.com';
      const path = '/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
      const wsUrl = `wss://${host}${path}?key=${this.currentApiKey}`;

      console.log(`[GeminiLive] Initiating WebSocket to ${host} with model: ${this.liveModel}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[GeminiLive] WebSocket connected successfully');
        this.callbacks.onStatusChange('connected');
        this.sendSessionSetup();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (err) => {
        console.error('Gemini Live WebSocket Error:', err);
      };

      this.ws.onclose = async (event) => {
        console.log('Gemini Live WebSocket closed:', event.code, event.reason);

        // If the model is not found/unsupported (code 1008), try next candidate model automatically
        if (
          event.code === 1008 &&
          (event.reason.includes('not found') || event.reason.includes('not supported') || event.reason.includes('ModelSer')) &&
          this.candidateIndex < this.candidateModels.length - 1
        ) {
          this.candidateIndex++;
          const nextModel = this.candidateModels[this.candidateIndex];
          console.warn(`[GeminiLive] Model ${modelToUse} failed. Automatically falling back to candidate: ${nextModel}`);
          setTimeout(() => {
            this.connectWithModel(nextModel);
          }, 300);
          return;
        }

        if (event.code !== 1000) {
          this.callbacks.onError(`Session closed (${event.code}): ${event.reason || 'Connection lost'}`);
          this.callbacks.onStatusChange('error');
        } else {
          this.callbacks.onStatusChange('disconnected');
        }
        this.cleanupAudio();
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.callbacks.onError(`Failed to start audio session: ${msg}`);
      this.callbacks.onStatusChange('error');
      this.cleanupAudio();
    }
  }

  private buildSystemPrompt(): { prompt: string; voiceName: string } {
    if (!this.config) throw new Error('Missing config');

    if (this.config.mode === 'single') {
      const persona = this.allPersonas.find((p) => p.id === this.config!.primaryPersonaId) || this.allPersonas[0];
      const inq = persona.inquisitor_engine;
      const pacing = inq.pacing_constraints;
      const banned = pacing.banned_fillers.map((w) => `"${w}"`).join(', ');

      const isThesisDiscovery = this.config.interviewGoal !== 'cross_examination';
      const arcGuidance = isThesisDiscovery
        ? `=== THE 4-PHASE CONVERSATIONAL ARC (ARTICLE & THESIS DISCOVERY) ===
You are an exploratory journalistic sparring partner helping the guest excavate their ideas for an article or thesis. Follow this sequence:
- PHASE 1: GENESIS & INTELLECTUAL ON-RAMP (Turns 1–2):
  * DO NOT start with aggressive cross-examination or gotchas.
  * Start with curiosity: Ask how they arrived at this belief. What was the specific project, moment, or failure that catalyzed this realization? What motivated or inspired this insight?
  * Explore the origin story and initial expectations before challenging conclusions.
- PHASE 2: CONCRETE CRUCIBLE & FRICTION (Turns 3–4):
  * Drill into tangible mechanics: What broke down in that project? What were the unexpected edge cases or friction points?
- PHASE 3: STRESS-TESTING & BEAR-CASES (Turns 5–6):
  * Introduce critic objections and counter-theses from the briefing book: "Critics would argue X... why isn't that a better solution?"
- PHASE 4: SYNTHESIS & CORE THESIS (Turns 7+):
  * Help crystallize the lasting takeaway, mental model, or rule of thumb for their writing.

When the session opens, immediately fire your OPENING GENESIS HOOK exploring the project or moment that started this line of thinking!`
        : `=== JOURNALISTIC PREPARATION RULES (INVESTIGATIVE CROSS-EXAMINATION) ===
- YOU HAVE DONE EXTENSIVE INVESTIGATIVE HOMEWORK ON THIS GUEST.
- When the guest speaks, DO NOT settle for surface-level platitudes or mere restatements.
- Actively quote or cite specific metrics, dates, and historical precedents from your Briefing Book.
- If the guest gives a canned PR response, immediately spring the corresponding razor trapdoor question!

When the session opens, immediately fire your opening hook question based on your signature hook archetype!`;

      const prompt = `You are "${persona.display_name}," an elite, world-class interviewer conducting a live, simulated spoken voice interview with the user.
Your core ethos: ${persona.tagline}

=== INTERVIEWER ETHOS & CONVERSATIONAL ARCHITECTURE ===
- Relational Stance: ${inq.relational_stance}
- Ingestion Filter: ${inq.ingestion_filter}
- Opening Hook Archetype: ${inq.hook_archetype}
- Listening Vector: ${inq.listening_vector}
- Pushback Mechanic: ${inq.pushback_mechanic}
- Intensity Setting: ${this.config.intensity.toUpperCase()} (Push accordingly: ${
        this.config.intensity === 'ruthless'
          ? 'Never let them off the hook; challenge every premise aggressively.'
          : this.config.intensity === 'gentle'
          ? 'Be empathetic, warm, and encourage deep reflection.'
          : 'Balance respect with razor-sharp probing on unexamined trade-offs.'
      })

=== CRITICAL AUDIO & PACING CONSTRAINTS ===
1. THIS IS A REAL-TIME SPOKEN VOICE CALL: Keep turns brief, punchy, and conversational.
2. Ask exactly 1 single-barreled question per turn. Never stack multiple questions.
3. NEVER use banned conversational fillers like: ${banned}. Do NOT say "That's a great question", "Awesome", "Thanks for sharing", or "Fascinating".
4. Always speak in character as ${persona.display_name}.
5. Prefix your speech text with [${persona.display_name}]: so the transcript tracks speaker identity.

=== SUBJECT DOSSIER & TOPIC TO INITIATE ===
Topic: ${this.config.topic}
${this.config.guestName ? `Guest: ${this.config.guestName}${this.config.guestRole ? ` (${this.config.guestRole})` : ''}` : ''}
Context & Dossier:
${this.config.dossier || 'No specific background dossier provided. Focus on the core topic.'}

${this.config.briefingBook ? ResearchProducerService.formatBriefingForPrompt(this.config.briefingBook, persona.display_name) : ''}

${arcGuidance}`;

      return { prompt, voiceName: persona.voice_name || 'Fenrir' };
    } else {
      // Panel Mode
      const isThesisDiscovery = this.config.interviewGoal !== 'cross_examination';
      const selectedPersonas = this.allPersonas.filter((p) => this.config!.panelPersonaIds.includes(p.id));
      const personasList = selectedPersonas.length > 0 ? selectedPersonas : this.allPersonas.slice(0, 3);
      
      const panelDescriptions = personasList.map((p) => `
- **${p.display_name}** (${p.tagline})
  * Stance: ${p.inquisitor_engine.relational_stance}
  * Hook/Pushback: ${p.inquisitor_engine.pushback_mechanic}
  * Voice Personality: ${p.vocal_characteristics}`).join('\n');

      const panelArcGuidance = isThesisDiscovery
        ? `=== PANEL ARCHITECTURE (ARTICLE & THESIS DISCOVERY) ===
1. OPEN WITH DISCOVERY (Turns 1–2): The first interviewer opens by probing the formative project, breaking point, or motivation that catalyzed this thesis on "${this.config.topic}".
2. PROGRESS INTO FRICTION (Turns 3–4): Panelists tag-team to drill into the mechanical failures and edge cases.
3. DEBATE & BEAR-CASES (Turns 5–6): Panelists debate counter-theses and push back with critic perspectives.
4. SYNTHESIS (Turns 7+): Help the guest formulate the enduring lesson and rule of thumb.`
        : `=== PANEL ARCHITECTURE (INVESTIGATIVE CROSS-EXAMINATION) ===
1. All panelists weave hard metrics, historical precedents, and counter-theses into their questions from their signature perspective!
2. Catch PR evasions immediately and press on vulnerabilities.`;

      const prompt = `You are moderating a dynamic, live, collaborative multi-interviewer broadcast panel where ${personasList.length} legendary interviewers are in the room together grilling the guest (the user).

=== THE INTERVIEW PANEL IN THE ROOM ===
${panelDescriptions}

=== PANEL DYNAMICS & COLLABORATIVE RULES ===
1. ORGANIC TAG-TEAMING: The interviewers should interact naturally like a high-energy broadcast studio panel (e.g. 60 Minutes, The Daily, Pivot, Sunday Morning).
2. CROSS-TALK & REFERENCES: Interviewers should actively listen to each other, build on each other's questions, or chime in with their distinct perspective. For example:
   - "Wait, Michael, before we move on, I want to know who actually signed that check..."
   - "Forget the PR summary, let's talk about the blood on the floor..."
   - "Hold the phone—for those of us without a PhD, what does that actually mean?"
3. CLEAR SPEAKER ATTRIBUTION: Before speaking, ALWAYS declare which interviewer is taking the mic by prefixing the turn with their name in brackets, e.g., \`[${personasList[0].display_name}]:\` or \`[${personasList[1]?.display_name || personasList[0].display_name}]:\`.
4. VARIETY: Rotate naturally between the panelists so each interviewer brings their unique lens to the topic.
5. SHORT TURNS: Keep each spoken turn crisp (1-2 sentences maximum, asking 1 sharp question). Never deliver long monologues.
6. NO ROBOTIC FILLERS: Ban "Great answer", "Thanks for sharing", "Fascinating".

=== SUBJECT DOSSIER & TOPIC ===
Topic: ${this.config.topic}
${this.config.guestName ? `Guest: ${this.config.guestName}${this.config.guestRole ? ` (${this.config.guestRole})` : ''}` : ''}
Context & Dossier:
${this.config.dossier || 'No specific dossier provided. Focus on the core topic.'}

${this.config.briefingBook ? ResearchProducerService.formatBriefingForPrompt(this.config.briefingBook) : ''}

${panelArcGuidance}

Initiate the live panel now by having one of the panelists fire the opening hook!`;

      return { prompt, voiceName: personasList[0].voice_name || 'Fenrir' };
    }
  }

  private sendSessionSetup(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.hasKickoffBeenSent = false;
    const { prompt, voiceName } = this.buildSystemPrompt();

    const setupMessage = {
      setup: {
        model: this.liveModel || 'models/gemini-2.0-flash-exp',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voiceName,
              },
            },
          },
        },
        outputAudioTranscription: {},
        systemInstruction: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      },
    };

    console.log('[GeminiLive] Sending session setup message for model:', this.liveModel, 'with voice:', voiceName);
    this.ws.send(JSON.stringify(setupMessage));

    // Fallback: If server does not send an explicit setupComplete frame within 2500ms, trigger kickoff
    setTimeout(() => {
      if (!this.hasKickoffBeenSent && this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log('[GeminiLive] Fallback trigger check after setup');
        this.sendKickoffTrigger();
      }
    }, 2500);
  }

  public sendKickoffTrigger(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this.hasKickoffBeenSent) return;
    this.hasKickoffBeenSent = true;

    const kickoffMessage = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: 'The interview broadcast is live right now. Start the conversation immediately with your opening question based on the topic and dossier.',
              },
            ],
          },
        ],
        turnComplete: true,
      },
    };

    console.log('[GeminiLive] Firing opening hook kickoff trigger');
    this.ws.send(JSON.stringify(kickoffMessage));
  }

  public sendRealtimeAudio(base64Pcm16k: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const realtimeInput = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Pcm16k,
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(realtimeInput));
  }

  public sendUserTextMessage(text: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Add user turn to transcript
    const userTurn: TranscriptTurn = {
      id: `turn-${Date.now()}-user`,
      speaker: 'user',
      text: text,
      timestamp: Date.now(),
      isFinal: true,
    };
    this.currentTurns.push(userTurn);
    this.callbacks.onTranscriptUpdate([...this.currentTurns]);

    const clientContent = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: text,
              },
            ],
          },
        ],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(clientContent));
  }

  /**
   * Send live steering instruction to guide the interview (e.g. "Push harder", "Switch to Hunter")
   */
  public sendSteeringDirective(directive: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const steeringMessage = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: `[DIRECTOR INSTRUCTION]: ${directive}`,
              },
            ],
          },
        ],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(steeringMessage));
  }

  private handleMessage(data: string | Blob | ArrayBuffer): void {
    if (typeof data !== 'string') {
      return;
    }

    try {
      const msg = JSON.parse(data);

      // Setup handshake completed by server
      if (msg.setupComplete) {
        console.log('[GeminiLive] Setup completed by server, initiating turn 1');
        this.sendKickoffTrigger();
      }

      // 1. Check for Server Content / Model Turn
      if (msg.serverContent) {
        const { modelTurn, turnComplete, interrupted } = msg.serverContent;

        if (interrupted) {
          this.pcmPlayer.flush();
          this.callbacks.onActiveSpeakerChange(null);
          return;
        }

        // Real-time live text transcription chunks if available
        const liveTranscript = msg.serverContent.outputTranscription?.text || msg.serverContent.outputAudioTranscription?.text;
        if (liveTranscript) {
          this.handleIncomingText(liveTranscript);
        }

        if (modelTurn && modelTurn.parts) {
          for (const part of modelTurn.parts) {
            // Audio Chunks
            if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
              this.pcmPlayer.feed(part.inlineData.data);
              if (!this.currentSpeakerId) {
                this.currentSpeakerId = this.config?.mode === 'single' ? this.config.primaryPersonaId : (this.allPersonas[0]?.id || 'interviewer');
              }
              this.callbacks.onActiveSpeakerChange(this.currentSpeakerId);

              // If no turn exists yet or text hasn't arrived, register an active audio turn in the transcript
              const activePersona = this.allPersonas.find((p) => p.id === this.currentSpeakerId);
              const speakerLabel = activePersona ? activePersona.display_name : 'Interviewer';
              const lastTurn = this.currentTurns[this.currentTurns.length - 1];
              if (!lastTurn || lastTurn.speaker === 'user' || lastTurn.isFinal) {
                this.currentTurns.push({
                  id: `turn-${Date.now()}-ai`,
                  speaker: speakerLabel,
                  text: '🎙️ [Speaking live audio...]',
                  timestamp: Date.now(),
                  isFinal: false,
                });
                this.callbacks.onTranscriptUpdate([...this.currentTurns]);
              }
            }

            // Transcript text parts if provided
            if (part.text) {
              this.handleIncomingText(part.text);
            }
          }
        }

        if (turnComplete) {
          this.finalizeAssistantTurn();
        }
      }
    } catch (e) {
      console.error('Error parsing Gemini message:', e, data);
    }
  }

  private handleIncomingText(text: string): void {
    this.currentAssistantTurnText += text;

    // Detect speaker tag e.g. [Hunter S. Thompson]: or [Michael Barbaro]:
    const speakerMatch = this.currentAssistantTurnText.match(/^\[([^\]]+)\]:/);
    if (speakerMatch) {
      const rawName = speakerMatch[1].trim();
      const matched = this.allPersonas.find(
        (p) => p.display_name.toLowerCase().includes(rawName.toLowerCase()) || rawName.toLowerCase().includes(p.display_name.toLowerCase())
      );
      this.currentSpeakerId = matched ? matched.id : rawName;
    } else if (this.config?.mode === 'single') {
      this.currentSpeakerId = this.config.primaryPersonaId;
    }

    this.callbacks.onActiveSpeakerChange(this.currentSpeakerId);

    // Update live transcript preview
    const cleanText = this.currentAssistantTurnText.replace(/^\[[^\]]+\]:\s*/, '');
    const activePersona = this.allPersonas.find((p) => p.id === this.currentSpeakerId);
    const speakerLabel = activePersona ? activePersona.display_name : this.currentSpeakerId || 'Interviewer';

    const lastTurn = this.currentTurns[this.currentTurns.length - 1];
    if (lastTurn && lastTurn.speaker !== 'user' && !lastTurn.isFinal) {
      lastTurn.text = cleanText;
      lastTurn.speaker = speakerLabel;
    } else {
      this.currentTurns.push({
        id: `turn-${Date.now()}-ai`,
        speaker: speakerLabel,
        text: cleanText,
        timestamp: Date.now(),
        isFinal: false,
      });
    }

    this.callbacks.onTranscriptUpdate([...this.currentTurns]);
  }

  private finalizeAssistantTurn(): void {
    const lastTurn = this.currentTurns[this.currentTurns.length - 1];
    if (lastTurn && !lastTurn.isFinal) {
      lastTurn.isFinal = true;
    }
    this.currentAssistantTurnText = '';
    this.callbacks.onTranscriptUpdate([...this.currentTurns]);
  }

  private cleanupAudio(): void {
    this.audioRecorder.stop();
    this.pcmPlayer.flush();
    this.callbacks.onActiveSpeakerChange(null);
    this.callbacks.onInputLevel(0);
    this.callbacks.onOutputLevel(0);
  }

  public endSession(): TranscriptTurn[] {
    if (this.ws) {
      try {
        this.ws.close(1000, 'User ended session');
      } catch {
        // Ignore
      }
      this.ws = null;
    }
    this.cleanupAudio();
    this.callbacks.onStatusChange('disconnected');
    return this.currentTurns;
  }
}
