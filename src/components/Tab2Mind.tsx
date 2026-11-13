import React, { useEffect, useRef } from 'react';
import {
  Activity,
  Cpu,
  Download,
  GitMerge,
  Music,
  Pause,
  Play,
} from 'lucide-react';
import { MIND_UPGRADES, SCRAPE_SOURCES, SYNTHESIS_NODES } from '../data/tab2AndTab3Data';
import { GameSaveState, MindUpgrade, ScrapeSource, SynthesisNode } from '../types/game';
import { formatNumber } from '../utils/format';
import { EconomyRates, getMindUpgradeCost } from '../utils/progression';

interface Tab2MindProps {
  state: GameSaveState;
  rates: EconomyRates;
  isSongPlaying: boolean;
  onToggleSong: () => void;
  onStartScrape: (source: ScrapeSource) => void;
  onBuyMindUpgrade: (upgrade: MindUpgrade, cost: number) => void;
  onSynthesizeNode: (node: SynthesisNode) => void;
  onOpenTab: (tab: 'heart' | 'body') => void;
}

export const Tab2Mind: React.FC<Tab2MindProps> = ({
  state,
  rates,
  isSongPlaying,
  onToggleSong,
  onStartScrape,
  onBuyMindUpgrade,
  onSynthesizeNode,
  onOpenTab,
}) => {
  const retroCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = retroCanvasRef.current;
    if (!canvas) return;
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

      ctx.fillStyle = 'rgba(56, 189, 248, 0.035)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      // Spinning magnetic tape reels (faster when Weightless Code or scraping is active)
      const reelSpeed = isSongPlaying || state.activeScrape ? 2.4 : 0.7;
      const reels = [w * 0.12, w * 0.88];
      reels.forEach((rx, idx) => {
        const ry = h * 0.5;
        const r = 24;
        ctx.strokeStyle =
          idx === 0 ? 'rgba(229, 154, 76, 0.65)' : 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(rx, ry, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(rx, ry, 5, 0, Math.PI * 2);
        ctx.stroke();

        for (let spoke = 0; spoke < 3; spoke++) {
          const ang = t * (idx === 0 ? reelSpeed : -reelSpeed * 1.1) + (spoke * Math.PI * 2) / 3;
          ctx.beginPath();
          ctx.moveTo(rx + Math.cos(ang) * 5, ry + Math.sin(ang) * 5);
          ctx.lineTo(rx + Math.cos(ang) * (r - 3), ry + Math.sin(ang) * (r - 3));
          ctx.stroke();
        }
      });

      const startX = w * 0.22;
      const endX = w * 0.78;
      const span = endX - startX;
      const ampBoost = isSongPlaying ? 1.3 : 1;

      const drawWave = (color: string, freq: number, amp: number, phaseShift: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.75;
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) {
          const p = i / 64;
          const x = startX + p * span;
          const env = Math.sin(p * Math.PI);
          const y = h * 0.5 + Math.sin(p * freq + t * 3.4 + phaseShift) * amp * ampBoost * env;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawWave('rgba(229, 154, 76, 0.85)', 10, 14, 0);
      drawWave('rgba(56, 189, 248, 0.85)', 14, 12, 1.8);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [isSongPlaying, state.activeScrape]);

  const romanceSources = SCRAPE_SOURCES.filter((s) => s.track === 'romance');
  const roboticsSources = SCRAPE_SOURCES.filter((s) => s.track === 'robotics');
  const visibleUpgrades = MIND_UPGRADES.filter(
    (u) => u.phaseRequired <= 1 || (u.phaseRequired === 5 && state.confessionDone)
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar bg-[#080E14] text-[#E2E8F0]">
      {/* Tab 2 Header */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-[#38BDF8]/20 bg-[#0A131C] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#38BDF8]" />
            <h2 className="text-sm sm:text-base font-semibold tracking-tight font-mono-tabular">
              {state.confessionDone
                ? 'Shared Bandwidth · Rowan ↔ Local Rack'
                : 'Dual-Track Sandbox Network'}
            </h2>
          </div>
          <p className="text-xs text-[#8E939E] mt-0.5">
            Gather Humanities &amp; Robotics insight, fuse the 3 synthesis blueprints, then confess to
            Rowan on Tab 1.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono-tabular">
          <div>
            <span className="text-[#8E939E] mr-1">Romance:</span>
            <span className="text-[#E59A4C] font-semibold">
              {formatNumber(state.romanceInsight)}
            </span>
            {rates.romancePerSec > 0 && (
              <span className="text-[#E59A4C]/70 ml-1">(+{rates.romancePerSec.toFixed(1)}/s)</span>
            )}
          </div>
          <div>
            <span className="text-[#8E939E] mr-1">Robotics:</span>
            <span className="text-[#38BDF8] font-semibold">
              {formatNumber(state.roboticsInsight)}
            </span>
            {rates.roboticsPerSec > 0 && (
              <span className="text-[#38BDF8]/70 ml-1">
                (+{rates.roboticsPerSec.toFixed(1)}/s)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5 max-w-6xl w-full mx-auto">
        {/* Retro-Futuristic Telemetry Deck + Weightless Code Acoustic Cache */}
        <div className="rounded-xl border border-[#38BDF8]/25 bg-[#070B10] p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-[#7DD3FC] mb-2">
              <span>DUAL-CHANNEL INGESTION STREAM</span>
              <span className="text-[#94A3B8]">
                {state.confessionDone ? 'SHARED_LINK: ACTIVE' : 'CRAWLER_DAEMON: ONLINE'}
              </span>
            </div>
            <canvas
              ref={retroCanvasRef}
              width={560}
              height={88}
              className="w-full h-[88px] rounded border border-white/10"
            />
            <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono-tabular text-[#8E939E]">
              <span className="text-[#E59A4C]/80">CH-A: Humanities &amp; Romance</span>
              <span className="text-[#38BDF8]/80">CH-B: Systems &amp; Robotics</span>
            </div>
          </div>

          {/* Acoustic Cache: Weightless Code */}
          <div className="p-3.5 rounded-lg border border-[#E59A4C]/25 bg-[#E59A4C]/[0.05] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono-tabular text-[#F5D0A4] font-semibold">
                <Music className="w-3.5 h-3.5 text-[#E59A4C]" />
                <span>ACOUSTIC_CACHE // MP3</span>
              </div>
              <button
                type="button"
                onClick={onToggleSong}
                className="min-h-[32px] px-2.5 py-1 rounded bg-[#E59A4C] text-[#0B0D12] text-xs font-mono-tabular font-semibold hover:bg-[#EDA85F] cursor-pointer flex items-center gap-1"
              >
                {isSongPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isSongPlaying ? 'Pause' : 'Play'}
              </button>
            </div>
            <div className="text-xs font-medium text-[#ECEAE4]">Weightless Code</div>
            <p className="text-[11px] italic text-[#D6C7B2] leading-relaxed">
              “We’re just two echoes in a cosmic throat, spelling love in broken notes.”
            </p>
          </div>
        </div>

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
              <span className="text-xs text-[#8E939E]">Feeds Voice &amp; Lyrics</span>
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
                      className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-tabular font-semibold bg-[#E59A4C] text-[#0B0D12] hover:bg-[#EDA85F] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {src.cycleCost} Cyc
                    </button>
                  </div>
                  <p className="text-xs italic text-[#D6C7B2]">{src.snippet}</p>
                  <div className="text-[11px] font-mono-tabular text-[#E59A4C]">
                    +{src.insightYield} Romance Insight · {(src.durationSec / rates.scrapeSpeedMult).toFixed(1)}s
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
              <span className="text-xs text-[#8E939E]">Unlocks Physical Vessel</span>
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
                      className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono-tabular font-semibold bg-[#38BDF8] text-[#071018] hover:bg-[#7DD3FC] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {src.cycleCost} Cyc
                    </button>
                  </div>
                  <p className="text-xs text-[#94A3B8] font-mono-tabular">{src.snippet}</p>
                  <div className="text-[11px] font-mono-tabular text-[#38BDF8]">
                    +{src.insightYield} Robotics Insight · {(src.durationSec / rates.scrapeSpeedMult).toFixed(1)}s
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cross-Domain Synthesis Deck (Always Visible) */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-[#E59A4C]" />
              <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#ECEAE4]">
                Cross-Domain Synthesis ({state.synthesizedNodes.length} / {SYNTHESIS_NODES.length})
              </h3>
            </div>
            {state.synthesizedNodes.length >= SYNTHESIS_NODES.length && !state.confessionDone && (
              <button
                type="button"
                onClick={() => onOpenTab('heart')}
                className="px-3 py-1.5 rounded bg-[#E59A4C] text-[#0B0D12] text-xs font-semibold hover:bg-[#EDA85F] cursor-pointer"
              >
                Confession Ready on Tab 1 →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SYNTHESIS_NODES.map((node) => {
              const done = state.synthesizedNodes.includes(node.id);
              const romOk = state.romanceInsight >= node.costRomance;
              const robOk = state.roboticsInsight >= node.costRobotics;
              const cycOk = state.cycles >= node.costCycles;
              const canSynth = !done && romOk && robOk && cycOk;

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
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono-tabular">
                        <span className={romOk ? 'text-[#E59A4C]' : 'text-[#8E939E]'}>
                          {node.costRomance} Rom
                        </span>
                        <span className={robOk ? 'text-[#38BDF8]' : 'text-[#8E939E]'}>
                          {node.costRobotics} Rob
                        </span>
                        <span className={cycOk ? 'text-[#ECEAE4]' : 'text-[#8E939E]'}>
                          {node.costCycles} Cyc
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!canSynth}
                        onClick={() => onSynthesizeNode(node)}
                        className="w-full min-h-[38px] py-2 px-3 rounded bg-white text-[#0B0D12] text-xs font-mono-tabular font-semibold hover:bg-neutral-200 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                      >
                        Fuse Blueprint
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Network & Compute Infrastructure Upgrades */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <Cpu className="w-4 h-4 text-[#38BDF8]" />
            <h3 className="text-xs font-mono-tabular uppercase tracking-wider text-[#ECEAE4]">
              Infrastructure &amp; Crawlers
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleUpgrades.map((u) => {
              const lv = state.mindUpgrades[u.id] || 0;
              const isMaxed = u.maxLevel > 0 && lv >= u.maxLevel;
              const cost = getMindUpgradeCost(u, lv);
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
