import { CreateLinkEvent, GetRoomEngine, GetSessionDataManager } from '@volt/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    isWiredVolterStyle,
    LocalizeText,
    localizeWithFallback,
    resolveWiredStyle,
    unreleasedWiredTitleKey,
    WiredFurniType,
    WiredSelectionVisualizer,
    wiredStyleClassName,
    wiredStyleWidth,
    wiredWidthMultiplier
} from '../../../api';
import { IsTouchLayout, useVoltLayout } from '../../../api/touch';
import { isUsingAdvancedSettings } from '../../../api/wired/WiredAdvancedSettings';
import volterAtlas from '../../../assets/images/wired/volter_shell_atlas.png';
import { VoltCardContentView, VoltCardView, Text } from '../../../common';
import { useWired, useWiredTools } from '../../../hooks';
import { WiredBannerCanvas } from './WiredBannerCanvas';
import { useWiredTouchCollapse, WiredNativeContext } from './WiredNativeContext';
import { WiredFurniSelectorSection, WiredFurniSelectorView } from './WiredFurniSelectorView';
import { WiredSection, WiredSplitter } from './WiredSection';
import { WiredShellButton, WiredShellHeaderView } from './WiredShellHeaderView';
import { WIRED_ADVANCED_SURFACE_COLOR, WiredSurfaceContext, WiredText } from './WiredText';
import { WiredVolterBorderView, WiredVolterFrameView } from './WiredVolterFrameView';
import { finalizeWiredVariablePickers } from './WiredVariablePickerHistory';

// The official frame is centred while it is still its 108px minimum height and then grows downwards.
const WIRED_OPEN_HEIGHT = 108;

export type WiredSaveConfirmation = (confirm: () => void, cancel: () => void) => void;

export interface WiredBaseViewProps {
    wiredType: string;
    requiresFurni: number;
    hasSpecialInput: boolean;
    save: () => void;
    validate?: () => boolean;
    /** AIR element.requireConfirmation, requested only on an actual save (not Copy). */
    confirmSave?: WiredSaveConfirmation;
    cardStyle?: CSSProperties;
    /** Runtime AIR width modifier, e.g. neighborhood small/large drawing mode. */
    widthMultiplier?: number;
    footer?: ReactNode;
    /** Source-type controls placed beside the AIR summary header. */
    headerControls?: ReactNode;
    footerCollapsible?: boolean;
    /** AIR advancedAlwaysVisible: the footer is the expanded AdvancedSettingsWrapperPreset (advancedBackgroundColor) with no toggle. */
    advancedAlwaysVisible?: boolean;
    selectionPreview?: ReactNode;
    /** False keeps furni picking on but leaves its section out, for views that show it elsewhere. */
    showSelection?: boolean;
    /** Children are native sections (WiredSection) that bring their own splitters instead of one padded body. */
    nativeLayout?: boolean;
    /** The action delay section: native frames put it after the furni picks, legacy ones keep it with the body. */
    delay?: ReactNode;
    legacyDelay?: ReactNode;
}

