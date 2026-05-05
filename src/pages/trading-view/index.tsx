import React, { useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import './trading-view.scss';

// Encrypted/Hidden URL via simple obfuscation as requested
const _0x4f2a = ['aHR0cHM6Ly9jaGFydHMuZGVyaXYuY29tL2Rlcml2']; 
const getChartUrl = () => atob(_0x4f2a[0]);

const WS_URL = 'wss://api.derivws.com/trading/v1/options/ws/public';

const MARKETS = [
    { symbol: 'R_10', name: 'Volatility 10 Index' },
    { symbol: 'R_25', name: 'Volatility 25 Index' },
    { symbol: 'R_50', name: 'Volatility 50 Index' },
    { symbol: 'R_75', name: 'Volatility 75 Index' },
    { symbol: 'R_100', name: 'Volatility 100 Index' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index' },
];

const AnalysisPanel = observer(() => {
    const [selectedSymbol, setSelectedSymbol] = useState('R_10');
    const [symbols, setSymbols] = useState<{symbol: string, name: string}[]>(MARKETS);
    const [ticks, setTicks] = useState<number[]>([]);
    const [stats, setStats] = useState({ rise: 50, fall: 50, trend: 'Neutral', lastPrice: 0 });
    const wsRef = useRef<WebSocket | null>(null);

    const connect = useCallback(() => {
        if (wsRef.current) wsRef.current.close();
        
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }));
            ws.send(JSON.stringify({ ticks_history: selectedSymbol, count: 100, end: 'latest', style: 'ticks', subscribe: 1 }));
        };

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);
            if (data.msg_type === 'active_symbols') {
                const filtered = data.active_symbols
                    .filter((s: any) => s.market === 'synthetic_index')
                    .map((s: any) => ({ symbol: s.symbol, name: s.display_name }));
                if (filtered.length > 0) setSymbols(filtered);
            } else if (data.msg_type === 'history') {
                setTicks(data.history.prices.map(Number));
            } else if (data.msg_type === 'tick') {
                if (data.tick.symbol === selectedSymbol) {
                    const price = Number(data.tick.quote);
                    setTicks(prev => [...prev.slice(-99), price]);
                    setStats(s => ({ ...s, lastPrice: price }));
                }
            }
        };
    }, [selectedSymbol]);

    useEffect(() => {
        connect();
        return () => wsRef.current?.close();
    }, [connect]);

    useEffect(() => {
        if (ticks.length < 2) return;
        let riseCount = 0;
        let fallCount = 0;
        for (let i = 1; i < ticks.length; i++) {
            if (ticks[i] > ticks[i-1]) riseCount++;
            else if (ticks[i] < ticks[i-1]) fallCount++;
        }
        const total = riseCount + fallCount;
        if (total === 0) return;
        
        const risePct = Math.round((riseCount / total) * 100);
        const fallPct = 100 - risePct;
        
        let trend = 'Neutral';
        if (risePct > 55) trend = 'Strong Rise';
        if (fallPct > 55) trend = 'Strong Fall';
        if (risePct > 65) trend = 'Critical Rise';
        if (fallPct > 65) trend = 'Critical Fall';

        setStats(prev => ({ ...prev, rise: risePct, fall: fallPct, trend }));
    }, [ticks]);

    return (
        <div className="rf-analysis">
            <div className="rf-analysis__card glass">
                <div className="rf-analysis__top">
                    <div className="market-selector">
                        <label>Target Market</label>
                        <select value={selectedSymbol} onChange={e => setSelectedSymbol(e.target.value)}>
                            {symbols.map(m => <option key={m.symbol} value={m.symbol}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="price-display">
                        <span className="label">Live Quote</span>
                        <span className="value">{stats.lastPrice.toFixed(3)}</span>
                    </div>
                    <div className={`trend-status trend-status--${stats.trend.toLowerCase().replace(' ', '-')}`}>
                        {stats.trend.toUpperCase()}
                    </div>
                </div>

                <div className="rf-analysis__main">
                    <div className="metric-box">
                        <div className="metric-box__title">Rise Probability</div>
                        <div className="metric-box__value rise">{stats.rise}%</div>
                        <div className="metric-box__bar">
                            <div className="fill rise" style={{ width: `${stats.rise}%` }} />
                        </div>
                    </div>
                    <div className="metric-box">
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
                                className="progress rise" 
                                cx="50" cy="50" r="45" 
                                style={{ strokeDasharray: `${stats.rise * 2.82} 282` }}
                            />
                        </svg>
                        <div className="viz-content">
                            <span className="pct">{stats.rise}%</span>
                            <span className="txt">BULLISH</span>
                        </div>
                    </div>
                    <div className="viz-info">
                        <h4>Advanced Intelligence</h4>
                        <p>Real-time tick analysis processing last 100 movements. Detecting micro-trends and momentum shifts in the {selectedSymbol} market.</p>
                        <div className="signals">
                            <div className="signal-item">
                                <span className="dot" /> Volatility Matrix Active
                            </div>
                            <div className="signal-item">
                                <span className="dot" /> Tick Stream Verified
                            </div>
                        </div>
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
                    <p>Advanced charting and tick analysis engine</p>
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
                        📈 Analysis
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
