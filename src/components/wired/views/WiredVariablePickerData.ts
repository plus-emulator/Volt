import { CUSTOM_VARIABLE_TOKEN_PREFIX as CUSTOM_TOKEN_PREFIX, createNativeVariableToken, getNativeVariableId } from '../../../api';

export type WiredVariablePickerTarget = 'user' | 'furni' | 'global' | 'context';
export type WiredVariablePickerUsage = 'give' | 'remove' | 'change-destination' | 'change-reference' | 'condition' | 'filter-main' | 'echo';

export interface IWiredVariableDefinitionLike {
    availability: number;
    hasValue: boolean;
    isReadOnly?: boolean;
    canCreateAndDelete?: boolean;
    requiresExecutionContext?: boolean;
    /** Native wired forms key a variable by its opaque server id; the tools' definitions still carry the numeric item id. */
    variableId?: string;
    itemId?: number;
    name: string;
    /** AIR WiredVariable.variableType (package_223/class_4027: 0 user, 1 internal, 2 user, 3 dynamic); drives the picker tabs. */
    variableType?: number;
    /** AIR WiredVariable.isInvisible: hidden from the picker unless it is the stored selection. */
    isInvisible?: boolean;
}

export interface IWiredVariablePickerEntry {
    id: string;
    token: string;
    label: string;
    displayLabel: string;
    searchableText: string;
    selectable: boolean;
    hasValue: boolean;
    kind: 'internal' | 'custom';
    target: WiredVariablePickerTarget;
    variableType?: number;
    isInvisible?: boolean;
    children?: IWiredVariablePickerEntry[];
}

interface IInternalVariableMeta {
    key: string;
    canUseAsDestination: boolean;
    canUseAsReference: boolean;
}

const INTERNAL_VARIABLE_ALIASES: Record<string, string> = {
    '@position.x': '@position_x',
    '@position.y': '@position_y',
    '@effect': '@effect_id',
    '@handitems': '@handitem_id',
    '@is_mute': '@is_muted',
    '@teams.red.score': '@team_red_score',
    '@teams.green.score': '@team_green_score',
    '@teams.blue.score': '@team_blue_score',
    '@teams.yellow.score': '@team_yellow_score',
    '@teams.red.size': '@team_red_size',
    '@teams.green.size': '@team_green_size',
    '@teams.blue.size': '@team_blue_size',
    '@teams.yellow.size': '@team_yellow_size'
};

const INTERNAL_TOKEN_PREFIX = 'internal:';

const createInternalMeta = (key: string, canUseAsDestination = false, canUseAsReference = false): IInternalVariableMeta => ({
    key,
    canUseAsDestination,
    canUseAsReference
});

export const normalizeInternalVariableKey = (key: string) => {
    const normalizedKey = key?.trim();

    if (!normalizedKey) return '';

    return INTERNAL_VARIABLE_ALIASES[normalizedKey] || normalizedKey;
};

