import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { addComma, getCurrencyDisplayCode, getDecimalPlaces } from '@/components/shared';
import Text from '@/components/shared_ui/text';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { useApiBase } from '@/hooks/useApiBase';
import { useStore } from '@/hooks/useStore';
import { isDemoAccount } from '@/utils/account-helpers';
import { Localize } from '@deriv-com/translations';
import { TAccountSwitcher } from './common/types';
import AccountInfoWrapper from './account-info-wrapper';
import brandConfig from '@/../brand.config.json';
import './account-switcher.scss';

const RealIcon = () => (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' className='acc-info__icon'>
        <path
            d='M10 2L3 5V10C3 14.41 6.13 18.23 10 19.5C13.87 18.23 17 14.41 17 10V5L10 2Z'
            fill='#4BB463'
            fillOpacity='0.15'
            stroke='#4BB463'
            strokeWidth='1.5'
            strokeLinejoin='round'
        />
        <path
            d='M7 10.5L9 12.5L13 8.5'
            stroke='#4BB463'
            strokeWidth='1.8'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M10 6V7' stroke='#4BB463' strokeWidth='1.5' strokeLinecap='round' />
    </svg>
);

const DemoIcon = () => (
    <svg width='20' height='20' viewBox='0 0 24 24' fill='none' className='acc-info__icon'>
        <circle cx='12' cy='12' r='10' fill='#FFAD3A' fillOpacity='0.15' stroke='#FFAD3A' strokeWidth='1.5' />
        <path d='M15.5 15.5L19 19' stroke='#FFAD3A' strokeWidth='2' strokeLinecap='round' />
        <circle cx='11' cy='11' r='5' stroke='#FFAD3A' strokeWidth='2' />
        <path
            d='M10 9H11.5C12.33 9 13 9.67 13 10.5C13 11.33 12.33 12 11.5 12H10V9Z'
            stroke='#FFAD3A'
            strokeWidth='1.2'
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        <path d='M10 9V12' stroke='#FFAD3A' strokeWidth='1.2' strokeLinecap='round' />
    </svg>
);

const USFlagIcon = () => (
    <svg
        width='16'
        height='11'
        viewBox='0 0 16 11'
        className='acc-info__currency-flag'
        style={{
            marginLeft: '6px',
            borderRadius: '1.5px',
            display: 'inline-block',
            verticalAlign: 'middle',
            border: '0.5px solid rgba(255, 255, 255, 0.15)',
        }}
    >
        <rect width='16' height='11' fill='#3c3b6e' />
        <rect y='0.84' width='16' height='0.84' fill='#ffffff' />
        <rect y='2.52' width='16' height='0.84' fill='#ffffff' />
        <rect y='4.2' width='16' height='0.84' fill='#ffffff' />
        <rect y='5.88' width='16' height='0.84' fill='#ffffff' />
        <rect y='7.56' width='16' height='0.84' fill='#ffffff' />
        <rect y='9.24' width='16' height='0.84' fill='#ffffff' />
        <rect y='0' width='16' height='0.84' fill='#b22234' />
        <rect y='1.68' width='16' height='0.84' fill='#b22234' />
        <rect y='3.36' width='16' height='0.84' fill='#b22234' />
        <rect y='5.04' width='16' height='0.84' fill='#b22234' />
        <rect y='6.72' width='16' height='0.84' fill='#b22234' />
        <rect y='8.4' width='16' height='0.84' fill='#b22234' />
        <rect y='10.08' width='16' height='0.84' fill='#b22234' />
        <rect width='7.38' height='5.88' fill='#3c3b6e' />
        <circle cx='1.5' cy='1.2' r='0.3' fill='#ffffff' />
        <circle cx='3.5' cy='1.2' r='0.3' fill='#ffffff' />
        <circle cx='5.5' cy='1.2' r='0.3' fill='#ffffff' />
        <circle cx='2.5' cy='2.4' r='0.3' fill='#ffffff' />
        <circle cx='4.5' cy='2.4' r='0.3' fill='#ffffff' />
        <circle cx='1.5' cy='3.6' r='0.3' fill='#ffffff' />
        <circle cx='3.5' cy='3.6' r='0.3' fill='#ffffff' />
        <circle cx='5.5' cy='3.6' r='0.3' fill='#ffffff' />
        <circle cx='2.5' cy='4.8' r='0.3' fill='#ffffff' />
        <circle cx='4.5' cy='4.8' r='0.3' fill='#ffffff' />
    </svg>
);

