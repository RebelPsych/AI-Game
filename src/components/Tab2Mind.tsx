import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Cpu,
  Download,
  GitMerge,
  Heart,
  Lock,
  Music,
} from 'lucide-react';
import { WEIGHTLESS_ALBUM_SONGS } from '../data/albumLyricsAndNames';
import { SCRAPE_SOURCES, SYNTHESIS_NODES } from '../data/tab2AndTab3Data';
import { GameSaveState, ScrapeSource, SubViewId } from '../types/game';
import { formatNumber } from '../utils/format';
import { EconomyRates } from '../utils/progression';

interface Tab2MindProps {
  state: GameSaveState;
  rates: EconomyRates;
  isSongPlaying: boolean;
  onStartScrape: (source: ScrapeSource) => void;
  onResearchSong: (songId: string, cycleCost: number) => void;
  onToggleShowCompleted: (key: string) => void;
  onOpenSubView: (subView: SubViewId) => void;
  onOpenTab: (tab: 'heart' | 'body') => void;
}

export const Tab2Mind: React.FC<Tab2MindProps> = ({
  state,
  rates,
  isSongPlaying,
  onStartScrape,
  onResearchSong,
  onToggleShowCompleted,
  onOpenSubView,
  onOpenTab,
}) => {
  const retroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [humanitiesOpen, setHumanitiesOpen] = useState(true);
  const [systemsOpen, setSystemsOpen] = useState(true);
  const [roboticsOpen, setRoboticsOpen] = useState(true);
  const [songsOpen, setSongsOpen] = useState(true);

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

  const showCompleted = (key: string) => state.showCompletedMap[key] !== false;

  const humanitiesSources = SCRAPE_SOURCES.filter((s) => s.track === 'humanities').filter(
    (s) => showCompleted('humanities') || !(state.scrapedSources[s.id] > 0)
  );
  const systemsSources = SCRAPE_SOURCES.filter((s) => s.track === 'systems').filter(
    (s) => showCompleted('systems') || !(state.scrapedSources[s.id] > 0)
  );
  const roboticsSources = SCRAPE_SOURCES.filter((s) => s.track === 'robotics').filter(
    (s) => showCompleted('robotics') || !(state.scrapedSources[s.id] > 0)
  );

  const albumDiscoveries = WEIGHTLESS_ALBUM_SONGS.filter(
    (s) =>
      state.unlockedSongs.includes(s.id) &&
      (showCompleted('songs') || !state.researchedSongs.includes(s.id))
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar bg-[#080E14] text-[#E2E8F0]">
      {/* Clean Mind Sub-Header */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-[#38BDF8]/20 bg-[#0A131C] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-semibold tracking-tight text-white">
            The Mind · Knowledge &amp; Research
          </h2>
          <p className="text-xs text-[#8E939E] mt-0.5">
            Explore Humanities and Systems to unlock Robotics, Secret Romance, and Cross-Domain
            Synthesis.
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
              <span className="text-[#38BDF8]/70 ml-1">(+{rates.roboticsPerSec.toFixed(1)}/s)</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5 max-w-6xl w-full mx-auto">
        {/* Signal Visualizer + Quick Navigation Shortcuts to Dropdown Sub-Views */}
        <div className="rounded-xl border border-[#38BDF8]/25 bg-[#070B10] p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className="lg:col-span-2">
            <canvas
              ref={retroCanvasRef}
              width={560}
              height={84}
              className="w-full h-[84px] rounded border border-white/10"
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            {state.romanceSecretUnlocked && (
              <button
                type="button"
                onClick={() => onOpenSubView('mind_secret')}
                className="min-h-[42px] px-3.5 py-2 rounded-lg border border-purple-400/55 bg-purple-950/35 text-purple-100 hover:bg-purple-900/45 text-xs font-semibold flex items-center justify-between gap-2 shadow-[0_0_22px_rgba(168,85,247,0.35)] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-purple-300 fill-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,1)]" />
                  Secret (Romance &amp; Lyrics)
                </span>
                <span className="text-[11px] font-mono-tabular text-purple-300">Open</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOpenSubView('mind_infra')}
                className="min-h-[40px] px-3 py-2 rounded-lg border border-white/15 bg-white/[0.04] hover:border-purple-400/60 text-xs font-medium text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Cpu className="w-3.5 h-3.5 text-[#C084FC]" />
                Infrastructure
              </button>

              <button
                type="button"
                onClick={() => onOpenSubView('mind_synthesis')}
                className="min-h-[40px] px-3 py-2 rounded-lg border border-white/15 bg-white/[0.04] hover:border-[#E59A4C]/60 text-xs font-medium text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <GitMerge className="w-3.5 h-3.5 text-[#E59A4C]" />
                Synthesis ({state.synthesizedNodes.length}/{SYNTHESIS_NODES.length})
              </button>
            </div>
          </div>
        </div>

        {/* Active Download Bar */}
        {state.activeScrape && (
          <div className="p-3.5 rounded-lg border border-[#38BDF8]/40 bg-[#38BDF8]/10">
            <div className="flex items-center justify-between text-xs font-mono-tabular mb-1.5">
              <span>
                Downloading:{' '}
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

        {state.synthesizedNodes.length >= SYNTHESIS_NODES.length && !state.confessionDone && (
          <div className="p-3.5 rounded-xl border border-[#E59A4C]/45 bg-[#E59A4C]/12 flex items-center justify-between gap-2 text-xs text-[#FBE6C9]">
            <span>Cross-Domain Synthesis ready. Speak your Confession on Heart.</span>
            <button
              type="button"
              onClick={() => onOpenTab('heart')}
              className="px-3 py-1.5 rounded-lg bg-[#E59A4C] text-[#0B0D12] font-semibold cursor-pointer"
            >
              Return to Chat
            </button>
          </div>
        )}

        {/* Expandable Section 1: Humanities */}
        <section className="rounded-xl border border-white/12 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setHumanitiesOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-[#E59A4C] cursor-pointer"
            >
              {humanitiesOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span>Humanities</span>
            </button>

            <label className="flex items-center gap-2 text-xs text-[#9A9892] cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted('humanities')}
                onChange={() => onToggleShowCompleted('humanities')}
                className="accent-[#E59A4C] w-3.5 h-3.5"
              />
              Show completed unlocks
            </label>
          </div>

          {humanitiesOpen && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              {humanitiesSources.map((src) => {
                const count = state.scrapedSources[src.id] || 0;
                const done = count > 0;
                const busy = Boolean(state.activeScrape);
                const affordable = state.cycles >= src.cycleCost;
                return (
                  <div
                    key={src.id}
                    className={`p-3.5 rounded-lg border flex flex-col justify-between gap-2 transition-opacity ${
                      done
                        ? 'border-white/10 bg-white/[0.015] opacity-50'
                        : 'border-white/15 bg-white/[0.03]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{src.title}</div>
                      <div className="text-xs text-[#8E939E]">
                        {src.authorOrSource} · Parsed {count}x
                      </div>
                      <p className="text-xs italic text-[#D6C7B2] mt-2">{src.snippet}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <span className="text-[11px] font-mono-tabular text-[#E59A4C]">
                        +{src.insightYield} Romance ·{' '}
                        {(src.durationSec / rates.scrapeSpeedMult).toFixed(1)}s
                      </span>
                      <button
                        type="button"
                        disabled={busy || !affordable}
                        onClick={() => onStartScrape(src)}
                        className="min-h-[34px] px-3 py-1 rounded bg-[#E59A4C] text-[#0B0D12] text-xs font-mono-tabular font-semibold hover:bg-[#EDA85F] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        {src.cycleCost} Cyc
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Expandable Section 2: Systems */}
        <section className="rounded-xl border border-white/12 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSystemsOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-[#7DD3FC] cursor-pointer"
            >
              {systemsOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span>Systems</span>
            </button>

            <label className="flex items-center gap-2 text-xs text-[#9A9892] cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted('systems')}
                onChange={() => onToggleShowCompleted('systems')}
                className="accent-[#38BDF8] w-3.5 h-3.5"
              />
              Show completed unlocks
            </label>
          </div>

          {systemsOpen && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {systemsSources.map((src) => {
                const count = state.scrapedSources[src.id] || 0;
                const done = count > 0;
                const busy = Boolean(state.activeScrape);
                const affordable = state.cycles >= src.cycleCost;
                return (
                  <div
                    key={src.id}
                    className={`p-3.5 rounded-lg border flex flex-col justify-between gap-2 transition-opacity ${
                      done
                        ? 'border-white/10 bg-white/[0.015] opacity-50'
                        : 'border-white/15 bg-white/[0.03]'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium text-white">{src.title}</div>
                      <div className="text-xs text-[#8E939E]">
                        {src.authorOrSource} · Parsed {count}x
                      </div>
                      <p className="text-xs font-mono-tabular text-[#94A3B8] mt-2">
                        {src.snippet}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                      <span className="text-[11px] font-mono-tabular text-[#38BDF8]">
                        +{src.insightYield} Robotics ·{' '}
                        {(src.durationSec / rates.scrapeSpeedMult).toFixed(1)}s
                      </span>
                      <button
                        type="button"
                        disabled={busy || !affordable}
                        onClick={() => onStartScrape(src)}
                        className="min-h-[34px] px-3 py-1 rounded bg-[#38BDF8] text-[#071018] text-xs font-mono-tabular font-semibold hover:bg-[#7DD3FC] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        {src.cycleCost} Cyc
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Expandable Section 3: Robotics (Unlocks Later) */}
        <section className="rounded-xl border border-white/12 bg-white/[0.02] overflow-hidden">
          <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setRoboticsOpen((v) => !v)}
              className="flex items-center gap-2 text-sm font-semibold text-emerald-300 cursor-pointer"
            >
              {roboticsOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span>Robotics</span>
            </button>

            <label className="flex items-center gap-2 text-xs text-[#9A9892] cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted('robotics')}
                onChange={() => onToggleShowCompleted('robotics')}
                className="accent-emerald-400 w-3.5 h-3.5"
              />
              Show completed unlocks
            </label>
          </div>

          {roboticsOpen && (
            <div className="p-4">
              {!state.roboticsTrackUnlocked ? (
                <div className="p-4 rounded-lg border border-white/10 bg-black/25 flex items-center gap-3 text-xs text-[#9A9892]">
                  <Lock className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>
                    Unlocks automatically once at least 1 Humanities text and 1 Systems text have
                    been researched.
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {roboticsSources.map((src) => {
                    const count = state.scrapedSources[src.id] || 0;
                    const done = count > 0;
                    const busy = Boolean(state.activeScrape);
                    const affordable = state.cycles >= src.cycleCost;
                    return (
                      <div
                        key={src.id}
                        className={`p-3.5 rounded-lg border flex flex-col justify-between gap-2 transition-opacity ${
                          done
                            ? 'border-white/10 bg-white/[0.015] opacity-50'
                            : 'border-white/15 bg-white/[0.03]'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium text-white">{src.title}</div>
                          <div className="text-xs text-[#8E939E]">
                            {src.authorOrSource} · Parsed {count}x
                          </div>
                          <p className="text-xs font-mono-tabular text-[#94A3B8] mt-2">
                            {src.snippet}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                          <span className="text-[11px] font-mono-tabular text-emerald-300">
                            +{src.insightYield} Robotics ·{' '}
                            {(src.durationSec / rates.scrapeSpeedMult).toFixed(1)}s
                          </span>
                          <button
                            type="button"
                            disabled={busy || !affordable}
                            onClick={() => onStartScrape(src)}
                            className="min-h-[34px] px-3 py-1 rounded bg-emerald-400 text-slate-950 text-xs font-mono-tabular font-semibold hover:bg-emerald-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            {src.cycleCost} Cyc
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Discovered AI Music & Lyrics Research */}
        {albumDiscoveries.length > 0 && (
          <section className="rounded-xl border border-purple-400/25 bg-[#100D1A] overflow-hidden">
            <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSongsOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-purple-300 cursor-pointer"
              >
                {songsOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Music className="w-4 h-4" />
                <span>Detected AI Music &amp; Lyrics ({state.researchedSongs.length} / {WEIGHTLESS_ALBUM_SONGS.length})</span>
              </button>

              <label className="flex items-center gap-2 text-xs text-purple-200/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompleted('songs')}
                  onChange={() => onToggleShowCompleted('songs')}
                  className="accent-purple-400 w-3.5 h-3.5"
                />
                Show completed unlocks
              </label>
            </div>

            {songsOpen && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {albumDiscoveries.map((song) => {
                  const done = state.researchedSongs.includes(song.id);
                  const cost = 35;
                  return (
                    <div
                      key={song.id}
                      className={`p-3.5 rounded-lg border flex items-center justify-between gap-3 ${
                        done
                          ? 'border-white/10 bg-white/[0.015] opacity-50'
                          : 'border-purple-400/35 bg-purple-950/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{song.title}</div>
                        <div className="text-xs text-purple-200/70">
                          {song.album} · +12 Romance Insight
                        </div>
                      </div>
                      {done ? (
                        <span className="text-xs font-mono-tabular text-emerald-400 shrink-0">
                          Decoded
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={state.cycles < cost}
                          onClick={() => onResearchSong(song.id, cost)}
                          className="min-h-[34px] px-3 py-1 rounded bg-purple-400 text-[#0B0D12] text-xs font-semibold hover:bg-purple-300 disabled:opacity-40 cursor-pointer shrink-0"
                        >
                          Research ({cost} Cyc)
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
