import { describe, it, expect } from 'vitest';
import { ResearchProducerService, researchProducer } from '../services/research-producer';
import { SAMPLE_DOSSIERS } from '../data/personas';

describe('ResearchProducerService & Briefing Book Generation', () => {
  it('should generate a rich simulated briefing book for Tech/AI pivot topics', async () => {
    const briefing = await researchProducer.generateBriefingBook({
      topic: 'Shutting down SaaS product to rebuild on autonomous agents',
      guestName: 'Alex Chen',
      guestRole: 'CEO, WorkflowGen',
    });

    expect(briefing.guestName).toBe('Alex Chen');
    expect(briefing.guestTitleOrRole).toBe('CEO, WorkflowGen');
    expect(briefing.summaryAngle.length).toBeGreaterThan(20);
    expect(briefing.hardDatapoints.length).toBeGreaterThanOrEqual(3);
    expect(briefing.historicalPrecedents.length).toBeGreaterThanOrEqual(2);
    expect(briefing.vulnerabilitiesAndPRSpin.length).toBeGreaterThanOrEqual(2);
    expect(briefing.counterTheses.length).toBeGreaterThanOrEqual(3);

    // Verify presence of metrics and razor questions
    expect(briefing.hardDatapoints.some((d) => d.metricOrFact.includes('$4M') || d.metricOrFact.includes('%'))).toBe(true);
    expect(briefing.vulnerabilitiesAndPRSpin.every((v) => v.razorQuestion.length > 10)).toBe(true);
  });

  it('should generate domain-specific briefing for Biotech / Science topics', async () => {
    const briefing = await researchProducer.generateBriefingBook({
      topic: 'Refusing an $8M buyout to keep plastic enzyme open source',
      guestName: 'Dr. Aris Thorne',
      guestRole: 'Lead Biochemist',
    });

    expect(briefing.summaryAngle).toContain('enzyme');
    expect(briefing.hardDatapoints.some((d) => d.metricOrFact.includes('$8M') || d.metricOrFact.includes('tons'))).toBe(true);
    expect(briefing.historicalPrecedents.some((p) => p.analogyOrCase.includes('Jonas Salk') || p.analogyOrCase.includes('CRISPR'))).toBe(true);
  });

  it('should generate domain-specific briefing for Viral Hardware / Supply Chain crisis', async () => {
    const briefing = await researchProducer.generateBriefingBook({
      topic: 'Going viral on TikTok with 100,000 orders and only 400 hardware units in stock',
      guestName: 'Marcus Vance',
      guestRole: 'Designer',
    });

    expect(briefing.summaryAngle).toContain('100,000');
    expect(briefing.hardDatapoints.some((d) => d.metricOrFact.includes('100,000 orders') || d.metricOrFact.includes('Stripe'))).toBe(true);
    expect(briefing.historicalPrecedents.some((p) => p.analogyOrCase.includes('Coolest Cooler'))).toBe(true);
  });

  it('should correctly format structured briefing book into high-impact prompt injection', () => {
    const sample = SAMPLE_DOSSIERS[0];
    const promptText = ResearchProducerService.formatBriefingForPrompt(sample.briefingBook, 'Kara Swisher');

    expect(promptText).toContain('=== THE INVESTIGATIVE SHOW BRIEFING BOOK & HOMEWORK (FOR KARA SWISHER) ===');
    expect(promptText).toContain('Alex Chen');
    expect(promptText).toContain('--- HARD DATAPOINTS & FINANCIAL/OPERATIONAL RECEIPTS ---');
    expect(promptText).toContain('--- HISTORICAL PRECEDENTS & REAL-WORLD ANALOGIES ---');
    expect(promptText).toContain('--- ANTICIPATED PR SPIN & RAZOR LANDMINES ---');
    expect(promptText).toContain('--- CRITIC BEAR-CASES & COUNTER-THESES ---');
    expect(promptText).toContain('Netflix Qwikster');
    expect(promptText).toContain('$4M ARR');
  });

  it('sample dossiers should all have valid pre-configured briefing books', () => {
    for (const sample of SAMPLE_DOSSIERS) {
      expect(sample.guestName.length).toBeGreaterThan(0);
      expect(sample.guestRole.length).toBeGreaterThan(0);
      expect(sample.briefingBook.hardDatapoints.length).toBeGreaterThanOrEqual(3);
      expect(sample.briefingBook.historicalPrecedents.length).toBeGreaterThanOrEqual(2);
      expect(sample.briefingBook.vulnerabilitiesAndPRSpin.length).toBeGreaterThanOrEqual(2);
      expect(sample.briefingBook.counterTheses.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('should generate domain-specific briefing for security breaches and outages', async () => {
    const briefing = await researchProducer.generateBriefingBook({
      topic: 'Autonomous AI Agent Security Breach at TechCorp',
      guestName: 'Elena Rostova',
      guestRole: 'Chief Information Security Officer',
    });

    expect(briefing.summaryAngle).toContain('trust');
    expect(briefing.hardDatapoints.some((d) => d.metricOrFact.includes('telemetry') || d.metricOrFact.includes('credentials') || d.metricOrFact.includes('architects'))).toBe(true);
    expect(briefing.historicalPrecedents.some((p) => p.analogyOrCase.includes('SolarWinds') || p.analogyOrCase.includes('Equifax'))).toBe(true);
    expect(briefing.vulnerabilitiesAndPRSpin.some((v) => v.razorQuestion.includes('privacy') || v.razorQuestion.includes('incident'))).toBe(true);
  });

  it('should produce alternate angles when re-running homework on the same topic', async () => {
    const run1 = await researchProducer.generateBriefingBook({
      topic: 'Shutting down SaaS product to rebuild on autonomous agents',
      guestName: 'Alex Chen',
      guestRole: 'CEO, WorkflowGen',
    });

    const run2 = await researchProducer.generateBriefingBook({
      topic: 'Shutting down SaaS product to rebuild on autonomous agents',
      guestName: 'Alex Chen',
      guestRole: 'CEO, WorkflowGen',
    });

    // Verify that consecutive runs produce variations in angle and datapoints
    expect(run1.summaryAngle).not.toBe(run2.summaryAngle);
  });

  it('should generate 100% clean briefing book for custom topics with zero demo artifacts', async () => {
    const briefing = await researchProducer.generateBriefingBook({
      topic: 'Why our school district decided to ban smartphones across all 14 campuses',
      guestName: 'Dr. Sarah Jenkins',
      guestRole: 'School Board President',
      notes: '350 parents signed protest petition. 42% decrease in bullying reports. 12 teachers filed grievances over enforcement duties.',
    });

    expect(briefing.guestName).toBe('Dr. Sarah Jenkins');
    expect(briefing.guestTitleOrRole).toBe('School Board President');

    // Stringify entire briefing book to scan for forbidden demo artifacts
    const fullJSON = JSON.stringify(briefing);

    // Absolutely NO demo artifacts from Sample #1 (Alex Chen / WorkflowGen / AI pivot)
    expect(fullJSON).not.toContain('$4M ARR');
    expect(fullJSON).not.toContain('45 headcount');
    expect(fullJSON).not.toContain('WorkflowGen');
    expect(fullJSON).not.toContain('Alex Chen');
    expect(fullJSON).not.toContain('Netflix Qwikster');
    expect(fullJSON).not.toContain('autonomous agents');

    // Absolutely NO demo artifacts from Sample #2 (Biotech / Aris Thorne / plastic enzyme)
    expect(fullJSON).not.toContain('140,000 tons');
    expect(fullJSON).not.toContain('enzyme');
    expect(fullJSON).not.toContain('Aris Thorne');

    // Absolutely NO demo artifacts from Sample #3 (Marcus Vance / Hardware / Coolest Cooler)
    expect(fullJSON).not.toContain('100,000 orders');
    expect(fullJSON).not.toContain('Coolest Cooler');
    expect(fullJSON).not.toContain('Marcus Vance');

    // Absolutely NO demo artifacts from Sample #4 (Security breach / SolarWinds / Equifax)
    expect(fullJSON).not.toContain('SolarWinds');
    expect(fullJSON).not.toContain('Elena Rostova');
    expect(fullJSON).not.toContain('48,000 credentials');

    // Verify custom receipts were extracted from user notes
    const hasBullyingStat = briefing.hardDatapoints.some((d) => d.metricOrFact.includes('42%'));
    const hasPetitionStat = briefing.hardDatapoints.some((d) => d.metricOrFact.includes('350 parents'));
    expect(hasBullyingStat || hasPetitionStat).toBe(true);

    // Verify relevant policy precedent
    expect(briefing.historicalPrecedents.some((p) => p.analogyOrCase.includes('Cellphone Ban'))).toBe(true);
  });

  it('should generate clean custom briefing for small business commerce topics without demo artifacts', async () => {
    const briefing = await researchProducer.generateBriefingBook({
      topic: 'Opening 6 new artisanal bakeries while organic flour costs surged 40%',
      guestName: 'Maya Lin',
      guestRole: 'Founder & Head Baker',
    });

    expect(briefing.guestName).toBe('Maya Lin');
    expect(briefing.guestTitleOrRole).toBe('Founder & Head Baker');

    const fullJSON = JSON.stringify(briefing);
    expect(fullJSON).not.toContain('$4M ARR');
    expect(fullJSON).not.toContain('WorkflowGen');
    expect(fullJSON).not.toContain('SolarWinds');
    expect(fullJSON).not.toContain('plastic');
    expect(fullJSON).not.toContain('100,000 orders');

    // Domain should be commerce / business
    expect(briefing.historicalPrecedents.some((p) => p.analogyOrCase.includes('Starbucks') || p.analogyOrCase.includes('Krispy Kreme'))).toBe(true);
  });

  it('extractReceiptsFromContext should extract currencies, percentages, and quantities', () => {
    const receipts = researchProducer.extractReceiptsFromContext(
      'Smartphone ban on 14 campuses',
      'Raised $500k in emergency funding. 68% drop in task completion. 25 teachers threatened resignation.'
    );

    expect(receipts.length).toBeGreaterThanOrEqual(3);
    expect(receipts.some((r) => r.metricOrFact.includes('$500k'))).toBe(true);
    expect(receipts.some((r) => r.metricOrFact.includes('68%'))).toBe(true);
  });

  it('should generate rich originAndMotivationAngles for custom thesis topics', async () => {
    const briefing = await researchProducer.generateBriefingBook({
      topic: 'Why AI is not the best choice to reach for when we talk about repeated automations',
      guestName: 'Staff Automation Architect',
      notes: 'Built 120 deterministic cron jobs. Attempted LLM agents that drifted after 3 weeks. 99.9% uptime requirement.',
    });

    expect(briefing.originAndMotivationAngles).toBeDefined();
    expect(briefing.originAndMotivationAngles!.length).toBeGreaterThanOrEqual(3);
    expect(briefing.originAndMotivationAngles![0]).toContain('Formative Crucible');

    const promptText = ResearchProducerService.formatBriefingForPrompt(briefing, 'Michael Barbaro');
    expect(promptText).toContain('--- PHASE 1: FORMATIVE GENESIS & ORIGIN ANGLES ---');
    expect(promptText).toContain('[GENESIS & ORIGIN ANGLE]');
  });
});
