import { lazy, Suspense } from 'react';
import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider, Navigate } from 'react-router-dom';
import ChunkLoader from '@/components/loader/chunk-loader';
import LocalStorageSyncWrapper from '@/components/localStorage-sync-wrapper';
import RoutePromptDialog from '@/components/route-prompt-dialog';
import { useAccountSwitching } from '@/hooks/useAccountSwitching';
import { useLanguageFromURL } from '@/hooks/useLanguageFromURL';
import { useOAuthCallback } from '@/hooks/useOAuthCallback';
import { StoreProvider } from '@/hooks/useStore';
import { OAuthTokenExchangeService } from '@/services/oauth-token-exchange.service';
import { initializeI18n, localize, TranslationProvider } from '@deriv-com/translations';
import CoreStoreProvider from './CoreStoreProvider';
import './app-root.scss';

const Layout = lazy(() => import('../components/layout'));
const AppRoot = lazy(() => import('./app-root'));
const SelectionPage = lazy(() => import('../pages/selection/SelectionPage'));
const Error404Page = lazy(() => import('../pages/error404/Error404Page'));
const MembershipBots = lazy(() => import('../pages/membership-bots'));

const SelectionGuard = ({ children }: { children: React.ReactNode }) => {
    // SelectionGuard is now effectively a placeholder as we conjoined the process
    return <>{children}</>;
};

// Translations CDN is optional — requires TRANSLATIONS_CDN_URL, R2_PROJECT_NAME, and CROWDIN_BRANCH_NAME env vars.
// Without these, the app defaults to English. See user-guide/03-white-labeling.md#translations for setup instructions.
const i18nInstance = initializeI18n({ cdnUrl: '' });

/**
 * Component wrapper to handle language URL parameter
 * Uses the useLanguageFromURL hook to process language switching
 */
const LanguageHandler = ({ children }: { children: React.ReactNode }) => {
    useLanguageFromURL();
    return <>{children}</>;
};

const router = createBrowserRouter(
    createRoutesFromElements(
        <Route>
            <Route
                path='/selection'
                element={
                    <Suspense fallback={<ChunkLoader message={localize('Loading...')} />}>
                        <SelectionPage />
                    </Suspense>
                }
            />
            <Route path='/index.html' element={<Navigate to='/' replace />} />
            <Route path='/bot.html' element={<Navigate to='/' replace />} />
            <Route
                path='/'
                element={
                    <Suspense
                        fallback={<ChunkLoader message={localize('Please wait while we connect to the server...')} />}
                    >
                        <TranslationProvider defaultLang='EN' i18nInstance={i18nInstance}>
                            <LanguageHandler>
                                <SelectionGuard>
                                    <StoreProvider>
                                        <LocalStorageSyncWrapper>
                                            <RoutePromptDialog />
                                            <CoreStoreProvider>
                                                <Layout />
                                            </CoreStoreProvider>
                                        </LocalStorageSyncWrapper>
                                    </StoreProvider>
                                </SelectionGuard>
                            </LanguageHandler>
                        </TranslationProvider>
                    </Suspense>
                }
            >
                {/* All child routes will be passed as children to Layout */}
                <Route index element={<AppRoot />} />
            </Route>

            <Route
                path='/market/admin'
                element={
                    <Suspense fallback={<ChunkLoader message={localize('Loading Admin Portal...')} />}>
                        <TranslationProvider defaultLang='EN' i18nInstance={i18nInstance}>
                            <LanguageHandler>
                                <StoreProvider>
                                    <LocalStorageSyncWrapper>
                                        <CoreStoreProvider>
                                            <MembershipBots isAdminRoute={true} />
                                        </CoreStoreProvider>
                                    </LocalStorageSyncWrapper>
                                </StoreProvider>
                            </LanguageHandler>
                        </TranslationProvider>
                    </Suspense>
                }
            />
            <Route
                path='/market/admin/'
                element={
                    <Suspense fallback={<ChunkLoader message={localize('Loading Admin Portal...')} />}>
                        <TranslationProvider defaultLang='EN' i18nInstance={i18nInstance}>
                            <LanguageHandler>
                                <StoreProvider>
                                    <LocalStorageSyncWrapper>
                                        <CoreStoreProvider>
                                            <MembershipBots isAdminRoute={true} />
                                        </CoreStoreProvider>
                                    </LocalStorageSyncWrapper>
                                </StoreProvider>
                            </LanguageHandler>
                        </TranslationProvider>
                    </Suspense>
                }
            />

            <Route
                path='*'
                element={
                    <Suspense fallback={<ChunkLoader message={localize('Loading...')} />}>
                        <Error404Page />
                    </Suspense>
                }
            />
        </Route>
    )
);

/**
 * Main App component
 *
 * Responsibilities:
 * 1. OAuth callback handling (via useOAuthCallback hook)
 * 2. Account switching from URL (via useAccountSwitching hook)
 * 3. Router provider setup
 *
 * All complex logic has been extracted into custom hooks for better maintainability
 */
