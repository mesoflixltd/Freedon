import { observer } from '@/external/bot-skeleton/utils/observer';
import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import { getSocketURL } from '@/components/shared';

class CopyTradingService {
    private real_api: any = null;
    private real_token: string | null = null;
    private is_initializing = false;

    constructor() {
        this.registerListeners();
    }

    private registerListeners() {
        observer.register('bot.copy_trade', this.handleCopyTrade.bind(this));
    }

    private async getRealToken() {
        try {
            const accountsList = JSON.parse(localStorage.getItem('accountsList') ?? '{}');
            const clientAccounts = JSON.parse(localStorage.getItem('clientAccounts') ?? '{}');
            
            // Find the first non-virtual account
            const realLoginId = Object.keys(clientAccounts).find(loginId => !clientAccounts[loginId].is_virtual);
            
            if (realLoginId && accountsList[realLoginId]) {
                return accountsList[realLoginId];
            }
        } catch (error) {
            console.error('[CopyTrading] Error getting real token:', error);
        }
        return null;
    }

    private async initRealApi() {
        if (this.real_api && this.real_api.connection.readyState === WebSocket.OPEN) {
            return this.real_api;
        }

        if (this.is_initializing) {
            return new Promise((resolve) => {
                const check = setInterval(() => {
                    if (!this.is_initializing) {
                        clearInterval(check);
                        resolve(this.real_api);
                    }
                }, 100);
            });
        }

        this.is_initializing = true;
        try {
            const token = await this.getRealToken();
            if (!token) {
                throw new Error('No real account token found');
            }

            const wsURL = await getSocketURL();
            const socket = new WebSocket(wsURL);
            const api = new DerivAPIBasic({ connection: socket });

            await new Promise((resolve, reject) => {
                socket.onopen = resolve;
                socket.onerror = reject;
                setTimeout(() => reject(new Error('Connection timeout')), 10000);
            });

            const response = await api.authorize(token);
            if (response.error) {
                throw new Error(response.error.message);
            }

            this.real_api = api;
            this.real_token = token;
            console.log('[CopyTrading] Real API initialized and authorized');
            return api;
        } catch (error) {
            console.error('[CopyTrading] Failed to initialize Real API:', error);
            return null;
        } finally {
            this.is_initializing = false;
        }
    }

    private async handleCopyTrade({ contract_type, trade_options }: { contract_type: string, trade_options: any }) {
        console.log('[CopyTrading] Duplicate trade triggered:', contract_type);
        
        try {
            const api = await this.initRealApi();
            if (!api) {
                observer.emit('ui.log.error', 'Copytrading failed: Could not connect to Real account.');
                return;
            }

            // 1. Get proposal for the real account
            const proposal_req = {
                proposal: 1,
                subscribe: 0,
                amount: trade_options.amount,
                basis: trade_options.basis,
                contract_type: contract_type,
                currency: 'USD', // Should ideally get from real account info
                duration: trade_options.duration,
                duration_unit: trade_options.duration_unit,
                symbol: trade_options.symbol,
            };

            const proposal_res = await api.send(proposal_req);
            if (proposal_res.error) {
                throw new Error(`Proposal failed: ${proposal_res.error.message}`);
            }

            // 2. Buy the proposal
            const buy_res = await api.send({
                buy: proposal_res.proposal.id,
                price: proposal_res.proposal.ask_price,
            });

            if (buy_res.error) {
                throw new Error(`Buy failed: ${buy_res.error.message}`);
            }

            console.log('[CopyTrading] Successfully duplicated trade on Real account:', buy_res.buy.transaction_id);
            observer.emit('ui.log.success', `Trade duplicated to Real account: ${buy_res.buy.transaction_id}`);
            
        } catch (error) {
            console.error('[CopyTrading] Error duplicating trade:', error);
            observer.emit('ui.log.error', `Copytrading error: ${error.message}`);
        }
    }
}

export const copyTradingService = new CopyTradingService();
