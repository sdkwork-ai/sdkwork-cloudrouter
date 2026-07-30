import { useState, useMemo, useEffect, useRef } from 'react';
import { toCanvas } from 'html-to-image';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Trophy,
  Activity,
  MessageSquare,
  Image as ImageIcon,
  Music,
  Video,
  Search,
  ArrowUp,
  ArrowDown,
  Minus,
  Globe,
  LayoutGrid,
  BarChart3,
  Flame,
  Filter,
  Zap,
  CheckCircle2,
  Cpu,
  Unlock,
  Lock,
  ArrowRight,
  Sparkles,
  Play,
  Pause,
  Camera,
  AlertCircle,
  X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import type { CategoricalChartFunc } from 'recharts/types/chart/types';
import {
  DEFAULT_RANKING_SNAPSHOT_SOURCE,
  EMPTY_RANKING_CATALOG,
  EMPTY_RANKING_HISTORY,
  deriveVendorOptionsForRankings,
  deriveRankingViewModel,
  findRankingColor,
  formatRankingVolume,
  resolveActiveRankingWeekIndex,
  type RankingLicense,
  type RankingModality,
  type RankingVendorOption,
} from './rankingCatalog';
import { RankingService } from './rankingService';

type Modality = RankingModality;

const getModalityIcon = (modality: Modality) => {
  switch (modality) {
    case 'LLM': return <MessageSquare className="w-4 h-4" />;
    case 'Image': return <ImageIcon className="w-4 h-4" />;
    case 'Audio': return <Activity className="w-4 h-4" />;
    case 'Video': return <Video className="w-4 h-4" />;
    case 'Music': return <Music className="w-4 h-4" />;
    case 'Embedding': return <Cpu className="w-4 h-4" />;
    case 'Rerank': return <Activity className="w-4 h-4" />;
    default: return <LayoutGrid className="w-4 h-4" />;
  }
};