const INTERNAL_VARIABLES: Record<'user' | 'furni' | 'global' | 'context', IInternalVariableMeta[]> = {
    furni: [
        createInternalMeta('~teleport.target_id', false, true),
        createInternalMeta('@id', false, true),
        createInternalMeta('@class_id', false, true),
        createInternalMeta('@height', false, true),
        createInternalMeta('@state', true, true),
        createInternalMeta('@position_x', true, true),
        createInternalMeta('@position_y', true, true),
        createInternalMeta('@rotation', true, true),
        createInternalMeta('@altitude', true, true),
        createInternalMeta('@opacity', true, true),
        createInternalMeta('@gravity', true, true),
        createInternalMeta('@is_invisible', false, true),
        createInternalMeta('@type', false, true),
        createInternalMeta('@is_stackable', false, true),
        createInternalMeta('@can_stand_on', false, true),
        createInternalMeta('@can_sit_on', false, true),
        createInternalMeta('@can_lay_on', false, true),
        createInternalMeta('@wallitem_offset', false, true),
        createInternalMeta('@dimensions.x', false, true),
        createInternalMeta('@dimensions.y', false, true),
        createInternalMeta('@owner_id', false, true),
        createInternalMeta('@projectile.animation.position.x', false, true),
        createInternalMeta('@projectile.animation.position.y', false, true),
        createInternalMeta('@projectile.animation.position.altitude', false, true),
        createInternalMeta('@projectile.animation.is_traveling', false, false),
        createInternalMeta('@projectile.animation.tiles_traveled', false, true),
        createInternalMeta('@projectile.animation.furni_collisions', false, true),
        createInternalMeta('@projectile.animation.user_collisions', false, true)
    ],
    user: [
        createInternalMeta('@index', false, true),
        createInternalMeta('@type', false, true),
        createInternalMeta('@gender', false, true),
        createInternalMeta('@level', false, true),
        createInternalMeta('@achievement_score', false, true),
        createInternalMeta('@is_hc', false, true),
        createInternalMeta('@has_rights', false, true),
        createInternalMeta('@is_group_admin', false, true),
        createInternalMeta('@is_owner', false, true),
        createInternalMeta('@is_muted', false, true),
        createInternalMeta('@is_trading', false, true),
        createInternalMeta('@is_frozen', false, true),
        createInternalMeta('@effect_id', false, true),
        createInternalMeta('@team_score', false, true),
        createInternalMeta('@team_color', false, true),
        createInternalMeta('@team_type', false, true),
        createInternalMeta('@sign', false, true),
        createInternalMeta('@dance', false, true),
        createInternalMeta('@is_idle', false, true),
        createInternalMeta('@handitem_id', false, true),
        createInternalMeta('@position_x', true, true),
        createInternalMeta('@position_y', true, true),
        createInternalMeta('@direction', true, true),
        createInternalMeta('@altitude', false, true),
        createInternalMeta('@favourite_group_id', false, true),
        createInternalMeta('@room_entry.method', false, true),
        createInternalMeta('@room_entry.teleport_id', false, true),
        createInternalMeta('@user_id', false, true),
        createInternalMeta('@bot_id', false, true),
        createInternalMeta('@pet_id', false, true),
        createInternalMeta('@pet_owner_id', false, true)
    ],
    global: [
        createInternalMeta('@furni_count', false, true),
        createInternalMeta('@user_count', false, true),
        createInternalMeta('@wired_timer', false, true),
        createInternalMeta('@team_red_score', false, true),
        createInternalMeta('@team_green_score', false, true),
        createInternalMeta('@team_blue_score', false, true),
        createInternalMeta('@team_yellow_score', false, true),
        createInternalMeta('@team_red_size', false, true),
        createInternalMeta('@team_green_size', false, true),
        createInternalMeta('@team_blue_size', false, true),
        createInternalMeta('@team_yellow_size', false, true),
        createInternalMeta('@room_id', false, true),
        createInternalMeta('@group_id', false, true),
        createInternalMeta('@timezone_server', false, true),
        createInternalMeta('@timezone_client', false, true),
        createInternalMeta('@current_time', false, true),
        createInternalMeta('@current_time.millisecond_of_second', false, true),
        createInternalMeta('@current_time.seconds_of_minute', false, true),
        createInternalMeta('@current_time.minute_of_hour', false, true),
        createInternalMeta('@current_time.hour_of_day', false, true),
        createInternalMeta('@current_time.day_of_week', false, true),
        createInternalMeta('@current_time.day_of_month', false, true),
        createInternalMeta('@current_time.day_of_year', false, true),
        createInternalMeta('@current_time.week_of_year', false, true),
        createInternalMeta('@current_time.month_of_year', false, true),
        createInternalMeta('@current_time.year', false, true)
    ],
    context: [
        createInternalMeta('@selector_furni_count', false, true),
        createInternalMeta('@selector_user_count', false, true),
        createInternalMeta('@signal_furni_count', false, true),
        createInternalMeta('@signal_user_count', false, true),
        createInternalMeta('@antenna_id', false, true),
        createInternalMeta('@chat_type', false, true),
        createInternalMeta('@chat_style', false, true)
    ]
};

const getNormalizedInternalTarget = (target: WiredVariablePickerTarget): 'user' | 'furni' | 'global' | 'context' => {
    if (target === 'furni') return 'furni';
    if (target === 'user') return 'user';
    if (target === 'context') return 'context';

    return 'global';
};

const getInternalSelectable = (usage: WiredVariablePickerUsage, meta: IInternalVariableMeta) => {
    switch (usage) {
        case 'condition':
            return true;
        case 'filter-main':
            return meta.canUseAsReference;
        case 'echo':
            return true;
        case 'change-destination':
            return meta.canUseAsDestination;
        case 'change-reference':
            return meta.canUseAsReference;
        default:
            return false;
    }
};

