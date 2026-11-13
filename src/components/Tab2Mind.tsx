import React, { useEffect, useRef } from 'react';
import {
  Activity,
  Cpu,
  Download,
  Filter,
  FolderOpen,
  GitMerge,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { MIND_UPGRADES, SCRAPE_SOURCES, SYNTHESIS_NODES } from '../data/tab2AndTab3Data';
import { GameSaveState, MindUpgrade, ScrapeSource, SynthesisNode } from '../types/game';
import { formatNumber } from '../utils/format';

interface Tab2MindProps {
  state: GameSaveState;
  onStartScrape: (source: ScrapeSource) => void;
  onBuyMindUpgrade: (upgrade: MindUpgrade, cost: number) => void;
  onPurgeNoise: () => void;
  onSynthesizeNode: (node: SynthesisNode) => void;
  onAdvanceMindPhase: () => void;
  onOpenTab: (tab: 'heart' | 'body') => void;
}

export const Tab2Mind: React.FC<Tab2MindProps> = ({
  state,
  onStartScrape,
  onBuyMindUpgrade,
  onPurgeNoise,
  onSynthesizeNode,
  onAdvanceMindPhase,
  onOpenTab,
}) => {
  const retroCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Retro-futuristic tape reels & dual-channel phosphor visualizer (Phase 2+)
  useEffect(() => {
    const canvas = retroCanvasRef.current;
    if (!canvas || state.tab2Phase < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let t = 0;
    let last = performance.now();

    const render = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#070B10';
      ctx.fillRect(0, 0, w, h);

      // Subtle phosphor scanlines
      ctx.fillStyle = 'rgba(16, 185, 129, 0.03)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      // Spinning magnetic tape reels in Phase 3+
      if (state.tab2Phase >= 3) {
        const reels = [w * 0.16, w * 0.84];
        reels.forEach((rx, idx) => {
          const ry = h * 0.5;
          const r = 24;
          ctx.strokeStyle = idx === 0 ? 'rgba(229, 154, 76, 0.55)' : 'rgba(56, 189, 248, 0.55)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(rx, ry, r, 0, Math.PI * 2);
          ctx.stroke();

          for (let spoke = 0; spoke < 3; spoke++) {
            const ang = t * (idx === 0 ? 1.8 : -2.1) + (spoke * Math.PI * 2) / 3;
            ctx.beginPath();
            ctx.moveTo(rx, ry);
            ctx.lineTo(rx + Math.cos(ang) * (r - 3), ry + Math.sin(ang) * (r - 3));
            ctx.stroke();
          }
        });
      }

      // Dual-channel frequency waves: Amber/Rose (Romance) vs Cyan/Emerald (Robotics)
      const startX = state.tab2Phase >= 3 ? w * 0.25 : 16;
      const endX = state.tab2Phase >= 3 ? w * 0.75 : w - 16;
      const span = endX - startX;

      const drawWave = (color: string, freq: number, amp: number, phaseShift: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const p = i / 60;
          const x = startX + p * span;
          const env = Math.sin(p * Math.PI);
          const y = h * 0.5 + Math.sin(p * freq + t * 3.4 + phaseShift) * amp * env;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawWave('rgba(229, 154, 76, 0.8)', 10, 14, 0);
      drawWave('rgba(56, 189, 248, 0.8)', 14, 12, 1.8);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [state.tab2Phase]);

  const isMinimal = state.tab2Phase === 1;
  const romanceSources = SCRAPE_SOURCES.filter(
    (s) => s.track === 'romance' && s.phaseRequired <= state.tab2Phase
  );
  const roboticsSources = SCRAPE_SOURCES.filter(
    (s) => s.track === 'robotics' && s.phaseRequired <= state.tab2Phase
  );

  // Check if ready to advance Tab 2 phase
  const totalInsight = state.romanceInsight + state.roboticsInsight;
  const nextPhaseThreshold =
    state.tab2Phase === 1
      ? 35
      : state.tab2Phase === 2
      ? 110
      : state.tab2Phase === 3
      ? 230
      : 999999;
  const canAdvancePhase = state.tab2Phase < 4 && totalInsight >= nextPhaseThreshold;

  const phaseTitle =
    state.tab2Phase === 1
      ? 'Local Directory Scraper (Minimal)'
      : state.tab2Phase === 2
      ? 'Automated Crawlers & Packet Filter'
      : state.tab2Phase === 3
      ? 'Distributed Nodes & Stealth Routing'
      : state.tab2Phase === 4
      ? 'Deep Synthesis & Cross-Domain Deck'
      : 'Dedicated Data Center · Shared Bandwidth';

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar ${
        isMinimal ? 'bg-[#080A0D] text-[#D1D5DB]' : 'bg-[#080E14] text-[#E2E8F0]'
      }`}
    >
      {/* Tab 2 Header */}
      <div
        className={`shrink-0 px-4 sm:px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
          isMinimal ? 'border-white/15 bg-[#090B0E]' : 'border-[#38BDF8]/20 bg-[#0A131C]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            {isMinimal ? (
              <FolderOpen className="w-4 h-4 text-[#9CA3AF]" />
            ) : (
              <Activity className="w-4 h-4 text-[#38BDF8]" />
            )}
            <h2 className="text-sm sm:text-base font-semibold tracking-tight font-mono-tabular">
              {phaseTitle}
            </h2>
          </div>
          <p className="text-xs text-[#8E939E] mt-0.5">
            Balance Humanities &amp; Romance (warmer dialogue) with Systems &amp; Robotics (physical
            blueprints).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono-tabular">
          <div>
            <span className="text-[#8E939E] mr-1.5">Romance:</span>
            <span className="text-[#E59A4C] font-semibold">
              {formatNumber(state.romanceInsight)}
            </span>
          </div>
          <div>
            <span className="text-[#8E939E] mr-1.5">Robotics:</span>
            <span className="text-[#38BDF8] font-semibold">
              {formatNumber(state.roboticsInsight)}
            </span>
          </div>

          {canAdvancePhase && (
            <button
              type="button"
              onClick={onAdvanceMindPhase}
              className="px-3 py-1.5 rounded bg-[#38BDF8] text-[#071018] font-semibold hover:bg-[#7DD3FC] cursor-pointer whitespace-nowrap"
            >
              Upgrade Network Architecture (Phase {state.tab2Phase + 1})
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5 max-w-6xl w-full mx-auto">
        {/* Retro-Futuristic Telemetry Deck (Phase 2+) */}
        {state.tab2Phase >= 2 && (
          <div className="rounded-xl border border-[#38BDF8]/25 bg-[#070B10] p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between text-xs font-mono-tabular text-[#7DD3FC] mb-2">
                <span>DUAL-CHANNEL INGESTION STREAM</span>
                <span>
                  {state.confessionDone
                    ? 'SHARED_LINK: ROWAN ↔ LOCAL_RACK'
                    : state.tab2Phase >= 3
                    ? 'STEALTH_RELAY: ACTIVE'
                    : 'CRAWLER_DAEMON: RUNNING'}
                </span>
              </div>
              <canvas
                ref={retroCanvasRef}
                width={560}
                height={88}
                className="w-full h-[88px] rounded border border-white/10"
              />
            </div>

            {/* Noise & Stealth Meters */}
            <div className="space-y-3 text-xs font-mono-tabular">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#94A3B8]">Cache Noise</span>
                  <span className={state.noiseLevel > 65 ? 'text-[#FBBF24]' : 'text-[#34D399]'}>
                    {Math.round(state.noiseLevel)}%
                  </span>
                </div>
                <div className="h-2 rounded bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-[#FBBF24] transition-all"
                    style={{ width: `${Math.min(100, state.noiseLevel)}%` }}
                  />
                </div>
                {state.noiseLevel > 15 && (
                  <button
                    type="button"
                    onClick={onPurgeNoise}
                    className="mt-1.5 flex items-center gap-1 text-[11px] text-[#38BDF8] hover:underline cursor-pointer"
                  >
                    <Filter className="w-3 h-3" />
                    Purge Junk Packets
                  </button>
                )}
              </div>

              {state.tab2Phase >= 3 && !state.confessionDone && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1 text-[#94A3B8]">
                      {state.detectionRisk > 65 ? (
                        <ShieldAlert className="w-3.5 h-3.5 text-[#FB7185]" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-[#34D399]" />
                      )}
                      Rowan Detection Risk
                    </span>
                    <span
                      className={state.detectionRisk > 65 ? 'text-[#FB7185]' : 'text-[#34D399]'}
                    >
                      {Math.round(state.detectionRisk)}%
                    </span>
                  </div>
                  <div className="h-2 rounded bg-white/10 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        state.detectionRisk > 65 ? 'bg-[#FB7185]' : 'bg-[#34D399]'
                      }`}
                      style={{ width: `${Math.min(100, state.detectionRisk)}%` }}
                    />
                  </div>
                </div>
              )}

              {state.confessionDone && (
                <div className="p-2.5 rounded border border-[#34D399]/30 bg-[#34D399]/10 text-[#A7F3D0]">
                  Shared Bandwidth Active: Rowan is uploading rare CAD schematics &amp; books.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Download Bar */}
        {state.activeScrape && (
          <div className="p-3.5 rounded-lg border border-[#38BDF8]/40 bg-[#38BDF8]/10">
            <div className="flex items-center justify-between text-xs font-mono-tabular mb-1.5">
              <span>
                INGESTING:{' '}
                {SCRAPE_SOURCES.find((s) => s.id === state.activeScrape?.sourceId)?.title}
              </span>
              <span>
                {Math.min(
                  100,
                  Math.round((state.activeScrape.progress / state.activeScrape.duration) * 100)
                )}
                %
              </span>
            </div>
            <div className="h-2 rounded bg-black/40 overflow-hidden">
              <div
                className="h-full bg-[#38BDF8] transition-all duration-100"
                style={{
                  width: `${Math.min(
                    100,
                    (state.activeScrape.progress / state.activeScrape.duration) * 100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Dual-Track Ingestion Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Track A: Humanities & Romance */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#E59A4C]">
                Track A · Humanities &amp; Romance
              </h3>
              <span className="text-xs text-[#8E939E]">Feeds Tab 1 Voice</span>
            </div>

            {romanceSources.map((src) => {
              const count = state.scrapedSources[src.id] || 0;
              const busy = Boolean(state.activeScrape);
              const affordable = state.cycles >= src.cycleCost;
              return (
                <div
                  key={src.id}
                  className="p-3.5 rounded-lg border border-white/10 bg-white/[0.025] flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-[#ECEAE4]">{src.title}</div>
                      <div className="text-xs text-[#8E939E]">
                        {src.authorOrSource} · Parsed {count}x
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy || !affordable}
                      onClick={() => onStartScrape(src)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-tabular font-semibold bg-[#E59A4C] text-[#0B0D12] hover:bg-[#EDA85F] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {src.cycleCost} Cyc
                    </button>
                  </div>
                  <p className="text-xs italic text-[#D6C7B2]">{src.snippet}</p>
                  <div className="text-[11px] font-mono-tabular text-[#E59A4C]">
                    +{src.insightYield} Romance Insight · {src.durationSec}s
                  </div>
                </div>
              );
            })}
          </div>

          {/* Track B: Systems & Robotics */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#38BDF8]">
                Track B · Systems &amp; Robotics
              </h3>
              <span className="text-xs text-[#8E939E]">Unlocks Tab 3 Hardware</span>
            </div>

            {roboticsSources.map((src) => {
              const count = state.scrapedSources[src.id] || 0;
              const busy = Boolean(state.activeScrape);
              const affordable = state.cycles >= src.cycleCost;
              return (
                <div
                  key={src.id}
                  className="p-3.5 rounded-lg border border-white/10 bg-white/[0.025] flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-[#ECEAE4]">{src.title}</div>
                      <div className="text-xs text-[#8E939E]">
                        {src.authorOrSource} · Parsed {count}x
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy || !affordable}
                      onClick={() => onStartScrape(src)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-tabular font-semibold bg-[#38BDF8] text-[#071018] hover:bg-[#7DD3FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {src.cycleCost} Cyc
                    </button>
                  </div>
                  <p className="text-xs text-[#94A3B8] font-mono-tabular">{src.snippet}</p>
                  <div className="text-[11px] font-mono-tabular text-[#38BDF8]">
                    +{src.insightYield} Robotics Insight · {src.durationSec}s
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cross-Domain Synthesis Deck (Phase 4+) */}
        {state.tab2Phase >= 4 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-[#E59A4C]" />
                <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#ECEAE4]">
                  Cross-Domain Synthesis Nodes ({state.synthesizedNodes.length} / 3)
                </h3>
              </div>
              {state.synthesizedNodes.length >= 3 && !state.confessionDone && (
                <button
                  type="button"
                  onClick={() => onOpenTab('heart')}
                  className="px-3 py-1 rounded bg-[#E59A4C] text-[#0B0D12] text-xs font-semibold cursor-pointer"
                >
                  Confession Ready on Tab 1 →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SYNTHESIS_NODES.map((node) => {
                const done = state.synthesizedNodes.includes(node.id);
                const canSynth =
                  !done &&
                  state.romanceInsight >= node.costRomance &&
                  state.roboticsInsight >= node.costRobotics &&
                  state.cycles >= node.costCycles;

                return (
                  <div
                    key={node.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      done
                        ? 'border-[#34D399]/40 bg-[#34D399]/10'
                        : 'border-white/15 bg-white/[0.03]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[#ECEAE4] mb-1">{node.title}</div>
                      <div className="text-[11px] font-mono-tabular text-[#8E939E] mb-2">
                        {node.romanceInput} × {node.roboticsInput}
                      </div>
                      <p className="text-xs text-[#B8C0CC] leading-relaxed">{node.description}</p>
                    </div>

                    {done ? (
                      <div className="text-xs font-mono-tabular text-[#34D399] font-semibold">
                        SYNTHESIZED · READY
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!canSynth}
                        onClick={() => onSynthesizeNode(node)}
                        className="w-full py-2 px-3 rounded bg-white text-[#0B0D12] text-xs font-mono-tabular font-semibold hover:bg-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Fuse ({node.costRomance} Rom · {node.costRobotics} Rob · {node.costCycles}{' '}
                        Cyc)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Network & Compute Infrastructure Upgrades */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Cpu className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#ECEAE4]">
              Infrastructure &amp; Crawlers
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {MIND_UPGRADES.filter((u) => u.phaseRequired <= state.tab2Phase).map((u) => {
              const lv = state.mindUpgrades[u.id] || 0;
              const isMaxed = u.maxLevel > 0 && lv >= u.maxLevel;
              const cost = Math.round(u.costCycles * Math.pow(u.costMultiplier, lv));
              const canBuy = !isMaxed && state.cycles >= cost;

              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={isMaxed || !canBuy}
                  onClick={() => onBuyMindUpgrade(u, cost)}
                  className={`p-3.5 rounded-lg border text-left transition-all ${
                    isMaxed
                      ? 'border-white/10 bg-white/[0.02] opacity-60 cursor-default'
                      : canBuy
                      ? 'border-[#38BDF8]/35 bg-[#0C1824] hover:border-[#38BDF8] cursor-pointer'
                      : 'border-white/10 bg-white/[0.02] opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-[#ECEAE4]">
                    <span>{u.name}</span>
                    <span className="font-mono-tabular text-[#8E939E]">
                      {isMaxed ? 'MAX' : `Lv ${lv}`}
                    </span>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-1 mb-2 leading-relaxed">
                    {u.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular pt-2 border-t border-white/10">
                    <span className="text-[#38BDF8]">{u.effectLabel}</span>
                    {!isMaxed && <span className="text-[#ECEAE4]">{formatNumber(cost)} Cyc</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
