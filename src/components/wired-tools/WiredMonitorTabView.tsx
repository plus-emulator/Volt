import { FC, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../api';
import monitorElementOne from '../../assets/images/wired/native/menu_monitor_1.png';
import monitorElementTwo from '../../assets/images/wired/native/menu_monitor_2.png';
import { ClassicScrollAreaView } from '../../common';
import { loadNativeFont, measureNativeText } from '../../common/native-text/NativeFont';
import { nativeTextStyles } from '../../common/native-text/NativeTextStyles';
import { MONITOR_COLOR_GREEN } from './WiredCreatorTools.constants';
import { MonitorLog, MonitorStat } from './WiredCreatorTools.types';
import { WiredMenuLabel } from '../../common/native-text/WiredMenuLabel';
import { WiredMenuButton, WiredMenuItem, WiredMenuPanel, WiredMenuTable, WiredMenuTitle } from './WiredMenuParts';

export interface WiredMonitorTabViewProps {
    /** Room stats and error logs have not arrived yet (WiredMenuDefaultTab loading_view). */
    loading: boolean;
    /** Wired write permission; the official tab disables "Clear all" without it. */
    canClear: boolean;
    /** WiredMenuController.hasReadPermission: the log overview needs read access. */
    canOpenLogs: boolean;
    monitorStats: MonitorStat[];
    monitorLogs: MonitorLog[];
    /** Opens the room's paged wired log window. */
    onOpenRoomLogs: () => void;
    onClearMonitorLogs: () => void;
    /** Opens the error information window for a row; every row links to it, as officially. */
    onOpenMonitorErrorInfo: (log: MonitorLog) => void;
}

const STAT_FONT_SIZE = 11;

/** A statistics `html` window (font_size 11): the label in black and the value in its colour, drawn as one native text line. */
const WiredMonitorStatLine: FC<{ stat: MonitorStat }> = ({ stat }) => {
    const text = stat.value ? `${stat.label} ${stat.value}` : stat.label;
    const [valueLeft, setValueLeft] = useState<number>(null);

    useEffect(() => {
        let disposed = false;
        const style = { ...nativeTextStyles.u_regular, size: STAT_FONT_SIZE };
        loadNativeFont(style)
            .then(({ font }) => {
                if (!disposed) setValueLeft(Math.floor(2 + measureNativeText(font, `${stat.label} `, style)));
            })
            .catch(() => undefined);
        return () => {
            disposed = true;
        };
    }, [stat.label]);

    return (
        <div className="volt-wired-menu__stat">
            <WiredMenuLabel size={STAT_FONT_SIZE} text={text} />
            {stat.value && stat.color && valueLeft !== null && (
                <WiredMenuLabel
                    className="volt-wired-menu__stat-value"
                    color={parseInt(stat.color, 16)}
                    size={STAT_FONT_SIZE}
                    style={{ clipPath: `inset(0 0 0 ${valueLeft}px)` }}
                    text={text}
                />
            )}
        </div>
    );
};

/** The "Monitor" tab (monitor_container of wired_menu_view): statistics, the monitor picture and the error log table. */
export const WiredMonitorTabView = (props: WiredMonitorTabViewProps) => {
    const { loading, canClear, canOpenLogs, monitorStats, monitorLogs, onOpenRoomLogs, onClearMonitorLogs, onOpenMonitorErrorInfo } = props;
    // updateImageUI: Frank panics on a heavy room, any non-green figure or any thrown error; image 2 is the layout default.
    const panicking = loading || monitorStats.some((stat) => stat.alarm && stat.color && stat.color !== MONITOR_COLOR_GREEN) || monitorLogs.some((log) => log.amount !== '0');

    return (
        <>
            <WiredMenuTitle h={19} w={106} x={14} y={18}>
                {localizeWithFallback('wiredmenu.monitor.statistics', 'Statistics:')}
            </WiredMenuTitle>
            <WiredMenuPanel h={99} w={204} x={14} y={38}>
                {/* scrollable_itemlist_vertical 197x89, items 16px high with a spacing of 2. */}
                <WiredMenuItem h={89} w={197} x={5} y={5}>
                    <ClassicScrollAreaView className="size-full" scrollStep={18}>
                        {monitorStats.map((stat) => (
                            <WiredMonitorStatLine key={stat.label} stat={stat} />
                        ))}
                    </ClassicScrollAreaView>
                </WiredMenuItem>
            </WiredMenuPanel>
            <WiredMenuItem className="volt-wired-menu__monitor-image" h={145} w={256} x={230} y={4}>
                <img alt="" draggable={false} src={panicking ? monitorElementTwo : monitorElementOne} />
            </WiredMenuItem>
            <WiredMenuTitle h={19} w={106} x={14} y={152}>
                {localizeWithFallback('wiredmenu.monitor.log', 'Logs:')}
            </WiredMenuTitle>
            <WiredMenuTable
                columns={[
                    { key: 'type', title: localizeWithFallback('wiredmenu.monitor.column.type', 'Type'), factor: 0.33 },
                    { key: 'category', title: localizeWithFallback('wiredmenu.monitor.column.category', 'Category'), factor: 0.22 },
                    { key: 'amount', title: localizeWithFallback('wiredmenu.monitor.column.occurrences', 'Amount'), factor: 0.15 },
                    { key: 'latest', title: localizeWithFallback('wiredmenu.monitor.column.latest', 'Latest occurrence'), factor: 0.3 }
                ]}
                h={156}
                rows={monitorLogs.map((log, index) => ({
                    key: `${log.errorId}-${index}`,
                    cells: { type: log.type, category: log.category, amount: log.amount, latest: log.latest },
                    cellTitles: { latest: log.latestTooltip },
                    links: { type: () => onOpenMonitorErrorInfo(log) }
                }))}
                w={472}
                x={14}
                y={172}
            />
            <WiredMenuButton danger={true} disabled={!canClear} h={30} w={110} x={14} y={337} onClick={onClearMonitorLogs}>
                {localizeWithFallback('wiredmenu.monitor.clear_all', 'Clear all')}
            </WiredMenuButton>
            <WiredMenuButton disabled={!canOpenLogs} h={30} w={110} x={375} y={337} onClick={onOpenRoomLogs}>
                {localizeWithFallback('wiredmenu.monitor.log_overview', 'View full logs')}
            </WiredMenuButton>
            {/* loading_view: 500x382 over the tab body, 0x99e9e9e1, swallowing input. */}
            {loading && <WiredMenuItem className="volt-wired-menu__loading" h={382} w={500} x={0} y={0} />}
        </>
    );
};