const getCustomSelectable = (usage: WiredVariablePickerUsage, definition: IWiredVariableDefinitionLike) => {
    switch (usage) {
        case 'give':
        case 'remove':
            return definition.canCreateAndDelete ?? !definition.isReadOnly;
        case 'condition':
        case 'filter-main':
            return true;
        case 'echo':
            // AIR EchoVariable.variableSelectionFilter: any variable that can be read outside a running stack.
            return !definition.requiresExecutionContext;
        case 'change-reference':
            return !!definition.hasValue;
        case 'change-destination':
            return !!definition.hasValue && !definition.isReadOnly;
        default:
            return !definition.isReadOnly;
    }
};

const createInternalEntry = (target: WiredVariablePickerTarget, usage: WiredVariablePickerUsage, meta: IInternalVariableMeta): IWiredVariablePickerEntry => ({
    id: `${INTERNAL_TOKEN_PREFIX}${meta.key}`,
    token: `${INTERNAL_TOKEN_PREFIX}${meta.key}`,
    label: meta.key,
    displayLabel: meta.key,
    searchableText: meta.key,
    selectable: getInternalSelectable(usage, meta),
    hasValue: meta.canUseAsReference,
    kind: 'internal',
    target
});

const createCustomEntry = (
    target: WiredVariablePickerTarget,
    usage: WiredVariablePickerUsage,
    definition: IWiredVariableDefinitionLike
): IWiredVariablePickerEntry => ({
    id: definition.variableId ? createNativeVariableToken(definition.variableId) : `${CUSTOM_TOKEN_PREFIX}${definition.itemId}`,
    token: definition.variableId ? createNativeVariableToken(definition.variableId) : `${CUSTOM_TOKEN_PREFIX}${definition.itemId}`,
    label: definition.name,
    displayLabel: definition.name,
    searchableText: definition.name,
    selectable: getCustomSelectable(usage, definition),
    hasValue: !!definition.hasValue,
    kind: 'custom',
    target,
    variableType: definition.variableType,
    isInvisible: !!definition.isInvisible
});

export const createCustomVariableToken = (itemId: number) => (itemId > 0 ? `${CUSTOM_TOKEN_PREFIX}${itemId}` : '');
export const createInternalVariableToken = (key: string) => {
    const normalizedKey = normalizeInternalVariableKey(key);

    return normalizedKey ? `${INTERNAL_TOKEN_PREFIX}${normalizedKey}` : '';
};
export const isCustomVariableToken = (token: string) => !!token && token.startsWith(CUSTOM_TOKEN_PREFIX);
export const isInternalVariableToken = (token: string) => !!token && token.startsWith(INTERNAL_TOKEN_PREFIX);
export const getCustomVariableItemId = (token: string) => (isCustomVariableToken(token) ? parseInt(token.slice(CUSTOM_TOKEN_PREFIX.length), 10) || 0 : 0);
export const getInternalVariableKey = (token: string) =>
    isInternalVariableToken(token) ? normalizeInternalVariableKey(token.slice(INTERNAL_TOKEN_PREFIX.length)) : '';

export const normalizeVariableTokenFromWire = (value: string) => {
    const normalizedValue = value?.trim();

    if (!normalizedValue) return '';
    if (isCustomVariableToken(normalizedValue)) return normalizedValue;
    if (isInternalVariableToken(normalizedValue)) return createInternalVariableToken(normalizedValue.slice(INTERNAL_TOKEN_PREFIX.length));

    const parsedValue = parseInt(normalizedValue, 10);

    return !Number.isNaN(parsedValue) && parsedValue > 0 ? createCustomVariableToken(parsedValue) : '';
};

export const createFallbackVariableEntry = (target: WiredVariablePickerTarget, token: string): IWiredVariablePickerEntry | null => {
    if (!token) return null;

    if (isCustomVariableToken(token)) {
        const variableId = getNativeVariableId(token);

        if (!variableId) return null;

        return {
            id: token,
            token,
            label: `#${variableId}`,
            displayLabel: `#${variableId}`,
            searchableText: `#${variableId}`,
            selectable: true,
            hasValue: false,
            kind: 'custom',
            target
        };
    }

    return null;
};

