import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Bar, ErrorBar, Cell, Line 
} from 'recharts';
import { 
  BarChart2, TrendingUp, Loader2, RefreshCw, PenTool, 
  Activity, Layers, Trash2, Sliders, Eraser 
} from 'lucide-react';
import { fetchHistoricalCandles, CandleData } from '../services/marketService';
import { Drawing, DrawingType, Point } from '../types';
import { useMarketData } from '../hooks/useMarketData';

export type Timeframe = '1m' | '1h' | '1d' | '1w' | '1mo';
export type ChartType = 'LINE' | 'CANDLE';

interface MarketChartProps {
    symbol: string;
}

const MarketChart: React.FC<MarketChartProps> = React.memo(({ symbol }) => {
    const [timeframe, setTimeframe] = useState<Timeframe>('1h');
    const [chartType, setChartType] = useState<ChartType>('CANDLE');
    const [data, setData] = useState<CandleData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(false);

    // Consume real-time price updates
    const marketData = useMarketData(symbol);

    // Indicator States
    const [showSMA, setShowSMA] = useState(false);
    const [showEMA, setShowEMA] = useState(false);
    const [showBollinger, setShowBollinger] = useState(false);

    // Drawing States
    const [activeTool, setActiveTool] = useState<DrawingType>('NONE');
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [currentDrawing, setCurrentDrawing] = useState<Partial<Drawing> | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const loadData = async () => {
        setIsLoading(true);
        setError(false);
        try {
            const candles = await fetchHistoricalCandles(symbol, timeframe);
            if (candles.length > 0) {
                setData(candles);
            } else {
                setError(true);
            }
        } catch (err) {
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 60000); // Polling backup
        return () => clearInterval(interval);
    }, [symbol, timeframe]);

    // Merge real-time price into the last candle
    const liveData = useMemo(() => {
        if (data.length === 0) return [];
        const updatedData = [...data];
        
        // Only update if we have a valid price and it corresponds to the current symbol
        // (Hook handles switching, so marketData should be relevant)
        if (marketData.price > 0) {
            const lastCandle = updatedData[updatedData.length - 1];
            // Simple logic: update close price. In a real app, we'd check if time crossed interval boundary.
            const updatedCandle = {
                ...lastCandle,
                close: marketData.price,
                high: Math.max(lastCandle.high, marketData.price),
                low: Math.min(lastCandle.low, marketData.price),
                // time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            };
            updatedData[updatedData.length - 1] = updatedCandle;
        }
        return updatedData;
    }, [data, marketData.price]);

    // Calculate Indicators on liveData
    const chartData = useMemo(() => {
        if (liveData.length === 0) return [];
        
        let calculatedData = [...liveData];

        // SMA 20
        if (showSMA) {
            calculatedData = calculatedData.map((item, index, arr) => {
                if (index < 19) return item;
                const slice = arr.slice(index - 19, index + 1);
                const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
                return { ...item, sma: sum / 20 };
            });
        }

        // EMA 20
        if (showEMA) {
            const k = 2 / (20 + 1);
            let ema = calculatedData[0].close;
            calculatedData = calculatedData.map((item, index) => {
                if (index === 0) return { ...item, ema };
                ema = item.close * k + ema * (1 - k);
                return { ...item, ema };
            });
        }

        // Bollinger Bands (20, 2)
        if (showBollinger) {
             calculatedData = calculatedData.map((item, index, arr) => {
                if (index < 19) return item;
                const slice = arr.slice(index - 19, index + 1);
                const mean = slice.reduce((acc, curr) => acc + curr.close, 0) / 20;
                const variance = slice.reduce((acc, curr) => acc + Math.pow(curr.close - mean, 2), 0) / 20;
                const stdDev = Math.sqrt(variance);
                return { 
                    ...item, 
                    bbUpper: mean + (2 * stdDev),
                    bbLower: mean - (2 * stdDev)
                };
            });
        }

        return calculatedData;
    }, [liveData, showSMA, showEMA, showBollinger]);

    // Drawing Logic
    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (activeTool === 'NONE' || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (!currentDrawing) {
            // Start drawing
            setCurrentDrawing({
                type: activeTool,
                start: { x, y },
                end: { x, y } // Initialize end same as start
            });
        } else {
            // Finish drawing
            const newDrawing: Drawing = {
                id: Date.now().toString(),
                type: activeTool,
                start: currentDrawing.start!,
                end: { x, y },
                color: '#F59E0B'
            };
            setDrawings([...drawings, newDrawing]);
            setCurrentDrawing(null);
            setActiveTool('NONE'); // Reset tool after drawing
        }
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!currentDrawing || !svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCurrentDrawing({
            ...currentDrawing,
            end: { x, y }
        });
    };

    const isPositive = liveData.length > 0 && liveData[liveData.length - 1].close >= liveData[0].close;
    const lineColor = isPositive ? '#10B981' : '#EF4444';

    return (
        <div className="w-full h-full flex flex-col bg-[#0B0E14] rounded-lg overflow-hidden relative">
            {isLoading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Loader2 className="animate-spin text-primary" size={32} />
                </div>
            )}
            
            {/* Chart Toolbar */}
            <div className="flex flex-wrap items-center justify-between p-2 border-b border-white/5 gap-2 bg-[#151A25]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 border border-indigo-500/30">
                            {symbol[0]}
                        </div>
                        <span className="font-bold text-gray-200 text-sm tracking-wide">{symbol}/USDT</span>
                    </div>
                    
                    {/* Timeframe Selector */}
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 overflow-x-auto scrollbar-hide max-w-[200px] md:max-w-none">
                        {(['1m', '1h', '1d', '1w', '1mo'] as Timeframe[]).map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all whitespace-nowrap ${
                                    timeframe === tf 
                                    ? 'bg-gray-700 text-white shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Indicators Dropdown */}
                    <div className="relative group z-30">
                        <button className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1">
                            <Sliders size={14} /> <span className="text-[10px]">Ind</span>
                        </button>
                        <div className="absolute top-full right-0 mt-1 w-40 bg-[#1E232F] border border-card-border rounded-lg shadow-xl p-2 hidden group-hover:block">
                            <label className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer">
                                <input type="checkbox" checked={showSMA} onChange={() => setShowSMA(!showSMA)} />
                                <span className="text-xs text-gray-300">SMA (20)</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer">
                                <input type="checkbox" checked={showEMA} onChange={() => setShowEMA(!showEMA)} />
                                <span className="text-xs text-gray-300">EMA (20)</span>
                            </label>
                            <label className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer">
                                <input type="checkbox" checked={showBollinger} onChange={() => setShowBollinger(!showBollinger)} />
                                <span className="text-xs text-gray-300">Bollinger Bands</span>
                            </label>
                        </div>
                    </div>

                    <div className="w-[1px] h-4 bg-gray-700 mx-1"></div>

                    {/* Tools */}
                    <button 
                        onClick={() => setActiveTool(activeTool === 'TRENDLINE' ? 'NONE' : 'TRENDLINE')}
                        className={`p-1.5 rounded-md transition-colors ${activeTool === 'TRENDLINE' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Draw Trendline"
                    >
                        <TrendingUp size={14} />
                    </button>
                    <button 
                        onClick={() => setActiveTool(activeTool === 'FIBONACCI' ? 'NONE' : 'FIBONACCI')}
                        className={`p-1.5 rounded-md transition-colors ${activeTool === 'FIBONACCI' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Fibonacci Retracement"
                    >
                        <Layers size={14} />
                    </button>
                    <button 
                        onClick={() => setDrawings([])}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-400 transition-colors"
                        title="Clear Drawings"
                    >
                        <Trash2 size={14} />
                    </button>

                    <div className="w-[1px] h-4 bg-gray-700 mx-1"></div>

                    {/* Chart Type Toggle */}
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                        <button 
                            onClick={() => setChartType('LINE')}
                            className={`p-1.5 rounded-md transition-colors ${chartType === 'LINE' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Line Chart"
                        >
                            <Activity size={14} />
                        </button>
                        <button 
                            onClick={() => setChartType('CANDLE')}
                            className={`p-1.5 rounded-md transition-colors ${chartType === 'CANDLE' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            title="Candlestick Chart"
                        >
                            <BarChart2 size={14} className="rotate-90" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 w-full min-h-0 relative p-2 overflow-hidden">
                {/* Drawing Overlay SVG */}
                <svg 
                    ref={svgRef}
                    className={`absolute inset-0 z-10 w-full h-full ${activeTool !== 'NONE' ? 'cursor-crosshair' : 'pointer-events-none'}`}
                    onClick={handleSvgClick}
                    onMouseMove={handleMouseMove}
                >
                    {/* Render saved drawings */}
                    {drawings.map(d => (
                        <g key={d.id}>
                            {d.type === 'TRENDLINE' && (
                                <line x1={d.start.x} y1={d.start.y} x2={d.end.x} y2={d.end.y} stroke={d.color} strokeWidth="2" />
                            )}
                            {d.type === 'FIBONACCI' && (
                                <g>
                                    <line x1={d.start.x} y1={d.start.y} x2={d.end.x} y2={d.end.y} stroke={d.color} strokeWidth="1" strokeDasharray="4 4" />
                                    {/* Mock Fib Lines */}
                                    <line x1={d.start.x} y1={d.start.y} x2={d.end.x} y2={d.start.y} stroke={d.color} strokeWidth="1" opacity="0.5" />
                                    <line x1={d.start.x} y1={d.end.y} x2={d.end.x} y2={d.end.y} stroke={d.color} strokeWidth="1" opacity="0.5" />
                                    <line x1={d.start.x} y1={(d.start.y + d.end.y) / 2} x2={d.end.x} y2={(d.start.y + d.end.y) / 2} stroke={d.color} strokeWidth="1" opacity="0.5" />
                                </g>
                            )}
                        </g>
                    ))}
                    {/* Render current drawing */}
                    {currentDrawing && (
                        <line 
                            x1={currentDrawing.start!.x} 
                            y1={currentDrawing.start!.y} 
                            x2={currentDrawing.end!.x} 
                            y2={currentDrawing.end!.y} 
                            stroke="#F59E0B" 
                            strokeWidth="2" 
                            strokeDasharray="5 5"
                        />
                    )}
                </svg>

                {error ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-red-400 gap-2">
                        <span className="text-sm">Failed to load real-time data from Binance.</span>
                        <button onClick={loadData} className="text-xs underline hover:text-white">Retry</button>
                    </div>
                ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={lineColor} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={lineColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                        <XAxis 
                            dataKey="time" 
                            hide={false} 
                            tick={{ fill: '#6B7280', fontSize: 10 }} 
                            axisLine={false}
                            tickLine={false}
                            minTickGap={30}
                        />
                        <YAxis 
                            domain={['auto', 'auto']} 
                            orientation="right" 
                            tick={{ fill: '#6B7280', fontSize: 10 }} 
                            axisLine={false}
                            tickLine={false}
                            width={50}
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#F3F4F6' }}
                            formatter={(value: number, name: string) => {
                                if (name === 'close') return [`$${value.toFixed(2)}`, 'Price'];
                                if (name === 'sma') return [`$${value.toFixed(2)}`, 'SMA (20)'];
                                if (name === 'ema') return [`$${value.toFixed(2)}`, 'EMA (20)'];
                                if (name.startsWith('bb')) return [`$${value.toFixed(2)}`, 'Bollinger'];
                                return [value, name];
                            }}
                        />
                        
                        {/* Indicators Overlays */}
                        {showSMA && <Line type="monotone" dataKey="sma" stroke="#F59E0B" strokeWidth={2} dot={false} />}
                        {showEMA && <Line type="monotone" dataKey="ema" stroke="#8B5CF6" strokeWidth={2} dot={false} />}
                        {showBollinger && (
                            <>
                                <Line type="monotone" dataKey="bbUpper" stroke="#10B981" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                                <Line type="monotone" dataKey="bbLower" stroke="#10B981" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                            </>
                        )}

                        {chartType === 'LINE' ? (
                            <Area 
                                type="monotone" 
                                dataKey="close" 
                                stroke={lineColor} 
                                fill="url(#colorPrice)" 
                                strokeWidth={2}
                            />
                        ) : (
                             <Bar dataKey="close" fill="#8884d8" barSize={8}>
                                {liveData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.close >= entry.open ? '#10B981' : '#EF4444'} />
                                ))}
                                <ErrorBar dataKey="high" width={0} strokeWidth={1} stroke="white" />
                                <ErrorBar dataKey="low" width={0} strokeWidth={1} stroke="white" />
                            </Bar>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
                )}
                
                <div className="absolute bottom-2 left-2 text-[10px] text-gray-500 bg-black/60 px-2 py-1 rounded pointer-events-none flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Binance Data {marketData.price > 0 && `($${marketData.price.toFixed(2)})`}
                </div>
            </div>
        </div>
    );
});

export default MarketChart;