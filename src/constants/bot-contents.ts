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
    MEMBERSHIP_BOTS: 1,
    DASHBOARD: 2,
    BOT_BUILDER: 3,
    CHART: 4,
    DCIRCLES: 5,
    FREEBOTS: 6,
    AI_HUB: 7,
    CLASSES: 8,
    TRADING_VIEW: 9,
    RISK_CALCULATOR: 10,
    TUTORIAL: 11,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-campaigns',
    'id-membership-bots',
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-charts',
    'id-dcircles',
    'id-freebots',
    'id-ai-hub',
    'id-classes',
    'id-trading-view',
    'id-risk-calculator',
    'id-tutorials',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