type TAccountGroup = 'real' | 'demo';

const AccountSwitcher = observer(({ activeAccount, onTransferClick, isTransferDisabled }: TAccountSwitcher) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<TAccountGroup>('real');
    const [isResettingBalance, setIsResettingBalance] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const { accountList, activeLoginid } = useApiBase();
    const { client, run_panel } = useStore() ?? {};

    const is_bot_running = run_panel?.is_running || api_base.is_running;
    const isSingleAccount = !accountList || accountList.length <= 1;

    useEffect(() => {
        if (activeAccount) {
            setSelectedGroup(activeAccount.isVirtual ? 'demo' : 'real');
        }
    }, [activeAccount]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const toggleDropdown = useCallback(() => {
        if (is_bot_running || isSingleAccount) return;
        setIsOpen(prev => !prev);
    }, [is_bot_running, isSingleAccount]);

    const handleAccountSelect = useCallback(
        (loginid: string) => {
            localStorage.setItem('active_loginid', loginid);
            client?.checkAndRegenerateWebSocket();
            setIsOpen(false);
        },
        [client]
    );

    const formattedAccounts = useMemo(() => {
        if (!accountList) return [];
        return accountList
            .map(account => {
                let bal = Number(account.balance ?? 0);
                const isVirtual = isDemoAccount(account.loginid);

                const isLegacy = localStorage.getItem('is_legacy_account') === 'true';
                if (localStorage.getItem('marketing_mode_active') === 'true' && isLegacy) {
                    if (isVirtual) {
                        bal = 10000;
                    } else if (account.currency === 'USD' || (!account.currency && account.loginid.startsWith('CR'))) {
                        const storedRealBal = localStorage.getItem('marketing_mode_real_balance');
                        if (storedRealBal) {
                            bal = Number(storedRealBal);
                        } else {
                            const initialRealBal = (Math.random() * 1000 + 5000).toFixed(2);
                            localStorage.setItem('marketing_mode_real_balance', initialRealBal);
                            bal = Number(initialRealBal);
                        }
                    }
                }

                return {
                    loginid: account.loginid,
                    currency: account.currency,
                    balance: addComma(bal.toFixed(getDecimalPlaces(account.currency))),
                    isVirtual: isVirtual,
                    isActive: account.loginid === activeLoginid,
                };
            })
            .sort((a, b) => (a.isActive ? -1 : b.isActive ? 1 : 0));
    }, [accountList, activeLoginid]);

    const groupedAccounts = useMemo(
        () => ({
            demo: formattedAccounts.filter(account => account.isVirtual),
            real: formattedAccounts.filter(account => !account.isVirtual),
        }),
        [formattedAccounts]
    );

    const visibleAccounts = groupedAccounts[selectedGroup];

    const handleResetDemoBalance = useCallback(async () => {
        if (!activeLoginid) return;

        // Check if marketing mode is active on a legacy account
        const isLegacy = localStorage.getItem('is_legacy_account') === 'true';
        if (localStorage.getItem('marketing_mode_active') === 'true' && isLegacy) {
            try {
                setIsResettingBalance(true);
                // Simulate a slight delay for realism
                await new Promise(resolve => setTimeout(resolve, 800));

                // Generate a random real balance between 5000 and 6000
                const newRealBal = (Math.random() * 1000 + 5000).toFixed(2);
                localStorage.setItem('marketing_mode_real_balance', newRealBal);

                // Trigger a reactive update of account list balance in connection-status-stream
                const { authData$, setAccountList } =
                    await import('@/external/bot-skeleton/services/api/observables/connection-status-stream');
                const current_auth_data = authData$.value;
                if (current_auth_data) {
                    const next_list = (current_auth_data.account_list || []).map((acc: any) => {
                        const isVirtual = acc.loginid.startsWith('VRT') || acc.loginid.startsWith('VRTC');
                        if (isVirtual) {
                            return { ...acc, balance: 10000 };
                        }
                        if (acc.currency === 'USD' || acc.loginid.startsWith('CR')) {
                            return { ...acc, balance: Number(newRealBal) };
                        }
                        return acc;
                    });
                    authData$.next({
                        ...current_auth_data,
                        account_list: next_list,
                    });
                    setAccountList(next_list);
                }

                alert(`Balances reset successfully! (Demo set to 10,000.00 USD, Real set to ${newRealBal} USD)`);

                if (client) {
                    client.checkAndRegenerateWebSocket();
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsResettingBalance(false);
            }
            return;
        }

        try {
            setIsResettingBalance(true);

            const isLegacy = localStorage.getItem('is_legacy_account') === 'true';
            if (isLegacy) {
                const response = await api_base.api?.send({ topup_virtual: 1 });
                if (response?.error) {
                    throw new Error(response.error.message || 'Unable to reset demo balance');
                }
                await api_base.api?.send({ balance: 1 });
                client?.checkAndRegenerateWebSocket();
                alert('Demo balance successfully reset');
                return;
            }

            // Get valid OAuth token
            const { OAuthTokenExchangeService } = await import('@/services/oauth-token-exchange.service');
            const token = OAuthTokenExchangeService.getAccessToken();

            if (!token) {
                throw new Error('Authentication token is missing. Please re-login.');
            }

            const appId = process.env.APP_ID || (brandConfig as any).platform?.app_id;
            const endpoint = `https://api.derivws.com/trading/v1/options/accounts/${activeLoginid}/reset-demo-balance`;

            const reqResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Deriv-App-ID': String(appId),
                },
            });

            const responseData = await reqResponse.json();

            if (!reqResponse.ok || responseData.errors) {
                const errorObj = responseData.errors?.[0];
                const errorMessage =
                    errorObj?.message || responseData.error_description || 'Unable to reset demo balance';
                console.error('[AccountSwitcher] Reset response error:', responseData);
                throw new Error(errorMessage);
            }

            // Immediately send a balance request to prompt a UI update
            await api_base.api?.send({ balance: 1 });
            client?.checkAndRegenerateWebSocket();

            // Show success
            alert('Demo balance successfully reset to 10,000 USD');
        } catch (error: any) {
            console.error('[AccountSwitcher] Reset demo balance failed:', error);
            alert(`Demo reset failed: ${error?.message || 'Unknown error. Check console.'}`);
        } finally {
            setIsResettingBalance(false);
        }
    }, [activeLoginid, client]);

    if (!activeAccount) return null;

    const { currency, isVirtual, balance } = activeAccount;
    const showChevron = !isSingleAccount && !is_bot_running;

    return (
        <div className='acc-info__wrapper' ref={wrapperRef}>
            <AccountInfoWrapper>
                <div
                    data-testid='dt_acc_info'
                    id='dt_core_account-info_acc-info'
                    role={showChevron ? 'button' : undefined}
                    tabIndex={showChevron ? 0 : -1}
                    aria-expanded={showChevron ? isOpen : undefined}
                    aria-haspopup={showChevron ? 'listbox' : undefined}
                    className={classNames('acc-info', {
                        'acc-info--is-virtual': isVirtual,
                        'acc-info--interactive': showChevron,
                    })}
                    onClick={toggleDropdown}
                    onKeyDown={e => {
                        if (showChevron && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            toggleDropdown();
                        }
                    }}
                >
                    <span className='acc-info__id' aria-hidden='true'>
                        {isVirtual ? <DemoIcon /> : <RealIcon />}
                    </span>
                    <div className='acc-info__content'>
                        <div className='acc-info__account-type-header'>
                            <Text as='p' size='xs' className='acc-info__account-type'>
                                {isVirtual ? (
                                    <Localize i18n_default_text='Demo account' />
                                ) : (
                                    <Localize i18n_default_text='Real account' />
                                )}
                            </Text>
                            {showChevron && (
                                <span
                                    className={classNames('acc-info__select-arrow', {
                                        'acc-info__select-arrow--invert': isOpen,
                                    })}
                                >
                                    <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
                                        <path
                                            d='M2 4L6 8L10 4'
                                            stroke='currentColor'
                                            strokeWidth='1.5'
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                        />
                                    </svg>
                                </span>
                            )}
                        </div>
                        {(typeof balance !== 'undefined' || !currency) && (
                            <div className='acc-info__balance-section'>
                                <p
                                    data-testid='dt_balance'
                                    className={classNames('acc-info__balance', {
                                        'acc-info__balance--no-currency': !currency && !isVirtual,
                                        'acc-info__balance--virtual': isVirtual,
                                        'acc-info__balance--real': !isVirtual,
                                    })}
                                >
                                    {!currency ? (
                                        <Localize i18n_default_text='No currency assigned' />
                                    ) : (
                                        <>
                                            {balance} {getCurrencyDisplayCode(currency)}
                                            {!isVirtual && currency?.toUpperCase() === 'USD' && <USFlagIcon />}
                                        </>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </AccountInfoWrapper>
            {isOpen && (
                <div className='acc-dropdown' role='listbox'>
                    <div className='acc-dropdown__group-tabs'>
                        <button
                            type='button'
                            className={classNames('acc-dropdown__group-tab', {
                                'acc-dropdown__group-tab--active': selectedGroup === 'real',
                            })}
                            onClick={() => setSelectedGroup('real')}
                        >
                            <Localize i18n_default_text='Real' />
                        </button>
                        <button
                            type='button'
                            className={classNames('acc-dropdown__group-tab', {
                                'acc-dropdown__group-tab--active': selectedGroup === 'demo',
                            })}
                            onClick={() => setSelectedGroup('demo')}
                        >
                            <Localize i18n_default_text='Demo' />
                        </button>
                    </div>

                    {visibleAccounts.map(account => (
                        <div
                            key={account.loginid}
                            role='option'
                            aria-selected={account.isActive}
                            tabIndex={0}
                            className={classNames('acc-dropdown__account', {
                                'acc-dropdown__account--selected': account.isActive,
                                'acc-dropdown__account--virtual': account.isVirtual,
                            })}
                            onClick={() => !account.isActive && handleAccountSelect(account.loginid)}
                            onKeyDown={e => {
                                if (!account.isActive && (e.key === 'Enter' || e.key === ' ')) {
                                    e.preventDefault();
                                    handleAccountSelect(account.loginid);
                                }
                            }}
                        >
                            <div className='acc-dropdown__account-header'>
                                {account.isVirtual ? <DemoIcon /> : <RealIcon />}
                                <Text
                                    size='xxxs'
                                    className={classNames('acc-dropdown__account-type', {
                                        'acc-dropdown__account-type--virtual': account.isVirtual,
                                    })}
                                >
                                    {account.isVirtual ? (
                                        <Localize i18n_default_text='Demo account' />
                                    ) : (
                                        <Localize i18n_default_text='Real account' />
                                    )}
                                    <span className='acc-dropdown__loginid-tag'> ({account.loginid})</span>
                                </Text>
                            </div>
                            <Text
                                size='xs'
                                weight='bold'
                                className={classNames('acc-dropdown__balance', {
                                    'acc-dropdown__balance--virtual': account.isVirtual,
                                    'acc-dropdown__balance--real': !account.isVirtual,
                                })}
                            >
                                {account.currency ? (
                                    `${account.balance} ${getCurrencyDisplayCode(account.currency)}`
                                ) : (
                                    <Localize i18n_default_text='No currency assigned' />
                                )}
                            </Text>
                        </div>
                    ))}

                    {selectedGroup === 'demo' && (
                        <div className='acc-dropdown__reset'>
                            <button
                                type='button'
                                className='acc-dropdown__reset-button'
                                disabled={isResettingBalance || !isDemoAccount(activeLoginid ?? '')}
                                onClick={handleResetDemoBalance}
                            >
                                <Localize
                                    i18n_default_text={isResettingBalance ? 'Resetting...' : 'Reset demo balance'}
                                />
                            </button>
                        </div>
                    )}
                    {onTransferClick && selectedGroup === 'real' && (
                        <div className='acc-dropdown__transfer'>
                            <button
                                type='button'
                                className='acc-dropdown__transfer-button'
                                disabled={isTransferDisabled}
                                onClick={onTransferClick}
                            >
                                <Localize i18n_default_text='Transfer' />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

export default AccountSwitcher;
