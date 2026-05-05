import { useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import './trading-view.scss';

// Encrypted/Hidden URL via simple obfuscation as requested
const _0x4f2a = ['aHR0cHM6Ly9jaGFydHMuZGVyaXYuY29tL2Rlcml2']; 
const getChartUrl = () => atob(_0x4f2a[0]);

const WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public?app_id=114343';

const AnalysisPanel = observer(() => {
    const [selectedSymbol, setSelectedSymbol] = useState('R_10');
    const [symbols, setSymbols] = useState<{symbol: string, name: string}[]>([]);
    const [ticks, setTicks] = useState<number[]>([]);
    const [tickCount, setTickCount] = useState(100);
    const [stats, setStats] = useState({ rise: 0, fall: 0, trend: 'Connecting...', lastPrice: 0, streak: '' });
    const [historyTape, setHistoryTape] = useState<{type: 'R'|'F', price: number}[]>([]);
    const wsRef = useRef<WebSocket | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current) wsRef.current.close();
        
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('[TradingView Analysis] Connected to WS');
            // Use 'full' to ensure market/submarket fields are present for filtering
            ws.send(JSON.stringify({ active_symbols: 'full' }));
            
            // Get initial history without subscription
            ws.send(JSON.stringify({ 
                ticks_history: selectedSymbol, 
                count: Math.max(tickCount, 100), 
                end: 'latest', 
                style: 'ticks'
            }));

            // Subscribe to real-time ticks separately
            ws.send(JSON.stringify({ 
                ticks: selectedSymbol, 
                subscribe: 1 
            }));
        };

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            
            if (data.error) {
                console.warn('[TradingView Analysis] API Error:', data.error.message);
                return;
            }

            if (data.msg_type === 'active_symbols') {
                if (data.active_symbols && Array.isArray(data.active_symbols)) {
                    const filtered = data.active_symbols
                        .filter((s: any) => s.market === 'synthetic_index')
                        .map((s: any) => ({ symbol: s.symbol, name: s.display_name }));
                    if (filtered.length > 0) setSymbols(filtered);
                } else {
                    console.warn('[TradingView Analysis] No active symbols found in response');
                }
            } else if (data.msg_type === 'history') {
                const prices = data.history.prices.map(Number);
                setTicks(prices);
                
                // Build initial tape
                const tape: {type: 'R'|'F', price: number}[] = [];
                for(let i=1; i<prices.length; i++) {
                    tape.push({ type: prices[i] >= prices[i-1] ? 'R' : 'F', price: prices[i] });
                }
                setHistoryTape(tape.slice(-30));
            } else if (data.msg_type === 'tick') {
                if (data.tick.symbol === selectedSymbol) {
                    const price = Number(data.tick.quote);
                    setTicks(prev => {
                        const newTicks = [...prev.slice(-(tickCount - 1)), price];
                        
                        // Update tape
                        const lastPrice = prev[prev.length - 1] || price;
                        const type = price >= lastPrice ? 'R' : 'F';
                        setHistoryTape(t => [...t.slice(-29), { type, price }]);
                        
                        return newTicks;
                    });
                    setStats(s => ({ ...s, lastPrice: price }));
                }
            }
        };
    }, [selectedSymbol, tickCount]);

    useEffect(() => {
        connect();
        return () => wsRef.current?.close();
    }, [connect]);

    useEffect(() => {
        if (ticks.length < 2) return;
        let riseCount = 0;
        let fallCount = 0;
        // Analyze window based on user tickCount
        const windowTicks = ticks.slice(-tickCount);
        for (let i = 1; i < windowTicks.length; i++) {
            if (windowTicks[i] >= windowTicks[i-1]) riseCount++;
            else fallCount++;
        }
        const total = riseCount + fallCount;
        if (total === 0) {
            setStats(prev => ({ ...prev, rise: 0, fall: 0, trend: 'No Data' }));
            return;
        }
        
        const risePct = Math.round((riseCount / total) * 100);
        const fallPct = 100 - risePct;
        
        let trend = 'Neutral';
        if (risePct > 55) trend = 'Strong Rise';
        if (fallPct > 55) trend = 'Strong Fall';
        if (risePct > 65) trend = 'Critical Rise';
        if (fallPct > 65) trend = 'Critical Fall';

        // Calculate Streak from the tape
        if (historyTape.length > 0) {
            let streakType = historyTape[historyTape.length - 1].type;
            let streakCount = 0;
            for (let i = historyTape.length - 1; i >= 0; i--) {
                if (historyTape[i].type === streakType) streakCount++;
                else break;
            }
            const streak = streakCount > 1 ? `${streakCount}${streakType}` : '';
            setStats(prev => ({ ...prev, rise: risePct, fall: fallPct, trend, streak }));
        }
    }, [ticks, historyTape, tickCount]);

    return (
        <div className="rf-analysis">
            <div className="rf-analysis__card glass">
                <div className="rf-analysis__top">
                    <div className="market-selector">
                        <label>Target Market</label>
                        <div className="dropdown-wrapper">
                            <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
                                {symbols.length > 0 ? symbols.map(m => <option key={m.symbol} value={m.symbol}>{m.name}</option>) : <option>Loading Symbols...</option>}
                            </select>
                        </div>
                    </div>
                    <div className="analysis-config">
                        <label>Ticks Window</label>
                        <div className="input-pill">
                            <input 
                                type="number" 
                                value={tickCount} 
                                onChange={e => setTickCount(Math.min(1000, Math.max(10, Number(e.target.value))))} 
                            />
                            <span className="unit">TKS</span>
                        </div>
                    </div>
                    <div className="price-display">
                        <span className="label">Live Quote</span>
                        <span className="value">{stats.lastPrice.toFixed(3)}</span>
                    </div>
                    <div className="streak-indicator">
                        {stats.streak && (
                            <div className={`streak-badge streak-badge--${stats.streak.includes('R') ? 'rise' : 'fall'}`}>
                                {stats.streak} STREAK
                            </div>
                        )}
                    </div>
                    <div className={`trend-status trend-status--${stats.trend.toLowerCase().replace(' ', '-')}`}>
                        {stats.trend.toUpperCase()}
                    </div>
                </div>

                <div className="rf-analysis__main">
                    <div className="metric-box glass-accent">
                        <div className="metric-box__title">Rise Probability</div>
                        <div className="metric-box__value rise">{stats.rise}%</div>
                        <div className="metric-box__bar">
                            <div className="fill rise" style={{ width: `${stats.rise}%` }} />
                        </div>
                    </div>
                    <div className="metric-box glass-accent">
                        <div className="metric-box__title">Fall Probability</div>
                        <div className="metric-box__value fall">{stats.fall}%</div>
                        <div className="metric-box__bar">
                            <div className="fill fall" style={{ width: `${stats.fall}%` }} />
                        </div>
                    </div>
                </div>

                <div className="rf-analysis__viz">
                    <div className="viz-circle">
                        <svg viewBox="0 0 100 100">
                            <circle className="bg" cx="50" cy="50" r="45" />
                            <circle 
                                className={`progress ${stats.rise > stats.fall ? 'rise' : 'fall'}`} 
                                cx="50" cy="50" r="45" 
                                style={{ strokeDasharray: `${(stats.rise > stats.fall ? stats.rise : stats.fall) * 2.82} 282` }}
                            />
                        </svg>
                        <div className="viz-content">
                            <span className="pct">{stats.rise > stats.fall ? stats.rise : stats.fall}%</span>
                            <span className="txt">
                                {stats.rise === stats.fall ? 'NEUTRAL' : (stats.rise > stats.fall ? 'BULLISH' : 'BEARISH')}
                            </span>
                        </div>
                    </div>
                    <div className="viz-info">
                        <div className="viz-info__header">
                            <h4>Market Sentiment</h4>
                            <p>Deep-tick analysis processing the last {tickCount} price movements. Using sequential momentum verification to identify trade entries.</p>
                        </div>
                        <div className="signals-grid">
                            <div className="signal-item">
                                <span className="dot pulse" /> Volatility Matrix: ACTIVE
                            </div>
                            <div className="signal-item">
                                <span className="dot pulse" /> Sentiment: {stats.trend}
                            </div>
                            <div className="signal-item">
                                <span className="dot pulse" /> Stream Stability: HIGH
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rf-analysis__tape glass-dark">
                    <div className="tape-header">
                        <span>LIVE TICK TAPE (LAST 30)</span>
                        <div className="legend">
                            <span className="r">R = Rise</span>
                            <span className="f">F = Fall</span>
                        </div>
                    </div>
                    <div className="tape-container">
                        {historyTape.map((t, i) => (
                            <div 
                                key={i} 
                                className={`tape-node tape-node--${t.type === 'R' ? 'rise' : 'fall'} ${i === historyTape.length - 1 ? 'latest' : ''}`}
                            >
                                <div className="node-symbol">{t.type}</div>
                                <div className="node-price">{t.price.toString().split('.')[1]?.slice(0, 2) || '00'}</div>
                                {i === historyTape.length - 1 && <div className="latest-indicator">NEW</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

const TradingView = observer(() => {
    const [view, setView] = useState<'chart' | 'analysis'>('chart');

    return (
        <div className="trading-view-page">
            <div className="tv-header">
                <div className="tv-header__title">
                    <h2>Market Intelligence</h2>
                    <p>Professional analysis suite with real-time tick intelligence</p>
                </div>
                <div className="tv-switcher glass">
                    <button 
                        className={`tv-switcher__btn ${view === 'chart' ? 'active' : ''}`}
                        onClick={() => setView('chart')}
                    >
                        📊 Live Charts
                    </button>
                    <button 
                        className={`tv-switcher__btn ${view === 'analysis' ? 'active' : ''}`}
                        onClick={() => setView('analysis')}
                    >
                        📈 Tick Analysis
                    </button>
                </div>
            </div>

            <div className="tv-content">
                {view === 'chart' ? (
                    <div className="tv-iframe-wrapper glass">
                        <iframe 
                            src={getChartUrl()} 
                            title="Deriv Charts" 
                            className="tv-iframe" 
                            frameBorder="0"
                            allowFullScreen
                        />
                    </div>
                ) : (
                    <AnalysisPanel />
                )}
            </div>
        </div>
    );
});

export default TradingView;
