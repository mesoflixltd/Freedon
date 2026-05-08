import { action, computed, makeObservable, observable } from 'mobx';
/* [AI] - Analytics removed - utility functions moved to @/utils/account-helpers */
import { getAccountId } from '@/utils/account-helpers';
/* [/AI] */
import { isEmptyObject } from '@/components/shared';
import { isMultipliersOnly, isOptionsBlocked } from '@/components/shared/common/utility';
import { removeCookies } from '@/components/shared/utils/storage/storage';
import { observer as globalObserver, observer } from '@/external/bot-skeleton';
import { api_base } from '@/external/bot-skeleton/services/api/api-base';
import { ErrorLogger } from '@/utils/error-logger';
import type { Balance } from '@deriv/api-types';
import {
    authData$,
    setAccountList,
    setAuthData,
    setIsAuthorized,
} from '../external/bot-skeleton/services/api/observables/connection-status-stream';
import type { TAuthData } from '../types/api-types';
import type RootStore from './root-store';

export default class ClientStore {
    loginid = '';
    account_list: TAuthData['account_list'] = [];
    balance = '0';
    currency = 'AUD';
    is_logged_in = false;
    is_account_regenerating = false;

    accounts: Record<string, NonNullable<TAuthData['account_list']>[number]> = {};
    all_accounts_balance: Balance | null = null;
    is_logging_out = false;

    private authDataSubscription: { unsubscribe: () => void } | null = null;
    private root_store: RootStore;
    private tab_visibility_handler: ((event: Event) => void) | null = null;
    private ws_login_id: string | null = null;
    private is_regenerating = false;
    private instance_id: string = '';

    // TODO: fix with self exclusion

    onAuthorizeEvent = (data: {
        account_list?: TAuthData['account_list'];
        current_account?: { loginid: string; currency: string; is_virtual: number; balance?: number };
    }) => {
        if (data?.account_list) {
            this.setAccountList(data.account_list);
        }

        // Update current account details from new API structure
        if (data?.current_account) {
            const isLegacy = localStorage.getItem('is_legacy_account') === 'true';
            const isMarketingMode = localStorage.getItem('marketing_mode_active') === 'true' && isLegacy;

            const realLoginid = data.current_account.loginid;
            const uiLoginid = isMarketingMode ? localStorage.getItem('active_loginid') || realLoginid : realLoginid;

            this.setLoginId(uiLoginid);
            this.setCurrency(data.current_account.currency);
            this.setIsLoggedIn(true);

            if (!isMarketingMode) {
                localStorage.setItem('active_loginid', realLoginid);
            } else {
                localStorage.setItem('marketing_mode_real_loginid', realLoginid);
            }

            // Store the login ID used for WebSocket connection
            this.setWebSocketLoginId(realLoginid);

            if (typeof data.current_account.balance === 'number') {
                let balVal = data.current_account.balance;
                if (isMarketingMode) {
                    const isVirtual = uiLoginid.startsWith('VRT') || uiLoginid.startsWith('VRTC');
                    if (isVirtual) {
                        balVal = 10000;
                    } else if (data.current_account.currency === 'USD') {
                        const storedRealBal = localStorage.getItem('marketing_mode_real_balance');
                        balVal = storedRealBal ? Number(storedRealBal) : balVal;
                    }
                }
                this.setBalance(balVal.toString());
            }
        }
    };

