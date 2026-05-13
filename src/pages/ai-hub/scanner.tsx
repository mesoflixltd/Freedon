import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { observer as globalObserver } from '../../external/bot-skeleton/utils/observer';
import DBot from '../../external/bot-skeleton/scratch/dbot';
import { updateScannerBotXML } from './utils/xml-engine';
import './scanner.scss';

// ─── Constants ──────────────────────────────────────────────────────────────
const SCAN_SYMBOLS = [
    { symbol: 'R_10', name: 'Volatility 10 Index', pip: 3 },
    { symbol: 'R_25', name: 'Volatility 25 Index', pip: 3 },
    { symbol: 'R_50', name: 'Volatility 50 Index', pip: 2 },
    { symbol: 'R_75', name: 'Volatility 75 Index', pip: 2 },
    { symbol: 'R_100', name: 'Volatility 100 Index', pip: 2 },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index', pip: 3 },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index', pip: 3 },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index', pip: 2 },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index', pip: 2 },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', pip: 2 },
];

const WINDOW_SIZE = 1000;

const TEMPLATE_XML = `<xml xmlns="https://developers.google.com/blockly/xml" is_dbot="true" collection="false">
  <variables>
    <variable id="v_stake">stake</variable>
    <variable id="v_martingale">martingale</variable>
    <variable id="v_tp">take_profit</variable>
    <variable id="v_sl">stop_loss</variable>
    <variable id="v_max_trades">max_trades</variable>
    <variable id="v_target_wins">target_wins</variable>
    <variable id="v_max_losses">max_losses</variable>
    <variable id="v_current_stake">current_stake</variable>
    <variable id="v_total_profit">total_profit</variable>
    <variable id="v_trade_count">trade_count</variable>
    <variable id="v_win_count">win_count</variable>
    <variable id="v_loss_count">loss_count</variable>
  </variables>
  <block type="trade_definition" id="trade_def_main" deletable="false" x="0" y="0">
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_market" id="market_id_001" deletable="false" movable="false">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">1HZ10V</field>
        <next>
          <block type="trade_definition_tradetype" id="type_id_001" deletable="false" movable="false">
            <field name="TRADETYPECAT_LIST">digits</field>
            <field name="TRADETYPE_LIST">overunder</field>
            <next>
              <block type="trade_definition_contracttype" id="contract_id_001" deletable="false" movable="false">
                <field name="TYPE_LIST">both</field>
                <next>
                  <block type="trade_definition_candleinterval" id="interval_id_001" deletable="false" movable="false">
                    <field name="CANDLEINTERVAL_LIST">60</field>
                    <next>
                      <block type="trade_definition_restartbuysell" id="restart_id_001" deletable="false" movable="false">
                        <field name="TIME_MACHINE_ENABLED">FALSE</field>
                        <next>
                          <block type="trade_definition_restartonerror" id="onerror_id_001" deletable="false" movable="false">
                            <field name="RESTARTONERROR">TRUE</field>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="INITIALIZATION">
      <block type="variables_set" id="init_stake">
        <field name="VAR" id="v_stake">stake</field>
        <value name="VALUE">
          <block type="math_number" id="stake_id_001">
            <field name="NUM">0.35</field>
          </block>
        </value>
        <next>
          <block type="variables_set" id="init_current_stake">
            <field name="VAR" id="v_current_stake">current_stake</field>
            <value name="VALUE">
              <block type="variables_get">
                <field name="VAR" id="v_stake">stake</field>
              </block>
            </value>
            <next>
              <block type="variables_set" id="init_martingale">
                <field name="VAR" id="v_martingale">martingale</field>
                <value name="VALUE">
                  <block type="math_number" id="martingale_id_001">
                    <field name="NUM">2</field>
                  </block>
                </value>
                <next>
                  <block type="variables_set" id="init_tp">
                    <field name="VAR" id="v_tp">take_profit</field>
                    <value name="VALUE">
                      <block type="math_number" id="tp_id_001">
                        <field name="NUM">10</field>
                      </block>
                    </value>
                    <next>
                      <block type="variables_set" id="init_sl">
                        <field name="VAR" id="v_sl">stop_loss</field>
                        <value name="VALUE">
                          <block type="math_number" id="sl_id_001">
                            <field name="NUM">10</field>
                          </block>
                        </value>
                        <next>
                          <block type="variables_set" id="init_max_trades">
                            <field name="VAR" id="v_max_trades">max_trades</field>
                            <value name="VALUE">
                              <block type="math_number" id="max_trades_id_001">
                                <field name="NUM">50</field>
                              </block>
                            </value>
                            <next>
                              <block type="variables_set" id="init_target_wins">
                                <field name="VAR" id="v_target_wins">target_wins</field>
                                <value name="VALUE">
                                  <block type="math_number" id="target_wins_id_001">
                                    <field name="NUM">10</field>
                                  </block>
                                </value>
                                <next>
                                  <block type="variables_set" id="init_max_losses">
                                    <field name="VAR" id="v_max_losses">max_losses</field>
                                    <value name="VALUE">
                                      <block type="math_number" id="max_losses_id_001">
                                        <field name="NUM">5</field>
                                      </block>
                                    </value>
                                    <next>
                                      <block type="variables_set">
                                        <field name="VAR" id="v_total_profit">total_profit</field>
                                        <value name="VALUE"><block type="math_number"><field name="NUM">0</field></block></value>
                                        <next>
                                          <block type="variables_set">
                                            <field name="VAR" id="v_trade_count">trade_count</field>
                                            <value name="VALUE"><block type="math_number"><field name="NUM">0</field></block></value>
                                            <next>
                                              <block type="variables_set">
                                                <field name="VAR" id="v_win_count">win_count</field>
                                                <value name="VALUE"><block type="math_number"><field name="NUM">0</field></block></value>
                                                <next>
                                                  <block type="variables_set">
                                                    <field name="VAR" id="v_loss_count">loss_count</field>
                                                    <value name="VALUE"><block type="math_number"><field name="NUM">0</field></block></value>
                                                  </block>
                                                </next>
                                              </block>
                                            </next>
                                          </block>
                                        </next>
                                      </block>
                                    </next>
                                  </block>
                                </next>
                              </block>
                            </next>
                          </block>
                        </next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
    <statement name="SUBMARKET">
      <block type="trade_definition_tradeoptions" id="options_id_001">
        <mutation xmlns="http://www.w3.org/1999/xhtml" has_first_barrier="false" has_second_barrier="false" has_prediction="true"></mutation>
        <field name="DURATIONTYPE_LIST">t</field>
        <value name="DURATION">
          <shadow type="math_number_positive">
            <field name="NUM">1</field>
          </shadow>
        </value>
        <value name="AMOUNT">
          <block type="variables_get">
            <field name="VAR" id="v_current_stake">current_stake</field>
          </block>
        </value>
        <value name="PREDICTION">
          <shadow type="math_number_positive" id="predict_id_001">
            <field name="NUM">1</field>
          </shadow>
        </value>
      </block>
    </statement>
  </block>
  <block type="before_purchase" id="before_id_001" deletable="false" x="0" y="600">
    <statement name="BEFOREPURCHASE_STACK">
      <block type="purchase" id="purchase_id_001">
        <field name="PURCHASE_LIST">DIGITOVER</field>
      </block>
    </statement>
  </block>
  <block type="after_purchase" id="after_id_001" x="550" y="0">
    <statement name="AFTERPURCHASE_STACK">
      <block type="math_change">
        <field name="VAR" id="v_trade_count">trade_count</field>
        <value name="DELTA"><block type="math_number"><field name="NUM">1</field></block></value>
        <next>
          <block type="math_change">
            <field name="VAR" id="v_total_profit">total_profit</field>
            <value name="DELTA">
              <block type="read_details">
                <field name="DETAIL_INDEX">4</field>
              </block>
            </value>
            <next>
              <block type="controls_if">
                <mutation else="1"></mutation>
                <value name="IF0">
                  <block type="contract_check_result">
                    <field name="CHECK_RESULT">win</field>
                  </block>
                </value>
                <statement name="DO0">
                  <block type="math_change">
                    <field name="VAR" id="v_win_count">win_count</field>
                    <value name="DELTA"><block type="math_number"><field name="NUM">1</field></block></value>
                    <next>
                      <block type="variables_set">
                        <field name="VAR" id="v_current_stake">current_stake</field>
                        <value name="VALUE">
                          <block type="variables_get">
                            <field name="VAR" id="v_stake">stake</field>
                          </block>
                        </value>
                      </block>
                    </next>
                  </block>
                </statement>
                <statement name="ELSE">
                  <block type="math_change">
                    <field name="VAR" id="v_loss_count">loss_count</field>
                    <value name="DELTA"><block type="math_number"><field name="NUM">1</field></block></value>
                    <next>
                      <block type="variables_set">
                        <field name="VAR" id="v_current_stake">current_stake</field>
                        <value name="VALUE">
                          <block type="math_arithmetic">
                            <field name="OP">MULTIPLY</field>
                            <value name="A">
                              <block type="variables_get">
                                <field name="VAR" id="v_current_stake">current_stake</field>
                              </block>
                            </value>
                            <value name="B">
                              <block type="variables_get">
                                <field name="VAR" id="v_martingale">martingale</field>
                              </block>
                            </value>
                          </block>
                        </value>
                      </block>
                    </next>
                  </block>
                </statement>
                <next>
                  <block type="controls_if">
                    <value name="IF0">
                      <block type="logic_operation">
                        <field name="OP">AND</field>
                        <value name="A">
                          <block type="logic_operation">
                            <field name="OP">AND</field>
                            <value name="A">
                              <block type="logic_compare">
                                <field name="OP">LT</field>
                                <value name="A"><block type="variables_get"><field name="VAR" id="v_total_profit">total_profit</field></block></value>
                                <value name="B"><block type="variables_get"><field name="VAR" id="v_tp">take_profit</field></block></value>
                              </block>
                            </value>
                            <value name="B">
                              <block type="logic_compare">
                                <field name="OP">GT</field>
                                <value name="A"><block type="variables_get"><field name="VAR" id="v_total_profit">total_profit</field></block></value>
                                <value name="B">
                                  <block type="math_single">
                                    <field name="OP">NEG</field>
                                    <value name="NUM"><block type="variables_get"><field name="VAR" id="v_sl">stop_loss</field></block></value>
                                  </block>
                                </value>
                              </block>
                            </value>
                          </block>
                        </value>
                        <value name="B">
                          <block type="logic_operation">
                            <field name="OP">AND</field>
                            <value name="A">
                              <block type="logic_compare">
                                <field name="OP">LT</field>
                                <value name="A"><block type="variables_get"><field name="VAR" id="v_trade_count">trade_count</field></block></value>
                                <value name="B"><block type="variables_get"><field name="VAR" id="v_max_trades">max_trades</field></block></value>
                              </block>
                            </value>
                            <value name="B">
                              <block type="logic_operation">
                                <field name="OP">AND</field>
                                <value name="A">
                                  <block type="logic_compare">
                                    <field name="OP">LT</field>
                                    <value name="A"><block type="variables_get"><field name="VAR" id="v_win_count">win_count</field></block></value>
                                    <value name="B"><block type="variables_get"><field name="VAR" id="v_target_wins">target_wins</field></block></value>
                                  </block>
                                </value>
                                <value name="B">
                                  <block type="logic_compare">
                                    <field name="OP">LT</field>
                                    <value name="A"><block type="variables_get"><field name="VAR" id="v_loss_count">loss_count</field></block></value>
                                    <value name="B"><block type="variables_get"><field name="VAR" id="v_max_losses">max_losses</field></block></value>
                                  </block>
                                </value>
                              </block>
                            </value>
                          </block>
                        </value>
                      </block>
                    </value>
                    <statement name="DO0">
                      <block type="trade_again"></block>
                    </statement>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`;

