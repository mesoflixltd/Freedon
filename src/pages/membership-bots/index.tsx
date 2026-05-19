import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from '@/hooks/useStore';
import { load, save_types } from '@/external/bot-skeleton';
import { DBOT_TABS } from '@/constants/bot-contents';
import { Localize } from '@deriv-com/translations';
import { Text } from '@deriv-com/ui';
import {
    LabelPairedPuzzlePieceTwoCaptionBoldIcon,
    LabelPairedPlusLgFillIcon,
    LabelPairedChartMixedCaptionBoldIcon,
    LabelPairedPlayCaptionBoldIcon,
    LabelPairedCircleInfoCaptionBoldIcon,
} from '@deriv/quill-icons/LabelPaired';
import { runQuery, escapeSql } from './db';
import './membership-bots.scss';

interface BotModel {
    id: string;
    name: string;
    description: string;
    accuracy: number;
    icon: string;
    xmlFile: string;
    prices: {
        daily: number;
        weekly: number;
        monthly: number;
    };
    buyPrice: number;
    category: string;
    features: string[];
}

const PREMIUM_BOTS: BotModel[] = [
    {
        id: 'apex_ai_v2',
        name: 'Apex AI V2',
        description: 'Advanced deep-learning predictive neural bot with dynamic micro-stake recovery multipliers.',
        accuracy: 100,
        icon: 'ai',
        xmlFile: '💰📊 Rise _ Fall Apex AI Bot 🤖💹.xml',
        prices: { daily: 60, weekly: 125, monthly: 400 },
        buyPrice: 1200,
        category: 'High-Frequency Neural Network',
        features: [
            'Deep Learning neural pattern scanner',
            '1-Second high frequency execution',
            'Dynamic recovery multiplier',
            'Fully customizable risk configurations'
        ]
    },
    {
        id: 'apex_ai_2026',
        name: 'Apex AI 2026',
        description: 'Latest institutional-grade market momentum scanner utilizing custom high-speed index triggers.',
        accuracy: 97,
        icon: 'chart',
        xmlFile: 'THE BINOTEK 5 - 2025🥇.xml',
        prices: { daily: 50, weekly: 100, monthly: 300 },
        buyPrice: 1000,
        category: 'Market Momentum Scanner',
        features: [
            'Institutional-grade momentum trigger',
            'Fast Index contract filtering',
            'Multi-run micro-stake stabilizer',
            'Intelligent target stop loss'
        ]
    },
    {
        id: 'anex_enhanced',
        name: 'Anex (Enhanced AI)',
        description: 'Super-stable and highly reliable statistical trend arbitrage algorithm with automated stop-loss.',
        accuracy: 95,
        icon: 'puzzle',
        xmlFile: 'AUTO C4 VOLT 🇬🇧 2 🇬🇧 AI PREMIUM ROBOT 💯.xml',
        prices: { daily: 40, weekly: 75, monthly: 200 },
        buyPrice: 900,
        category: 'Statistical Arbitrage',
        features: [
            'Trend arbitrage algorithm',
            'Live market volatility adapter',
            'Instant automated stop loss guard',
            'Real-time capital protection'
        ]
    },
];

interface MembershipBotsProps {
    isAdminRoute?: boolean;
}

