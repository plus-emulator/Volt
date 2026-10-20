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

export const WIRED_MONITOR_ACTION_FETCH = 0;
export const WIRED_MONITOR_ACTION_CLEAR_LOGS = 1;
// WiredMenuMonitorTab.POLL_MONITOR_MS
export const WIRED_MONITOR_POLL_MS = 500;
// WiredMenuMonitorTab.CLEAR_LOGS_TIMEOUT: Clear stays disabled this long after it was pressed.
export const WIRED_MONITOR_CLEAR_LOCK_MS = 4000;
export const WIRED_VARIABLES_POLL_MS = 250;
// WiredMenuOverviewTab.POLL_MS
export const WIRED_VARIABLE_OVERVIEW_POLL_MS = 500;
export const WIRED_CLOCK_REFRESH_MS = 50;

/**
 * Monitor log types. `errorId` marks the six the official client knows: their text is its
 * `wiredmenu.error_info.<errorId>` localization (pinned from the AIR default localizations as the
 * fallback). The other types are this hotel's own and keep their own text.
 */
export const MONITOR_ERROR_INFO: Record<string, { description: string; errorId?: number; severity: string; title: string }> = {
    WIRED_LOG: {
        title: 'WIRED_LOG',
        severity: 'INFO',
        description: 'A line a "write to logs" box in this room wrote, at the level the box was set to.\n\nNothing is wrong with the engine: the room itself asked for this line, usually to show what a setup is doing while it is being built.\n\nOpen the room log to read the lines and filter them by level.'
    },
    UNREACHABLE: {
        title: 'UNREACHABLE',
        severity: 'WARNING',
        description: 'A furni in this room is waiting on something the room has no way of producing, so it will sit there doing nothing.\n\nA highscore board is the usual case: it only fills when a game ends, and a game can only end through a game timer. Without one in the room the board stays empty forever.\n\nNothing has failed. The furni is fine and so is the engine - the room is simply missing the piece that would feed it.'
    },
    NO_TARGETS: {
        title: 'NO_TARGETS',
        severity: 'WARNING',
        description: 'A chain fired and one of its effects had nothing to act on, so it did nothing.\n\nThe reason names which source came back empty. "The triggering item" is empty when the trigger is not about a furni at all; "the selector" is empty when no selector picked anything; "the picked furni" is empty when the chosen furni have since been taken up.\n\nThis is not an engine error. It means the setup asked for something that was not there, which until now was the one way a chain could fail in complete silence.'
    },
    EXECUTION_CAP: {
        title: 'EXECUTION_CAP',
        severity: 'ERROR',
        errorId: 0,
        description: 'This error occurs when the maximum Wired usage limit (which can be observed in the "Monitor" tab) is about to be exceeded by a Wired execution.\nWhen this happens, the execution of Wired will be cancelled, such that the Wired usage limit is never exceeded.\n\nReaching the execution cap too quickly may be a sign of an inefficient Wired setup.\nIf your Wired setup is not too complex, you should investigate how to improve the setup to avoid this error from unexpectedly happening. The Wired usage is a great indicator of your room\'s Wired complexity, and other factors (such as lag in the Habbo servers) are not at play.'
    },
    DELAYED_EVENTS_CAP: {
        title: 'DELAYED_EVENTS_CAP',
        severity: 'ERROR',
        errorId: 1,
        description: 'Delayed Wired events happen when you execute a Wired effect that has a delay configured.\nThere is a limit to how many of these delayed Wired events can be awaiting execution at the same time, otherwise a smart setup with Wired signals could cause a memory leak in the Habbo servers.\n\nIn any normal scenario, it would be rare to receive this error. If for some reason you do, you may have made an error in your Wired setup. If you haven\'t made an error, you should transform your Wired setup to use Wired counters instead'
    },
    EXECUTOR_OVERLOAD: {
        title: 'EXECUTOR_OVERLOAD',
        severity: 'ERROR',
        errorId: 2,
        description: 'This error occurs when the Wired engine is receiving a lot of instructions, but the Habbo servers can not keep up with it.\nThis is usually a sign of server issues, and may not necessarily have to do anything with your room.\n\nIf your room also gives the "MARKED_AS_HEAVY" warning, your room may be a contributing factor and you could look into making the Wired setup less complex'
    },
    MARKED_AS_HEAVY: {
        title: 'MARKED_AS_HEAVY',
        severity: 'WARNING',
        errorId: 3,
        description: 'The Habbo servers are analyzing the time it takes to execute your Wired setup at all times, and may consider it to be a "heavy" Wired setup if certain boundaries are exceeded. What happens as a result, is that your room is treated slightly different to avoid it from interfering with other rooms in the hotel. There is no reason to panic as this is not an error, but just a warning. However, you shouldn\'t completely ignore it too.\n\nWhat this means for a wired creator is:\n- Ignore the message if Habbo is lagging, it may not be related to your wired setup.\n- Ignore this message if your room is actually a complex wired room. It\'s just a notification in that case, so you\'re aware.\n- If none of the above, and it\'s supposed to be a simple room, then you\'re doing something wrong and should probably improve the Wired setup.'
    },
    KILLED: {
        title: 'KILLED',
        severity: 'ERROR',
        errorId: 4,
        description: 'This is an error that occurs when the Habbo server suspect your room from having malicious Wired intentions. For that reason, the exact criteria for when this happens will not be disclosed.\n\nThe penalty for this error is that Wired execution is halted for 10 minutes.'
    },
    RECURSION_TIMEOUT: {
        title: 'RECURSION_TIMEOUT',
        severity: 'ERROR',
        errorId: 5,
        description: 'Recursive wired events happen when signals execute other Wired stacks in the room. It may do that 10, 100, or 1000+ times before actually concluding the Wired execution. If the Habbo servers analyze that this is taking too long, it will stop your Wired execution.\n\nThis Wired error rarely occurs, but it sometimes does when there is lag on the Habbo servers and the Wired room is either inefficient or complex.\nIn most cases, another Wired error will already have stopped your Wired execution before this error can occur.'
    }
};

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
