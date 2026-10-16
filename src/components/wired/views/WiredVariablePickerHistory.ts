/**
 * AIR NewVariablePickerHelper history (WIN63-202610131318-860371703,
 * roomevents/wired_setup/uibuilder/presets/newvariablepicker/NewVariablePickerHelper.as:235-302): per room and per
 * variable target, the most recent selection first, at most 20 ids, kept for the session only. Nothing is stored for
 * room 0.
 */
const MAX_HISTORY = 20;

const history = new Map<number, Map<string, string[]>>();

export const addWiredVariablePickerHistory = (roomId: number, target: string, token: string) => {
    if (!roomId || !token) return;

    let roomHistory = history.get(roomId);

    if (!roomHistory) {
        roomHistory = new Map();
        history.set(roomId, roomHistory);
    }

    const tokens = (roomHistory.get(target) ?? []).filter((current) => current !== token);

    tokens.unshift(token);

    if (tokens.length > MAX_HISTORY) tokens.pop();

    roomHistory.set(target, tokens);
};

export const getWiredVariablePickerHistory = (roomId: number, target: string): string[] => {
    if (!roomId) return [];

    return history.get(roomId)?.get(target) ?? [];
};

export const clearWiredVariablePickerHistory = () => history.clear();

/**
 * AIR records a selection only when the form is saved: VariablePickerPreset.finalizeSelection -> NewVariablePicker.finalize
 * -> addToHistory (VariablePickerPreset.as:38-43, NewVariablePicker.as:329-336). Each mounted picker registers its
 * finalizer here and the wired editor's save calls finalizeWiredVariablePickers().
 */
const finalizers = new Set<() => void>();

export const registerWiredVariablePickerFinalizer = (finalize: () => void) => {
    finalizers.add(finalize);

    return () => {
        finalizers.delete(finalize);
    };
};

export const finalizeWiredVariablePickers = () => {
    for (const finalize of [...finalizers]) finalize();
};