export function Rankings() {
  const { t } = useTranslation();
  const [rankingCatalog, setRankingCatalog] = useState(EMPTY_RANKING_CATALOG);
  const [rankingHistory, setRankingHistory] = useState(EMPTY_RANKING_HISTORY);
  const [rankingSnapshotSource, setRankingSnapshotSource] = useState(DEFAULT_RANKING_SNAPSHOT_SOURCE);
  const [rankingVendors, setRankingVendors] = useState<RankingVendorOption[]>([]);
  const [vendorLoadError, setVendorLoadError] = useState<string | null>(null);
  const [isRankingLoading, setIsRankingLoading] = useState(true);
  const [rankingLoadFailed, setRankingLoadFailed] = useState(false);
  const [rankingReloadVersion, setRankingReloadVersion] = useState(0);
  const [vendorReloadVersion, setVendorReloadVersion] = useState(0);
  const [activeModality, setActiveModality] = useState<Modality>('All');
  const [hoveredWeekIndex, setHoveredWeekIndex] = useState<number | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rankingSearchQuery, setRankingSearchQuery] = useState('');
  const [licenseFilter, setLicenseFilter] = useState<RankingLicense>('All');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const targetRef = useRef<HTMLDivElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);

  const activeWeekIndex = resolveActiveRankingWeekIndex({
    hoveredWeekIndex,
    selectedWeekIndex,
    historyLength: rankingHistory.length,
  });
  const vendorOptions = useMemo(
    () => deriveVendorOptionsForRankings(rankingCatalog, rankingVendors),
    [rankingCatalog, rankingVendors],
  );
  const selectedVendorCode = selectedVendor
    ? vendorOptions.vendorCodesByLabel[selectedVendor]
    : undefined;
  const rankingView = useMemo(
    () => deriveRankingViewModel({
      catalog: rankingCatalog,
      history: rankingHistory,
      filters: {
        modality: activeModality,
        vendor: selectedVendor,
        vendorCode: selectedVendorCode,
        license: licenseFilter,
        searchQuery,
      },
      activeWeekIndex,
      vendors: rankingVendors,
      vendorOptions,
    }),
    [activeModality, activeWeekIndex, licenseFilter, rankingCatalog, rankingHistory, rankingVendors, searchQuery, selectedVendor, selectedVendorCode, vendorOptions],
  );
  const {
    chartData,
    chartKeys,
    displayRankings,
    dynamicStats,
    modalityCounts,
    panelStats,
  } = rankingView;
  const { vendorModelCounts, vendors } = vendorOptions;
  const activeBackendModality = activeModality === 'All' ? undefined : activeModality.toLowerCase();
  const recordingErrorMessage = t('rankings.videoExportError');
  const modalityLabels: Record<Modality, string> = {
    All: t('rankings.allModalities'),
    LLM: t('rankings.modality.llm'),
    Image: t('rankings.modality.image'),
    Audio: t('rankings.modality.audio'),
    Video: t('rankings.modality.video'),
    Music: t('rankings.modality.music'),
    Embedding: t('rankings.modality.embedding'),
    Rerank: t('rankings.modality.rerank'),
  };
  const licenseLabels: Record<RankingLicense, string> = {
    All: t('rankings.allModels'),
    'Open Source': t('rankings.openSource'),
    Proprietary: t('rankings.proprietary'),
  };
  const activeLeaderboardModality = activeModality === 'All' ? t('rankings.global') : modalityLabels[activeModality];
  const displayedSourceLabel =
    rankingSnapshotSource.sourceLabel === DEFAULT_RANKING_SNAPSHOT_SOURCE.sourceLabel
      ? t('rankings.publishedBenchmark')
      : rankingSnapshotSource.sourceLabel;
  const overallRankMatch = dynamicStats.trendingRankDisplay.match(/^#(\d+) Overall$/u);
  const displayedTrendingName = dynamicStats.trendingName === 'N/A' ? t('rankings.notAvailable') : dynamicStats.trendingName;
  const displayedTrendingRank = overallRankMatch
    ? t('rankings.overallRank', { rank: overallRankMatch[1] })
    : dynamicStats.trendingRankDisplay === 'Trending'
      ? t('rankings.trending')
      : dynamicStats.trendingRankDisplay;

  const retryModelVendors = () => {
    setVendorReloadVersion((version) => version + 1);
  };

  const retryModelRankings = () => {
    setRankingReloadVersion((version) => version + 1);
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setRankingSearchQuery(searchQuery.trim());
    }, 300);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    setIsRankingLoading(true);
    setRankingLoadFailed(false);
    RankingService.fetchModelRankings({
      vendorCode: selectedVendorCode,
      modality: activeBackendModality,
      searchQuery: rankingSearchQuery,
      pageSize: 200,
    })
      .then((snapshot) => {
        if (cancelled) {
          return;
        }
        setRankingCatalog(snapshot.catalog);
        setRankingHistory(snapshot.history);
        setRankingSnapshotSource(snapshot.source);
        setHoveredWeekIndex(null);
        setSelectedWeekIndex(null);
        setIsRankingLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setRankingLoadFailed(true);
        setIsRankingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBackendModality, rankingReloadVersion, rankingSearchQuery, selectedVendorCode]);

  useEffect(() => {
    let cancelled = false;
    setVendorLoadError(null);
    RankingService.fetchModelVendors()
      .then((vendors) => {
        if (cancelled) {
          return;
        }
        setRankingVendors(vendors);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setVendorLoadError(t('rankings.vendorLoadError'));
      });
    return () => {
      cancelled = true;
    };
  }, [t, vendorReloadVersion]);

  useEffect(() => {
    let interval: number | undefined;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setSelectedWeekIndex(prev => {
          const currentIndex = prev !== null ? prev : rankingHistory.length - 1;
          const next = currentIndex + 1;
          if (next >= rankingHistory.length) {
            setIsPlaying(false);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
               mediaRecorderRef.current.stop();
               mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            return rankingHistory.length - 1;
          }
          return next;
        });
      }, isRecording ? 800 : 300);
    }
    return () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
      }
    };
  }, [isPlaying, isRecording, rankingHistory.length]);

  useEffect(() => {
    let captureInterval: number | undefined;
    let isCapturing = false;
    if (isRecording && targetRef.current && captureCanvasRef.current) {
      const ctx = captureCanvasRef.current.getContext('2d');
      const target = targetRef.current;
      captureInterval = window.setInterval(async () => {
         if (isCapturing) return;
         isCapturing = true;
         try {
           await new Promise(resolve => requestAnimationFrame(resolve));
           const filter = (node: HTMLElement) => {
             return !(node instanceof HTMLElement && node.hasAttribute('data-html2capture-ignore'));
           };
           const frame = await toCanvas(target, { backgroundColor: '#050505', pixelRatio: 2, filter });
           if (ctx && captureCanvasRef.current) {
             ctx.clearRect(0, 0, captureCanvasRef.current.width, captureCanvasRef.current.height);
             ctx.drawImage(frame, 0, 0);
           }
         } catch {
           setRecordingError(recordingErrorMessage);
         } finally {
           isCapturing = false;
         }
      }, 100);
    }
    return () => {
      if (captureInterval !== undefined) {
        window.clearInterval(captureInterval);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    setRecordingError(null);
    if (!targetRef.current) {
      setRecordingError(recordingErrorMessage);
      return;
    }
    try {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder is not available in this browser.');
      }

      // Use pixelRatio matching our toCanvas generator logic above
      const pixelRatio = 2;
      const width = targetRef.current.offsetWidth;
      const height = targetRef.current.offsetHeight;

      const canvas = document.createElement('canvas');
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      captureCanvasRef.current = canvas;

      // Capture 30 fps if available
      const stream = canvas.captureStream(30);

      // Explicitly set high bit rate (16 Mbps) for better text rendering
      let options: MediaRecorderOptions = { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 16000000 };
      if (typeof MediaRecorder !== 'undefined' && options.mimeType && !MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm', videoBitsPerSecond: 16000000 };
      }

      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = "claw-router-rankings.webm";
        a.click();
        window.URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // chunk every 1 second
      setIsRecording(true);

      // Auto-start timelapse from beginning
      setTimeout(() => {
        setSelectedWeekIndex(0);
        setIsPlaying(true);
      }, 500);

    } catch {
      setRecordingError(recordingErrorMessage);
      setIsRecording(false);
      setIsPlaying(false);
    }
  };

  const containerAnimation: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemAnimation: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const handleChartMouseMove: CategoricalChartFunc = (state) => {
    if (state && state.isTooltipActive && typeof state.activeTooltipIndex === 'number') {
      setHoveredWeekIndex(state.activeTooltipIndex);
    }
  };

  const handleChartClick: CategoricalChartFunc = (state) => {
    if (state && state.isTooltipActive && typeof state.activeTooltipIndex === 'number') {
      setSelectedWeekIndex(state.activeTooltipIndex);
    }
  };

  return (
    <div className="theme-aware-dark-surface min-h-screen bg-slate-50 dark:bg-[#050505] text-slate-700 dark:text-slate-300 pt-20 flex flex-col relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute left-[20%] top-[-10%] z-0 h-[500px] w-[500px] rounded-full bg-indigo-600/[0.04] blur-[120px] pointer-events-none" />
      <div className="absolute right-[10%] top-[40%] z-0 h-[400px] w-[400px] rounded-full bg-amber-600/[0.03] blur-[100px] pointer-events-none" />

      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 flex flex-col lg:flex-row gap-8 relative z-10">

        {/* Left Sidebar */}
        <motion.aside variants={itemAnimation} initial="hidden" animate="show" className="w-full lg:w-64 shrink-0 flex flex-col gap-8">
          <div className="sticky top-24 flex flex-col gap-8">

            <div className="hidden lg:block">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-white rounded-full text-xs font-bold tracking-wider mb-4">
                <Trophy className="w-3 h-3 text-amber-400" />
                {t('rankings.badge')}
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                {t('rankings.title')}
              </h1>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                {t('rankings.subtitle')}
              </p>
            </div>

            {/* Modalities List */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3 mb-1 flex items-center gap-2">
                <LayoutGrid className="w-3 h-3" /> {t('rankings.categories')}
              </h3>
              {(['All', 'LLM', 'Image', 'Video', 'Audio', 'Music', 'Embedding', 'Rerank'] as Modality[]).map(modality => {
                const isActive = activeModality === modality;
                const count = modalityCounts[modality];
                return (
                  <button
                    key={modality}
                    onClick={() => setActiveModality(modality)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-white' : 'opacity-70'}>
                        {getModalityIcon(modality)}
                      </span>
                      {modalityLabels[modality]}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'}`}>
                         {count}
                       </span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Market Insights / License Filter */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-3 mb-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-indigo-400" /> {t('rankings.modelAccess')}
                </h3>
              </div>
              <div className="flex flex-col gap-1">
                {(['All', 'Open Source', 'Proprietary'] as const).map(license => {
                  const isActive = licenseFilter === license;
                  return (
                    <button
                      key={license}
                      onClick={() => setLicenseFilter(license)}
                      className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors group ${
                        isActive
                          ? 'text-white font-semibold bg-indigo-500/10 text-indigo-300'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {license === 'Open Source' ? <Unlock className="w-3.5 h-3.5" /> :
                         license === 'Proprietary' ? <Lock className="w-3.5 h-3.5" /> : null}
                        <span>{licenseLabels[license]}</span>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Vendors Filter */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-3 mb-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Filter className="w-3 h-3" /> {t('rankings.modelVendors')}
                </h3>
                {selectedVendor && (
                  <button onClick={() => setSelectedVendor(null)} className="text-[10px] text-slate-400 hover:text-white transition-colors uppercase font-bold">
                    {t('rankings.clear')}
                  </button>
                )}
              </div>
              {vendorLoadError && (
                <div className="mx-3 flex items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                  <span className="truncate">{vendorLoadError}</span>
                  <button
                    type="button"
                    onClick={retryModelVendors}
                    className="shrink-0 font-bold uppercase text-amber-100 hover:text-white"
                  >
                    {t('rankings.retry')}
                  </button>
                </div>
              )}
              <div className="flex flex-col gap-0.5 border-y border-white/5 py-2">
                {vendors.map(vendor => (
                  <button
                    key={vendor}
                    onClick={() => setSelectedVendor(vendor)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors text-left group ${
                      selectedVendor === vendor
                        ? 'text-white font-semibold bg-white/10'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 font-medium'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                      selectedVendor === vendor
                        ? 'bg-white border-white text-black'
                        : 'border-white/20 bg-transparent group-hover:border-white/40'
                    }`}>
                      {selectedVendor === vendor && <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5 stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 7.5 5.5 10 11 3.5"></polyline></svg>}
                    </div>
                    <span className="truncate flex-1">{vendor}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">{vendorModelCounts[vendor]}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </motion.aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col gap-10 relative">
          <div ref={targetRef} className="flex flex-col gap-10 relative rounded-2xl bg-[#050505]">
            {/* Watermark for Video Export */}
            <div className={`absolute bottom-6 right-6 z-[100] pointer-events-none transition-all duration-700 flex items-center gap-2 ${isPlaying || isRecording ? 'opacity-80 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}>
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-black font-mono tracking-wider text-xl drop-shadow-md">Claw Router</span>
            </div>

            {/* Top Level Stats */}
          <motion.div variants={containerAnimation} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={itemAnimation} className="bg-[#111] shadow-lg border border-white/5 rounded-2xl p-5 flex flex-col hover:border-white/10 transition-colors relative overflow-hidden">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5" /> {t('rankings.benchmarkIndex')}
              </span>
              <div className="text-3xl font-black font-mono text-white mt-1">{formatRankingVolume(dynamicStats.totalVol)}</div>
              <div className="text-emerald-500 text-xs font-bold mt-2 flex items-center gap-1">
                {t('rankings.publishedBenchmark')}
              </div>
            </motion.div>

            <motion.div variants={itemAnimation} className="bg-[#111] shadow-lg border border-white/5 rounded-2xl p-5 flex flex-col hover:border-white/10 transition-colors relative overflow-hidden">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                <Unlock className="w-3.5 h-3.5" /> {t('rankings.openSourceShare')}
              </span>
              <div className="text-3xl font-black font-mono text-white mt-1">
                {dynamicStats.ossShare}%
              </div>
              <div className="text-slate-500 text-xs font-medium mt-2">
                {t('rankings.byBenchmarkIndex')}
              </div>
            </motion.div>

            <motion.div variants={itemAnimation} className="bg-[#111] shadow-lg border border-white/5 rounded-2xl p-5 flex flex-col hover:border-white/10 transition-colors relative overflow-hidden">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> {t('rankings.avgLatency')}
              </span>
              <div className="text-3xl font-black font-mono text-white mt-1">{dynamicStats.avgLatency}<span className="text-sm text-slate-500 tracking-normal ml-1">ms</span></div>
              <div className="text-emerald-500 text-xs font-bold mt-2 flex items-center gap-1">
                {t('rankings.weightedByBenchmark')}
              </div>
            </motion.div>

            <motion.div variants={itemAnimation} className="bg-gradient-to-br from-[#111] to-[#1a1a1a] border border-white/10 rounded-2xl p-5 flex flex-col relative overflow-hidden group hover:border-amber-500/30 transition-colors shadow-lg">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity duration-500 transform group-hover:scale-110">
                 <Flame className="w-16 h-16 text-amber-500" />
              </div>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2 relative z-10">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> {t('rankings.topMover')}
              </span>
              <div className="text-xl font-bold text-white mt-1 relative z-10 truncate">
                {displayedTrendingName}
              </div>
              <div className="text-amber-500 text-xs font-bold mt-3 inline-flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded w-fit relative z-10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <ArrowUp className="w-3 h-3" /> {displayedTrendingRank}
              </div>
            </motion.div>
          </motion.div>

          {/* Chart Section */}
          <div className="flex flex-col gap-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-slate-400" />
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {isPlaying ? (
                      <span className="text-amber-400 flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                        </span>
                        {t('rankings.timelapsePlaying')}
                      </span>
                    ) : (
                      <>
                        {t('rankings.snapshotBenchmark')}
                        <span className="relative flex h-2.5 w-2.5 ml-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      </>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t('rankings.sourceObserved', { source: displayedSourceLabel, observedAt: rankingSnapshotSource.observedAt })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3" data-html2capture-ignore="true">
                 <button
                   onClick={() => {
                     if (isPlaying) {
                       setIsPlaying(false);
                     } else {
                       if (selectedWeekIndex === rankingHistory.length - 1 || selectedWeekIndex === null) {
                         setSelectedWeekIndex(0);
                       }
                       setIsPlaying(true);
                     }
                   }}
                   className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isPlaying ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-[0_0_15px_rgba(99,102,241,0.4)]'}`}
                 >
                   {isPlaying ? (
                     <><Pause className="w-4 h-4 fill-current" /> {t('rankings.pauseRace')}</>
                   ) : (
                     <><Play className="w-4 h-4 fill-current" /> {t('rankings.playTimelapse')}</>
                   )}
                 </button>
                 {!isPlaying && !isRecording && (
                   <button
                     onClick={startRecording}
                     className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
                   >
                     <Camera className="w-4 h-4" /> {t('rankings.exportVideo')}
                   </button>
                 )}
                 {isRecording && (
                   <button
                     onClick={() => {
                        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                           mediaRecorderRef.current.stop();
                           mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                        }
                        setIsRecording(false);
                        setIsPlaying(false);
                     }}
                     className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-500/20 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:bg-red-500/30 transition-colors"
                   >
                     <span className="relative flex h-2.5 w-2.5 mr-1">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                     </span>
                     {t('rankings.stopRecording')}
                  </button>
                 )}
              </div>
            </div>

            {recordingError && (
              <div
                role="alert"
                data-html2capture-ignore="true"
                className="flex items-start justify-between gap-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.08)]"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <div>
                    <div className="font-semibold text-red-100">{t('rankings.videoExportUnavailable')}</div>
                    <div className="mt-0.5 text-red-200/80">{recordingError}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRecordingError(null)}
                  className="rounded-lg p-1 text-red-200/70 transition-colors hover:bg-red-500/20 hover:text-red-100"
                  aria-label={t('rankings.dismissVideoExportError')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col xl:flex-row items-start gap-8">

              {/* Chart Area */}
              <div className="flex-1 w-full h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    stackOffset="none"
                    margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                    barCategoryGap="10%"
                    onMouseMove={handleChartMouseMove}
                    onMouseLeave={() => setHoveredWeekIndex(null)}
                    onClick={handleChartClick}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-aware-chart-grid)" opacity={1} />
                    <XAxis
                      dataKey="name"
                      axisLine={{ stroke: '#334155', opacity: 0.5 }}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      dy={10}
                      tickFormatter={(val, i) => i % 6 === 0 ? val : ''}
                    />
                    <YAxis
                      tickFormatter={(value) => formatRankingVolume(value)}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      dx={-10}
                    />
                    <RechartsTooltip cursor={{ fill: 'var(--theme-aware-tooltip-cursor)', opacity: 1 }} content={() => null} />

                    {chartKeys.map(key => (
                      <Bar
                        key={key}
                        dataKey={key}
                        stackId="a"
                        fill={findRankingColor(key, displayRankings)}
                        isAnimationActive={false}
                        stroke="var(--theme-aware-surface)"
                        strokeWidth={1}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Right Interactive Legend Panel inside Chart Area */}
              <div className="w-full xl:w-80 shrink-0 flex flex-col gap-3">
                <div className="bg-[#111] shadow-md text-slate-300 border border-white/5 text-sm font-bold px-4 py-1.5 rounded-full inline-flex self-start transition-opacity shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                  {panelStats.date}
                </div>

                <div className="bg-[#0a0a0a] shadow-lg shadow-black/40 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                  <div className="flex flex-col p-2 max-h-[350px] overflow-y-auto custom-scrollbar">
                    <AnimatePresence>
                      {panelStats.models.map((model) => (
                        <motion.div
                          key={model.name}
                          layout
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-colors group cursor-default"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: model.color }} />
                            <span className={`text-[13px] truncate ${model.isOthers ? 'text-slate-500' : 'text-slate-200 font-medium group-hover:text-white transition-colors'}`}>
                              {model.name}
                            </span>
                          </div>
                          <span className="text-[13px] font-mono text-slate-300 shrink-0 pl-3">
                            {formatRankingVolume(model.value)}
                          </span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <div className="border-t border-white/10 p-4 flex items-center justify-between bg-[#111]">
                    <span className="text-sm text-slate-400 font-medium">{t('rankings.totalBenchmark')}</span>
                    <span className="text-base font-black font-mono text-white tracking-tight">{formatRankingVolume(panelStats.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="h-px w-full bg-white/5 my-4" />

          {/* Detailed Leaderboard List */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col flex-wrap sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Activity className="w-6 h-6 text-emerald-500" />
                {t('rankings.leaderboardTitle', { modality: activeLeaderboardModality })}
              </h2>

              <div className="relative w-full sm:w-64 max-w-xs">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  maxLength={200}
                  placeholder={t('rankings.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-white/10 rounded-xl bg-[#111] text-sm focus:outline-none focus:ring-1 focus:ring-white/30 text-white placeholder:text-slate-500 transition-shadow"
                />
              </div>
            </div>

            {rankingLoadFailed && displayRankings.length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <span>{t('rankings.loadErrorDescription')}</span>
                <button
                  type="button"
                  onClick={retryModelRankings}
                  className="shrink-0 font-bold uppercase text-amber-100 hover:text-white"
                >
                  {t('rankings.retry')}
                </button>
              </div>
            )}

            {/* Rich Table Container */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-white/10 bg-white/5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <div className="col-span-1 text-center">{t('rankings.table.rank')}</div>
                <div className="col-span-4">{t('rankings.table.modelProvider')}</div>
                <div className="col-span-2 text-right">{t('rankings.table.benchmark')}</div>
                <div className="col-span-2 text-center">{t('rankings.table.contextSpeed')}</div>
                <div className="col-span-3 text-right">{t('rankings.table.performancePrice')}</div>
              </div>

              <div className="flex flex-col divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {displayRankings.length === 0 ? (
                    <div className="p-16 text-center flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        {rankingLoadFailed ? (
                          <AlertCircle className="w-8 h-8 text-amber-400" />
                        ) : isRankingLoading ? (
                          <Activity className="w-8 h-8 text-slate-500 animate-pulse" />
                        ) : (
                          <Search className="w-8 h-8 text-slate-600" />
                        )}
                      </div>
                      <h3 className="text-white font-bold text-lg">
                        {rankingLoadFailed
                          ? t('rankings.loadErrorTitle')
                          : isRankingLoading
                            ? t('rankings.loadingTitle')
                            : t('rankings.emptyTitle')}
                      </h3>
                      <p className="text-slate-500 text-sm mt-1">
                        {rankingLoadFailed
                          ? t('rankings.loadErrorDescription')
                          : isRankingLoading
                            ? t('rankings.loadingDescription')
                            : t('rankings.emptyDescription')}
                      </p>
                      {rankingLoadFailed && (
                        <button
                          type="button"
                          onClick={retryModelRankings}
                          className="mt-4 font-bold uppercase text-sm text-amber-200 hover:text-white"
                        >
                          {t('rankings.retry')}
                        </button>
                      )}
                    </div>
                  ) : (
                    displayRankings.map((model) => {
                      const rankChange = model.calculatedPrevRank - model.displayRank;
                      const bgGlow = model.displayRank === 1 ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-l-2 border-l-amber-500' :
                                     model.displayRank === 2 ? 'bg-gradient-to-r from-slate-300/10 to-transparent border-l-2 border-l-slate-300' :
                                     model.displayRank === 3 ? 'bg-gradient-to-r from-orange-400/10 to-transparent border-l-2 border-l-orange-400' : 'border-l-2 border-l-transparent hover:bg-white/[0.02]';

                      return (
                        <motion.div
                          key={model.id}
                          layout
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className={`flex flex-col md:grid md:grid-cols-12 gap-4 items-center px-4 md:px-6 py-5 transition-colors group relative ${bgGlow}`}
                        >
                          {/* CTA Action */}
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300 z-10 hidden md:block">
                            <button className="bg-white text-[#050505] px-4 py-1.5 rounded-full text-xs font-bold hover:bg-slate-200 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                              {t('rankings.deploy')} <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Rank */}
                          <div className="col-span-1 flex flex-col items-center justify-center w-full md:w-auto shrink-0 mb-2 md:mb-0 relative py-1">
                            {model.displayRank === 1 && (
                              <Trophy className="absolute -top-3 w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                            )}
                            <span className={`text-2xl font-black font-mono ${
                              model.displayRank === 1 ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]' :
                              model.displayRank === 2 ? 'text-slate-300' :
                              model.displayRank === 3 ? 'text-orange-400' : 'text-slate-500'
                            }`}>
                              {model.displayRank}
                            </span>
                            {model.displayRank > 3 && (
                              <div className="flex items-center text-[10px] font-bold mt-1">
                                {rankChange > 0 && <span className="text-emerald-500 flex items-center"><ArrowUp className="w-3 h-3" /> {rankChange}</span>}
                                {rankChange < 0 && <span className="text-red-500 flex items-center"><ArrowDown className="w-3 h-3" /> {Math.abs(rankChange)}</span>}
                                {rankChange === 0 && <span className="text-slate-600"><Minus className="w-3 h-3" /></span>}
                              </div>
                            )}
                          </div>

                          {/* Model Info */}
                          <div className="col-span-4 flex items-center gap-4 w-full min-w-0">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10 bg-[#111] text-white">
                                {getModalityIcon(model.modality)}
                            </div>
                            <div className="flex flex-col truncate w-full">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-200 text-base truncate group-hover:text-white transition-colors">
                                  {model.name}
                                </h3>
                                {model.isNew && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-widest shrink-0 hidden sm:block">
                                    {t('rankings.new')}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                                <span className="flex items-center gap-1.5"><Globe className="w-3 h-3" /> {model.vendor}</span>
                                {model.license && (
                                  <>
                                    <span className="text-slate-600">/</span>
                                    <span className="flex items-center gap-1">
                                      {model.license === 'Open Source' ? <Unlock className="w-3 h-3 text-indigo-400" /> : <Lock className="w-3 h-3 text-slate-400" />}
                                      <span className={model.license === 'Open Source' ? 'text-indigo-400' : 'text-slate-400'}>{licenseLabels[model.license]}</span>
                                    </span>
                                  </>
                                )}
                              </div>
                              {model.strengths && model.strengths.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 mt-2 hidden lg:flex">
                                  {model.strengths.map(s => (
                                     <div key={s} className="text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r from-white/10 to-white/5 border border-white/10 px-2 py-0.5 rounded-full text-slate-300 shrink-0">
                                       {s}
                                     </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Benchmark */}
                          <div className="col-span-2 flex flex-col items-center md:items-end w-full gap-1.5 mt-4 md:mt-0">
                            <span className="text-slate-200 text-sm font-bold font-mono">
                               {formatRankingVolume(model.currentVolume)}
                            </span>
                            <div className="h-1 w-24 bg-[#111] rounded-full overflow-hidden hidden md:block">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${(model.currentVolume / Math.max(1, displayRankings[0]?.currentVolume || 1)) * 100}%`,
                                  backgroundColor: model.color
                                }}
                              />
                            </div>
                          </div>

                          {/* Context & Speed */}
                          <div className="col-span-2 flex flex-row md:flex-col items-center justify-center gap-4 md:gap-1.5 w-full mt-2 md:mt-0 text-sm border-y border-white/5 py-3 md:py-0 md:border-0">
                            {model.contextSize ? (
                              <span className="text-slate-300 font-semibold bg-[#1a1a1a] border border-white/5 px-2 py-0.5 rounded text-xs flex items-center gap-1.5 hover:bg-white/5 transition-colors cursor-default">
                                <Cpu className="w-3 h-3 text-slate-500" />
                                {t('rankings.contextValue', { value: model.contextSize })}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-xs">-</span>
                            )}
                            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                              <Zap className="w-3 h-3 text-amber-500/70" /> {model.latency}ms
                            </span>
                          </div>

                          {/* Performance & Price */}
                          <div className="col-span-3 flex flex-row md:flex-col items-center justify-between md:items-end w-full mt-2 md:mt-0 text-sm">
                            <div className="flex flex-col items-end gap-1.5 w-full">
                              {model.winRate ? (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {t('rankings.winRate', { value: model.winRate })}
                                </div>
                              ) : (
                                <div className="text-xs text-slate-600 hidden md:block">{t('rankings.naBenchmark')}</div>
                              )}

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-0.5" title={t('rankings.costIndicator')}>
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} className={`text-[11px] font-black tracking-tight ${
                                      i < model.costIndicator
                                        ? 'text-indigo-400 drop-shadow-[0_0_2px_rgba(129,140,248,0.5)]'
                                        : 'text-slate-700/50'
                                    }`}>$</span>
                                  ))}
                                </div>
                                {model.pricing && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-slate-700 hidden md:block" />
                                    <span className="text-[10px] text-slate-400 font-mono tracking-tight hidden md:block bg-[#111] px-1.5 rounded">
                                      {model.pricing}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