interface IMarketData {
    symbol: string;
    prices: number[];
    digits: number[];
    frequencies: number[]; // Pre-calculated percentages for digits 0-9
    pip_size: number;
    last_price: number;
    last_update: number;
    tick_pulse?: number; // Timestamp for pulse animation
}

interface ISignal {
    symbol: string;
    type: 'OVER' | 'UNDER' | 'EVEN' | 'ODD' | 'MATCH' | 'NONE';
    prediction: number;
    confidence: number;
    reason: string;
}

const getDigit = (price: number, pip: number) => {
    if (price === undefined || isNaN(price)) return 0;
    const s = price.toFixed(pip);
    return Number(s[s.length - 1]);
};

// ── AIScanner Component ─────────────────────────────────────────────────────
const AIScannerPage: React.FC = observer((): JSX.Element => {
    const navigate = useNavigate();
    const [marketStats, setMarketStats] = useState<Record<string, IMarketData>>({});
    const [favorableSymbols, setFavorableSymbols] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [scanMode, setScanMode] = useState<'multi'>('multi');
    const [currentScanningSymbol, setCurrentScanningSymbol] = useState<string | null>(null);
    const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
    const [selectedSignal, setSelectedSignal] = useState<ISignal | null>(null);

    const [stake, setStake] = useState('0.35');
    const [martingale, setMartingale] = useState('2.0');
    const [takeProfit, setTakeProfit] = useState('10');
    const [stopLoss, setStopLoss] = useState('10');
    const [maxTrades, setMaxTrades] = useState('50');
    const [targetWins, setTargetWins] = useState('10');
    const [maxLosses, setMaxLosses] = useState('5');

    const syncCount = useRef(0);
    const activeSubscriptions = useRef<Record<string, string>>({}); // symbol -> subId

    // Initial State Setup
    useEffect(() => {
        const initialStats: Record<string, IMarketData> = {};
        SCAN_SYMBOLS.forEach(s => {
            initialStats[s.symbol] = {
                symbol: s.symbol,
                prices: [],
                digits: [],
                frequencies: new Array(10).fill(10), // Start with neutral 10%
                pip_size: s.pip,
                last_price: 0,
                last_update: Date.now(),
            };
        });
        setMarketStats(initialStats);
    }, []);

    const handleMessage = useCallback((event: MessageEvent) => {
        const msg = JSON.parse(event.data);
        const { msg_type, error, echo_req, tick, history } = msg;

        if (error) {
            console.error('[AI Scanner] API ERROR:', error.message);
            return;
        }

        const calculateFrequencies = (digits: number[]) => {
            if (!digits.length) return new Array(10).fill(0);
            const counts = new Array(10).fill(0);
            digits.forEach(d => counts[d]++);
            return counts.map(c => (c / digits.length) * 100);
        };

        if (msg_type === 'history') {
            const sym = echo_req.ticks_history;
            if (!sym) return;

            if (msg.subscription?.id) {
                activeSubscriptions.current[sym] = msg.subscription.id;
            }

            const prices = (history?.prices ?? []).map(Number);
            const pip = Number(msg.pip_size ?? 2);
            const digits = prices.map((p: number) => getDigit(p, pip));

            setMarketStats(prev => ({
                ...prev,
                [sym]: {
                    ...prev[sym],
                    prices,
                    digits,
                    frequencies: calculateFrequencies(digits),
                    pip_size: pip,
                    last_price: prices[prices.length - 1] || 0,
                    last_update: Date.now(),
                },
            }));

            syncCount.current += 1;
        }

        if (msg_type === 'tick') {
            const sym = tick.symbol;
            if (!sym) return;

            const quote = Number(tick.quote);
            const pip = Number(tick.pip_size ?? 2);
            const digit = getDigit(quote, pip);

            setMarketStats(prev => {
                const current = prev[sym];
                if (!current) return prev;
                const newDigits = [...current.digits, digit].slice(-WINDOW_SIZE);
                return {
                    ...prev,
                    [sym]: {
                        ...current,
                        prices: [...current.prices, quote].slice(-WINDOW_SIZE),
                        digits: newDigits,
                        frequencies: calculateFrequencies(newDigits),
                        pip_size: pip,
                        last_price: quote,
                        last_update: Date.now(),
                        tick_pulse: Date.now(),
                    },
                };
            });
        }
    }, []);

    useEffect(() => {
        let sub: any = null;
        setWsStatus('connecting');

        const init = () => {
            if (!api_base.api) {
                setTimeout(init, 1000);
                return;
            }
            setWsStatus('connected');
            sub = api_base.api.onMessage().subscribe((envelope: any) => {
                handleMessage({ data: JSON.stringify(envelope.data || envelope) } as MessageEvent);
            });
        };

        init();
        return () => {
            sub?.unsubscribe();
            // Clean up subscriptions
            Object.values(activeSubscriptions.current).forEach(id => {
                api_base.api?.send({ forget: id });
            });
        };
    }, [handleMessage]);

    const startScan = useCallback(async () => {
        if (!api_base.api) return;
        setIsScanning(true);
        setFavorableSymbols([]);

        for (let i = 0; i < SCAN_SYMBOLS.length; i++) {
            const s = SCAN_SYMBOLS[i];
            setCurrentScanningSymbol(s.symbol);

            api_base.api.send({
                ticks_history: s.symbol,
                count: WINDOW_SIZE,
                end: 'latest',
                style: 'ticks',
                subscribe: 1,
                req_id: 3000 + i,
            });

            // Wait for analysis period
            await new Promise(resolve => setTimeout(resolve, 3500));

            // Evaluation
            setMarketStats(current => {
                const data = current[s.symbol];
                if (data) {
                    const probAbove1 = data.frequencies.slice(2).reduce((a, b) => a + b, 0);
                    if (probAbove1 > 65) {
                        setFavorableSymbols(prev => [...prev, s.symbol]);
                    } else {
                        const subId = activeSubscriptions.current[s.symbol];
                        if (subId) {
                            api_base.api.send({ forget: subId });
                            delete activeSubscriptions.current[s.symbol];
                        }
                    }
                }
                return current;
            });
        }
        setIsScanning(false);
        setCurrentScanningSymbol(null);
    }, []);

    const handleLaunchBot = useCallback(() => {
        if (!selectedSignal) return;

        let contract_type = 'overunder';
        let purchase_list = 'DIGITOVER';

        if (selectedSignal.type === 'UNDER') {
            contract_type = 'overunder';
            purchase_list = 'DIGITUNDER';
        } else if (selectedSignal.type === 'EVEN' || selectedSignal.type === 'ODD') {
            contract_type = 'evenodd';
            purchase_list = selectedSignal.type === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD';
        } else if (selectedSignal.type === 'MATCH') {
            contract_type = 'matchdiff';
            purchase_list = 'DIGITMATCH';
        }

        const adaptiveXml = updateScannerBotXML(TEMPLATE_XML, {
            symbol: selectedSignal.symbol,
            stake: stake,
            prediction: selectedSignal.prediction,
            martingale: martingale,
            takeProfit,
            stopLoss,
            maxTrades,
            targetWins,
            maxLosses,
        })
            .replace('overunder', contract_type)
            .replace('DIGITOVER', purchase_list);

        try {
            const workspace = (window.Blockly as any)?.derivWorkspace;
            if (!workspace) return;
            const dom = window.Blockly.utils.xml.textToDom(adaptiveXml);
            workspace.clear();
            window.Blockly.Xml.domToWorkspace(dom, workspace);
            globalObserver.emit(
                'ui.log.info',
                `[DSS] Executing ${selectedSignal.type} strategy on ${selectedSignal.symbol}`
            );
            setTimeout(() => {
                DBot.runBot();
                navigate('/');
            }, 2000);
        } catch (e: any) {
            console.error('Launch failed:', e);
        }
    }, [selectedSignal, stake, martingale, takeProfit, stopLoss, navigate]);

    const signals = useMemo(() => {
        const results: ISignal[] = [];
        Object.values(marketStats).forEach(data => {
            // Only show signals for symbols that passed the scan
            if (!favorableSymbols.includes(data.symbol) && data.symbol !== currentScanningSymbol) return;
            if (data.digits.length < 50) return;

            const probabilityAbove1 = data.frequencies.slice(2).reduce((a, b) => a + b, 0);

            if (probabilityAbove1 > 65) {
                results.push({
                    symbol: data.symbol,
                    type: 'OVER',
                    prediction: 1,
                    confidence: Math.round(probabilityAbove1),
                    reason: `Probability of digits 2-9 is ${probabilityAbove1.toFixed(1)}%`,
                });
            }
        });
        return results.sort((a, b) => b.confidence - a.confidence);
    }, [marketStats, favorableSymbols, currentScanningSymbol]);

    return (
        <div className='dss-scanner dss-scanner--full'>
            <div className='dss-scanner__header'>
                <div className='dss-scanner__title'>
                    <h2>AI Market Intelligence</h2>
                    <div className={`dss-status dss-status--${wsStatus}`}>
                        {isScanning
                            ? `Scanning Matrix: ${currentScanningSymbol || '...'}`
                            : favorableSymbols.length > 0
                              ? `${favorableSymbols.length} Favorable Markets Found`
                              : 'Matrix Standby'}
                    </div>
                </div>
                <div className='dss-scanner__actions'>
                    <select
                        className='dss-mode-select'
                        value={scanMode}
                        onChange={e => setScanMode(e.target.value as any)}
                    >
                        <option value='multi'>Scan Multimarket</option>
                    </select>
                    <button
                        className={`dss-scan-btn ${isScanning ? 'dss-scan-btn--active' : ''}`}
                        onClick={startScan}
                        disabled={isScanning}
                    >
                        {isScanning ? 'SCANNING...' : 'START SCAN'}
                    </button>
                </div>
            </div>

            <div className='dss-grid-wrapper'>
                <div className='dss-grid'>
                    {SCAN_SYMBOLS.filter(
                        s => favorableSymbols.includes(s.symbol) || s.symbol === currentScanningSymbol
                    ).map(s => {
                        const data = marketStats[s.symbol];
                        const signal = signals.find(sig => sig.symbol === s.symbol);
                        const isNewTick = data?.tick_pulse && Date.now() - data.tick_pulse < 300;
                        const isCurrentlyScanning = s.symbol === currentScanningSymbol;

                        return (
                            <div
                                key={s.symbol}
                                className={`dss-card ${signal ? 'dss-card--has-signal' : 'dss-card--scanning'} ${isNewTick ? 'dss-card--active' : ''} ${isCurrentlyScanning ? 'dss-card--scanning-active' : ''}`}
                            >
                                <div className='dss-card__market'>
                                    <div className='dss-card__market-left'>
                                        <span className='dss-card__name'>{s.name}</span>
                                        <span className='dss-card__symbol'>{s.symbol}</span>
                                    </div>
                                    <div className='dss-card__market-right'>
                                        <span className='dss-price'>
                                            {data?.last_price?.toFixed(data?.pip_size || 2)}
                                        </span>
                                    </div>
                                </div>
                                <div className='dss-card__visual'>
                                    <div className='dss-distribution'>
                                        {data?.frequencies.map((pct, d) => {
                                            const deviation = pct - 10;
                                            return (
                                                <div key={d} className='dss-dist-bar'>
                                                    <div
                                                        className={`dss-dist-fill ${deviation > 2 ? 'high' : deviation < -2 ? 'low' : ''}`}
                                                        style={{ height: `${Math.max(5, Math.min(pct * 3.5, 100))}%` }}
                                                    >
                                                        <span className='pct-text'>{pct.toFixed(0)}%</span>
                                                    </div>
                                                    <span className='dss-dist-label'>{d}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {signal ? (
                                    <div className='dss-signal animated pulse'>
                                        <div className='dss-signal__type'>
                                            <span className='label'>ANALYSIS RESULT:</span>
                                            <span className={`value ${signal.type.toLowerCase()}`}>
                                                {signal.type} {signal.prediction}
                                            </span>
                                        </div>
                                        <div className='dss-signal__confidence'>
                                            <div className='conf-bar'>
                                                <div className='conf-fill' style={{ width: `${signal.confidence}%` }} />
                                            </div>
                                            <span className='conf-text'>{signal.confidence}% Accuracy</span>
                                        </div>
                                        <button className='dss-trade-btn' onClick={() => setSelectedSignal(signal)}>
                                            LOAD & SELECT STRATEGY
                                        </button>
                                    </div>
                                ) : (
                                    <div className='dss-no-signal'>
                                        <div className='dss-search-loader' />
                                        <span>
                                            {isCurrentlyScanning ? 'Gathering Intelligence...' : 'Awaiting Matrix...'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {!isScanning && favorableSymbols.length === 0 && (
                        <div className='dss-empty-state'>
                            <div className='dss-empty-state__icon'>📡</div>
                            <h3>No Active Signals</h3>
                            <p>Click 'START SCAN' to begin multi-market intelligence gathering.</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedSignal && (
                <div className='dss-modal-overlay'>
                    <div className='dss-modal'>
                        <div className='dss-modal__header'>
                            <h3>Initialise AI Strategy</h3>
                            <button onClick={() => setSelectedSignal(null)}>×</button>
                        </div>
                        <div className='dss-modal__body'>
                            <div className='dss-modal__signal-info'>
                                <span className='market'>{selectedSignal.symbol}</span>
                                <span className={`type ${selectedSignal.type.toLowerCase()}`}>
                                    {selectedSignal.type} {selectedSignal.prediction}
                                </span>
                            </div>
                            <div className='dss-form-grid'>
                                <div className='dss-input-group'>
                                    <label>Stake (USD)</label>
                                    <input
                                        type='number'
                                        step='0.1'
                                        value={stake}
                                        onChange={e => setStake(e.target.value)}
                                    />
                                </div>
                                <div className='dss-input-group'>
                                    <label>Martingale Factor</label>
                                    <input
                                        type='number'
                                        step='0.1'
                                        value={martingale}
                                        onChange={e => setMartingale(e.target.value)}
                                    />
                                </div>
                                <div className='dss-input-group'>
                                    <label>Target Profit (USD)</label>
                                    <input
                                        type='number'
                                        value={takeProfit}
                                        onChange={e => setTakeProfit(e.target.value)}
                                    />
                                </div>
                                <div className='dss-input-group'>
                                    <label>Stop Loss (USD)</label>
                                    <input type='number' value={stopLoss} onChange={e => setStopLoss(e.target.value)} />
                                </div>
                                <div className='dss-input-group'>
                                    <label>Max Trades</label>
                                    <input
                                        type='number'
                                        value={maxTrades}
                                        onChange={e => setMaxTrades(e.target.value)}
                                    />
                                </div>
                                <div className='dss-input-group'>
                                    <label>Number of Wins</label>
                                    <input
                                        type='number'
                                        value={targetWins}
                                        onChange={e => setTargetWins(e.target.value)}
                                    />
                                </div>
                                <div className='dss-input-group'>
                                    <label>Number of Losses</label>
                                    <input
                                        type='number'
                                        value={maxLosses}
                                        onChange={e => setMaxLosses(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className='dss-modal__footer'>
                            <button className='cancel-btn' onClick={() => setSelectedSignal(null)}>
                                Cancel
                            </button>
                            <button className='launch-btn' onClick={handleLaunchBot}>
                                LOAD & RUN STRATEGY →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default AIScannerPage;
