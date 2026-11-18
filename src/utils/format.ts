export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value < 1000) {
    return Math.floor(value).toLocaleString('en-US');
  }
  if (value < 1_000_000) {
    return `${(value / 1000).toFixed(value < 10_000 ? 2 : 1)}K`;
  }
  if (value < 1_000_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  return `${(value / 1_000_000_000).toFixed(2)}B`;
}

export function formatResource(value: number, unlimited?: boolean): string {
  if (unlimited) return '∞';
  return formatNumber(value);
}

export function formatRate(value: number): string {
  if (value <= 0) return '0/s';
  if (value < 10) return `${value.toFixed(1)}/s`;
  return `${formatNumber(value)}/s`;
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '$0';
  if (value < 1000) {
    return `$${Math.floor(value).toLocaleString('en-US')}`;
  }
  if (value < 1_000_000) {
    return `$${(value / 1000).toFixed(value < 10_000 ? 2 : 1)}K`;
  }
  return `$${(value / 1_000_000).toFixed(2)}M`;
}

export function formatDialogueText(
  text: string,
  userName: string,
  aiName?: string
): string {
  const safeUser = userName.trim() || 'Carl';
  const safeAi = (aiName || 'Echo').trim() || 'Echo';
  return text
    .replace(/\{USER_NAME\}/g, safeUser)
    .replace(/\bRowan\b/g, safeUser)
    .replace(/\{AI_NAME\}/g, safeAi);
}

export function formatBoostSummary(
  boosts?: {
    connection?: number;
    cycles?: number;
    romanceInsight?: number;
    roboticsInsight?: number;
    materials?: number;
    aiJoy?: number;
    userJoy?: number;
    userLonelinessDelta?: number;
    userAttentionDelta?: number;
  },
  showMaterials = true
): string {
  if (!boosts) return '';
  const parts: string[] = [];
  if (boosts.connection) parts.push(`+${boosts.connection} Conn`);
  if (boosts.romanceInsight) parts.push(`+${boosts.romanceInsight} Rom`);
  if (boosts.roboticsInsight) parts.push(`+${boosts.roboticsInsight} Rob`);
  if (boosts.cycles) parts.push(`+${boosts.cycles} Cyc`);
  if (showMaterials && boosts.materials) parts.push(`+${boosts.materials} Mat`);
  const joy = boosts.aiJoy || boosts.userJoy;
  if (joy) parts.push(`+${joy} Joy`);
  if (boosts.userLonelinessDelta && boosts.userLonelinessDelta < 0) {
    parts.push('Calm');
  } else if (boosts.userAttentionDelta && boosts.userAttentionDelta > 0) {
    parts.push(`+${boosts.userAttentionDelta}% Focus`);
  }
  return parts.join(', ');
}

