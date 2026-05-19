import React, { useState, useEffect, useMemo, useCallback } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { v4 as uuidv4 } from 'uuid';
import {
    LabelPairedChartMixedCaptionBoldIcon,
    LabelPairedMemoPadCaptionBoldIcon,
    LabelPairedTrashCaptionRegularIcon,
    LabelPairedPenCaptionRegularIcon,
    LabelPairedCircleExclamationCaptionRegularIcon,
} from '@deriv/quill-icons/LabelPaired';
import { Text } from '@deriv-com/ui';
import { localize } from '@deriv-com/translations';
import { useStore } from '@/hooks/useStore';
import './risk-calculator.scss';

// ── Types ──────────────────────────────────────────────────────────────────────
type TJournalEntry = {
    id: string;
    title: string;
    description: string;
    type: 'Journal' | 'Plan';
    createdAt: string;
    calcSnapshot?: string; // serialized calculator result
};

type TActiveView = 'calculator' | 'journal' | 'analytics';

const MIN_STAKE = 0.35; // Deriv minimum stake

// ── Main Component ─────────────────────────────────────────────────────────────
const RiskCalculator = observer(() => {
    const { client } = useStore();
    const isAuthenticated = client.is_logged_in;

    // ── Calculator state ───────────────────────────────────────────────────────
    const [balance, setBalance] = useState<string>('1000');
    const [target, setTarget] = useState<string>('1200');
    const [payoutPct, setPayoutPct] = useState<string>('95');
    const [stake, setStake] = useState<string>('0.35');
    const [sessionRuns, setSessionRuns] = useState<string>('3');

    // ── Journal state ──────────────────────────────────────────────────────────
    const [entries, setEntries] = useState<TJournalEntry[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<TJournalEntry | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [entryType, setEntryType] = useState<'Journal' | 'Plan'>('Journal');
    const [active_view, setActiveView] = useState<TActiveView>('calculator');

    // ── Analytics state ────────────────────────────────────────────────────────
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsStage, setAnalyticsStage] = useState('');
    const [analyticsData, setAnalyticsData] = useState<any | null>(null);
    const [useSimulatedData, setUseSimulatedData] = useState(false);

    // ── Persist journal ────────────────────────────────────────────────────────
    useEffect(() => {
        const saved =
            localStorage.getItem('freedon_trading_journal') ||
            localStorage.getItem('tradq_trading_journal') ||
            localStorage.getItem('mesoflix_trading_journal');
        if (saved) {
            try {
                setEntries(JSON.parse(saved));
            } catch (_) {
                /* noop */
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('freedon_trading_journal', JSON.stringify(entries));
    }, [entries]);

    // ── AI Engine calculations ─────────────────────────────────────────────────
    const calc = useMemo(() => {
        const b = parseFloat(balance) || 0;
        const tgt = parseFloat(target) || 0;
        const pp = parseFloat(payoutPct) || 95;
        const stk = Math.max(MIN_STAKE, parseFloat(stake) || MIN_STAKE);
        const runs = Math.max(1, parseInt(sessionRuns, 10) || 3);

        const profitNeeded = Math.max(0, tgt - b);
        const profitPerTrade = stk * (pp / 100); // profit on each winning trade
        const tradesNeeded = profitPerTrade > 0 ? Math.ceil(profitNeeded / profitPerTrade) : 0;
        const tradesPerRun = Math.ceil(tradesNeeded / runs);
        const roiPercent = b > 0 ? ((tgt - b) / b) * 100 : 0;
        const winRateNeeded =
            tradesNeeded > 0
                ? (tradesNeeded / (tradesNeeded * 1.2)) * 100 // assumes ~20% loss buffer
                : 0;
        const maxDrawdownRisk = stk * tradesPerRun; // worst-case loss per run
        const totalPayout = stk + profitPerTrade;

        // Daily projection — simple linear at `runs` per day
        const daysNeeded = runs > 0 ? Math.ceil(tradesNeeded / (tradesPerRun * runs)) : 0;

        return {
            stk: stk.toFixed(2),
            profitPerTrade: profitPerTrade.toFixed(3),
            totalPayout: totalPayout.toFixed(3),
            profitNeeded: profitNeeded.toFixed(2),
            tradesNeeded,
            tradesPerRun,
            roiPercent: roiPercent.toFixed(1),
            winRateNeeded: winRateNeeded.toFixed(1),
            maxDrawdownRisk: maxDrawdownRisk.toFixed(2),
            daysNeeded,
            isViable: stk >= MIN_STAKE && profitNeeded >= 0 && b > 0,
        };
    }, [balance, target, payoutPct, stake, sessionRuns]);

    // ── "Save to Journal" pre-fill with calculation snapshot ──────────────────
    const handleSaveCalcToJournal = useCallback(() => {
        const snap = [
            `Balance: $${balance}  →  Target: $${target}`,
            `Stake: $${calc.stk}  |  Payout: ${payoutPct}%  |  Profit/trade: $${calc.profitPerTrade}`,
            `Trades needed: ${calc.tradesNeeded}  |  Trades/run: ${calc.tradesPerRun}  |  Runs/session: ${sessionRuns}`,
            `ROI needed: ${calc.roiPercent}%  |  Est. days: ${calc.daysNeeded}`,
            `Max drawdown per run: $${calc.maxDrawdownRisk}`,
        ].join('\n');
        setTitle(`Target Plan — $${balance} → $${target}`);
        setDescription(snap);
        setEntryType('Plan');
        setIsFormOpen(true);
        setActiveView('journal');
    }, [balance, target, payoutPct, stake, sessionRuns, calc]);

    // ── Journal CRUD ───────────────────────────────────────────────────────────
    const handleSaveEntry = () => {
        if (!title.trim() || !description.trim()) return;
        if (editingEntry) {
            setEntries(prev =>
                prev.map(e => (e.id === editingEntry.id ? { ...e, title, description, type: entryType } : e))
            );
            setEditingEntry(null);
        } else {
            setEntries(prev => [
                {
                    id: uuidv4(),
                    title,
                    description,
                    type: entryType,
                    createdAt: new Date().toISOString(),
                },
                ...prev,
            ]);
        }
        setTitle('');
        setDescription('');
        setIsFormOpen(false);
    };

    const handleDeleteEntry = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEntries(prev => prev.filter(item => item.id !== id));
    };

    const handleEditEntry = (entry: TJournalEntry) => {
        setEditingEntry(entry);
        setTitle(entry.title);
        setDescription(entry.description);
        setEntryType(entry.type);
        setIsFormOpen(true);
        setActiveView('journal');
    };

    // ── Diagnostics Engine & Parsing ──────────────────────────────────────────
    const getSimulatedTransactions = useCallback(() => {
        const mockTxs: any[] = [];
        const now = Math.floor(Date.now() / 1000);

        // Add deposit
        mockTxs.push({
            action_type: 'deposit',
            amount: '500.00',
            balance_after: '500.00',
            transaction_id: '88234710',
            transaction_time: now - 15 * 24 * 3600,
            longcode: 'Payment agent deposit via Neteller',
        });

        // Add 20 random trades over the last 15 days
        let currentBalance = 500.0;
        const winLossPattern = [1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1]; // 15 wins, 5 losses (75% win rate!)
        const stakes = [10, 10, 10, 15, 15, 15, 20, 20, 20, 25, 25, 25, 25, 30, 30, 30, 30, 40, 40, 40];
        const payouts = stakes.map(s => s * 1.95);

        winLossPattern.forEach((isWin, index) => {
            const timeOffset = (15 - index * 0.7) * 24 * 3600;
            const contractId = 2390847100 + index;
            const stake = stakes[index];
            const payout = payouts[index];

            // Buy transaction
            currentBalance -= stake;
            mockTxs.push({
                action_type: 'buy',
                amount: `-${stake.toFixed(2)}`,
                balance_after: currentBalance.toFixed(2),
                contract_id: contractId,
                transaction_id: String(99120340 + index * 2),
                transaction_time: now - timeOffset,
                longcode: `Win contract on Volatility 10 (1s) Index (Matches/Differs)`,
            });

            if (isWin) {
                // Sell transaction
                currentBalance += payout;
                mockTxs.push({
                    action_type: 'sell',
                    amount: `${payout.toFixed(2)}`,
                    balance_after: currentBalance.toFixed(2),
                    contract_id: contractId,
                    transaction_id: String(99120340 + index * 2 + 1),
                    transaction_time: now - timeOffset + 3,
                    longcode: `Contract win payout`,
                });
            }
        });

        // Add a withdrawal
        currentBalance -= 150.0;
        mockTxs.push({
            action_type: 'withdrawal',
            amount: '-150.00',
            balance_after: currentBalance.toFixed(2),
            transaction_id: '88349210',
            transaction_time: now - 2 * 24 * 3600,
            longcode: 'Withdrawal to WebMoney wallet',
        });

        return mockTxs.reverse();
    }, []);

    const processTransactions = useCallback((txs: any[]) => {
        if (txs.length === 0) {
            return {
                txCount: 0,
                firstTxDate: null,
                activeDays: 0,
                totalDeposits: 0,
                totalWithdrawals: 0,
                netCapital: 0,
                totalTrades: 0,
                totalWins: 0,
                totalLosses: 0,
                winRate: '0.0',
                totalStake: '0.00',
                totalProfit: '0.00',
                totalLoss: '0.00',
                profitFactor: '0.00',
                avgWin: '0.00',
                avgLoss: '0.00',
                maxWin: '0.00',
                maxLoss: '0.00',
                winStreak: 0,
                lossStreak: 0,
                healthScore: 0,
                healthGrade: 'N/A',
                healthLabel: 'No Trade Data',
                healthDesc: 'Start trading to generate statistics and view your account health diagnostics.',
                recentTxList: [],
            };
        }

        const txCount = txs.length;
        const sortedTxs = [...txs].sort((a, b) => a.transaction_time - b.transaction_time);
        const firstTxDate = new Date(sortedTxs[0].transaction_time * 1000);
        const lastTxDate = new Date(sortedTxs[sortedTxs.length - 1].transaction_time * 1000);
        const activeDays = Math.max(
            1,
            Math.ceil((lastTxDate.getTime() - firstTxDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        let totalDeposits = 0;
        let totalWithdrawals = 0;
        txs.forEach(tx => {
            const amt = parseFloat(tx.amount) || 0;
            if (tx.action_type === 'deposit') {
                totalDeposits += amt;
            } else if (tx.action_type === 'withdrawal') {
                totalWithdrawals += Math.abs(amt);
            }
        });
        const netCapital = totalDeposits - totalWithdrawals;

        const tradesMap = new Map<number, { buy?: any; sell?: any; contract_id: number }>();
        txs.forEach(tx => {
            if (tx.contract_id) {
                const id = parseInt(tx.contract_id, 10);
                const existing = tradesMap.get(id) || { contract_id: id };
                if (tx.action_type === 'buy') {
                    existing.buy = tx;
                } else if (tx.action_type === 'sell') {
                    existing.sell = tx;
                }
                tradesMap.set(id, existing);
            }
        });

        const trades = Array.from(tradesMap.values()).filter(t => t.buy);
        const totalTrades = trades.length;

        let totalWins = 0;
        let totalLosses = 0;
        let totalStake = 0;
        let totalProfit = 0;
        let totalLoss = 0;
        let maxWin = 0;
        let maxLoss = 0;

        const sortedTrades = trades.sort((a, b) => a.buy.transaction_time - b.buy.transaction_time);

        let currentWinStreak = 0;
        let currentLossStreak = 0;
        let maxWinStreak = 0;
        let maxLossStreak = 0;

        sortedTrades.forEach(t => {
            const stakeAmt = Math.abs(parseFloat(t.buy.amount) || 0);
            totalStake += stakeAmt;

            if (t.sell) {
                totalWins++;
                const payoutAmt = parseFloat(t.sell.amount) || 0;
                const profitAmt = payoutAmt - stakeAmt;
                totalProfit += profitAmt;
                if (profitAmt > maxWin) maxWin = profitAmt;

                currentWinStreak++;
                if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
                currentLossStreak = 0;
            } else {
                totalLosses++;
                totalLoss += stakeAmt;
                if (stakeAmt > maxLoss) maxLoss = stakeAmt;

                currentLossStreak++;
                if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
                currentWinStreak = 0;
            }
        });

        const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
        const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 99.9 : 0;
        const avgWin = totalWins > 0 ? totalProfit / totalWins : 0;
        const avgLoss = totalLosses > 0 ? totalLoss / totalLosses : 0;

        let healthScore = 0;
        if (winRate >= 70) healthScore += 30;
        else if (winRate >= 55) healthScore += 20;
        else if (winRate >= 45) healthScore += 10;
        else if (winRate > 0) healthScore += 5;

        if (profitFactor >= 2.0) healthScore += 30;
        else if (profitFactor >= 1.5) healthScore += 20;
        else if (profitFactor >= 1.0) healthScore += 10;
        else if (profitFactor > 0) healthScore += 5;

        if (maxLossStreak === 0) healthScore += 20;
        else if (maxLossStreak <= 2) healthScore += 20;
        else if (maxLossStreak <= 4) healthScore += 12;
        else if (maxLossStreak <= 6) healthScore += 6;

        if (totalTrades >= 50) healthScore += 20;
        else if (totalTrades >= 20) healthScore += 15;
        else if (totalTrades >= 5) healthScore += 10;
        else if (totalTrades > 0) healthScore += 5;

        let healthGrade = 'D';
        let healthLabel = 'High Risk';
        let healthDesc =
            'Your portfolio shows signs of rapid drawdown risk. Reduce your stake size and practice consistent rules.';

        if (healthScore >= 90) {
            healthGrade = 'S';
            healthLabel = 'Legendary Elite';
            healthDesc =
                'Exceptional risk-adjusted returns! You have consistent win streaks, excellent trade sizes, and positive expectancy.';
        } else if (healthScore >= 80) {
            healthGrade = 'A';
            healthLabel = 'Professional';
            healthDesc =
                'Solid execution and high profitability. Your profit factor is strongly positive. Continue with your active plan.';
        } else if (healthScore >= 65) {
            healthGrade = 'B';
            healthLabel = 'Consistent';
            healthDesc =
                'Good account stability. Maintain discipline and adjust take-profit rules slightly to increase average wins.';
        } else if (healthScore >= 50) {
            healthGrade = 'C';
            healthLabel = 'Developing';
            healthDesc =
                'Profitable but experiencing high drawdown variances. Monitor your losing streaks and apply tighter stops.';
        }

        const recentTxList = txs.slice(0, 10);

        return {
            txCount,
            firstTxDate,
            activeDays,
            totalDeposits,
            totalWithdrawals,
            netCapital,
            totalTrades,
            totalWins,
            totalLosses,
            winRate: winRate.toFixed(1),
            totalStake: totalStake.toFixed(2),
            totalProfit: totalProfit.toFixed(2),
            totalLoss: totalLoss.toFixed(2),
            profitFactor: profitFactor.toFixed(2),
            avgWin: avgWin.toFixed(2),
            avgLoss: avgLoss.toFixed(2),
            maxWin: maxWin.toFixed(2),
            maxLoss: maxLoss.toFixed(2),
            winStreak: maxWinStreak,
            lossStreak: maxLossStreak,
            healthScore,
            healthGrade,
            healthLabel,
            healthDesc,
            recentTxList,
        };
    }, []);

    const runDiagnostics = async (isSimulatedOverride?: boolean) => {
        setAnalyticsLoading(true);
        setAnalyticsData(null);

        const isSimulated = isSimulatedOverride !== undefined ? isSimulatedOverride : useSimulatedData;

        const stages = [
            'Establishing Secure Handshake with Deriv API...',
            'Scanning Account Statement Logs...',
            'Analyzing Performance Metrics & Win Streaks...',
            'Calibrating Account Health Index...',
        ];

        let currentStageIdx = 0;
        setAnalyticsStage(stages[currentStageIdx]);
        const stageInterval = setInterval(() => {
            currentStageIdx++;
            if (currentStageIdx < stages.length) {
                setAnalyticsStage(stages[currentStageIdx]);
            }
        }, 800);

        try {
            let transactions: any[] = [];

            if (isAuthenticated && !isSimulated) {
                const { api_base } = await import('@/external/bot-skeleton/services/api/api-base');

                if (api_base.api) {
                    let offset = 0;
                    const limit = 100;
                    let hasMore = true;
                    let fetchCount = 0;

                    while (hasMore && fetchCount < 5) {
                        const response = await api_base.api.send({
                            statement: 1,
                            limit,
                            offset,
                        });

                        if (response.error) {
                            throw new Error(response.error.message);
                        }

                        const list = response.statement?.transactions || [];
                        transactions.push(...list);

                        if (list.length < limit || transactions.length >= 500) {
                            hasMore = false;
                        } else {
                            offset += limit;
                            fetchCount++;
                        }
                    }
                } else {
                    throw new Error('Deriv WebSocket API is not connected. Please try again.');
                }
            }

            if (transactions.length === 0 && !isSimulated) {
                // If live account is empty, prompt simulation as toggle fallback
                const emptyStats = processTransactions([]);
                setAnalyticsData({ ...emptyStats, isReal: false, isEmpty: true });
            } else if (isSimulated) {
                const simulated = getSimulatedTransactions();
                const stats = processTransactions(simulated);
                setAnalyticsData({ ...stats, isReal: false });
            } else {
                const stats = processTransactions(transactions);
                setAnalyticsData({ ...stats, isReal: true });
            }
        } catch (error: any) {
            console.error('Diagnostics error:', error);
            setAnalyticsStage(`Error: ${error.message || 'Failed to fetch statement'}. Loading demo simulation...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
            const simulatedStats = processTransactions(getSimulatedTransactions());
            setAnalyticsData({ ...simulatedStats, isReal: false, error: error.message });
        } finally {
            clearInterval(stageInterval);
            setAnalyticsLoading(false);
        }
    };

    // ── Render Helpers ─────────────────────────────────────────────────────────
    const renderCalculator = () => (
        <div className='rc-card'>
            <div className='rc-card__title'>
                <LabelPairedChartMixedCaptionBoldIcon width='22px' height='22px' fill='var(--brand-red-coral)' />
                AI Trading Calculator
            </div>

            <div className='rc-form'>
                <div className='rc-form__row'>
                    <div className='rc-form__field'>
                        <label>Account Balance ($)</label>
                        <input type='number' min='0' value={balance} onChange={e => setBalance(e.target.value)} />
                    </div>
                    <div className='rc-form__field'>
                        <label>Target Amount ($)</label>
                        <input type='number' min='0' value={target} onChange={e => setTarget(e.target.value)} />
                    </div>
                </div>

                <div className='rc-form__row'>
                    <div className='rc-form__field'>
                        <label>Stake per Trade ($)</label>
                        <input
                            type='number'
                            min={MIN_STAKE}
                            step='0.01'
                            value={stake}
                            onChange={e => setStake(e.target.value)}
                        />
                        <span className='rc-form__hint'>Min: ${MIN_STAKE} (Deriv default)</span>
                    </div>
                    <div className='rc-form__field'>
                        <label>Payout per Trade (%)</label>
                        <input
                            type='number'
                            min='1'
                            max='200'
                            value={payoutPct}
                            onChange={e => setPayoutPct(e.target.value)}
                        />
                    </div>
                </div>

                <div className='rc-form__row rc-form__row--single'>
                    <div className='rc-form__field'>
                        <label>Runs per Session</label>
                        <input
                            type='number'
                            min='1'
                            max='100'
                            value={sessionRuns}
                            onChange={e => setSessionRuns(e.target.value)}
                        />
                        <span className='rc-form__hint'>How many rounds you plan per session</span>
                    </div>
                </div>
            </div>

            {calc.isViable ? (
                <div className='rc-results'>
                    <div className='rc-results__header'>
                        <span className='rc-results__badge'>AI Analysis</span>
                        <span className='rc-results__roi'>
                            ROI needed: <strong>{calc.roiPercent}%</strong>
                        </span>
                    </div>

                    <div className='rc-results__grid'>
                        <div className='rc-stat rc-stat--primary'>
                            <div className='rc-stat__value'>{calc.tradesNeeded}</div>
                            <div className='rc-stat__label'>Total Trades Needed</div>
                        </div>
                        <div className='rc-stat rc-stat--accent'>
                            <div className='rc-stat__value'>{calc.tradesPerRun}</div>
                            <div className='rc-stat__label'>Trades per Run</div>
                        </div>
                        <div className='rc-stat'>
                            <div className='rc-stat__value'>${calc.profitPerTrade}</div>
                            <div className='rc-stat__label'>Profit per Win</div>
                        </div>
                        <div className='rc-stat'>
                            <div className='rc-stat__value'>${calc.profitNeeded}</div>
                            <div className='rc-stat__label'>Total Profit Needed</div>
                        </div>
                        <div className='rc-stat rc-stat--danger'>
                            <div className='rc-stat__value'>${calc.maxDrawdownRisk}</div>
                            <div className='rc-stat__label'>Max Risk / Run</div>
                        </div>
                        <div className='rc-stat'>
                            <div className='rc-stat__value'>{calc.daysNeeded}d</div>
                            <div className='rc-stat__label'>Est. Days at {sessionRuns} runs/day</div>
                        </div>
                    </div>

                    <div className='rc-results__summary'>
                        <p>
                            With a <strong>${calc.stk}</strong> stake at <strong>{payoutPct}%</strong> payout, each win
                            nets <strong>${calc.profitPerTrade}</strong>. You need
                            <strong> {calc.tradesNeeded} wins</strong> to reach your target, split into{' '}
                            <strong>{calc.tradesPerRun} trades per run</strong> across
                            <strong> {sessionRuns} runs per session</strong>.
                        </p>
                    </div>

                    <button className='rc-save-btn' onClick={handleSaveCalcToJournal}>
                        📓 Save to Journal as Trading Plan
                    </button>
                </div>
            ) : (
                <div className='rc-results rc-results--invalid'>
                    <p>⚠ Enter valid balance, target, and a stake ≥ ${MIN_STAKE} to see your AI analysis.</p>
                </div>
            )}
        </div>
    );

    const renderJournal = () => (
        <div className='rc-card rc-card--journal'>
            <div className='rc-card__title-row'>
                <div className='rc-card__title'>
                    <LabelPairedMemoPadCaptionBoldIcon width='22px' height='22px' fill='var(--brand-blue)' />
                    Trading Journal
                </div>
                <button
                    className='rc-add-btn'
                    onClick={() => {
                        setIsFormOpen(!isFormOpen);
                        if (isFormOpen) setEditingEntry(null);
                    }}
                >
                    {isFormOpen ? '✕ Cancel' : '+ New Entry'}
                </button>
            </div>

            {isFormOpen && (
                <div className='rc-journal-form'>
                    <div className='rc-form__field'>
                        <label>Title / Trading Pair</label>
                        <input
                            type='text'
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder='e.g. Target Plan — R_50'
                        />
                    </div>
                    <div className='rc-journal-form__types'>
                        {(['Journal', 'Plan'] as const).map(t => (
                            <label
                                key={t}
                                className={classNames('rc-type-btn', { 'rc-type-btn--active': entryType === t })}
                            >
                                <input
                                    type='radio'
                                    name='entry-type'
                                    checked={entryType === t}
                                    onChange={() => setEntryType(t)}
                                />
                                {t === 'Journal' ? '📒 Journal' : '📋 Trading Plan'}
                            </label>
                        ))}
                    </div>
                    <div className='rc-form__field'>
                        <label>Notes / Strategy</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder='Write your strategy, results, or what happened in the trade...'
                            rows={5}
                        />
                    </div>
                    <button
                        className='rc-save-btn'
                        onClick={handleSaveEntry}
                        disabled={!title.trim() || !description.trim()}
                    >
                        {editingEntry ? '✏️ Update Entry' : '💾 Save Entry'}
                    </button>
                </div>
            )}

            {!isFormOpen && (
                <div className='rc-journal-list'>
                    {entries.length === 0 ? (
                        <div className='rc-journal-empty'>
                            <LabelPairedCircleExclamationCaptionRegularIcon width='40px' height='40px' />
                            <strong>Your journal is empty</strong>
                            <span>Save a calculation above or add an entry manually.</span>
                        </div>
                    ) : (
                        entries.map(entry => (
                            <div key={entry.id} className='rc-journal-item' onClick={() => handleEditEntry(entry)}>
                                <div className='rc-journal-item__header'>
                                    <h3>{entry.title}</h3>
                                    <time>{new Date(entry.createdAt).toLocaleDateString()}</time>
                                </div>
                                <p>
                                    {entry.description.length > 180
                                        ? entry.description.substring(0, 180) + '…'
                                        : entry.description}
                                </p>
                                <div className='rc-journal-item__footer'>
                                    <span className={classNames('rc-tag', { 'rc-tag--plan': entry.type === 'Plan' })}>
                                        {entry.type === 'Plan' ? '📋 Plan' : '📒 Journal'}
                                    </span>
                                    <div className='rc-journal-item__actions'>
                                        <LabelPairedPenCaptionRegularIcon
                                            width='15px'
                                            height='15px'
                                            fill='var(--text-less-prominent)'
                                        />
                                        <LabelPairedTrashCaptionRegularIcon
                                            width='15px'
                                            height='15px'
                                            fill='var(--status-danger)'
                                            onClick={(e: React.MouseEvent) => handleDeleteEntry(entry.id, e)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );

    const renderAnalyticsContent = (data: any, isBlurred: boolean) => {
        return (
            <div className={classNames('analytics-dashboard', { 'analytics-dashboard--blurred': isBlurred })}>
                {/* 1. Health Score Section */}
                <div className='analytics-section analytics-section--score'>
                    <div className='health-card'>
                        <div className='health-card__gauge-box'>
                            <div className='health-card__grade'>{data.healthGrade}</div>
                            <div className='health-card__score-label'>Score: {data.healthScore}/100</div>
                        </div>
                        <div className='health-card__details'>
                            <h3>
                                Account Health Index:{' '}
                                <span className='health-card__label-text'>{data.healthLabel}</span>
                            </h3>
                            <p>{data.healthDesc}</p>
                        </div>
                    </div>
                </div>

                {/* 2. Primary Metrics (3 cards) */}
                <div className='analytics-grid analytics-grid--three'>
                    <div className='analytics-stat-card'>
                        <span className='analytics-stat-card__icon'>📈</span>
                        <div className='analytics-stat-card__content'>
                            <span className='analytics-stat-card__label'>Net Profit / Loss</span>
                            <span
                                className={classNames('analytics-stat-card__value', {
                                    'analytics-stat-card__value--gain':
                                        parseFloat(data.totalProfit) - parseFloat(data.totalLoss) >= 0,
                                    'analytics-stat-card__value--loss':
                                        parseFloat(data.totalProfit) - parseFloat(data.totalLoss) < 0,
                                })}
                            >
                                {parseFloat(data.totalProfit) - parseFloat(data.totalLoss) >= 0 ? '+' : ''}$
                                {(parseFloat(data.totalProfit) - parseFloat(data.totalLoss)).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div className='analytics-stat-card'>
                        <span className='analytics-stat-card__icon'>🛡️</span>
                        <div className='analytics-stat-card__content'>
                            <span className='analytics-stat-card__label'>Profit Factor</span>
                            <span className='analytics-stat-card__value'>{data.profitFactor}</span>
                        </div>
                    </div>
                    <div className='analytics-stat-card'>
                        <span className='analytics-stat-card__icon'>⏳</span>
                        <div className='analytics-stat-card__content'>
                            <span className='analytics-stat-card__label'>Account Lifetime</span>
                            <span className='analytics-stat-card__value'>
                                {data.activeDays} {data.activeDays === 1 ? 'Day' : 'Days'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Core Capital Flow (3 cards) */}
                <div className='analytics-grid analytics-grid--three'>
                    <div className='analytics-stat-card analytics-stat-card--secondary'>
                        <div className='analytics-stat-card__content'>
                            <span className='analytics-stat-card__label'>Lifetime Deposits</span>
                            <span className='analytics-stat-card__value analytics-stat-card__value--gain'>
                                ${parseFloat(data.totalDeposits).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div className='analytics-stat-card analytics-stat-card--secondary'>
                        <div className='analytics-stat-card__content'>
                            <span className='analytics-stat-card__label'>Lifetime Withdrawals</span>
                            <span className='analytics-stat-card__value analytics-stat-card__value--loss'>
                                -${parseFloat(data.totalWithdrawals).toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <div className='analytics-stat-card analytics-stat-card--secondary'>
                        <div className='analytics-stat-card__content'>
                            <span className='analytics-stat-card__label'>Net Capital Input</span>
                            <span className='analytics-stat-card__value'>
                                ${parseFloat(data.netCapital).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Win / Loss stats (2 columns) */}
                <div className='analytics-grid analytics-grid--two-columns'>
                    {/* Trading Volume */}
                    <div className='analytics-card-detail'>
                        <h4>Trading Volume &amp; Success</h4>
                        <div className='trade-volume-box'>
                            <div className='trade-volume-box__circle'>
                                <div className='trade-volume-box__circle-inner'>
                                    <span className='trade-volume-box__rate'>{data.winRate}%</span>
                                    <span className='trade-volume-box__sub'>Win Rate</span>
                                </div>
                            </div>
                            <div className='trade-volume-box__breakdown'>
                                <div className='breakdown-item'>
                                    <span>Total Trades Executed</span>
                                    <strong>{data.totalTrades}</strong>
                                </div>
                                <div className='breakdown-item'>
                                    <span>Wins</span>
                                    <strong className='text-success'>{data.totalWins}</strong>
                                </div>
                                <div className='breakdown-item'>
                                    <span>Losses</span>
                                    <strong className='text-danger'>{data.totalLosses}</strong>
                                </div>
                            </div>
                        </div>
                        <div className='analytics-progress-wrapper'>
                            <div className='analytics-progress-bar'>
                                <div className='analytics-progress-fill' style={{ width: `${data.winRate}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* Streaks & Peaks */}
                    <div className='analytics-card-detail'>
                        <h4>Streak Analytics &amp; Averages</h4>
                        <div className='streaks-container'>
                            <div className='streak-row'>
                                <div className='streak-tile streak-tile--win'>
                                    <span className='streak-tile__num'>{data.winStreak}</span>
                                    <span className='streak-tile__lbl'>Max Win Streak</span>
                                </div>
                                <div className='streak-tile streak-tile--loss'>
                                    <span className='streak-tile__num'>{data.lossStreak}</span>
                                    <span className='streak-tile__lbl'>Max Loss Streak</span>
                                </div>
                            </div>
                            <div className='averages-list'>
                                <div className='avg-item'>
                                    <span>Average Win Trade</span>
                                    <strong className='text-success'>+${data.avgWin}</strong>
                                </div>
                                <div className='avg-item'>
                                    <span>Average Loss Trade</span>
                                    <strong className='text-danger'>-${data.avgLoss}</strong>
                                </div>
                                <div className='avg-item'>
                                    <span>Max Single Win</span>
                                    <strong className='text-success'>+${data.maxWin}</strong>
                                </div>
                                <div className='avg-item'>
                                    <span>Max Single Loss</span>
                                    <strong className='text-danger'>-${data.maxLoss}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Recent Transaction Table */}
                <div className='analytics-logs-section'>
                    <h4>Recent Transaction History Diagnostic</h4>
                    {data.recentTxList.length === 0 ? (
                        <div className='recent-logs-empty'>No transactions recorded on this account yet.</div>
                    ) : (
                        <div className='recent-logs-table-wrapper'>
                            <table className='recent-logs-table'>
                                <thead>
                                    <tr>
                                        <th>Date/Time</th>
                                        <th>Type</th>
                                        <th>ID</th>
                                        <th>Description</th>
                                        <th className='text-right'>Amount</th>
                                        <th className='text-right'>Balance After</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentTxList.map((tx: any, idx: number) => {
                                        let typeLabel = tx.action_type;
                                        if (tx.action_type === 'buy') typeLabel = 'Contract Stake';
                                        if (tx.action_type === 'sell') typeLabel = 'Contract Payout';
                                        if (tx.action_type === 'deposit') typeLabel = 'Account Deposit';
                                        if (tx.action_type === 'withdrawal') typeLabel = 'Account Withdrawal';

                                        return (
                                            <tr key={tx.transaction_id || idx}>
                                                <td>{new Date(tx.transaction_time * 1000).toLocaleString()}</td>
                                                <td>
                                                    <span
                                                        className={classNames('log-type-tag', {
                                                            'log-type-tag--buy': tx.action_type === 'buy',
                                                            'log-type-tag--sell': tx.action_type === 'sell',
                                                            'log-type-tag--deposit': tx.action_type === 'deposit',
                                                            'log-type-tag--withdrawal': tx.action_type === 'withdrawal',
                                                        })}
                                                    >
                                                        {typeLabel}
                                                    </span>
                                                </td>
                                                <td className='text-mono'>{tx.transaction_id}</td>
                                                <td className='log-desc-col'>{tx.longcode || 'Transaction record'}</td>
                                                <td
                                                    className={classNames('text-right text-mono', {
                                                        'text-success': parseFloat(tx.amount) > 0,
                                                        'text-danger': parseFloat(tx.amount) < 0,
                                                    })}
                                                >
                                                    {parseFloat(tx.amount) > 0 ? '+' : ''}$
                                                    {parseFloat(tx.amount).toFixed(2)}
                                                </td>
                                                <td className='text-right text-mono'>
                                                    ${parseFloat(tx.balance_after).toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const getSimulatedStatsPlaceholder = () => {
        return {
            txCount: 22,
            firstTxDate: new Date(),
            activeDays: 15,
            totalDeposits: 500,
            totalWithdrawals: 150,
            netCapital: 350,
            totalTrades: 20,
            totalWins: 15,
            totalLosses: 5,
            winRate: '75.0',
            totalStake: '390.00',
            totalProfit: '350.25',
            totalLoss: '95.00',
            profitFactor: '3.69',
            avgWin: '23.35',
            avgLoss: '19.00',
            maxWin: '40.00',
            maxLoss: '40.00',
            winStreak: 4,
            lossStreak: 1,
            healthScore: 92,
            healthGrade: 'S',
            healthLabel: 'Legendary Elite',
            healthDesc:
                'Exceptional risk-adjusted returns! You have consistent win streaks, excellent trade sizes, and positive expectancy.',
            recentTxList: getSimulatedTransactions().slice(0, 5),
        };
    };

    const renderAnalytics = () => {
        if (!isAuthenticated && !analyticsData) {
            return (
                <div className='rc-card rc-card--analytics rc-card--guest'>
                    <div className='analytics-teaser'>
                        <div className='analytics-teaser__badge'>🔒 Authorized Feature</div>
                        <h2>Unlock Account Diagnostics &amp; Lifetime Stats</h2>
                        <p>
                            Perform a deep-scan of your live account performance directly via the Deriv WS API.
                            Instantly analyze lifetime trade growth, streaks, and calculate your custom Account Health
                            Index.
                        </p>

                        <div className='analytics-teaser__demo-cta'>
                            <button
                                className='rc-save-btn'
                                onClick={() => {
                                    setUseSimulatedData(true);
                                    runDiagnostics(true);
                                }}
                            >
                                ✨ Try Simulation Playground Demo
                            </button>
                        </div>

                        <div className='analytics-mockup-wrapper'>
                            <div className='analytics-mockup-overlay'>
                                <span>Connect your account to initiate scan</span>
                            </div>
                            {renderAnalyticsContent(getSimulatedStatsPlaceholder(), true)}
                        </div>
                    </div>
                </div>
            );
        }

        if (analyticsLoading) {
            return (
                <div className='rc-card rc-card--analytics rc-card--loading'>
                    <div className='diagnostics-loader'>
                        <div className='diagnostics-loader__scanner'>
                            <div className='diagnostics-loader__pulse' />
                        </div>
                        <h3>Analyzing Account Integrity</h3>
                        <p className='diagnostics-loader__stage'>{analyticsStage}</p>
                        <div className='diagnostics-loader__progress-bar'>
                            <div className='diagnostics-loader__progress-fill' />
                        </div>
                    </div>
                </div>
            );
        }

        if (analyticsData) {
            return (
                <div className='rc-card rc-card--analytics rc-card--results'>
                    <div className='analytics-header-row'>
                        <div className='analytics-header-row__left'>
                            <h2>Account Diagnostics Report</h2>
                            <span
                                className={classNames('analytics-badge', {
                                    'analytics-badge--real': analyticsData.isReal && !analyticsData.isEmpty,
                                    'analytics-badge--simulated': !analyticsData.isReal || analyticsData.isEmpty,
                                })}
                            >
                                {analyticsData.isReal && !analyticsData.isEmpty
                                    ? '🟢 Live Account'
                                    : '✨ Simulated Demo'}
                            </span>
                        </div>
                        <div className='analytics-header-row__right'>
                            {analyticsData.isEmpty && (
                                <div className='empty-state-banner'>
                                    No live trades detected yet. Loaded simulation preview.
                                </div>
                            )}
                            {analyticsData.isReal && (
                                <button className='rc-refresh-btn' onClick={() => runDiagnostics(false)}>
                                    ⟳ Re-Scan Account
                                </button>
                            )}
                            {(!analyticsData.isReal || analyticsData.isEmpty) && isAuthenticated && (
                                <button
                                    className='rc-refresh-btn rc-refresh-btn--primary'
                                    onClick={() => {
                                        setUseSimulatedData(false);
                                        runDiagnostics(false);
                                    }}
                                >
                                    🚀 Scan Live Account
                                </button>
                            )}
                        </div>
                    </div>
                    {renderAnalyticsContent(analyticsData, false)}
                </div>
            );
        }

        return (
            <div className='rc-card rc-card--analytics rc-card--start'>
                <div className='diagnostics-start'>
                    <div className='diagnostics-start__icon'>🛡️</div>
                    <h2>Run Account Diagnostics</h2>
                    <p>
                        This tool performs a complete lifetime analysis of your account. We will securely retrieve your
                        transaction logs, trade history, deposits, and withdrawals to construct a detailed health
                        report.
                    </p>
                    <button className='rc-save-btn' onClick={() => runDiagnostics(false)}>
                        🚀 Start Diagnostics Scan
                    </button>
                    <span className='diagnostics-start__hint'>
                        All processing runs securely within your local session sandbox.
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className='risk-calculator-page'>
            {/* Header */}
            <div className='risk-calculator-page__header'>
                <div className='risk-calculator-page__header-title'>
                    <Text as='h1'>Freedon Risk Tools</Text>

                    <div className='risk-calculator-page__toggle'>
                        <button
                            className={classNames('toggle-btn', { 'toggle-btn--active': active_view === 'calculator' })}
                            onClick={() => setActiveView('calculator')}
                        >
                            <LabelPairedChartMixedCaptionBoldIcon
                                width='16px'
                                height='16px'
                                fill={active_view === 'calculator' ? 'white' : 'var(--text-general)'}
                            />
                            <span>{localize('Calculator')}</span>
                        </button>
                        <button
                            className={classNames('toggle-btn', { 'toggle-btn--active': active_view === 'journal' })}
                            onClick={() => setActiveView('journal')}
                        >
                            <LabelPairedMemoPadCaptionBoldIcon
                                width='16px'
                                height='16px'
                                fill={active_view === 'journal' ? 'white' : 'var(--text-general)'}
                            />
                            <span>{localize('Journal')}</span>
                        </button>
                        <button
                            className={classNames('toggle-btn', { 'toggle-btn--active': active_view === 'analytics' })}
                            onClick={() => setActiveView('analytics')}
                        >
                            <svg
                                width='16'
                                height='16'
                                viewBox='0 0 24 24'
                                fill={active_view === 'analytics' ? 'white' : 'var(--text-general)'}
                                xmlns='http://www.w3.org/2000/svg'
                                style={{ transition: 'fill 0.25s ease', marginRight: '0.6rem' }}
                            >
                                <path d='M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM11 11H9V17H11V11ZM15 7H13V17H15V7ZM17 13H15V17H17V13Z' />
                            </svg>
                            <span>{localize('Analytics')}</span>
                        </button>
                    </div>
                </div>
                <Text color='less-prominent'>
                    {active_view === 'calculator' &&
                        localize(
                            'AI-powered trade planner — enter your balance, target & stake to get your session plan.'
                        )}
                    {active_view === 'journal' &&
                        localize('Log your trades, strategies, results, and notes to track your progress.')}
                    {active_view === 'analytics' &&
                        localize('Live account diagnostics — scan your account performance metrics and trade records.')}
                </Text>
            </div>

            {/* Scrollable content area */}
            <div className='risk-calculator-page__scroll-container'>
                <div className='risk-calculator-page__content'>
                    {active_view === 'calculator' && renderCalculator()}
                    {active_view === 'journal' && renderJournal()}
                    {active_view === 'analytics' && renderAnalytics()}
                </div>
            </div>
        </div>
    );
});

export default RiskCalculator;
