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
    DASHBOARD: 0,
    BOT_BUILDER: 1,
    CHART: 2,
    DCIRCLES: 3,
    FREEBOTS: 4,
    AI_HUB: 5,
    CLASSES: 6,
    RISK_CALCULATOR: 7,
    TUTORIAL: 8,
    TRADING_VIEW: 9,
});

export const MAX_STRATEGIES = 10;

export const TAB_IDS = [
    'id-dbot-dashboard',
    'id-bot-builder',
    'id-charts',
    'id-dcircles',
    'id-freebots',
    'id-ai-hub',
    'id-classes',
    'id-risk-calculator',
    'id-tutorials',
    'id-trading-view',
];

export const DEBOUNCE_INTERVAL_TIME = 500;
