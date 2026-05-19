type TTabsTitle = {
    [key: string]: string | number;
};

type TDashboardTabIndex = {
    [key: string]: number;
};

export const tabs_title: TTabsTitle = Object.freeze({
    WORKSPACE: 'Workspace',
    CHART: 'Chart',
});

export const DBOT_TABS: TDashboardTabIndex = Object.freeze({
    CAMPAIGNS: 0,
    DASHBOARD: 1,
    BOT_BUILDER: 2,
    CHART: 3,
    DCIRCLES: 4,
    FREEBOTS: 5,
    MEMBERSHIP_BOTS: 6,
    AI_HUB: 7,
    CLASSES: 8,
    TRADING_VIEW: 9,
    RISK_CALCULATOR: 10,
    TUTORIAL: 11,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-campaigns',
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-charts',
    'id-dcircles',
    'id-freebots',
    'id-membership-bots',
    'id-ai-hub',
    'id-classes',
    'id-trading-view',
    'id-risk-calculator',
    'id-tutorials',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
