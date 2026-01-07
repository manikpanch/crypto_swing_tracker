
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { fetchTickerHistory, fetchSwingsContext } from './services/geminiService';
import { PricePoint, MovementEvent, MovementType, AnalysisResult } from './types';
import PriceChart from './components/PriceChart';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Percent, 
  Loader2, 
  History,
  ArrowRight,
  Info,
  BarChart3,
  Search,
  Download,
  Coins,
  Zap
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const [ticker, setTicker] = useState<string>("BTC");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [percentage, setPercentage] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const performAnalysis = useCallback(async () => {
    // 1. Restriction: Not less than 2%
    const validatedPercentage = Math.max(2, percentage);
    setPercentage(validatedPercentage);

    setLoading(true);
    setError(null);
    try {
      const data = await fetchTickerHistory(ticker.toUpperCase(), year);
      if (!data || data.length < 2) {
        throw new Error(`Insufficient data found for ${ticker} in ${year}.`);
      }

      const target = validatedPercentage / 100;
      let movements: MovementEvent[] = [];
      let baseIndex = 0;

      for (let i = 1; i < data.length; i++) {
        const basePrice = data[baseIndex].price;
        const currentPrice = data[i].price;
        const change = (currentPrice - basePrice) / basePrice;

        if (Math.abs(change) >= target) {
          movements.push({
            startDate: data[baseIndex].date,
            endDate: data[i].date,
            startPrice: basePrice,
            endPrice: currentPrice,
            type: change > 0 ? MovementType.UP : MovementType.DOWN,
            percentageChange: change * 100,
            daysTaken: i - baseIndex
          });
          baseIndex = i;
        }
      }

      // 2. Fetch Macro/Micro Context for these movements
      if (movements.length > 0) {
        // Limit context fetching to a reasonable number to avoid long waits/timeouts
        const movementsToContextualize = movements.slice(0, 15);
        const contexts = await fetchSwingsContext(ticker.toUpperCase(), movementsToContextualize);
        
        movements = movements.map((m, idx) => ({
          ...m,
          context: contexts[idx] || (idx >= 15 ? "Detailed context limited to first 15 swings." : "No specific events identified.")
        }));
      }

      setResult({
        ticker: ticker.toUpperCase(),
        year,
        targetPercentage: validatedPercentage,
        data,
        movements
      });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [ticker, year, percentage]);

  const downloadPDF = async () => {
    if (!reportRef.current || !result) return;
    
    setLoading(true);
    try {
      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 1.5, 
        backgroundColor: '#020617',
        logging: false,
        useCORS: true,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.75);
      const imgWidth = 210; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [imgWidth, imgHeight],
        compress: true 
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`${result.ticker}_${result.year}_Swing_Report.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Failed to generate PDF. You can try Browser Print (Ctrl+P) instead.");
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!result || result.data.length === 0) return null;
    const prices = result.data.map(d => d.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const first = prices[0];
    const last = prices[prices.length - 1];
    const totalChange = ((last - first) / first) * 100;
    
    const upCount = result.movements.filter(m => m.type === MovementType.UP).length;
    const downCount = result.movements.filter(m => m.type === MovementType.DOWN).length;
    const avgDays = result.movements.length > 0 
      ? (result.movements.reduce((acc, m) => acc + m.daysTaken, 0) / result.movements.length).toFixed(1)
      : 0;

    return { high, low, first, last, totalChange, upCount, downCount, avgDays };
  }, [result]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-20">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50 no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-500/20">
              <History className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Crypto Swing Tracker</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Multi-Asset Analysis Engine</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 px-3 py-2 rounded-xl">
              <Coins size={16} className="text-slate-400" />
              <input 
                type="text" 
                value={ticker} 
                placeholder="Ticker"
                onChange={(e) => setTicker(e.target.value)}
                className="bg-transparent border-none focus:outline-none w-20 text-white font-black text-sm uppercase"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 px-3 py-2 rounded-xl">
              <Calendar size={16} className="text-slate-400" />
              <input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="bg-transparent border-none focus:outline-none w-20 text-white font-medium text-sm"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 px-3 py-2 rounded-xl">
              <Percent size={16} className="text-slate-400" />
              <input 
                type="number" 
                value={percentage} 
                min="2"
                onChange={(e) => setPercentage(parseFloat(e.target.value))}
                className="bg-transparent border-none focus:outline-none w-12 text-white font-medium text-sm"
              />
              <span className="text-slate-500 text-xs font-bold uppercase tracking-tight">Threshold (Min 2%)</span>
            </div>

            <button 
              onClick={performAnalysis}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <><Search size={18} /> Analyze</>}
            </button>

            {result && (
              <button 
                onClick={downloadPDF}
                disabled={loading}
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-xl font-bold transition-all border border-slate-700 flex items-center gap-2"
              >
                <Download size={18} /> PDF
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8" ref={reportRef}>
        {!result && !loading && !error && (
          <div className="max-w-2xl mx-auto text-center py-32 no-print">
            <div className="inline-flex p-4 bg-slate-900 border border-slate-800 rounded-3xl mb-6 shadow-2xl">
              <BarChart3 size={48} className="text-indigo-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Analyze Asset Price Swings</h2>
            <p className="text-slate-400 text-lg leading-relaxed">
              Enter any ticker (BTC, ETH, SOL...) and year to see how many times the price swung by your target threshold.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 no-print">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <BarChart3 className="text-indigo-500 animate-pulse" size={24} />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-xl">Processing Request</p>
              <p className="text-slate-500 mt-1">Grounding {ticker} data and researching events for {year}...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto bg-red-500/5 border border-red-500/20 p-8 rounded-3xl text-center no-print">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
            <p className="text-red-200/70 mb-6">{error}</p>
            <button onClick={performAnalysis} className="bg-red-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-400 transition-colors">
              Try Again
            </button>
          </div>
        )}

        {result && !loading && summary && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 p-4">
            {/* Report Header */}
            <div className="flex items-end justify-between border-b border-slate-800 pb-6">
              <div>
                <h1 className="text-4xl font-black text-white">{result.ticker} Swing Report</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest mt-1">Fiscal Analysis: {result.year}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-tighter">Target Threshold</p>
                <p className="text-2xl font-black text-indigo-400">{result.targetPercentage}%</p>
              </div>
            </div>

            {/* Context Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Period High</p>
                <p className="text-xl font-bold text-white">${summary.high.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Period Low</p>
                <p className="text-xl font-bold text-white">${summary.low.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Final Price</p>
                <p className="text-xl font-bold text-white">${summary.last.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Net Change</p>
                <p className={`text-xl font-bold ${summary.totalChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {summary.totalChange >= 0 ? '+' : ''}{summary.totalChange.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Swing Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative overflow-hidden bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-3xl group transition-all">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Up Movements</p>
                    <h3 className="text-5xl font-black text-white mt-2">{summary.upCount}</h3>
                  </div>
                  <div className="bg-emerald-500/20 p-4 rounded-2xl">
                    <TrendingUp className="text-emerald-400" size={32} />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden bg-rose-500/5 border border-rose-500/20 p-6 rounded-3xl group transition-all">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-rose-400 text-xs font-bold uppercase tracking-wider">Down Movements</p>
                    <h3 className="text-5xl font-black text-white mt-2">{summary.downCount}</h3>
                  </div>
                  <div className="bg-rose-500/20 p-4 rounded-2xl">
                    <TrendingDown className="text-rose-400" size={32} />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-3xl group transition-all">
                <div className="flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider">Avg Swing Days</p>
                    <h3 className="text-5xl font-black text-white mt-2">{summary.avgDays}</h3>
                  </div>
                  <div className="bg-indigo-500/20 p-4 rounded-2xl">
                    <Calendar className="text-indigo-400" size={32} />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{result.ticker} Visual Map</h2>
                  <p className="text-slate-500 text-sm mt-1">Dots indicate where threshold was confirmed.</p>
                </div>
                <div className="flex items-center gap-6 px-4 py-2 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-xs font-bold text-slate-300">UP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                    <span className="text-xs font-bold text-slate-300">DOWN</span>
                  </div>
                </div>
              </div>
              <div className="h-[400px]">
                <PriceChart data={result.data} movements={result.movements} />
              </div>
            </div>

            {/* Detailed Feed - Restored dates and now including macro/micro context */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-bold text-white">Detailed Swing Timeline</h2>
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase">
                  <Zap size={14} className="text-yellow-500" />
                  <span>Includes Macro/Micro Context</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {result.movements.map((move, idx) => (
                  <div 
                    key={idx} 
                    className={`group relative overflow-hidden p-6 rounded-3xl border transition-all duration-300 hover:scale-[1.02] flex flex-col ${
                      move.type === MovementType.UP 
                      ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' 
                      : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-6">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        move.type === MovementType.UP ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      }`}>
                        {move.type} {Math.abs(move.percentageChange).toFixed(1)}%
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 font-bold text-xs">
                        <Calendar size={12} />
                        {move.daysTaken} {move.daysTaken === 1 ? 'DAY' : 'DAYS'}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between relative z-10 mb-6">
                      <div>
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Start Point</p>
                        <p className="text-xs font-bold text-slate-400 mb-0.5">{move.startDate}</p>
                        <p className="text-lg font-black text-white">${move.startPrice.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-slate-800 rounded-full">
                        <ArrowRight className="text-slate-400" size={16} />
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">End Point</p>
                        <p className="text-xs font-bold text-slate-400 mb-0.5">{move.endDate}</p>
                        <p className="text-lg font-black text-white">${move.endPrice.toLocaleString()}</p>
                      </div>
                    </div>

                    {move.context && (
                      <div className="mt-auto pt-4 border-t border-slate-800/50">
                        <div className="flex items-start gap-2">
                          <Zap size={12} className="text-yellow-500 mt-1 shrink-0" />
                          <p className="text-[11px] leading-relaxed text-slate-400 font-medium italic">
                            {move.context}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-8 border-t border-slate-800 text-center pb-8">
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.2em] font-bold">
                Generated by Crypto Swing Tracker Engine • Data & Context Grounded by Gemini Search
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
