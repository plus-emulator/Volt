import { KeyboardEvent } from 'react';
import { IsTouchLayout, localizeWithFallback, useVoltLayout } from '../../api';
import wiredGlobalPlaceholderImage from '../../assets/images/wiredtools/wired_global_placeholder.png';
import contextIcon from '../../assets/images/wired/native/menu_variable_context.png';
import furniIcon from '../../assets/images/wired/native/menu_variable_furni.png';
import globalIcon from '../../assets/images/wired/native/menu_variable_global.png';
import userIcon from '../../assets/images/wired/native/menu_variable_user.png';
import { CatalogIconView } from '../catalog/views/catalog-icon/CatalogIconView';
import { LayoutAvatarImageView, LayoutPetImageView, LayoutRoomObjectImageView } from '../../common';
import { INSPECTION_ELEMENTS } from './WiredCreatorTools.constants';
import { InspectionFurniSelection, InspectionGiveDefinition, InspectionUserSelection, InspectionVariable } from './WiredCreatorTools.types';
import { WiredMenuLabel } from '../../common/native-text/WiredMenuLabel';
import { WiredMenuButton, WiredMenuButtonIcon, WiredMenuCheckbox, WiredMenuItem, WiredMenuPanel, WiredMenuTable, WiredMenuTitle } from './WiredMenuParts';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

const TYPE_ICONS: Record<string, string> = { furni: furniIcon, user: userIcon, global: globalIcon, context: contextIcon };

export interface WiredInspectionTabViewProps {
    // preview
    selectedFurni: InspectionFurniSelection | null;
    selectedUser: InspectionUserSelection | null;
    roomId: number | null;
    previewPlaceholder: string;

    // keep-selected toggle
    keepSelected: boolean;
    onKeepSelectedChange: (next: boolean) => void;

    // highlight the Wired boxes that have the selected furni in their furni picks
    canHighlightWiredBoxes: boolean;
    isHighlightingWiredBoxes: boolean;
    onToggleWiredBoxHighlight: () => void;

    // variables table
    displayedVariables: InspectionVariable[];
    selectedInspectionVariableKey: string;
    onSelectInspectionVariable: (variable: InspectionVariable) => void;

    // inline editor — `editingVariable` / `editingValue` come from the
    // store; this tab only needs the cancel / keydown / begin handlers
    // since each tab consumer wraps `onBeginVariableEdit` with its own
    // bookkeeping (variable-key tracking).
    onCancelVariableEdit: () => void;
    onVariableInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    onBeginVariableEdit: (variable: InspectionVariable) => void;

    // give-variable popover
    selectedInspectionGiveDefinition: InspectionGiveDefinition | null;
    onSelectGiveVariable: (variableId: string) => void;
    availableInspectionDefinitions: InspectionGiveDefinition[];
    inspectionGiveValue: string;
    onInspectionGiveValueChange: (value: string) => void;
    canGiveInspectionVariable: boolean;
    onOpenGiveInspectionVariable: () => void;
    canCreateInspectionVariable: boolean;
    onGiveInspectionVariable: () => void;

    // remove variable
    canRemoveInspectionVariable: boolean;
    onRemoveInspectionVariable: () => void;
}

/**
 * The "Inspection" tab body of WiredCreatorToolsView, extracted from
 * the parent's inline JSX. Same shape as WiredVariablesTabView:
 * pure presentation, all state and actions arrive as typed props.
 */
