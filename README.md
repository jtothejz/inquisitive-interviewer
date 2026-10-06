# Inquisitive Interviewer: Real-Time Voice AI & Narrative Synthesis Studio

An edge-native, real-time voice interview studio and narrative synthesis application. Step into a simulated live spoken broadcast interview with legendary interviewers (such as Hunter S. Thompson / Gonzo, Michael Barbaro, Audie Cornish, David Pogue, Kara Swisher, Terry Gross, or dynamic collaborative multi-interviewer panels), extract the raw revelations and "juicy nuggets" as you speak, and generate high-impact narrative drafts in each interviewer's signature literary style.

---

## Key Features

- **Direct Bidirectional Voice Engine**: Powered by Google Gemini 2.0 Flash Multimodal Live over native WebSockets, enabling low-latency, natural conversational speech with instant interruption handling.
- **Collaborative Multi-Interviewer Panel Mode**: Moderates a live broadcast table where 2+ interviewers tag-team, debate, and react to each other while grilling the guest in real time.
- **Real-Time "Juicy Nugget" Extractor**: Background intelligence listener that identifies unvarnished admissions, core tensions, turning points, and soundbites as you speak.
- **Multi-Format Synthesis Studio**:
  1. *Gonzo Dispatch / Manifesto* (Visceral, staccato, unapologetic truth)
  2. *NYT "The Daily" Script* (Dramatic chronology, narrative arc, step-back synthesis)
  3. *NPR In-Depth Audio Essay* (Audie Cornish balanced moral calculus)
  4. *CBS Sunday Morning / Tech Explainer* (David Pogue wit and kitchen-table analogies)
  5. *Pivot / Tech Insider Memo* (Kara Swisher power dynamics & spin destruction)
  6. *Fresh Air Biographical Portrait* (Terry Gross inner craft & formative turning points)
  7. *Golden Quotations & Soundbites Deck* (Curated verbatim admissions and social copy)
- **Live Steering Dock**: In-call steering pills ("Push harder", "Interrupt PR spin", "Unpack emotional stakes", "Pass mic to co-host") plus custom typed director notes.
- **Custom Persona Builder**: Create and configure custom interviewer archetypes with unique Inquisitor stance and Narrator output schemas.
- **Zero Cost / Edge Ready**: Built with React 19, Vite, Tailwind CSS, and Web Audio API. 100% serverless, deployable on Cloudflare Pages or GCP.

---

## Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key
Copy the environment example or enter your API key directly in the web UI Settings modal:
```bash
cp .env.example .env
# Set VITE_GEMINI_API_KEY=your_gemini_api_key
```
> Get a free Gemini API key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Cloudflare Deployment

### 1. Build the Production Bundle
```bash
npm run build
```

### 2. Deploy to Cloudflare Pages (Free Tier)
```bash
npx wrangler pages deploy dist --project-name=inquisitive-interviewer
```

---

## Architecture & Codebase Map

- [`src/data/personas.ts`](file:///Users/jakezimmer/dev/inquisitive-interviewer/src/data/personas.ts): Complete persona specifications (Inquisitor and Narrator engines).
- [`src/services/gemini-live.ts`](file:///Users/jakezimmer/dev/inquisitive-interviewer/src/services/gemini-live.ts): Real-time bidirectional WebSockets client for Gemini 2.0 Multimodal Live.
- [`src/audio/pcm-player.ts`](file:///Users/jakezimmer/dev/inquisitive-interviewer/src/audio/pcm-player.ts): Low-latency 24kHz PCM audio playback and visualizer RMS analyzer.
- [`src/audio/audio-recorder.ts`](file:///Users/jakezimmer/dev/inquisitive-interviewer/src/audio/audio-recorder.ts): 16kHz PCM microphone capture.
- [`src/services/nugget-extractor.ts`](file:///Users/jakezimmer/dev/inquisitive-interviewer/src/services/nugget-extractor.ts): Real-time insight and admission detector.
- [`src/services/synthesis-service.ts`](file:///Users/jakezimmer/dev/inquisitive-interviewer/src/services/synthesis-service.ts): Post-interview story and narrative draft generator.
- [`src/components/LiveRoom.tsx`](file:///Users/jakezimmer/dev/inquisitive-interviewer/src/components/LiveRoom.tsx): Main broadcast studio room with reactive waveforms and transcript.
- [`src/components/SynthesisStudio.tsx`](file:///Users/jakezimmer/dev/inquisitive-interviewer/src/components/SynthesisStudio.tsx): Narrative drafts editor, exporter, and AI polisher.
