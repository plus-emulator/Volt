import type { AvatarInfoFurni } from '../../api';

export type WiredToolsTab = 'monitor' | 'variables' | 'inspection' | 'chests' | 'settings';
export type InspectionElementType = 'furni' | 'user' | 'global';
export type VariablesElementType = InspectionElementType | 'context';

export interface InspectionElementButton {
    key: InspectionElementType;
    label: string;
    icon: string;
}

export interface VariablesElementButton {
    key: VariablesElementType;
    label: string;
    icon: string;
    disabled?: boolean;
}

export interface InspectionFurniSelection {
    objectId: number;
    category: number;
    info: AvatarInfoFurni;
}

export interface InspectionFurniLiveState {
    positionX: number;
    positionY: number;
    altitude: number;
    rotation: number;
    state: number;
}

export interface InspectionUserSelection {
    kind: 'user' | 'bot' | 'rentable_bot' | 'pet';
    roomIndex: number;
    name: string;
    figure: string;
    gender: string;
    userId: number;
    level: number;
    achievementScore: number;
    isHC: boolean;
    hasRights: boolean;
    isOwner: boolean;
    favouriteGroupId: number;
    roomEntryMethod: string;
    roomEntryTeleportId: number;
    posture?: string;
}

export interface InspectionUserLiveState {
    positionX: number;
    positionY: number;
    altitude: number;
    direction: number;
}

export interface MonitorStat {
    label: string;
    value: string;
    /** WiredMenuMonitorTab.colorize result (hex without #); rows without an answer have none. */
    color?: string;
    /** WiredMenuMonitorTab.isFrankPanicking reads this row's colour. The permanent variable rows are coloured but do not count. */
    alarm?: boolean;
}

/** WiredRoomStatsData: the server's Wired usage, heavy flag, furni and permanent variable counts with their caps. */
export interface MonitorRoomStats {
    executionCost: number;
    executionCostCap: number;
    isHeavy: boolean;
    floorItemCount: number;
    floorItemCap: number;
    wallItemCount: number;
    wallItemCap: number;
    permanentFurniVariables: number;
    maxPermanentFurniVariables: number;
    permanentUserVariables: number;
    maxPermanentUserVariables: number;
    permanentGlobalVariables: number;
    maxPermanentGlobalVariables: number;
}

export interface MonitorLog {
    errorId: number;
    type: string;
    category: string;
    amount: string;
    latest: string;
    latestTooltip?: string;
}

/** One Inspection row: a WiredVariablesForObject value joined with its catalogue definition. `key` is the server's variable id. */
export interface InspectionVariable {
    key: string;
    name: string;
    value: string;
    rawValue: number;
    target: number;
    editable: boolean;
    removable: boolean;
    valueClassName?: string;
    valueTitle?: string;
}

/** A catalogue definition offered by "Give variable"; `available` is false when the holder has it or it cannot be created. */
export interface InspectionGiveDefinition {
    variableId: string;
    name: string;
    target: number;
    hasValue: boolean;
    available: boolean;
}

export interface VariableDefinition {
    key: string;
    itemId?: number;
    target: 'Furni' | 'User' | 'Global' | 'Context';
    type: string;
    hasValue: boolean;
    isReadOnly?: boolean;
    availability: string;
    canWriteTo: boolean;
    canCreateDelete: boolean;
    canIntercept: boolean;
    hasCreationTime: boolean;
    hasUpdateTime: boolean;
    isTextConnected: boolean;
    isAlwaysAvailable?: boolean;
    /** The value-to-text table of a text connected custom variable, as the server sent it. */
    textConnector?: VariableTextValue[];
}

export interface VariableTextValue {
    value: string;
    text: string;
}

export interface VariableManageEntry {
    categoryLabel: string;
    createdAt: number;
    entityId: number;
    entityName: string;
    manageLabel: string;
    updatedAt: number;
    value: bigint | null;
}

export interface VariableHighlightTarget {
    category: number;
    objectId: number;
    /** The value bubble text, null when the variable has no value. */
    label: string | null;
}

export interface VariableHighlightOverlay extends VariableHighlightTarget {
    key: string;
    x: number;
    y: number;
}

export interface ManagedHolderVariableEntry {
    createdAt: number;
    hasValue: boolean;
    name: string;
    isReadOnly?: boolean;
    updatedAt: number;
    value: bigint | null;
    variableItemId: number;
}

