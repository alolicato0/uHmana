import type { DailyWellness, SymptomLog } from '../store/symptoms';
import { computeHealthScore } from '../store/symptoms';
import type { Reminder } from '../types';

export type InsightStatus = 'stable' | 'warning' | 'critical';

export interface InsightCard {
  id: string;
  emoji: string;
  title: string;
  body: string;
}

export interface TrendItem {
  label: string;
  emoji: string;
  direction: 'up' | 'down' | 'stable';
  good: boolean;
}

export interface InsightReport {
  hasData: boolean;
  score: number;
  status: InsightStatus;
  statusTitle: string;
  statusBullets: string[];
  correlations: InsightCard[];
  memory: InsightCard | null;
  risks: string[];
  trends: TrendItem[];
  suggestions: string[];
}

const DAY = 86_400_000;

function levelDir(v: number): 'up' | 'down' | 'stable' {
  return v >= 65 ? 'up' : v <= 40 ? 'down' : 'stable';
}

function detectFrequencyIncrease(logs: SymptomLog[]): InsightCard | null {
  const now = Date.now();
  const byName = new Map<string, { recent: number; prev: number }>();
  for (const l of logs) {
    const age = now - new Date(l.date).getTime();
    const entry = byName.get(l.name) ?? { recent: 0, prev: 0 };
    if (age <= 5 * DAY) entry.recent += 1;
    else if (age <= 10 * DAY) entry.prev += 1;
    byName.set(l.name, entry);
  }
  for (const [name, { recent, prev }] of byName) {
    if (recent >= 2 && recent > prev) {
      return {
        id: `freq-${name}`,
        emoji: '💡',
        title: 'Pattern rilevato',
        body: `"${name}" è aumentato negli ultimi giorni (${recent} episodi).`,
      };
    }
  }
  return null;
}

function buildMemory(logs: SymptomLog[]): InsightCard | null {
  if (logs.length < 2) return null;
  const latest = logs[0];
  const past = logs.filter((l) => l.name === latest.name && l.id !== latest.id);
  if (past.length === 0) return null;
  const lastPast = past[0];
  const dateStr = new Date(lastPast.date).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
  });
  const durationMap: Record<string, string> = {
    today: 'una giornata',
    '3days': 'qualche giorno',
    week: 'circa una settimana',
    longer: 'più di una settimana',
  };
  return {
    id: 'memory',
    emoji: '🧠',
    title: 'Memoria AI',
    body: `L'ultima volta che hai registrato "${latest.name}" è stato il ${dateStr} (intensità ${lastPast.intensity}/10), durato ${durationMap[lastPast.duration] ?? 'poco'}.`,
  };
}

export function buildInsightReport(
  logs: SymptomLog[],
  wellness: DailyWellness | null,
  reminders: Reminder[] = [],
): InsightReport {
  const hasData = logs.length > 0 || wellness !== null;
  const score = computeHealthScore(logs, wellness);
  const status: InsightStatus = score >= 75 ? 'stable' : score >= 50 ? 'warning' : 'critical';

  const last7 = logs.filter((l) => Date.now() - new Date(l.date).getTime() <= 7 * DAY);

  // ── Status bullets ──
  const statusBullets: string[] = [];
  statusBullets.push(
    last7.length === 0
      ? 'Nessun sintomo importante'
      : `${last7.length} ${last7.length === 1 ? 'sintomo registrato' : 'sintomi registrati'} (7gg)`,
  );
  if (wellness) {
    statusBullets.push(wellness.sleep >= 60 ? 'Sonno regolare' : 'Sonno ridotto');
    statusBullets.push(wellness.stress >= 60 ? 'Stress sotto controllo' : 'Stress da tenere d\'occhio');
  } else {
    statusBullets.push('Aggiungi il benessere per un quadro completo');
  }

  const statusTitle =
    status === 'stable'
      ? 'Tutto stabile'
      : status === 'warning'
      ? 'Attenzione al benessere'
      : 'Diversi segnali da monitorare';

  // ── Correlazioni ──
  const correlations: InsightCard[] = [];
  const headaches = logs.filter((l) => /test|emicrania|cefalea/i.test(l.name));
  if (headaches.length >= 1 && wellness && wellness.sleep < 50) {
    correlations.push({
      id: 'corr-sleep-head',
      emoji: '💡',
      title: 'Possibile correlazione',
      body: 'Il mal di testa tende a comparire dopo notti con poco sonno.',
    });
  }
  const freqInsight = detectFrequencyIncrease(logs);
  if (freqInsight) correlations.push(freqInsight);
  if (wellness && wellness.stress < 40 && last7.length >= 2) {
    correlations.push({
      id: 'corr-stress',
      emoji: '💡',
      title: 'Pattern rilevato',
      body: 'I sintomi sembrano più frequenti nei periodi di stress elevato.',
    });
  }
  const activeMeds = reminders.filter((r) => r.enabled && r.category === 'medication');
  if (activeMeds.length > 0 && last7.length >= 2) {
    correlations.push({
      id: 'corr-therapy',
      emoji: '💊',
      title: 'Terapia',
      body: `Hai ${activeMeds.length} ${activeMeds.length === 1 ? 'terapia attiva' : 'terapie attive'}: la costanza aiuta a ridurre i sintomi.`,
    });
  }

  // ── Memoria ──
  const memory = buildMemory(logs);

  // ── Rischi ──
  const risks: string[] = [];
  logs
    .filter((l) => l.duration === 'week' || l.duration === 'longer')
    .forEach((l) => {
      const label = `${l.name.toLowerCase()} persistente`;
      if (!risks.includes(label)) risks.push(label);
    });
  if (wellness) {
    if (wellness.stress < 40) risks.push('stress elevato');
    if (wellness.sleep < 40) risks.push('sonno insufficiente');
    if (wellness.hydration < 40) risks.push('idratazione bassa');
  }

  // ── Trend ──
  const trends: TrendItem[] = [];
  if (wellness) {
    trends.push({ label: 'Energia', emoji: '⚡', direction: levelDir(wellness.energy), good: wellness.energy >= 50 });
    trends.push({ label: 'Relax', emoji: '😌', direction: levelDir(wellness.stress), good: wellness.stress >= 50 });
    trends.push({ label: 'Sonno', emoji: '😴', direction: levelDir(wellness.sleep), good: wellness.sleep >= 50 });
  }
  trends.push({
    label: 'Sintomi',
    emoji: '🩺',
    direction: last7.length === 0 ? 'down' : last7.length >= 4 ? 'up' : 'stable',
    good: last7.length < 4,
  });

  // ── Suggerimenti ──
  const suggestions: string[] = [];
  if (wellness) {
    if (wellness.hydration < 60) suggestions.push("Aumenta l'idratazione durante la giornata");
    if (wellness.sleep < 60) suggestions.push('Cerca di migliorare la qualità del sonno');
    if (wellness.stress < 50) suggestions.push('Prova tecniche di rilassamento o brevi pause');
  }
  logs
    .filter((l) => l.duration === 'week' || l.duration === 'longer')
    .forEach((l) => suggestions.push(`Monitora "${l.name}" e valuta un consulto se persiste`));
  if (suggestions.length === 0) {
    suggestions.push('Continua a registrare i tuoi dati per insight più precisi');
  }

  return {
    hasData,
    score,
    status,
    statusTitle,
    statusBullets,
    correlations,
    memory,
    risks,
    trends,
    suggestions,
  };
}