export const WiredBaseView: FC<PropsWithChildren<WiredBaseViewProps>> = (props) => {
    const {
        wiredType = '',
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        confirmSave = undefined,
        children = null,
        hasSpecialInput = false,
        cardStyle = undefined,
        widthMultiplier = 1,
        footer = null,
        headerControls = null,
        footerCollapsible = true,
        advancedAlwaysVisible = false,
        selectionPreview = null,
        showSelection = true,
        nativeLayout = false,
        delay = null,
        legacyDelay = null
    } = props;
    const [needsSave, setNeedsSave] = useState<boolean>(false);
    const [keepOpenOnSave, setKeepOpenOnSave] = useState<boolean>(false);
    const [showFooter, setShowFooter] = useState(false);
    const [pasteInto, setPasteInto] = useState(false);
    const layout = useVoltLayout();
    const isTouch = IsTouchLayout(layout);
    const { areaSelectionActive, cancelAreaSelection, roomPickCollapsed, setRoomPickCollapsed } = useWiredTouchCollapse();
    const {
        trigger = null,
        setTrigger = null,
        setIntParams = null,
        setStringParam = null,
        setFurniIds = null,
        furniIds = [],
        secondaryFurniIds = [],
        activePickSlot = 0,
        setAllowsFurni = null,
        saveWired = null,
        saveWiredAndKeepOpen = null,
        clipboardEntry = null,
        copyWiredToClipboard = null,
        pasteWiredFromClipboard = null,
        resetWiredToDefault = null,
        clearWiredPicks = null
    } = useWired();
    const { roomSettings, activeWiredStyle } = useWiredTools();
    const furniData = trigger ? GetSessionDataManager().getFloorItemData(trigger.spriteId) : null;
    const unreleasedTitleKey = unreleasedWiredTitleKey(wiredType, trigger?.code);
    const wiredName = (unreleasedTitleKey && LocalizeText(unreleasedTitleKey)) || furniData?.name || `NAME: ${trigger?.spriteId ?? -1}`;
    const shellStyle = resolveWiredStyle(activeWiredStyle, furniData?.className);
    const isVolter = isWiredVolterStyle(shellStyle);
    const isNative = shellStyle === 'illumina';
    const iconOffset = { action: 0, trigger: 16, condition: 32, selector: 48, extra: 64, variable: 80 }[wiredType];
    const [summaryKind = '', summaryName = ''] = (wiredName || '').split(':', 2);

    const clearRoomAreaSelection = () => {
        GetRoomEngine().areaSelectionManager.clearHighlight();
        GetRoomEngine().areaSelectionManager.deactivate();
    };

    const pendingConfirmation = useRef<object | null>(null);
    // A pending dialog cannot commit into a different editor or a closed editor.
    useEffect(() => () => { pendingConfirmation.current = null; }, [trigger]);
    const onClose = () => {
        pendingConfirmation.current = null;
        clearRoomAreaSelection();
        WiredSelectionVisualizer.clearAllSelectionShaders();
        setTrigger(null);
    };

    const completeSave = useRef<(keepOpen: boolean) => void>(() => {});
    completeSave.current = (keepOpen) => {
        if (!roomSettings.canModify || (validate && !validate())) return;
        if (save) save();
        // AIR VariablePickerPreset.finalizeSelection: a saved selection enters the picker history (NewVariablePicker.as:329-336).
        finalizeWiredVariablePickers();
        setKeepOpenOnSave(keepOpen);
        setNeedsSave(true);
    };
    const onSave = (keepOpen: boolean = false) => {
        if (!roomSettings.canModify || pendingConfirmation.current || (validate && !validate())) return;
        if (!confirmSave) { completeSave.current(keepOpen); return; }
        const request = {};
        pendingConfirmation.current = request;
        confirmSave(() => {
            if (pendingConfirmation.current !== request) return;
            pendingConfirmation.current = null;
            completeSave.current(keepOpen);
        }, () => {
            if (pendingConfirmation.current === request) pendingConfirmation.current = null;
        });
    };

    useEffect(() => {
        if (!needsSave) return;

        if (keepOpenOnSave && saveWiredAndKeepOpen) saveWiredAndKeepOpen();
        else saveWired();

        setNeedsSave(false);
        setKeepOpenOnSave(false);
    }, [needsSave, keepOpenOnSave, saveWired, saveWiredAndKeepOpen]);

    const canEdit = !!roomSettings.canModify;
    const onCopy = () => {
        if (validate && !validate()) return;

        if (save) save();

        copyWiredToClipboard?.();
    };
    const menuItems: Array<{ id: string; label: string; disabled: boolean; onClick: () => void; checked?: boolean } | null> = [
        { id: 'copy', label: localizeWithFallback('wiredfurni.params.menu.copy', 'Copy'), disabled: !canEdit, onClick: onCopy },
        {
            id: 'paste',
            label: localizeWithFallback('wiredfurni.params.menu.paste', 'Paste'),
            disabled: !canEdit || !clipboardEntry,
            onClick: () => pasteWiredFromClipboard?.(pasteInto)
        },
        {
            id: 'paste-into',
            label: localizeWithFallback('wiredfurni.params.menu.paste_into', 'Paste into (keep picks and delay)'),
            disabled: !canEdit,
            checked: pasteInto,
            onClick: () => setPasteInto((value) => !value)
        },
        null,
        {
            id: 'clear-picks',
            label: localizeWithFallback('wiredfurni.params.menu.clear_picks', 'Clear furni picks'),
            disabled: !canEdit || (!furniIds?.length && !secondaryFurniIds?.length),
            onClick: () => clearWiredPicks?.()
        },
        { id: 'reset', label: localizeWithFallback('wiredfurni.params.menu.reset', 'Reset to default'), disabled: !canEdit, onClick: () => resetWiredToDefault?.() },
        null
    ];
    const shellMenuItems = [
        ...menuItems,
        { id: 'open-menu', label: localizeWithFallback('wiredfurni.params.menu.open_menu', 'Open Menu'), disabled: false, onClick: () => CreateLinkEvent('wiredmenu/open') },
        null,
        { id: 'save', label: localizeWithFallback('wiredfurni.params.menu.save', 'Save'), disabled: !canEdit, onClick: () => onSave(true) },
        { id: 'close', label: localizeWithFallback('wiredfurni.params.menu.close', 'Close'), disabled: false, onClick: onClose }
    ];

    useEffect(() => {
        if (!trigger) return;

        // AIR opens the advanced section expanded when it holds a non-default choice (UserDefinedRoomEventsCtrl.as:703).
        setShowFooter(isUsingAdvancedSettings(trigger, wiredType));

        WiredSelectionVisualizer.clearAllSelectionShaders();

        if (hasSpecialInput) {
            setIntParams(trigger.intData);
            setStringParam(trigger.stringData);
        }
    }, [trigger, wiredType, hasSpecialInput, setIntParams, setStringParam]);

    useEffect(() => {
        if (!trigger) return;

        setFurniIds((prevValue) => {
            if (prevValue && prevValue.length) WiredSelectionVisualizer.clearSelectionShaderFromFurni(prevValue);

            // A native inactive pick list is still saved editor data, even when this view cannot pick.

            if (trigger.selectedItems && trigger.selectedItems.length) {
                WiredSelectionVisualizer.applySelectionShaderToFurni(trigger.selectedItems);

                return trigger.selectedItems;
            }

            return [];
        });
    }, [trigger, setFurniIds]);

    useEffect(() => {
        return () => clearRoomAreaSelection();
    }, []);

    useEffect(() => {
        if (!trigger) return;

        setAllowsFurni(requiresFurni);
    }, [trigger, requiresFurni, setAllowsFurni]);

    const resolvedCardStyle: CSSProperties = { ...cardStyle };

    const cardWidth = Math.trunc(wiredStyleWidth(shellStyle) * wiredWidthMultiplier(wiredType, trigger?.code) * widthMultiplier);
    if (!isTouch) {
        resolvedCardStyle.width = cardWidth;
        resolvedCardStyle.minWidth = cardWidth;
        resolvedCardStyle.maxWidth = cardWidth;
    }
    resolvedCardStyle.resize = 'none';

    const supportsFurniPicking = requiresFurni > WiredFurniType.STUFF_SELECTION_OPTION_NONE;
    const isTouchCollapsed = isTouch && (areaSelectionActive || roomPickCollapsed);
    const activePickCount = (activePickSlot === 1 ? secondaryFurniIds : furniIds).length;
    const activePickLimit = trigger?.maximumItemSelectionCount ?? 0;
    const pickCountText = activePickLimit > 0 ? `${activePickCount}/${activePickLimit}` : `${activePickCount}`;

    const advancedLabel = LocalizeText(showFooter ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand');
    const advancedToggle = (
        <button className="volt-wired__advanced-toggle" type="button" onClick={() => setShowFooter((value) => !value)}>
            {isNative ? <WiredText text={advancedLabel} underline={true} /> : advancedLabel}
        </button>
    );

    const bodySections = isNative ? (
        <>
            {nativeLayout ? children : !!children && <WiredSection className="volt-wired__section--body">{children}</WiredSection>}
            {showSelection && supportsFurniPicking && (selectionPreview || <WiredFurniSelectorSection />)}
            {delay}
            {footer &&
                (advancedAlwaysVisible ? (
                    <div className="volt-wired__native-advanced">
                        <WiredSurfaceContext.Provider value={WIRED_ADVANCED_SURFACE_COLOR}>
                            <div className="volt-wired__native-advanced-body">{footer}</div>
                        </WiredSurfaceContext.Provider>
                    </div>
                ) : footerCollapsible ? (
                    <div className="volt-wired__native-advanced">
                        {advancedToggle}
                        {showFooter && (
                            <WiredSurfaceContext.Provider value={WIRED_ADVANCED_SURFACE_COLOR}>
                                <div className="volt-wired__native-advanced-body">{footer}</div>
                            </WiredSurfaceContext.Provider>
                        )}
                    </div>
                ) : (
                    <WiredSection className="volt-wired__section--footer">{footer}</WiredSection>
                ))}
        </>
    ) : (
        <>
            {!!children && <div className="volt-wired__divider" />}
            {!!children && <div className="volt-wired__section volt-wired__section--body">{children}</div>}
            {showSelection && supportsFurniPicking && (
                <>
                    <div className="volt-wired__divider" />
                    <div className="volt-wired__section volt-wired__section--selector">{selectionPreview || <WiredFurniSelectorView />}</div>
                </>
            )}
            {legacyDelay}
            {footer && (
                <>
                    <div className="volt-wired__divider" />
                    <div className="volt-wired__section volt-wired__section--footer">
                        {footerCollapsible ? (
                            <>
                                {advancedToggle}
                                {showFooter && <div className="volt-wired__advanced-body">{footer}</div>}
                            </>
                        ) : (
                            footer
                        )}
                    </div>
                </>
            )}
        </>
    );

    const actionButtons = (
        <div className="flex items-center gap-1 volt-wired__actions">
            <WiredShellButton shellStyle={shellStyle} disabled={!roomSettings.canModify} onClick={() => onSave(false)}>
                {LocalizeText('wiredfurni.ready')}
            </WiredShellButton>
            <WiredShellButton shellStyle={shellStyle} onClick={onClose}>
                {LocalizeText('cancel')}
            </WiredShellButton>
        </div>
    );

    return (
        <WiredNativeContext.Provider value={isNative}>
        <VoltCardView
            className={`volt-wired volt-wired--official ${isNative ? 'volt-wired--native-layout' : ''} ${wiredStyleClassName(shellStyle)} ${isVolter ? 'volt-wired--volter' : ''} ${isVolter && shellStyle !== 'volter' ? 'volt-wired--volter-colour' : ''} ${isTouchCollapsed ? 'volt-wired--touch-collapsed' : ''}`}
            theme="primary-slim"
            uniqueKey="volt-wired"
            isResizable={false}
            touchPresentation={isTouch ? (supportsFurniPicking ? 'half' : 'full') : undefined}
            style={resolvedCardStyle}
            initialPosition={{ x: Math.round((window.innerWidth - cardWidth) / 2), y: Math.round((window.innerHeight - WIRED_OPEN_HEIGHT) / 2) }}
        >
            {isWiredVolterStyle(shellStyle) && <WiredVolterFrameView shellStyle={shellStyle} />}
            <WiredShellHeaderView
                key={`${shellStyle}-${trigger?.id}`}
                shellStyle={shellStyle}
                title={LocalizeText('wiredfurni.title')}
                onClose={onClose}
                menuItems={shellMenuItems}
            />
            <VoltCardContentView classNames={['volt-wired__content']} gap={0}>
                <div className="volt-wired__section volt-wired__summary" style={headerControls ? { gap: 5, alignItems: 'center' } : undefined}>
                    {shellStyle === 'illumina' && (
                        <div className="volt-wired__banner" aria-hidden="true">
                            <WiredBannerCanvas />
                        </div>
                    )}
                    {isVolter && iconOffset !== undefined && (
                        <svg className="volt-wired__type-icon" viewBox={`${iconOffset} 336 13 14`} aria-hidden="true">
                            <image href={volterAtlas} width={490} height={360} />
                        </svg>
                    )}
                    <div className="volt-wired__summary-copy" style={headerControls ? { flex: 1 } : undefined}>
                        {shellStyle === 'illumina' ? (
                            <>
                                <span className="volt-wired__summary-kind">{summaryKind.toUpperCase()}</span>
                                <span className="volt-wired__summary-title">{summaryName.replace(/^ +/, '')}</span>
                            </>
                        ) : (
                            <Text bold className="volt-wired__summary-title">
                                {wiredName}
                            </Text>
                        )}
                    </div>
                    {headerControls && <div className="volt-wired__header-controls" style={{ position: 'relative', zIndex: 1, marginLeft: 'auto', flexShrink: 0 }}>{headerControls}</div>}
                </div>
                {isTouch && supportsFurniPicking && (
                    <div className="volt-wired__touch-pick-strip">
                        <span className="volt-wired__touch-pick-count">
                            {`${localizeWithFallback('wiredfurni.touch.selected_furni', 'Selected')}: ${pickCountText}`}
                        </span>
                        <button className="volt-wired__touch-pick-pill" type="button" onClick={() => setRoomPickCollapsed(true)}>
                            {localizeWithFallback('wiredfurni.touch.pick_in_room', 'Pick in room')}
                        </button>
                    </div>
                )}
                <div className="volt-wired__body">
                    {isWiredVolterStyle(shellStyle) && shellStyle !== 'volter' ? (
                        <WiredVolterBorderView shellStyle={shellStyle}>{bodySections}</WiredVolterBorderView>
                    ) : bodySections}
                    {!isTouch && (
                        <>
                            {!isNative && <div className="volt-wired__divider volt-wired__footer-divider" />}
                            <div className={isNative ? 'volt-wired__native-footer' : 'contents'}>
                                {isNative && <WiredSplitter />}
                                {actionButtons}
                            </div>
                        </>
                    )}
                </div>
                {isTouch && (
                    <div className="volt-wired__touch-footer">
                        {actionButtons}
                    </div>
                )}
            </VoltCardContentView>
        </VoltCardView>
        {isTouchCollapsed &&
            typeof document !== 'undefined' &&
            createPortal(
                <div className="volt-wired__touch-floating-bar" role="status">
                    <span className="volt-wired__touch-floating-copy">
                        {areaSelectionActive
                            ? localizeWithFallback('wiredfurni.touch.select_area_hint', 'Drag in room to select area')
                            : `${(summaryName || wiredName).trim()} (${pickCountText})`}
                    </span>
                    <button
                        className="volt-wired__touch-floating-btn"
                        type="button"
                        onClick={() => (areaSelectionActive ? cancelAreaSelection?.() : setRoomPickCollapsed(false))}
                    >
                        {areaSelectionActive ? LocalizeText('cancel') : localizeWithFallback('wiredfurni.touch.show_editor', 'Show editor')}
                    </button>
                </div>,
                document.body
            )}
        </WiredNativeContext.Provider>
    );
};