export const WiredInspectionTabView = (props: WiredInspectionTabViewProps) => {
    const {
        selectedFurni,
        selectedUser,
        roomId,
        previewPlaceholder,
        keepSelected,
        onKeepSelectedChange,
        canHighlightWiredBoxes,
        isHighlightingWiredBoxes,
        onToggleWiredBoxHighlight,
        displayedVariables,
        selectedInspectionVariableKey,
        onSelectInspectionVariable,
        onCancelVariableEdit,
        onVariableInputKeyDown,
        onBeginVariableEdit,
        selectedInspectionGiveDefinition,
        onSelectGiveVariable,
        availableInspectionDefinitions,
        inspectionGiveValue,
        onInspectionGiveValueChange,
        canGiveInspectionVariable,
        onOpenGiveInspectionVariable,
        canCreateInspectionVariable,
        onGiveInspectionVariable,
        canRemoveInspectionVariable,
        onRemoveInspectionVariable
    } = props;

    const isTouch = IsTouchLayout(useVoltLayout());
    const inspectionType = useWiredCreatorToolsUiStore((s) => s.inspectionType);
    const setInspectionType = useWiredCreatorToolsUiStore((s) => s.setInspectionType);
    const isInspectionGiveOpen = useWiredCreatorToolsUiStore((s) => s.isInspectionGiveOpen);
    const editingVariable = useWiredCreatorToolsUiStore((s) => s.editingVariable);
    const editingValue = useWiredCreatorToolsUiStore((s) => s.editingValue);
    const setEditingValue = useWiredCreatorToolsUiStore((s) => s.setEditingValue);

    // STATE_NOTHING: no furni or user picked yet; the official tab disables the variables table then.
    const nothingSelected = (inspectionType === 'furni' && !selectedFurni) || (inspectionType === 'user' && !selectedUser);

    const variableRows = displayedVariables.map((variable) => ({
        key: variable.key,
        selected: selectedInspectionVariableKey === variable.key,
        onSelect: () => onSelectInspectionVariable(variable),
        cells: {
            variable: variable.name,
            value:
                editingVariable === variable.key ? (
                    <input
                        autoFocus
                        className={isTouch ? 'volt-wt-cell-input' : 'volt-wired-menu__cell-input'}
                        spellCheck={false}
                        type="text"
                        value={editingValue}
                        onBlur={onCancelVariableEdit}
                        onChange={(event) => setEditingValue(event.target.value)}
                        onClick={(event) => event.stopPropagation()}
                        onKeyDownCapture={onVariableInputKeyDown}
                    />
                ) : variable.editable ? (
                    <button
                        className={`${isTouch ? 'volt-wt-table__link' : 'volt-wired-menu__link'} ${variable.valueClassName ?? ''}`}
                        title={variable.valueTitle}
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onBeginVariableEdit(variable);
                        }}
                    >
                        {variable.value}
                    </button>
                ) : (
                    <span className={variable.valueClassName} title={variable.valueTitle}>
                        {variable.value}
                    </span>
                )
        }
    }));

    if (isTouch) {
        return (
            <div className="volt-wt-tab-root volt-wt-inspection">
                <div className="volt-wt-scroll-area">
                    <div className="volt-wt-section">
                        <WiredMenuTitle x={0} y={0}>
                            Element type:
                        </WiredMenuTitle>
                        <WiredMenuPanel className="volt-wt-type-row" x={0} y={0}>
                            <div className="volt-wt-type-buttons">
                                {INSPECTION_ELEMENTS.map((element) => (
                                    <WiredMenuButton
                                        key={element.key}
                                        className={`volt-wt-icon-btn ${inspectionType === element.key ? 'is-selected' : ''}`}
                                        title={element.label}
                                        x={0}
                                        y={0}
                                        onClick={() => setInspectionType(element.key)}
                                    >
                                        <WiredMenuButtonIcon alt={element.label} src={TYPE_ICONS[element.key] ?? element.icon} />
                                    </WiredMenuButton>
                                ))}
                            </div>
                            <WiredMenuCheckbox checked={keepSelected} label="Keep selected" x={0} y={0} onChange={onKeepSelectedChange} />
                        </WiredMenuPanel>
                    </div>
                    <div className="volt-wt-section">
                        <WiredMenuTitle x={0} y={0}>
                            Preview:
                        </WiredMenuTitle>
                        <WiredMenuPanel className="volt-wt-preview-card" x={0} y={0}>
                            <div className="volt-wt-preview-box">
                                {inspectionType === 'furni' && selectedFurni && roomId !== null && (
                                    <LayoutRoomObjectImageView category={selectedFurni.category} objectId={selectedFurni.objectId} roomId={roomId} />
                                )}
                                {inspectionType === 'user' && selectedUser && (
                                    <>
                                        {selectedUser.kind === 'pet' ? (
                                            <LayoutPetImageView direction={2} figure={selectedUser.figure} posture={selectedUser.posture} />
                                        ) : (
                                            <LayoutAvatarImageView direction={2} figure={selectedUser.figure} />
                                        )}
                                    </>
                                )}
                                {inspectionType === 'global' && <img alt="" draggable={false} src={wiredGlobalPlaceholderImage} />}
                            </div>
                            <div className="volt-wt-preview-meta">
                                {nothingSelected ? (
                                    <span className="volt-wt-preview-hint">{previewPlaceholder}</span>
                                ) : (
                                    <span className="volt-wt-preview-name">
                                        {inspectionType === 'furni'
                                            ? selectedFurni?.info?.name
                                            : inspectionType === 'user'
                                              ? selectedUser?.name
                                              : localizeWithFallback('wiredmenu.inspection.global', 'Room global variables')}
                                    </span>
                                )}
                            </div>
                            {inspectionType === 'furni' && (
                                <WiredMenuButton
                                    className={`volt-wt-icon-btn ${isHighlightingWiredBoxes ? 'is-selected' : ''}`}
                                    disabled={!canHighlightWiredBoxes}
                                    title={localizeWithFallback('wiredmenu.inspection.highlight_wireds', 'Highlight Wired boxes that have this furni in their furni picks')}
                                    x={0}
                                    y={0}
                                    onClick={onToggleWiredBoxHighlight}
                                >
                                    <CatalogIconView className="volt-wt-highlight-icon" icon={80} />
                                </WiredMenuButton>
                            )}
                        </WiredMenuPanel>
                    </div>
                    <div className="volt-wt-section volt-wt-section--grow">
                        <WiredMenuTitle x={0} y={0}>
                            Variables:
                        </WiredMenuTitle>
                        <WiredMenuTable
                            columns={[
                                { key: 'variable', title: 'Variable', factor: 0.65, align: 'left' },
                                { key: 'value', title: 'Value', factor: 0.35, align: 'right' }
                            ]}
                            disabled={nothingSelected}
                            rows={variableRows}
                            w={303}
                            x={0}
                            y={0}
                        />
                    </div>
                    {isInspectionGiveOpen && (
                        <div className="volt-wt-give-panel">
                            <div className="volt-wt-field">
                                <label className="volt-wt-field__label">Variable:</label>
                                <div className="volt-wt-select-wrap">
                                    <select
                                        className="volt-wt-select"
                                        value={selectedInspectionGiveDefinition?.variableId ?? ''}
                                        onChange={(event) => onSelectGiveVariable(event.target.value)}
                                    >
                                        {!availableInspectionDefinitions.length && <option value="">No variables available</option>}
                                        {availableInspectionDefinitions.map((definition) => (
                                            <option key={definition.variableId} disabled={!definition.available} value={definition.variableId}>
                                                {definition.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="volt-wt-field">
                                <label className="volt-wt-field__label">Value:</label>
                                <input
                                    className="volt-wt-input"
                                    disabled={!selectedInspectionGiveDefinition?.hasValue}
                                    inputMode="numeric"
                                    type="number"
                                    value={inspectionGiveValue}
                                    onChange={(event) => onInspectionGiveValueChange(event.target.value)}
                                />
                            </div>
                            <div className="volt-wt-give-actions">
                                <WiredMenuButton x={0} y={0} onClick={onOpenGiveInspectionVariable}>
                                    {localizeWithFallback('generic.cancel', 'Cancel')}
                                </WiredMenuButton>
                                <WiredMenuButton disabled={!canCreateInspectionVariable} x={0} y={0} onClick={onGiveInspectionVariable}>
                                    Create
                                </WiredMenuButton>
                            </div>
                        </div>
                    )}
                </div>
                <div className="volt-wt-sticky-bar">
                    <WiredMenuButton disabled={!canRemoveInspectionVariable} x={0} y={0} onClick={onRemoveInspectionVariable}>
                        Remove variable
                    </WiredMenuButton>
                    <WiredMenuButton disabled={!canGiveInspectionVariable} x={0} y={0} onClick={onOpenGiveInspectionVariable}>
                        Give variable
                    </WiredMenuButton>
                </div>
            </div>
        );
    }

    return (
        <>
            <WiredMenuTitle h={19} w={165} x={14} y={18}>
                Element type:
            </WiredMenuTitle>
            <WiredMenuPanel h={47} w={141} x={14} y={38}>
                {INSPECTION_ELEMENTS.map((element, index) => (
                    <WiredMenuButton
                        key={element.key}
                        className={inspectionType === element.key ? 'is-selected' : ''}
                        h={36}
                        title={element.label}
                        w={37}
                        x={5 + index * 47}
                        y={5}
                        onClick={() => setInspectionType(element.key)}
                    >
                        <WiredMenuButtonIcon alt={element.label} box={{ w: 37, h: 37 }} className="volt-wired-menu__type-icon" src={TYPE_ICONS[element.key] ?? element.icon} />
                    </WiredMenuButton>
                ))}
            </WiredMenuPanel>
            <WiredMenuTitle h={19} w={165} x={14} y={94}>
                Preview:
            </WiredMenuTitle>
            <WiredMenuPanel className="volt-wired-menu__preview" h={225} w={141} x={14} y={114}>
                {inspectionType === 'furni' && selectedFurni && roomId !== null && (
                    <div className="volt-wired-menu__preview-image">
                        <LayoutRoomObjectImageView category={selectedFurni.category} objectId={selectedFurni.objectId} roomId={roomId} />
                    </div>
                )}
                {inspectionType === 'user' && selectedUser && (
                    <div className="volt-wired-menu__preview-image">
                        {selectedUser.kind === 'pet' ? (
                            <LayoutPetImageView direction={2} figure={selectedUser.figure} posture={selectedUser.posture} />
                        ) : (
                            <LayoutAvatarImageView direction={2} figure={selectedUser.figure} />
                        )}
                    </div>
                )}
                {inspectionType === 'global' && (
                    <div className="volt-wired-menu__preview-image">
                        <img alt="" draggable={false} src={wiredGlobalPlaceholderImage} />
                    </div>
                )}
                {inspectionType === 'furni' && (
                    <WiredMenuButton
                        className={`volt-wired-menu__highlight-wired ${isHighlightingWiredBoxes ? 'is-selected' : ''}`}
                        disabled={!canHighlightWiredBoxes}
                        h={26}
                        title={localizeWithFallback('wiredmenu.inspection.highlight_wireds', 'Highlight Wired boxes that have this furni in their furni picks')}
                        w={25}
                        x={110}
                        y={6}
                        onClick={onToggleWiredBoxHighlight}
                    >
                        <CatalogIconView className="volt-wired-menu__highlight-wired-icon" icon={80} />
                    </WiredMenuButton>
                )}
                {nothingSelected && (
                    <WiredMenuLabel align="field" className="volt-wired-menu__preview-instruction" text={previewPlaceholder} width={141} />
                )}
            </WiredMenuPanel>
            <WiredMenuCheckbox checked={keepSelected} h={18} label="Keep selected" w={197} x={14} y={348} onChange={onKeepSelectedChange} />
            <WiredMenuTitle h={19} w={188} x={183} y={17}>
                Variables:
            </WiredMenuTitle>
            <WiredMenuTable
                columns={[
                    { key: 'variable', title: 'Variable', factor: 0.65, align: 'left' },
                    { key: 'value', title: 'Value', factor: 0.35, align: 'right' }
                ]}
                disabled={nothingSelected}
                h={297}
                rows={variableRows}
                w={303}
                x={183}
                y={37}
            />
            <WiredMenuButton disabled={!canRemoveInspectionVariable} h={25} w={145} x={183} y={343} onClick={onRemoveInspectionVariable}>
                Remove variable
            </WiredMenuButton>
            <WiredMenuButton disabled={!canGiveInspectionVariable} h={25} w={145} x={341} y={343} onClick={onOpenGiveInspectionVariable}>
                Give variable
            </WiredMenuButton>
            {isInspectionGiveOpen && (
                <WiredMenuItem className="volt-wired-menu__bubble" h={145} w={186} x={299} y={181}>
                    <WiredMenuTitle h={17} w={158} x={6} y={6}>
                        Variable:
                    </WiredMenuTitle>
                    <WiredMenuItem h={22} w={158} x={6} y={26}>
                        <div className="volt-wired-menu__dropdown-wrap">
<select
                            className="volt-wired-menu__dropdown"
                            value={selectedInspectionGiveDefinition?.variableId ?? ''}
                            onChange={(event) => onSelectGiveVariable(event.target.value)}
                        >
                            {!availableInspectionDefinitions.length && <option value="">No variables available</option>}
                            {availableInspectionDefinitions.map((definition) => (
                                <option key={definition.variableId} disabled={!definition.available} value={definition.variableId}>
                                    {definition.name}
                                </option>
                            ))}
                        </select>
</div>
                    </WiredMenuItem>
                    <WiredMenuTitle h={17} w={158} x={6} y={52}>
                        Value:
                    </WiredMenuTitle>
                    <WiredMenuItem className="volt-wired-menu__value-box" h={22} w={80} x={6} y={72}>
                        <input
                            disabled={!selectedInspectionGiveDefinition?.hasValue}
                            type="number"
                            value={inspectionGiveValue}
                            onChange={(event) => onInspectionGiveValueChange(event.target.value)}
                        />
                    </WiredMenuItem>
                    <WiredMenuButton disabled={!canCreateInspectionVariable} h={25} w={158} x={6} y={100} onClick={onGiveInspectionVariable}>
                        Create
                    </WiredMenuButton>
                </WiredMenuItem>
            )}
        </>
    );
};