const MembershipBots = observer(({ isAdminRoute = false }: MembershipBotsProps) => {
    const { dashboard, client } = useStore();
    const [activeRentals, setActiveRentals] = useState<any[]>([]);
    const [pendingRentals, setPendingRentals] = useState<any[]>([]);
    const [loadingBotId, setLoadingBotId] = useState<string | null>(null);

    // Rent Modal states
    const [selectedBot, setSelectedBot] = useState<BotModel | null>(null);
    const [duration, setDuration] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [senderPhone, setSenderPhone] = useState('');
    const [screenshotBase64, setScreenshotBase64] = useState<string>('');
    const [isSubmittingProof, setIsSubmittingProof] = useState(false);

    // Admin portal states
    const [showAdminPortal, setShowAdminPortal] = useState(isAdminRoute);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

    useEffect(() => {
        if (isAdminRoute) {
            setShowAdminPortal(true);
        }
    }, [isAdminRoute]);
    const [adminUser, setAdminUser] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [allRentals, setAllRentals] = useState<any[]>([]);
    const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);

    // Extract visual real and demo IDs safely
    const client_accounts = client?.accounts || JSON.parse(localStorage.getItem('accountsList') || '{}');
    const realAccountId = Object.keys(client_accounts).find(id => id.startsWith('CR')) || 'CR-NOT-FOUND';
    const demoAccountId = Object.keys(client_accounts).find(id => id.startsWith('VRT') || id.startsWith('VRTC')) || 'VRT-NOT-FOUND';

    // Synchronize rentals from DB
    const fetchRentals = async () => {
        try {
            const query = `
                SELECT *, 
                CASE 
                    WHEN expires_at > NOW() AND status = 'approved' THEN 'approved'
                    WHEN expires_at <= NOW() AND status = 'approved' THEN 'expired'
                    ELSE status 
                END as current_status
                FROM rentals
                WHERE real_account_id = ${escapeSql(realAccountId)} OR demo_account_id = ${escapeSql(demoAccountId)}
                ORDER BY created_at DESC
            `;
            const rows = await runQuery(query);

            const active = rows.filter((r: any) => r.current_status === 'approved');
            const pending = rows.filter((r: any) => r.current_status === 'pending');

            setActiveRentals(active);
            setPendingRentals(pending);
        } catch (e) {
            console.error('Failed to fetch user rentals:', e);
        }
    };

    const fetchAllRentalsForAdmin = async () => {
        try {
            const rows = await runQuery("SELECT * FROM rentals ORDER BY created_at DESC");
            setAllRentals(rows);
        } catch (e) {
            console.error('Failed to fetch admin rentals:', e);
        }
    };

    useEffect(() => {
        fetchRentals();
        const interval = setInterval(fetchRentals, 10000); // Poll database every 10 seconds
        return () => clearInterval(interval);
    }, [realAccountId, demoAccountId]);

    useEffect(() => {
        if (isAdminLoggedIn) {
            fetchAllRentalsForAdmin();
            const interval = setInterval(fetchAllRentalsForAdmin, 5000);
            return () => clearInterval(interval);
        }
    }, [isAdminLoggedIn]);

    // Format Countdown Time Remaining
    const getCountdown = (expiresAtStr: string) => {
        const expiresAt = new Date(expiresAtStr).getTime();
        const now = new Date().getTime();
        const diff = expiresAt - now;

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    };

    // Keep active timers refreshing in UI
    const [, setTimerTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => setTimerTick(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    // File selection to Base64
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setScreenshotBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleLoadBot = async (bot: BotModel) => {
        setLoadingBotId(bot.id);
        try {
            const xmlPath = `/membership-bots/${encodeURIComponent(bot.xmlFile)}`;
            const response = await fetch(xmlPath);
            if (!response.ok) throw new Error('Bot strategy XML payload not found');

            const xmlString = await response.text();
            const cleanName = bot.name;

            await load({
                block_string: xmlString,
                file_name: cleanName,
                workspace: window.Blockly.derivWorkspace,
                from: save_types.LOCAL,
                strategy_id: bot.id,
                showIncompatibleStrategyDialog: false,
                drop_event: {},
                show_snackbar: true,
            } as any);

            dashboard.setActiveTab(DBOT_TABS.BOT_BUILDER);
        } catch (error) {
            console.error('Error loading membership bot:', error);
            alert('Failed to load strategy. Please make sure the bot file exists on the server.');
        } finally {
            setLoadingBotId(null);
        }
    };

    const handleSubscribeSubmit = async () => {
        if (!selectedBot || !senderPhone || !screenshotBase64) {
            alert('Please fill out all fields and upload the payment proof screenshot.');
            return;
        }

        setIsSubmittingProof(true);
        try {
            const amt = selectedBot.prices[duration];
            const sql = `
                INSERT INTO rentals (
                    real_account_id, 
                    demo_account_id, 
                    bot_model, 
                    duration, 
                    amount, 
                    payment_reference, 
                    proof_screenshot_url, 
                    status
                ) VALUES (
                    ${escapeSql(realAccountId)}, 
                    ${escapeSql(demoAccountId)}, 
                    ${escapeSql(selectedBot.name)}, 
                    ${escapeSql(duration)}, 
                    ${escapeSql(amt)}, 
                    ${escapeSql(senderPhone)}, 
                    ${escapeSql(screenshotBase64)}, 
                    'pending'
                )
            `;

            await runQuery(sql);
            alert('Payment proof uploaded successfully! Our admins are validating your transaction. Your subscription will activate in real time.');
            setSelectedBot(null);
            setSenderPhone('');
            setScreenshotBase64('');
            fetchRentals();
        } catch (e) {
            console.error('Error submitting proof:', e);
            alert('Failed to submit subscription. Please check your network and try again.');
        } finally {
            setIsSubmittingProof(false);
        }
    };

    // Admin authentication
    const handleAdminLogin = async () => {
        try {
            const sql = `SELECT * FROM admins WHERE username = ${escapeSql(adminUser)} AND password = ${escapeSql(adminPass)}`;
            const rows = await runQuery(sql);

            if (rows.length > 0) {
                setIsAdminLoggedIn(true);
                sessionStorage.setItem('admin_logged_in', 'true');
            } else {
                alert('Invalid admin credentials. Access Denied.');
            }
        } catch (e) {
            console.error('Admin login failed:', e);
        }
    };

    // Admin approve action
    const handleAdminApprove = async (rentalId: number, durationStr: string) => {
        try {
            let intervalDays = 30; // Monthly default
            if (durationStr === 'daily') intervalDays = 1;
            else if (durationStr === 'weekly') intervalDays = 7;

            const sql = `
                UPDATE rentals 
                SET status = 'approved',
                    activated_at = CURRENT_TIMESTAMP,
                    expires_at = CURRENT_TIMESTAMP + INTERVAL '${intervalDays} day'
                WHERE id = ${rentalId}
            `;

            await runQuery(sql);
            alert(`Rental request #${rentalId} Approved and activated!`);
            fetchAllRentalsForAdmin();
        } catch (e) {
            console.error('Failed to approve rental:', e);
        }
    };

    // Admin reject action
    const handleAdminReject = async (rentalId: number) => {
        try {
            const sql = `
                UPDATE rentals 
                SET status = 'rejected'
                WHERE id = ${rentalId}
            `;
            await runQuery(sql);
            alert(`Rental request #${rentalId} Rejected.`);
            fetchAllRentalsForAdmin();
        } catch (e) {
            console.error('Failed to reject rental:', e);
        }
    };

    // Check individual bot status
    const getBotStatus = (botName: string) => {
        const active = activeRentals.find(r => r.bot_model === botName);
        if (active) return { state: 'approved', rental: active };

        const pending = pendingRentals.find(r => r.bot_model === botName);
        if (pending) return { state: 'pending', rental: pending };

        return { state: 'unsubscribed', rental: null };
    };

    const getIcon = (iconName: string) => {
        const props = { width: '28px', height: '28px', fill: 'currentColor' };
        switch (iconName) {
            case 'ai':
                return <LabelPairedPlusLgFillIcon {...props} />;
            case 'chart':
                return <LabelPairedChartMixedCaptionBoldIcon {...props} />;
            default:
                return <LabelPairedPuzzlePieceTwoCaptionBoldIcon {...props} />;
        }
    };

    return (
        <div className='membership-bots-page'>
            <div className='membership-bots-page__header'>
                <div className='membership-bots-page__header-content'>
                    <div>
                        <Text as='h1' weight='bold'>
                            <Localize i18n_default_text='Membership Portal' />
                        </Text>
                        <Text color='less-prominent'>
                            <Localize i18n_default_text='Rent premium high-frequency automated strategies and AI algorithms.' />
                        </Text>
                    </div>
                    {isAdminRoute && (
                        <button 
                            className='membership-bots-page__admin-btn'
                            onClick={() => {
                                const isCurrentlyLoggedIn = sessionStorage.getItem('admin_logged_in') === 'true';
                                setIsAdminLoggedIn(isCurrentlyLoggedIn);
                                setShowAdminPortal(!showAdminPortal);
                            }}
                        >
                            {showAdminPortal ? 'Return to Portal' : 'Admin Sales Desk'}
                        </button>
                    )}
                </div>
            </div>

            <div className='membership-bots-page__scroll-container'>
                {!showAdminPortal ? (
                    <div className='membership-bots-page__grid'>
                        {PREMIUM_BOTS.map(bot => {
                            const status = getBotStatus(bot.name);

                            return (
                                <div 
                                    key={bot.id} 
                                    className={`bot-card bot-card--rental ${
                                        status.state === 'approved' ? 'bot-card--active-subscription' : ''
                                    } ${
                                        status.state === 'pending' ? 'bot-card--pending-subscription' : ''
                                    }`}
                                >
                                    <div className='bot-card__premium-ribbon'>PREMIUM</div>

                                    <div className='bot-card__top'>
                                        <div className='bot-card__icon-wrapper'>{getIcon(bot.icon)}</div>
                                        <div className='bot-card__status bot-card__status--premium'>
                                            {status.state === 'approved' ? 'Active' : status.state === 'pending' ? 'Pending Approval' : 'Premium'}
                                        </div>
                                    </div>

                                    <div className='bot-card__info'>
                                        <div className='bot-card__title-row'>
                                            <Text as='h3' className='bot-card__title'>
                                                {bot.name}
                                            </Text>
                                        </div>
                                        <Text color='less-prominent' className='bot-card__description'>
                                            {bot.description}
                                        </Text>
                                    </div>

                                    {/* Pricing Structure */}
                                    {status.state !== 'approved' && (
                                        <div className='bot-card__price-grid'>
                                            <div className='bot-card__price-grid-item'>
                                                <span className='duration-label'>Daily</span>
                                                <span className='price-val'>${bot.prices.daily}</span>
                                            </div>
                                            <div className='bot-card__price-grid-item'>
                                                <span className='duration-label'>Weekly</span>
                                                <span className='price-val'>${bot.prices.weekly}</span>
                                            </div>
                                            <div className='bot-card__price-grid-item'>
                                                <span className='duration-label'>Monthly</span>
                                                <span className='price-val'>${bot.prices.monthly}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Active Countdown */}
                                    {status.state === 'approved' && status.rental && (
                                        <div className='countdown-timer'>
                                            <span className='countdown-label'>Subscription Active</span>
                                            <span className='countdown-digits'>
                                                {getCountdown(status.rental.expires_at)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Winrate Stats (100% Guaranteed) */}
                                    <div className='bot-card__stats'>
                                        <div className='bot-card__stat-header'>
                                            <Text size='xs' weight='bold' color='prominent'>
                                                Winrate
                                            </Text>
                                            <Text size='xs' weight='bold' style={{ color: '#ffd700' }}>
                                                {bot.accuracy}%
                                            </Text>
                                        </div>
                                        <div className='bot-card__progress-bg'>
                                            <div 
                                                className='bot-card__progress-fill bot-card__progress-fill--premium' 
                                                style={{ width: `${bot.accuracy}%` }} 
                                            />
                                        </div>
                                    </div>

                                    {/* Bot Exclusive Features Checklist */}
                                    <div className='bot-card__features'>
                                        {bot.features.map((feat, idx) => (
                                            <div key={idx} className='bot-card__feature-item'>
                                                <span className='feature-check-icon'>✓</span>
                                                <span className='feature-text'>{feat}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Interactive Actions */}
                                    <div className='bot-card__footer'>
                                        <div className='bot-card__category-pill'>
                                            <LabelPairedCircleInfoCaptionBoldIcon width='12px' height='12px' />
                                            <span>{bot.category}</span>
                                        </div>

                                        {status.state === 'approved' ? (
                                            <button
                                                className='bot-card__load-btn bot-card__load-btn--premium'
                                                onClick={() => handleLoadBot(bot)}
                                                disabled={loadingBotId !== null}
                                            >
                                                {loadingBotId === bot.id ? (
                                                    <div className='bot-card__loader' />
                                                ) : (
                                                    <>
                                                        <LabelPairedPlayCaptionBoldIcon width='16px' height='16px' fill='black' />
                                                        <span>Load Strategy</span>
                                                    </>
                                                )}
                                            </button>
                                        ) : status.state === 'pending' ? (
                                            <button
                                                className='bot-card__load-btn'
                                                style={{ background: '#ff9800', cursor: 'default' }}
                                                disabled
                                            >
                                                Pending Admin Approval...
                                            </button>
                                        ) : (
                                            <button
                                                className='bot-card__load-btn bot-card__load-btn--premium'
                                                onClick={() => setSelectedBot(bot)}
                                            >
                                                <span>Rent Bot Strategy</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // Admin Dashboard UI
                    <div className='admin-portal'>
                        {!isAdminLoggedIn ? (
                            <div className='payment-modal' style={{ position: 'relative', background: 'transparent', zIndex: 1 }}>
                                <div className='payment-modal__container' style={{ border: '1px solid #333' }}>
                                    <div className='payment-modal__header'>
                                        <h2>Admin Sales Desk Login</h2>
                                    </div>
                                    <div className='payment-modal__body'>
                                        <div className='payment-modal__field-group'>
                                            <label>Username</label>
                                            <input 
                                                type='text' 
                                                placeholder='Username' 
                                                value={adminUser}
                                                onChange={e => setAdminUser(e.target.value)}
                                            />
                                        </div>
                                        <div className='payment-modal__field-group'>
                                            <label>Password</label>
                                            <input 
                                                type='password' 
                                                placeholder='Password' 
                                                value={adminPass}
                                                onChange={e => setAdminPass(e.target.value)}
                                            />
                                        </div>
                                        <button className='payment-modal__submit-btn' onClick={handleAdminLogin}>
                                            Authorize Login
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className='admin-portal__content'>
                                <div className='admin-portal__header'>
                                    <h2>Admin Sales & Activation Ledger</h2>
                                    <button 
                                        className='membership-bots-page__admin-btn'
                                        style={{ border: '1px solid red', color: 'red', background: 'transparent' }}
                                        onClick={() => {
                                            setIsAdminLoggedIn(false);
                                            sessionStorage.removeItem('admin_logged_in');
                                        }}
                                    >
                                        Admin Log Out
                                    </button>
                                </div>

                                <div className='admin-portal__table-wrapper'>
                                    <table className='admin-portal__table'>
                                        <thead>
                                            <tr>
                                                <th>ID</th>
                                                <th>Client Real ID</th>
                                                <th>Client Demo ID</th>
                                                <th>Bot Strategy</th>
                                                <th>Rent Tier</th>
                                                <th>Amount Paid</th>
                                                <th>Sender Ref</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allRentals.map((r: any) => (
                                                <tr key={r.id}>
                                                    <td>#{r.id}</td>
                                                    <td><span style={{ fontFamily: 'monospace' }}>{r.real_account_id}</span></td>
                                                    <td><span style={{ fontFamily: 'monospace' }}>{r.demo_account_id}</span></td>
                                                    <td><strong>{r.bot_model}</strong></td>
                                                    <td><span style={{ textTransform: 'uppercase', fontSize: '1.2rem', fontWeight: 'bold' }}>{r.duration}</span></td>
                                                    <td style={{ color: '#ffd700', fontWeight: 'bold' }}>${r.amount}</td>
                                                    <td><span style={{ fontFamily: 'monospace' }}>{r.payment_reference}</span></td>
                                                    <td>
                                                        <span className={`status-pill status-pill--${r.status.toLowerCase()}`}>
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {r.proof_screenshot_url && (
                                                            <button 
                                                                className='btn-action btn-action--view'
                                                                onClick={() => setViewingScreenshot(r.proof_screenshot_url)}
                                                            >
                                                                View Screenshot
                                                            </button>
                                                        )}
                                                        {r.status === 'pending' && (
                                                            <>
                                                                <button 
                                                                    className='btn-action btn-action--approve'
                                                                    onClick={() => handleAdminApprove(r.id, r.duration)}
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    className='btn-action btn-action--reject'
                                                                    onClick={() => handleAdminReject(r.id)}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {allRentals.length === 0 && (
                                                <tr>
                                                    <td colSpan={9} style={{ textAlign: 'center', color: '#666' }}>
                                                        No rental activation history found in ledger.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Subscribe Rent Modal */}
            {selectedBot && (
                <div className='payment-modal' onClick={() => setSelectedBot(null)}>
                    <div className='payment-modal__container' onClick={e => e.stopPropagation()}>
                        <div className='payment-modal__header'>
                            <h2>Subscribe: {selectedBot.name}</h2>
                            <button className='payment-modal__close' onClick={() => setSelectedBot(null)}>
                                &times;
                            </button>
                        </div>
                        <div className='payment-modal__body'>
                            {/* Account captures display */}
                            <div className='payment-modal__field-group'>
                                <label>Captured Demo Account ID</label>
                                <div className='extracted-id'>{demoAccountId}</div>
                            </div>
                            <div className='payment-modal__field-group'>
                                <label>Captured Real Account ID</label>
                                <div className='extracted-id'>{realAccountId}</div>
                            </div>

                            {/* Select duration */}
                            <div className='payment-modal__field-group'>
                                <label>Renting Subscription Period</label>
                                <select 
                                    value={duration} 
                                    onChange={e => setDuration(e.target.value as any)}
                                >
                                    <option value='daily'>Daily - ${selectedBot.prices.daily}</option>
                                    <option value='weekly'>Weekly - ${selectedBot.prices.weekly}</option>
                                    <option value='monthly'>Monthly - ${selectedBot.prices.monthly}</option>
                                </select>
                            </div>

                            {/* Payment details */}
                            <div className='payment-modal__field-group' style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '1.6rem', borderRadius: '1.6rem', border: '1px solid rgba(255, 215, 0, 0.2)' }}>
                                <Text size='sm' weight='bold' style={{ color: '#ffd700', marginBottom: '0.8rem', display: 'block' }}>
                                    Manual M-Pesa Payment Instructions:
                                </Text>
                                <Text size='sm' style={{ lineHeight: '1.6' }}>
                                    Please send exactly <strong>${selectedBot.prices[duration]}</strong> to phone number: <strong style={{ color: '#ffd700', fontSize: '1.5rem' }}>+254794432921</strong>. Once completed, fill out the form below and upload your transaction receipt/screenshot proof.
                                </Text>
                            </div>

                            <div className='payment-modal__field-group'>
                                <label>Sender Reference / Phone Number</label>
                                <input 
                                    type='text' 
                                    placeholder='e.g., MPESA Ref / +2547XXXXXXXX' 
                                    value={senderPhone}
                                    onChange={e => setSenderPhone(e.target.value)}
                                />
                            </div>

                            {/* Screenshot proof */}
                            <div className='payment-modal__field-group'>
                                <label>Upload Payment Proof Screenshot</label>
                                <label className='payment-modal__screenshot-upload'>
                                    <input 
                                        type='file' 
                                        accept='image/*' 
                                        onChange={handleFileChange}
                                    />
                                    {screenshotBase64 ? (
                                        <img src={screenshotBase64} alt='Payment Proof Preview' />
                                    ) : (
                                        <span>Click here to select and upload your receipt screenshot</span>
                                    )}
                                </label>
                            </div>

                            <button 
                                className='payment-modal__submit-btn'
                                onClick={handleSubscribeSubmit}
                                disabled={isSubmittingProof}
                            >
                                {isSubmittingProof ? 'Uploading Receipt Ledger...' : 'Submit Payment Proof'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View base64 proof image modal */}
            {viewingScreenshot && (
                <div className='payment-modal' onClick={() => setViewingScreenshot(null)}>
                    <div className='payment-modal__container' style={{ maxWidth: '80rem' }} onClick={e => e.stopPropagation()}>
                        <div className='payment-modal__header'>
                            <h2>Payment Proof Image</h2>
                            <button className='payment-modal__close' onClick={() => setViewingScreenshot(null)}>
                                &times;
                            </button>
                        </div>
                        <div className='payment-modal__body' style={{ alignItems: 'center' }}>
                            <img 
                                src={viewingScreenshot} 
                                alt='Full Proof Receipt' 
                                style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '1.2rem', boxShadow: '0 0.5rem 2rem rgba(0,0,0,0.5)' }} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default MembershipBots;
