import contextInspectionIcon from '../../assets/images/wiredtools/context.png';
import furniInspectionIcon from '../../assets/images/wiredtools/furni.png';
import globalInspectionIcon from '../../assets/images/wiredtools/global.png';
import userInspectionIcon from '../../assets/images/wiredtools/user.png';
import { InspectionElementButton, VariablesElementButton, WiredToolsTab } from './WiredCreatorTools.types';

export const TABS: Array<{ key: WiredToolsTab; label: string }> = [
    { key: 'monitor', label: 'Monitor' },
    { key: 'variables', label: 'Variables' },
    { key: 'inspection', label: 'Inspection' },
    { key: 'chests', label: 'Chests' },
    { key: 'settings', label: 'Settings' }
];

// WiredMenuMonitorTab.POLL_MONITOR_MS
export const WIRED_MONITOR_POLL_MS = 500;
// WiredMenuMonitorTab.CLEAR_LOGS_TIMEOUT: Clear stays disabled this long after it was pressed.
export const WIRED_MONITOR_CLEAR_LOCK_MS = 4000;
export const WIRED_VARIABLES_POLL_MS = 250;
// WiredMenuOverviewTab.POLL_MS
export const WIRED_VARIABLE_OVERVIEW_POLL_MS = 500;
export const WIRED_CLOCK_REFRESH_MS = 50;

export const INSPECTION_ELEMENTS: InspectionElementButton[] = [
    { key: 'furni', label: 'Furni', icon: furniInspectionIcon },
    { key: 'user', label: 'User', icon: userInspectionIcon },
    { key: 'global', label: 'Global', icon: globalInspectionIcon }
];

export const VARIABLES_ELEMENTS: VariablesElementButton[] = [
    { key: 'furni', label: 'Furni', icon: furniInspectionIcon },
    { key: 'user', label: 'User', icon: userInspectionIcon },
    { key: 'global', label: 'Global', icon: globalInspectionIcon },
    { key: 'context', label: 'Context', icon: contextInspectionIcon }
];

/** wired_menu_view statistics html captions, in WiredMenuMonitorTab.updateRoomStatsUI order. */
export const MONITOR_STAT_CAPTIONS: string[] = [
    'Wired usage:',
    'Is heavy:',
    'Floor furni:',
    'Wall furni:',
    'Permanent furni vars:',
    'Permanent user vars:',
    'Permanent global vars:'
];

export const MONITOR_COLOR_RED = 'ff5733';
export const MONITOR_COLOR_ORANGE = 'BD7800';
export const MONITOR_COLOR_GREEN = '008000';
