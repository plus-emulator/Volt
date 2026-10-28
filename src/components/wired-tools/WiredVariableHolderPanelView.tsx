import { KeyboardEvent, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { localizeWithFallback } from '../../api';
import { DraggableWindowPosition, VoltCardHeaderView, VoltCardView } from '../../common';
import { NativeText } from '../../common/native-text/NativeText';
import { WiredMenuLabel } from '../../common/native-text/WiredMenuLabel';
import { WiredMenuHtmlText } from './WiredMenuHtmlText';
import { WiredMenuButton, WiredMenuItem, WiredMenuTable, WiredMenuTitle } from './WiredMenuParts';

export interface WiredHolderPanelEntry {
    id: string;
    name: string;
    hasValue: boolean;
    value: bigint | number | null;
    isReadOnly?: boolean;
}

export interface WiredHolderPanelGiveOption {
    id: string;
    name: string;
    hasValue: boolean;
}

export interface WiredVariableHolderPanelViewProps {
    title: string;
    infoText: string;
    onRefresh: () => void;
    onClose: () => void;
    /** The frame's help button; without it the frame has none. */
    onHelp?: () => void;
    preview: ReactNode;
    infoLines: string[];
    variablesTitle: string;
    entries: WiredHolderPanelEntry[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    canEdit: boolean;
    editingId: string | null;
    editingValue: string;
    onBeginEdit: (entry: WiredHolderPanelEntry) => void;
    onEditingValueChange: (value: string) => void;
    onEditBlur: () => void;
    onEditKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    isGiveOpen: boolean;
    /** The "Give variable" button, which opens the create bubble. */
    canOpenGive: boolean;
    onToggleGive: () => void;
    giveOptions: WiredHolderPanelGiveOption[];
    giveSelectedId: string;
    onGiveSelect: (id: string) => void;
    giveValue: string;
    onGiveValueChange: (value: string) => void;
    /** The bubble's "Create" button. */
    canGive: boolean;
    onGive: () => void;
    canRemove: boolean;
    onRemove: () => void;
    status?: ReactNode;
    extraActions?: ReactNode;
    uniqueKey?: string;
}

/** variables_management_detail: a 339x512 frame 3 window whose client starts 33 px down; it resizes in height between 400 and 650. */
const WINDOW_WIDTH = 339;
/** The info html window: auto size "center", word wrap in 218 px, leading 1. */
const INFO_WIDTH = 218;
const INFO_LINE_HEIGHT = 15;
const PREVIEW_SIZE = 94;
const STATUS_HEIGHT = 24;
const EXTRA_ACTIONS_HEIGHT = 28;

/** PermanentVariableHolderPreviewer.centerContainer: the preview bitmap is centred in the preview border, on whole pixels. */
const CentredPreview = ({ children }: { children: ReactNode }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState<{ left: number; top: number }>(null);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;

        // A bitmap is measured by its own size: the avatar view's box is larger than the cropped head it draws.
        const update = () => {
            const image = element.querySelector('img');
            const width = image ? image.naturalWidth : element.offsetWidth;
            const height = image ? image.naturalHeight : element.offsetHeight;
            setOffset(width && height ? { left: Math.floor((PREVIEW_SIZE - width) / 2), top: Math.floor((PREVIEW_SIZE - height) / 2) } : null);
        };
        const observer = new ResizeObserver(update);
        observer.observe(element);
        element.addEventListener('load', update, true);
        update();

        return () => {
            observer.disconnect();
            element.removeEventListener('load', update, true);
        };
    }, []);

    return (
        <div ref={ref} className="volt-wired-varmanage-detail__preview-image" style={offset ? { left: offset.left, top: offset.top } : { visibility: 'hidden' }}>
            {children}
        </div>
    );
};

/**
 * The holder detail window of the creator tools (AIR VariableManagementDetailView): who the holder is, the variables they hold, a value
 * edited after a double click, and remove / give. Pure view; the caller owns the data and the writes.
 */