/**
 * The picker's entries are the native catalog's rows only: the catalog already carries the server's built-in
 * and derived variables, so nothing is appended here. One entry per variable, in catalog order: AIR keeps
 * `_allVariables.variables` in server order and builds its tree with the insertion-ordered class_471 map
 * (AIR WIN63-202610131318-860371703, NewVariablePicker.as:256-274, core/utils/class_471.as:70-80), so the
 * entries are neither sorted nor pre-grouped; the picker builds the '.' tree itself.
 */
export const buildWiredVariablePickerEntries = (
    target: WiredVariablePickerTarget,
    usage: WiredVariablePickerUsage,
    catalogDefinitions: IWiredVariableDefinitionLike[]
) =>
    (catalogDefinitions || [])
        .map((definition) => createCustomEntry(target, usage, definition))
        .filter((entry, index, collection) => collection.findIndex((other) => other.token === entry.token) === index);

export const flattenWiredVariablePickerEntries = (entries: IWiredVariablePickerEntry[]): IWiredVariablePickerEntry[] => {
    const flattened: IWiredVariablePickerEntry[] = [];

    for (const entry of entries) {
        flattened.push(entry);

        if (entry.children?.length) flattened.push(...entry.children);
    }

    return flattened;
};

/** AIR package_223/class_4027 variable types (WIN63-202610131318-860371703, class_4027.as:6-12). */
export const WIRED_VARIABLE_TYPE_USER = 0;
export const WIRED_VARIABLE_TYPE_INTERNAL = 1;
export const WIRED_VARIABLE_TYPE_USER_DERIVED = 2;
export const WIRED_VARIABLE_TYPE_DYNAMIC = 3;

/**
 * AIR VariableNode (WIN63-202610131318-860371703,
 * roomevents/wired_setup/uibuilder/presets/newvariablepicker/overview/VariableNode.as:7-105).
 */
export interface IWiredVariableNode {
    name: string;
    entry: IWiredVariablePickerEntry | null;
    children: Map<string, IWiredVariableNode>;
}

const createNode = (entry: IWiredVariablePickerEntry | null, name: string): IWiredVariableNode => ({ name, entry, children: new Map() });

/** Util.splitName (roomevents/Util.as:147-156): the variable name split on every '.'. */
export const splitWiredVariableName = (name: string) => name.split('.');

/**
 * VariableNode.flatten (VariableNode.as:54-72): a node without a variable whose only child flattens to a leaf
 * takes that leaf's variable and drops its children; with `useFullName` a resulting leaf shows the full name.
 */
export const flattenWiredVariableNode = (node: IWiredVariableNode, useFullName = false): boolean => {
    if (node.children.size === 1 && node.entry === null) {
        const onlyChild = node.children.values().next().value as IWiredVariableNode;

        if (flattenWiredVariableNode(onlyChild)) {
            node.entry = onlyChild.entry;
            node.children = new Map();
        }
    }

    const isLeaf = node.entry !== null && node.children.size === 0;

    if (useFullName && isLeaf) node.name = node.entry.displayLabel;

    return isLeaf;
};

/**
 * TabButtonConfigs.nodesFromVector (tabbuttons/TabButtonConfigs.as:84-120): one node per name segment; only the
 * last segment carries the variable, and an existing node is reused as is. With `flatten` every root child is
 * flattened with full names (the recent and search tabs).
 */
export const buildWiredVariableNodes = (entries: IWiredVariablePickerEntry[], flatten = false): IWiredVariableNode => {
    const root = createNode(null, null);

    for (const entry of entries) {
        const segments = splitWiredVariableName(entry.displayLabel);
        let parent = root;

        segments.forEach((segment, index) => {
            let node = parent.children.get(segment);

            if (!node) {
                node = createNode(index === segments.length - 1 ? entry : null, segment);
                parent.children.set(segment, node);
            }

            parent = node;
        });
    }

    if (flatten) for (const child of root.children.values()) flattenWiredVariableNode(child, true);

    return root;
};

/** VariableNode.canBeSelected (VariableNode.as:74-85): a node needs a variable that passes the picker's filter. */
export const canSelectWiredVariableNode = (node: IWiredVariableNode) => !!node.entry && node.entry.selectable;

/** VariableNode.isDisabled (VariableNode.as:87-105): not selectable and no enabled descendant. */
export const isWiredVariableNodeDisabled = (node: IWiredVariableNode): boolean => {
    if (canSelectWiredVariableNode(node)) return false;

    for (const child of node.children.values()) if (!isWiredVariableNodeDisabled(child)) return false;

    return true;
};