    constructor(root_store: RootStore) {
        this.root_store = root_store;
        // Subscribe to auth data changes to synchronize MobX state with RxJS authData$ in real-time
        this.authDataSubscription = authData$.subscribe(authData => {
            if (authData) {
                const isLegacy = localStorage.getItem('is_legacy_account') === 'true';
                const isMarketingMode = localStorage.getItem('marketing_mode_active') === 'true' && isLegacy;

                const realLoginid = authData.loginid;
                const uiLoginid = isMarketingMode ? localStorage.getItem('active_loginid') || realLoginid : realLoginid;

                this.setLoginId(uiLoginid);
                if (authData.currency) {
                    this.setCurrency(authData.currency);
                }
                this.setIsLoggedIn(true);

                if (isMarketingMode) {
                    localStorage.setItem('marketing_mode_real_loginid', realLoginid);
                }

                if (authData.account_list) {
                    this.setAccountList(authData.account_list);
                }

                if (typeof authData.balance !== 'undefined') {
                    let balVal = authData.balance;
                    if (isMarketingMode) {
                        const isVirtual = uiLoginid.startsWith('VRT') || uiLoginid.startsWith('VRTC');
                        if (isVirtual) {
                            balVal = 10000;
                        } else if (authData.currency === 'USD') {
                            const storedRealBal = localStorage.getItem('marketing_mode_real_balance');
                            balVal = storedRealBal ? Number(storedRealBal) : balVal;
                        }
                    }
                    this.setBalance(balVal.toString());
                }
            }
        });

        observer.register('api.authorize', this.onAuthorizeEvent);

        // Clean up any existing instance before registering new one to prevent memory leaks
        const existingId = globalObserver.getState('client.store.id');
        if (existingId) {
            globalObserver.setState({ 'client.store': null, 'client.store.id': null });
        }

        // Register this instance with the global observer so api-base can access it
        // Store a reference to this instance with a cryptographically secure unique ID to prevent memory leaks
        // Use crypto.getRandomValues for better uniqueness and security than Math.random()
        this.instance_id = `client_store_${Date.now()}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
        globalObserver.setState({ 'client.store': this, 'client.store.id': this.instance_id });

        // Set up visibility change listener to regenerate WebSocket when tab becomes visible
        this.setupVisibilityListener();

        makeObservable(this, {
            accounts: observable,
            account_list: observable,

            all_accounts_balance: observable,
            balance: observable,
            currency: observable,

            is_logged_in: observable,
            is_account_regenerating: observable,
            loginid: observable,
            is_logging_out: observable,
            active_accounts: computed,
            is_bot_allowed: computed,

            is_eu_or_multipliers_only: computed,
            is_low_risk: computed,
            is_multipliers_only: computed,
            is_options_blocked: computed,
            is_virtual: computed,

            residence: computed,

            logout: action,
            onAuthorizeEvent: action,
            setAccountList: action,

            setAllAccountsBalance: action,
            setIsAccountRegenerating: action,
            setBalance: action,
            setCurrency: action,
            setIsLoggedIn: action,
            setIsLoggingOut: action,
            setLoginId: action,

            is_trading_experience_incomplete: computed,
            is_cr_account: computed,
            account_open_date: computed,
        });
    }

    get active_accounts() {
        return this.accounts instanceof Object
            ? Object.values(this.accounts).filter(account => !(account as any).is_disabled)
            : [];
    }

    get is_bot_allowed() {
        return this.isBotAllowed();
    }
    get is_trading_experience_incomplete() {
        return false;
    }

    get is_low_risk() {
        return false;
    }

    get residence() {
        return '';
    }

    get is_options_blocked() {
        return isOptionsBlocked(this.residence);
    }

    get is_multipliers_only() {
        return isMultipliersOnly(this.residence);
    }

    get is_eu_or_multipliers_only() {
        // Always return false - EU restrictions now handled by backend
        return false;
    }

    get is_virtual() {
        return !isEmptyObject(this.accounts) && this.accounts[this.loginid] && !!this.accounts[this.loginid].is_virtual;
    }

    get all_loginids() {
        return !isEmptyObject(this.accounts) ? Object.keys(this.accounts) : [];
    }

    get virtual_account_loginid() {
        return this.all_loginids.find(loginid => !!this.accounts[loginid].is_virtual);
    }

    get is_cr_account() {
        return this.loginid?.startsWith('CR');
    }

    get should_hide_header() {
        return false;
    }

    get account_open_date() {
        if (isEmptyObject(this.accounts) || !this.accounts[this.loginid]) return undefined;
        return Object.keys(this.accounts[this.loginid]).includes('created_at')
            ? (this.accounts[this.loginid] as any).created_at
            : undefined;
    }

    isBotAllowed = () => {
        return this.is_virtual ? this.is_eu_or_multipliers_only : !this.is_options_blocked;
    };

    setLoginId = (loginid: string) => {
        this.loginid = loginid;
    };

    setAccountList = (account_list?: TAuthData['account_list']) => {
        this.accounts = {};
        account_list?.forEach(account => {
            this.accounts[account.loginid] = account;
        });
        if (account_list) this.account_list = account_list;
    };

    setBalance = (balance: string) => {
        this.balance = balance;
    };

    setCurrency = (currency: string) => {
        this.currency = currency;
    };

    setIsLoggedIn = (is_logged_in: boolean) => {
        this.is_logged_in = is_logged_in;
    };

    getCurrency = () => {
        const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') ?? '{}');
        return clientAccounts[this.loginid]?.currency ?? '';
    };

    getToken = () => {
        const accountList = JSON.parse(localStorage.getItem('accountsList') ?? '{}');
        return accountList[this.loginid] ?? '';
    };

    setAllAccountsBalance = (all_accounts_balance: Balance | undefined) => {
        this.all_accounts_balance = all_accounts_balance ?? null;
    };
    setIsAccountRegenerating = (is_loading: boolean) => {
        this.is_account_regenerating = is_loading;
    };

    setIsLoggingOut = (is_logging_out: boolean) => {
        this.is_logging_out = is_logging_out;
    };

    /**
     * Request logout via WebSocket (legacy method for backward compatibility)
     * @returns Promise with logout response
     */

    logout = async () => {
        if (localStorage.getItem('active_loginid')) {
            // Clear DerivAPI singleton instance and close WebSocket
            const { clearDerivApiInstance } = await import('@/external/bot-skeleton/services/api/appId');
            clearDerivApiInstance();

            // Clear accounts cache from DerivWSAccountsService
            const { DerivWSAccountsService } = await import('@/services/derivws-accounts.service');
            DerivWSAccountsService.clearStoredAccounts();
            DerivWSAccountsService.clearCache();

            // Clear OAuth token from sessionStorage
            const { OAuthTokenExchangeService } = await import('@/services/oauth-token-exchange.service');
            OAuthTokenExchangeService.clearAuthInfo();

            // Reset all the states
            this.account_list = [];
            this.accounts = {};
            this.is_logged_in = false;
            this.loginid = '';
            this.balance = '0';
            this.currency = 'USD';
            this.all_accounts_balance = null;

            // Clear localStorage
            localStorage.removeItem('active_loginid');
            localStorage.removeItem('accountsList');
            localStorage.removeItem('authToken');
            localStorage.removeItem('clientAccounts');
            localStorage.removeItem('account_type');
            localStorage.removeItem('is_legacy_account');
            localStorage.removeItem('mesoflix_account_v2');

            // Clear sessionStorage
            sessionStorage.clear();

            // Clear cookies
            removeCookies('client_information');

            // Reset observables
            setIsAuthorized(false);
            setAccountList([]);
            setAuthData(null);

            this.setIsLoggingOut(false);

            // Disable livechat
            window.LC_API?.close_chat?.();
            window.LiveChatWidget?.call('hide');

            // Shutdown and initialize intercom
            if (window.Intercom) {
                window.Intercom('shutdown');
                window.DerivInterCom.initialize({
                    hideLauncher: true,
                    token: null,
                });
            }
        }
    };

    /**
     * Sets up visibility change listener to regenerate WebSocket when tab becomes visible
     */
    setupVisibilityListener() {
        // Remove existing listener if any
        this.removeVisibilityListener();

        // Create handler function
        this.tab_visibility_handler = async () => {
            if (document.visibilityState === 'visible' && !this.is_regenerating) {
                // ✅ FIX: Don't regenerate WebSocket if bot is currently running
                const isBotRunning = this.root_store?.run_panel?.is_running || false;
                if (this.is_logged_in && !isBotRunning) {
                    this.checkAndRegenerateWebSocket();
                }
            }
        };

        // Add listener
        document.addEventListener('visibilitychange', this.tab_visibility_handler);
    }

    /**
     * Set the current WebSocket login ID
     * @param login_id The login ID used for the WebSocket connection
     */
    setWebSocketLoginId(login_id: string) {
        this.ws_login_id = login_id;
    }

    /**
     * Check if WebSocket needs to be regenerated based on login ID comparison
     * @returns True if WebSocket needs regeneration, false otherwise
     */
    needsWebSocketRegeneration(): boolean {
        const active_login_id = getAccountId();

        // If marketing mode is active on a legacy account, we don't switch/regenerate WebSocket
        // when changing between demo and real accounts, because the physical connection
        // always stays pre-authorized on the demo account under the hood.
        const isLegacy = localStorage.getItem('is_legacy_account') === 'true';
        const isMarketingMode = localStorage.getItem('marketing_mode_active') === 'true' && isLegacy;
        if (isMarketingMode) {
            return false;
        }

        // ✅ CRITICAL FIX: Don't regenerate WebSocket while bot is running
        // This prevents the bot from getting stuck after the first trade completes
        const isBotRunning = this.root_store?.run_panel?.is_running || false;

        return (
            !this.is_regenerating &&
            !!active_login_id &&
            !!this.ws_login_id &&
            active_login_id !== this.ws_login_id &&
            !api_base.is_running &&
            !isBotRunning // 🔧 ADDED: prevents regeneration during bot execution
        );
    }

    /**
     * Check if WebSocket needs regeneration and regenerate if needed
     */
    checkAndRegenerateWebSocket() {
        const isLegacy = localStorage.getItem('is_legacy_account') === 'true';
        const isMarketingMode = localStorage.getItem('marketing_mode_active') === 'true' && isLegacy;

        if (isMarketingMode) {
            const active_login_id = getAccountId();
            if (active_login_id) {
                const isVirtual = active_login_id.startsWith('VRT') || active_login_id.startsWith('VRTC');
                localStorage.setItem('account_type', isVirtual ? 'demo' : 'real');

                // Update ClientStore states manually
                this.setLoginId(active_login_id);

                let balVal = 10000;
                if (!isVirtual) {
                    const active_currency = this.getCurrency() || this.currency || 'USD';
                    if (active_currency === 'USD') {
                        const storedRealBal = localStorage.getItem('marketing_mode_real_balance');
                        balVal = storedRealBal ? Number(storedRealBal) : 5000;
                    } else {
                        const matched_acc = (this.account_list || []).find((a: any) => a.loginid === active_login_id);
                        balVal = matched_acc ? Number(matched_acc.balance) : 0;
                    }
                }
                this.setBalance(balVal.toString());

                // Fetch current list and update authData$ / account_list$
                const current_auth_data = authData$.value;
                let updated_list = this.account_list;
                if (current_auth_data) {
                    updated_list = (current_auth_data.account_list || []).map((acc: any) => {
                        const isVirtualAcc = acc.loginid.startsWith('VRT') || acc.loginid.startsWith('VRTC');
                        if (isVirtualAcc) {
                            return { ...acc, balance: 10000 };
                        }
                        if (acc.currency === 'USD') {
                            const storedRealBal = localStorage.getItem('marketing_mode_real_balance');
                            return { ...acc, balance: storedRealBal ? Number(storedRealBal) : 5000 };
                        }
                        return acc;
                    });

                    const is_virtual = isVirtual ? 1 : 0;
                    authData$.next({
                        ...current_auth_data,
                        loginid: active_login_id,
                        is_virtual,
                        balance: balVal,
                        account_list: updated_list,
                    });
                    setAccountList(updated_list);
                }

                // Trigger api.authorize event to alert observer listeners (like onAuthorizeEvent in other places or itself)
                globalObserver.emit('api.authorize', {
                    account_list: updated_list,
                    current_account: {
                        loginid: this.ws_login_id || active_login_id,
                        currency: this.currency || 'USD',
                        is_virtual: isVirtual ? 1 : 0,
                        balance: balVal,
                    },
                });
            }
            return;
        }

        if (this.needsWebSocketRegeneration()) {
            this.regenerateWebSocket();
        }
    }

    /**
     * Regenerate WebSocket connection with the new login ID
     * This method clears all data and creates a new connection with the current active login ID
     * Protected against race conditions with the is_regenerating flag
     * Includes error handling to prevent users from being stuck in loading state
     */
    async regenerateWebSocket() {
        if (this.is_regenerating) return;

        this.is_regenerating = true;
        this.setIsAccountRegenerating(true);

        try {
            const active_login_id = getAccountId();

            if (active_login_id) {
                // Clear DerivAPI singleton instance to force new connection
                const { clearDerivApiInstance } = await import('@/external/bot-skeleton/services/api/appId');
                clearDerivApiInstance();

                // Clear accounts cache but keep stored accounts for reuse
                const { DerivWSAccountsService } = await import('@/services/derivws-accounts.service');
                DerivWSAccountsService.clearCache();

                this.account_list = [];

                this.accounts = {};
                this.setIsLoggedIn(false);

                this.balance = '0';
                this.currency = 'USD';

                this.all_accounts_balance = null;

                const isLegacy = localStorage.getItem('is_legacy_account') === 'true';
                if (isLegacy) {
                    // For legacy accounts, synchronize authToken with the newly selected active_login_id
                    const accountsList = JSON.parse(localStorage.getItem('accountsList') || '{}');
                    const activeToken = accountsList[active_login_id || ''];
                    if (activeToken) {
                        localStorage.setItem('authToken', activeToken);
                    }
                } else {
                    localStorage.removeItem('accountsList');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('clientAccounts');
                    localStorage.removeItem('account_type'); // Clear account type on logout
                    removeCookies('client_information');

                    setIsAuthorized(false);
                    setAccountList([]);
                    setAuthData(null);
                }

                this.setIsLoggingOut(false);

                // disable livechat
                window.LC_API?.close_chat?.();
                window.LiveChatWidget?.call('hide');

                // Force create a new connection with the current active login ID
                // Wrap the potentially failing init call in a try-catch
                try {
                    await api_base.init(true); // ✅ Await the async call
                } catch (initError) {
                    ErrorLogger.error('ClientStore', 'WebSocket initialization failed', initError);
                    this.setIsAccountRegenerating(false);
                    throw initError; // Re-throw to be caught by outer catch if needed
                }

                // Update the tracked WebSocket login ID
                this.setWebSocketLoginId(active_login_id);
            }
        } catch (error) {
            ErrorLogger.error('ClientStore', 'WebSocket regeneration failed', error);
            this.setIsAccountRegenerating(false);
            // Consider showing user-facing error notification here
            // or dispatching an event that UI components can listen to
        } finally {
            this.is_regenerating = false;
        }
    }

    /**
     * Removes the visibility change listener
     */
    removeVisibilityListener() {
        if (this.tab_visibility_handler) {
            document.removeEventListener('visibilitychange', this.tab_visibility_handler);
            this.tab_visibility_handler = null;
        }
    }

    destroy() {
        this.authDataSubscription?.unsubscribe();
        observer.unregister('api.authorize', this.onAuthorizeEvent);
        this.removeVisibilityListener();

        // Properly clean up the global observer reference
        // Only clear if this instance is the one referenced by checking the instance ID
        const storedId = globalObserver.getState('client.store.id');
        if (storedId === this.instance_id) {
            globalObserver.setState({ 'client.store': null, 'client.store.id': null });
        }
    }
}