export const WiredVariableHolderPanelView = (props: WiredVariableHolderPanelViewProps) => {
    const {
        title,
        infoText,
        onRefresh,
        onClose,
        onHelp,
        preview,
        infoLines,
        variablesTitle,
        entries,
        selectedId,
        onSelect,
        canEdit,
        editingId,
        editingValue,
        onBeginEdit,
        onEditingValueChange,
        onEditBlur,
        onEditKeyDown,
        isGiveOpen,
        canOpenGive,
        onToggleGive,
        giveOptions,
        giveSelectedId,
        onGiveSelect,
        giveValue,
        onGiveValueChange,
        canGive,
        onGive,
        canRemove,
        onRemove,
        status = null,
        extraActions = null,
        uniqueKey = 'wired-variable-management-entry'
    } = props;
    const selectedGiveOption = giveOptions.find((option) => option.id === giveSelectedId) ?? null;
    const [tableArea, setTableArea] = useState<HTMLDivElement>(null);
    const [tableHeight, setTableHeight] = useState(0);
    const extrasHeight = (status ? STATUS_HEIGHT : 0) + (extraActions ? EXTRA_ACTIONS_HEIGHT : 0);

    // The values container stretches with the window height; the table view fills it.
    useEffect(() => {
        if (!tableArea) return;

        const observer = new ResizeObserver(() => setTableHeight(tableArea.clientHeight));
        observer.observe(tableArea);

        return () => observer.disconnect();
    }, [tableArea]);

    const valueCell = (entry: WiredHolderPanelEntry): ReactNode => {
        if (!entry.hasValue) return '';
        if (editingId !== entry.id) return String(entry.value ?? 0);

        return (
            <input
                autoFocus
                className="volt-wired-menu__cell-input"
                spellCheck={false}
                type="text"
                value={editingValue}
                onBlur={onEditBlur}
                onChange={(event) => onEditingValueChange(event.target.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDownCapture={onEditKeyDown}
            />
        );
    };

    return (
        <VoltCardView
            className="volt-wired-varmanage-detail"
            frameStyle={3}
            resizeAxis="vertical"
            theme="primary-slim"
            uniqueKey={uniqueKey}
            windowPosition={DraggableWindowPosition.CENTER}
        >
            <VoltCardHeaderView headerText="" onCloseClick={onClose}>
                <WiredMenuLabel align="button" className="volt-wired-menu__caption" color={0xffffff} text={title} textStyle="u_frame_title" width={WINDOW_WIDTH - 14} />
                {!!onHelp && (
                    <button
                        aria-label={localizeWithFallback('generic.help', 'Help')}
                        className="volt-wired-varmanage-detail__help"
                        type="button"
                        onClick={onHelp}
                        onMouseDownCapture={(event) => event.stopPropagation()}
                    />
                )}
            </VoltCardHeaderView>
            <div className="volt-wired-varmanage__client">
                <WiredMenuItem className="volt-wired-varmanage__box" h={57} w={228} x={18} y={7}>
                    <WiredMenuHtmlText wordWrap lineHeight={INFO_LINE_HEIGHT} style={{ left: 5, top: 12 }} text={infoText} width={INFO_WIDTH} />
                </WiredMenuItem>
                <WiredMenuButton h={30} w={62} x={259} y={20} onClick={onRefresh}>
                    {localizeWithFallback('wiredmenu.list_view.refresh', 'Refresh')}
                </WiredMenuButton>
                <WiredMenuTitle h={19} w={188} x={18} y={73}>
                    {localizeWithFallback('wiredmenu.variable_management_detail.holder_info', 'Holder info:')}
                </WiredMenuTitle>
                <WiredMenuItem className="volt-wired-varmanage-detail__preview" h={PREVIEW_SIZE} w={PREVIEW_SIZE} x={18} y={93}>
                    <CentredPreview>{preview}</CentredPreview>
                </WiredMenuItem>
                <WiredMenuItem className="volt-wired-varmanage-detail__info-box" h={94} w={194} x={127} y={93}>
                    <NativeText
                        nativeResolution
                        transparent
                        background={0xffffff}
                        maxWidth={182}
                        style={{ position: 'absolute', left: 6, top: 6 }}
                        text={infoLines.join('\n')}
                        textStyle="u_regular"
                    />
                </WiredMenuItem>
                <WiredMenuTitle h={19} w={188} x={18} y={196}>
                    {variablesTitle}
                </WiredMenuTitle>
                <div ref={setTableArea} className="volt-wired-varmanage-detail__values" style={{ bottom: 52 + extrasHeight }}>
                    {tableHeight > 0 && (
                        <WiredMenuTable
                            columns={[
                                { key: 'variable', title: localizeWithFallback('wiredmenu.inspection.variables.variable', 'Variable'), factor: 0.65, align: 'left' },
                                { key: 'value', title: localizeWithFallback('wiredmenu.inspection.variables.value', 'Value'), factor: 0.35, align: 'right' }
                            ]}
                            h={tableHeight}
                            rows={entries.map((entry) => ({
                                key: entry.id,
                                selected: selectedId === entry.id,
                                onSelect: () => onSelect(entry.id),
                                onCellDoubleClick: (column) => {
                                    if (column === 'value' && canEdit && entry.hasValue && !entry.isReadOnly) onBeginEdit(entry);
                                },
                                cells: { variable: entry.name, value: valueCell(entry) },
                                cellTitles: { variable: entry.name }
                            }))}
                            w={303}
                            x={0}
                            y={0}
                        />
                    )}
                </div>
                {extrasHeight > 0 && (
                    <div className="volt-wired-varmanage-detail__extras" style={{ height: extrasHeight }}>
                        {status}
                        {extraActions}
                    </div>
                )}
                <div className="volt-wired-varmanage-detail__actions">
                    <WiredMenuButton disabled={!canRemove} h={25} w={145} x={18} y={0} onClick={onRemove}>
                        {localizeWithFallback('wiredmenu.inspection.delete', 'Remove variable')}
                    </WiredMenuButton>
                    <WiredMenuButton disabled={!canOpenGive} h={25} w={145} x={176} y={0} onClick={onToggleGive}>
                        {localizeWithFallback('wiredmenu.inspection.add', 'Give variable')}
                    </WiredMenuButton>
                    {isGiveOpen && (
                        <WiredMenuItem className="volt-wired-menu__bubble" h={145} w={186} x={140} y={-145}>
                            <WiredMenuTitle h={17} w={158} x={6} y={6}>
                                {localizeWithFallback('wiredmenu.inspection.select_variable', 'Variable:')}
                            </WiredMenuTitle>
                            <WiredMenuItem h={22} w={158} x={6} y={26}>
                                <div className="volt-wired-menu__dropdown-wrap">
                                    <select className="volt-wired-menu__dropdown" value={selectedGiveOption?.id ?? ''} onChange={(event) => onGiveSelect(event.target.value)}>
                                        {!giveOptions.length && <option value="">No variables available</option>}
                                        {giveOptions.map((option) => (
                                            <option key={option.id} value={option.id}>
                                                {option.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </WiredMenuItem>
                            <WiredMenuTitle h={17} w={158} x={6} y={52}>
                                {localizeWithFallback('wiredmenu.inspection.select_value', 'Value:')}
                            </WiredMenuTitle>
                            <WiredMenuItem className="volt-wired-menu__value-box" h={22} w={80} x={6} y={72}>
                                <input
                                    disabled={!selectedGiveOption?.hasValue}
                                    type="number"
                                    value={giveValue}
                                    onChange={(event) => onGiveValueChange(event.target.value)}
                                />
                            </WiredMenuItem>
                            <WiredMenuButton disabled={!canGive} h={25} w={158} x={6} y={100} onClick={onGive}>
                                {localizeWithFallback('wiredmenu.inspection.create', 'Create')}
                            </WiredMenuButton>
                        </WiredMenuItem>
                    )}
                </div>
            </div>
        </VoltCardView>
    );
};
