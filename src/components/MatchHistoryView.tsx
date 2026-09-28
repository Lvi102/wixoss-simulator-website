import React, { useState } from 'react';
import { MatchRecord } from '../types/history';
import { WixossColor } from '../types/wixoss';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  Trophy,
  Clock,
  Search,
  Filter,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Shield,
  RotateCcw,
  Swords,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  BarChart3,
  Flame,
  Award,
  PieChart as PieIcon,
} from 'lucide-react';

interface MatchHistoryViewProps {
  matchHistory: MatchRecord[];
  onClearHistory: () => void;
  onDeleteMatch: (id: string) => void;
  onSeedSampleHistory: () => void;
  onStartNewBattle: () => void;
}

export const MatchHistoryView: React.FC<MatchHistoryViewProps> = ({
  matchHistory = [],
  onClearHistory,
  onDeleteMatch,
  onSeedSampleHistory,
  onStartNewBattle,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModeFilter, setSelectedModeFilter] = useState<'all' | 'hotseat' | 'split' | 'solitaire_ai'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedMatchDetail, setSelectedMatchDetail] = useState<MatchRecord | null>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  // Helper to format duration in seconds into "mm:ss" or "Xm Ys"
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Helper to format ISO date string
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Filtered and sorted matches
  const filteredMatches = (matchHistory || [])
    .filter((match) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        match.player1.name.toLowerCase().includes(searchLower) ||
        match.player2.name.toLowerCase().includes(searchLower) ||
        match.player1.deckName.toLowerCase().includes(searchLower) ||
        match.player2.deckName.toLowerCase().includes(searchLower) ||
        match.winnerName.toLowerCase().includes(searchLower) ||
        (match.notes && match.notes.toLowerCase().includes(searchLower));

      // Game mode filter
      const matchesMode = selectedModeFilter === 'all' || match.gameMode === selectedModeFilter;

      return matchesSearch && matchesMode;
    })
    .sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

  // Calculate Performance Summary Metrics on filtered view
  const currentMatches = filteredMatches;
  const totalMatches = currentMatches.length;
  const p1Wins = currentMatches.filter((m) => m.winnerId === 1).length;
  const p2Wins = currentMatches.filter((m) => m.winnerId === 2).length;
  const winRateP1 = totalMatches > 0 ? Math.round((p1Wins / totalMatches) * 100) : 0;

  const totalDuration = currentMatches.reduce((acc, m) => acc + (m.durationSeconds || 0), 0);
  const avgDurationSeconds = totalMatches > 0 ? Math.round(totalDuration / totalMatches) : 0;

  // Calculate most frequently used deck
  const deckCounts: Record<string, { count: number; name: string; color: string }> = {};
  currentMatches.forEach((m) => {
    [m.player1, m.player2].forEach((p) => {
      if (p && p.deckName) {
        if (!deckCounts[p.deckName]) {
          deckCounts[p.deckName] = { count: 0, name: p.deckName, color: p.deckColor };
        }
        deckCounts[p.deckName].count++;
      }
    });
  });

  const mostUsedDeck = Object.values(deckCounts).sort((a, b) => b.count - a.count)[0];

  // Color configuration mapping
  const COLOR_CONFIG: Record<
    WixossColor,
    { name: string; hex: string; borderClass: string; textClass: string }
  > = {
    Red: { name: 'Red', hex: '#ef4444', borderClass: 'border-rose-500/40', textClass: 'text-rose-400' },
    Blue: { name: 'Blue', hex: '#3b82f6', borderClass: 'border-blue-500/40', textClass: 'text-blue-400' },
    Green: { name: 'Green', hex: '#22c55e', borderClass: 'border-emerald-500/40', textClass: 'text-emerald-400' },
    Black: { name: 'Black', hex: '#a855f7', borderClass: 'border-purple-500/40', textClass: 'text-purple-400' },
    White: { name: 'White', hex: '#f59e0b', borderClass: 'border-amber-500/40', textClass: 'text-amber-300' },
    Colorless: { name: 'Colorless', hex: '#94a3b8', borderClass: 'border-slate-500/40', textClass: 'text-slate-300' },
  };

  const ALL_COLORS: WixossColor[] = ['Red', 'Blue', 'Green', 'Black', 'White', 'Colorless'];

  // Aggregate stats per color over stored match history
  const colorStatsMap: Record<WixossColor, { wins: number; matches: number; losses: number }> = {
    Red: { wins: 0, matches: 0, losses: 0 },
    Blue: { wins: 0, matches: 0, losses: 0 },
    Green: { wins: 0, matches: 0, losses: 0 },
    Black: { wins: 0, matches: 0, losses: 0 },
    White: { wins: 0, matches: 0, losses: 0 },
    Colorless: { wins: 0, matches: 0, losses: 0 },
  };

  let totalRecordedWins = 0;

  (matchHistory || []).forEach((match) => {
    // Player 1
    const colorP1 = match.player1?.deckColor || 'Colorless';
    if (!colorStatsMap[colorP1]) colorStatsMap[colorP1] = { wins: 0, matches: 0, losses: 0 };
    colorStatsMap[colorP1].matches += 1;
    if (match.winnerId === 1) {
      colorStatsMap[colorP1].wins += 1;
      totalRecordedWins++;
    } else {
      colorStatsMap[colorP1].losses += 1;
    }

    // Player 2
    const colorP2 = match.player2?.deckColor || 'Colorless';
    if (!colorStatsMap[colorP2]) colorStatsMap[colorP2] = { wins: 0, matches: 0, losses: 0 };
    colorStatsMap[colorP2].matches += 1;
    if (match.winnerId === 2) {
      colorStatsMap[colorP2].wins += 1;
      totalRecordedWins++;
    } else {
      colorStatsMap[colorP2].losses += 1;
    }
  });

  const deckColorAnalyticsData = ALL_COLORS.map((color) => {
    const stats = colorStatsMap[color] || { wins: 0, matches: 0, losses: 0 };
    const winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
    const shareOfWins = totalRecordedWins > 0 ? Math.round((stats.wins / totalRecordedWins) * 100) : 0;

    return {
      color,
      name: `${color} Deck`,
      wins: stats.wins,
      losses: stats.losses,
      totalMatches: stats.matches,
      winRate, // 0 - 100 percentage
      shareOfWins, // 0 - 100 percentage
      fill: COLOR_CONFIG[color]?.hex || '#94a3b8',
    };
  });

  const activeColorData = deckColorAnalyticsData.filter((d) => d.totalMatches > 0);

  // Custom Recharts Tooltip
  const CustomChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-2xl text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-white">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
            <span>{data.color} Deck Performance</span>
          </div>
          <div className="text-zinc-300 font-mono">
            Win Rate: <span className="font-bold text-emerald-400">{data.winRate}%</span>
          </div>
          <div className="text-zinc-400 font-mono text-[11px]">
            Record: {data.wins} Wins / {data.losses} Losses ({data.totalMatches} matches)
          </div>
          <div className="text-zinc-400 font-mono text-[11px]">
            Share of Total Victories: <span className="text-amber-400 font-bold">{data.shareOfWins}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 p-6 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-950">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              Match History & Battle Analytics
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Review saved game results, match durations, win rates, and deck performances stored in local persistence.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {matchHistory.length > 0 && (
            <button
              onClick={() => setIsConfirmClearOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-rose-950 hover:text-rose-300 hover:border-rose-800 border border-zinc-700 text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear History
            </button>
          )}

          <button
            onClick={onStartNewBattle}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:brightness-110 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all"
          >
            <Swords className="h-3.5 w-3.5" /> Start New Match
          </button>
        </div>
      </div>

      {/* Summary Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Battles */}
        <div className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 flex items-center space-x-4 shadow">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <Swords className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Total Matches
            </span>
            <span className="text-2xl font-black text-white font-mono">{totalMatches}</span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              Recorded in local history
            </span>
          </div>
        </div>

        {/* Card 2: Avg Duration */}
        <div className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 flex items-center space-x-4 shadow">
          <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Avg Match Duration
            </span>
            <span className="text-2xl font-black text-sky-300 font-mono">
              {totalMatches > 0 ? formatDuration(avgDurationSeconds) : '--'}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5">Per battle session</span>
          </div>
        </div>

        {/* Card 4: Most Used Deck */}
        <div className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 flex items-center space-x-4 shadow">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Layers className="h-6 w-6" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Most Popular Deck
            </span>
            <span className="text-sm font-bold text-emerald-300 truncate block">
              {mostUsedDeck ? mostUsedDeck.name : 'N/A'}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-0.5 font-mono">
              {mostUsedDeck ? `${mostUsedDeck.count} match appearances` : 'No deck data'}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Deck Color Win-Rate Visualization */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-500/20 via-amber-500/20 to-purple-500/20 border border-rose-500/30 text-rose-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                Deck Color Win-Rate Visualization
              </h3>
              <p className="text-xs text-zinc-400">
                Win-rates (%) and total victory distribution across WIXOSS deck colors over stored history
              </p>
            </div>
          </div>

          {/* Toggle Bar / Pie */}
          <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                chartType === 'bar'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Win Rate (%)
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                chartType === 'pie'
                  ? 'bg-rose-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PieIcon className="h-3.5 w-3.5" /> Victory Ratio Share
            </button>
          </div>
        </div>

        {matchHistory.length === 0 ? (
          <div className="py-10 text-center space-y-3 bg-zinc-950/60 rounded-2xl border border-dashed border-zinc-800">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <BarChart3 className="h-6 w-6" />
            </div>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              No recorded match data to visualize. Complete battles or generate sample history data.
            </p>
            <button
              onClick={onSeedSampleHistory}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-amber-400 font-semibold border border-zinc-700 inline-flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> Populate Sample Data
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <BarChart
                    data={deckColorAnalyticsData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis
                      dataKey="color"
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      axisLine={{ stroke: '#3f3f46' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#a1a1aa', fontSize: 11 }}
                      domain={[0, 100]}
                      unit="%"
                      axisLine={{ stroke: '#3f3f46' }}
                      tickLine={false}
                    />
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="winRate" name="Win Rate (%)" radius={[6, 6, 0, 0]}>
                      {deckColorAnalyticsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={activeColorData.length > 0 ? activeColorData : deckColorAnalyticsData}
                      dataKey="wins"
                      nameKey="color"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {(activeColorData.length > 0 ? activeColorData : deckColorAnalyticsData).map(
                        (entry, index) => (
                          <Cell key={`cell-pie-${index}`} fill={entry.fill} stroke="#18181b" strokeWidth={2} />
                        )
                      )}
                    </Pie>
                    <RechartsTooltip content={<CustomChartTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => <span className="text-xs text-zinc-300">{value}</span>}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Color Breakdown Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {deckColorAnalyticsData.map((d) => {
                const cfg = COLOR_CONFIG[d.color];
                return (
                  <div
                    key={d.color}
                    className={`p-3.5 rounded-2xl bg-zinc-950 border ${cfg.borderClass} space-y-2 relative overflow-hidden`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${cfg.textClass} flex items-center gap-1.5`}>
                        <span
                          className="h-2.5 w-2.5 rounded-full inline-block shadow-sm"
                          style={{ backgroundColor: cfg.hex }}
                        />
                        {d.color}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">{d.totalMatches} matches</span>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-white font-mono">{d.winRate}%</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {d.wins}W - {d.losses}L
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${d.winRate}%`, backgroundColor: cfg.hex }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="bg-zinc-900/90 p-4 rounded-2xl border border-zinc-800 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by player name, deck name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Game Mode Filter */}
          <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <span className="text-[10px] text-zinc-500 font-bold uppercase px-2">Mode:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'hotseat', label: 'Hotseat' },
              { id: 'split', label: 'Split' },
              { id: 'solitaire_ai', label: 'Vs AI' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModeFilter(m.id as any)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selectedModeFilter === m.id
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Sort Order */}
          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-300 hover:text-white font-semibold flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Matches List */}
      {filteredMatches.length > 0 ? (
        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const isP1Winner = match.winnerId === 1;
            const modeColor =
              match.gameMode === 'solitaire_ai'
                ? 'bg-amber-950/60 text-amber-300 border-amber-800/50'
                : match.gameMode === 'split'
                ? 'bg-sky-950/60 text-sky-300 border-sky-800/50'
                : 'bg-rose-950/60 text-rose-300 border-rose-800/50';

            const modeLabel =
              match.gameMode === 'solitaire_ai'
                ? '🤖 Solo Vs AI'
                : match.gameMode === 'split'
                ? '🖥️ Split Screen'
                : '🎮 Hotseat P2P';

            return (
              <div
                key={match.id}
                className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 shadow-lg transition-all space-y-4 group"
              >
                {/* Match Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${modeColor} flex items-center gap-1`}
                    >
                      {modeLabel}
                    </span>

                    <span className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 text-[11px] font-mono">
                      {match.lifeBurstRule === 'standard' ? '🎯 Standard Burst' : 'Standard'}
                    </span>

                    <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      {formatDate(match.date)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono">
                    <span className="text-zinc-400 flex items-center gap-1 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                      <Clock className="h-3.5 w-3.5 text-sky-400" />
                      {formatDuration(match.durationSeconds)}
                    </span>

                    <span className="text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                      {match.turnsCount} Turn{match.turnsCount !== 1 ? 's' : ''}
                    </span>

                    <button
                      onClick={() => onDeleteMatch(match.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Match Record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Player Comparison Card Grid */}
                <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                  {/* Player 1 Details */}
                  <div
                    className={`md:col-span-5 p-4 rounded-xl border transition-all ${
                      isP1Winner
                        ? 'bg-gradient-to-r from-amber-950/40 to-rose-950/20 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow ${
                            isP1Winner ? 'bg-amber-500' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {isP1Winner ? <Trophy className="h-5 w-5 text-zinc-950" /> : 'P1'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white">
                              {match.player1.name}
                            </span>
                            {isP1Winner && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider">
                                Winner
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <Layers className="h-3 w-3 text-rose-400" />
                            <span>{match.player1.deckName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Life Cloth Remaining */}
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                          Life Cloth
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            match.player1.remainingLifeCloth > 0 ? 'text-rose-400' : 'text-zinc-500'
                          }`}
                        >
                          ❤️ {match.player1.remainingLifeCloth}/7
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* VS Indicator */}
                  <div className="md:col-span-1 flex items-center justify-center py-1 md:py-0">
                    <span className="h-8 w-8 rounded-full bg-zinc-950 border border-zinc-800 text-zinc-500 text-[10px] font-extrabold font-mono flex items-center justify-center">
                      VS
                    </span>
                  </div>

                  {/* Player 2 Details */}
                  <div
                    className={`md:col-span-5 p-4 rounded-xl border transition-all ${
                      !isP1Winner
                        ? 'bg-gradient-to-r from-amber-950/40 to-rose-950/20 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-white shadow ${
                            !isP1Winner ? 'bg-amber-500' : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {!isP1Winner ? <Trophy className="h-5 w-5 text-zinc-950" /> : 'P2'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-white">
                              {match.player2.name}
                            </span>
                            {!isP1Winner && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider">
                                Winner
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <Layers className="h-3 w-3 text-sky-400" />
                            <span>{match.player2.deckName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Life Cloth Remaining */}
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                          Life Cloth
                        </span>
                        <span
                          className={`text-sm font-bold ${
                            match.player2.remainingLifeCloth > 0 ? 'text-rose-400' : 'text-zinc-500'
                          }`}
                        >
                          ❤️ {match.player2.remainingLifeCloth}/7
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions & Notes Footer */}
                <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                  <span className="italic text-zinc-500 text-[11px] truncate">
                    {match.notes || `Match concluded on turn ${match.turnsCount} with victory for ${match.winnerName}.`}
                  </span>

                  <button
                    onClick={() => setSelectedMatchDetail(match)}
                    className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 hover:underline shrink-0"
                  >
                    <span>View Match Breakdown</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Zero State / Empty Matches View */
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center space-y-6 shadow-xl max-w-xl mx-auto my-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 shadow-inner">
            <Trophy className="h-8 w-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">No Match History Found</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              {searchTerm || selectedModeFilter !== 'all'
                ? 'No recorded matches fit your current filter criteria. Try adjusting search or filter options.'
                : 'You have not completed any WIXOSS battles yet. Complete a battle in the Battle Arena to start tracking your performance history.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onSeedSampleHistory}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="h-4 w-4 text-amber-400" /> Populate Sample Match History
            </button>

            <button
              onClick={onStartNewBattle}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:brightness-110 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all"
            >
              <Swords className="h-4 w-4" /> Launch Battle Arena
            </button>
          </div>
        </div>
      )}

      {/* MATCH BREAKDOWN MODAL */}
      {selectedMatchDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Match Breakdown & Stats</h3>
                  <p className="text-xs text-zinc-400">Detailed summary of match result and setup</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatchDetail(null)}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Winner Announcement Banner */}
            <div className="bg-gradient-to-r from-amber-500 via-rose-600 to-amber-500 p-4 rounded-2xl text-center text-white font-bold shadow-lg flex items-center justify-center gap-2">
              <Award className="h-5 w-5" />
              <span>VICTORY FOR {selectedMatchDetail.winnerName.toUpperCase()}!</span>
            </div>

            {/* Match Config Table */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">Game Mode</span>
                <span className="font-bold text-zinc-200 uppercase">{selectedMatchDetail.gameMode}</span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">Rule Format</span>
                <span className="font-bold text-amber-300">{selectedMatchDetail.lifeBurstRule}</span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">Match Duration</span>
                <span className="font-bold text-sky-300">{formatDuration(selectedMatchDetail.durationSeconds)}</span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase block">Total Turns</span>
                <span className="font-bold text-emerald-300">{selectedMatchDetail.turnsCount} Turns</span>
              </div>
            </div>

            {/* Players Breakdown */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Player Decks & Remaining Life Cloth
              </span>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white block">{selectedMatchDetail.player1.name}</span>
                  <span className="text-zinc-400 text-[11px]">{selectedMatchDetail.player1.deckName}</span>
                </div>
                <span className="font-mono text-rose-400 font-bold">
                  {selectedMatchDetail.player1.remainingLifeCloth}/7 Life Cloth
                </span>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-white block">{selectedMatchDetail.player2.name}</span>
                  <span className="text-zinc-400 text-[11px]">{selectedMatchDetail.player2.deckName}</span>
                </div>
                <span className="font-mono text-rose-400 font-bold">
                  {selectedMatchDetail.player2.remainingLifeCloth}/7 Life Cloth
                </span>
              </div>
            </div>

            {/* Timestamp */}
            <div className="text-right text-[10px] font-mono text-zinc-500">
              Match recorded on {formatDate(selectedMatchDetail.date)}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedMatchDetail(null)}
                className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAR ALL CONFIRMATION MODAL */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <Trash2 className="h-6 w-6" />
              <h3 className="font-bold text-base text-white">Clear All Match History?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete all saved match records? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClearHistory();
                  setIsConfirmClearOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold shadow"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