function App() {
    // Handle OAuth callback flow (CSRF validation + code extraction)
    const { isProcessing, isValid, params, error, cleanupURL } = useOAuthCallback();

    // Handle account switching via URL parameter
    useAccountSwitching();

    // Intercept URL for Marketing Mode /tcx (activation) and /txc (deactivation)
    React.useEffect(() => {
        const handleMarketingModeURL = () => {
            const href = window.location.href.toLowerCase();
            const has_tcx =
                href.includes('/tcx') || href.includes('?tcx') || href.includes('#tcx') || href.includes('tcx=');
            const has_txc =
                href.includes('/txc') || href.includes('?txc') || href.includes('#txc') || href.includes('txc=');

            if (has_tcx) {
                const isLegacy =
                    localStorage.getItem('is_legacy_account') === 'true' ||
                    localStorage.getItem('accountsList') !== null;
                if (!isLegacy) {
                    console.warn('[Marketing Mode] Activation ignored: Current account is not a legacy account.');
                } else {
                    localStorage.setItem('is_legacy_account', 'true');
                    localStorage.setItem('marketing_mode_active', 'true');
                    if (!localStorage.getItem('marketing_mode_real_balance')) {
                        const initialRealBal = (Math.random() * 1000 + 5000).toFixed(2);
                        localStorage.setItem('marketing_mode_real_balance', initialRealBal);
                    }
                }

                // Clean the trigger from url
                let cleanHref = window.location.href
                    .replace(/\?tcx/gi, '')
                    .replace(/\/tcx/gi, '')
                    .replace(/#tcx/gi, '')
                    .replace(/tcx=/gi, '');

                window.history.replaceState({}, document.title, cleanHref);
                window.location.replace(cleanHref);
            } else if (has_txc) {
                localStorage.removeItem('marketing_mode_active');
                localStorage.removeItem('marketing_mode_real_balance');

                // Clean the trigger from url
                let cleanHref = window.location.href
                    .replace(/\?txc/gi, '')
                    .replace(/\/txc/gi, '')
                    .replace(/#txc/gi, '')
                    .replace(/txc=/gi, '');

                window.history.replaceState({}, document.title, cleanHref);
                window.location.replace(cleanHref);
            }
        };

        handleMarketingModeURL();

        window.addEventListener('popstate', handleMarketingModeURL);
        window.addEventListener('hashchange', handleMarketingModeURL);
        return () => {
            window.removeEventListener('popstate', handleMarketingModeURL);
            window.removeEventListener('hashchange', handleMarketingModeURL);
        };
    }, []);

    // Process the authorization code when OAuth callback is valid
    React.useEffect(() => {
        if (isProcessing) return;

        if (isValid) {
            // Handle Legacy Platform Flow On-site
            if (params.isLegacy) {
                console.log('🔄 Legacy account detected, initializing legacy platform flow on-site...');

                const urlParams = new URLSearchParams(window.location.search);
                const accounts: Array<{ account_id: string; token: string; currency: string }> = [];
                let index = 1;
                while (urlParams.has(`acct${index}`) && urlParams.has(`token${index}`)) {
                    const account_id = urlParams.get(`acct${index}`)!;
                    const token = urlParams.get(`token${index}`)!;
                    const currency = urlParams.get(`cur${index}`) || 'USD';
                    accounts.push({ account_id, token, currency });
                    index++;
                }

                if (accounts.length > 0) {
                    // Store legacy flag and clear V2 flag
                    localStorage.setItem('is_legacy_account', 'true');
                    localStorage.removeItem('tradq_account_v2');
                    localStorage.removeItem('mesoflix_account_v2');

                    // Set active loginid to first account
                    const firstAccount = accounts[0];
                    localStorage.setItem('active_loginid', firstAccount.account_id);
                    localStorage.setItem('authToken', firstAccount.token);

                    // Set account type
                    const isDemo =
                        firstAccount.account_id.startsWith('VRT') || firstAccount.account_id.startsWith('VRTC');
                    localStorage.setItem('account_type', isDemo ? 'demo' : 'real');

                    // Populate legacy localStorage keys for bot-skeleton compatibility
                    const accountsList: Record<string, string> = {};
                    const clientAccounts: Record<string, any> = {};
                    const derivAccounts: Array<{
                        account_id: string;
                        balance: string;
                        currency: string;
                        group: string;
                        status: string;
                        account_type: 'demo' | 'real';
                    }> = [];

                    accounts.forEach(acc => {
                        const acc_is_demo = acc.account_id.startsWith('VRT') || acc.account_id.startsWith('VRTC');
                        accountsList[acc.account_id] = acc.token;
                        clientAccounts[acc.account_id] = {
                            currency: acc.currency,
                            is_virtual: acc_is_demo ? 1 : 0,
                            loginid: acc.account_id,
                        };
                        derivAccounts.push({
                            account_id: acc.account_id,
                            balance: '0',
                            currency: acc.currency,
                            group: 'options',
                            status: 'active',
                            account_type: acc_is_demo ? 'demo' : 'real',
                        });
                    });

                    localStorage.setItem('accountsList', JSON.stringify(accountsList));
                    localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
                    sessionStorage.setItem('deriv_accounts', JSON.stringify(derivAccounts));

                    cleanupURL();
                    window.location.replace(window.location.origin);
                }
                return;
            }

            // Handle New Platform V2 Auth Flow
            if (params.code) {
                // Exchange authorization code for access token
                OAuthTokenExchangeService.exchangeCodeForToken(params.code)
                    .then((response: any) => {
                        if (response.access_token) {
                            cleanupURL();
                            // Mark V2 as active since it succeeded
                            localStorage.setItem('tradq_account_v2', 'true');
                            localStorage.setItem('mesoflix_account_v2', 'true');
                            localStorage.removeItem('is_legacy_account');
                            window.location.replace(window.location.origin);
                        } else if (response.error) {
                            console.error('❌ Token exchange failed:', response.error);
                            cleanupURL();
                            window.location.replace(window.location.origin);
                        }
                    })
                    .catch((error: any) => {
                        console.error('❌ Token exchange request failed:', error);
                        cleanupURL();
                        window.location.replace(window.location.origin);
                    });
            }
        } else if (error) {
            console.error('OAuth callback error:', error);
        }
    }, [isProcessing, isValid, params.code, params.isLegacy, error, cleanupURL]);

    return <RouterProvider router={router} />;
}

export default App;
