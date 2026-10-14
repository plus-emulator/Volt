// WIRED Label state (AIR WIN63-202610131318: FurnitureLabelWidget.as L190-215; labels packets class_3043 in 2237 and class_2856 in 796, dossier 'wf_label (WIRED Label)').
import { IWiredLabelData, RoomEngineEvent, RoomSessionEvent, WiredLabelOrRegion, WiredLabelsEvent, WiredLabelsUpdateEvent } from '@volt/renderer';
import { createVoltStore } from '../../../state/createVoltStore';
import { useMessageEvent, useVoltEvent } from '../../events';

export type WiredLabelsState = {
    labels: Record<number, IWiredLabelData>;
    settingsFurniId: number;
};

export type WiredLabelsActions = {
    replaceLabels(entries: WiredLabelOrRegion[]): void;
    applyLabels(updated: WiredLabelOrRegion[], removedFurniIds: number[]): void;
    openSettings(furniId: number): void;
    closeSettings(): void;
    clear(): void;
};

// Regions (type 1) belong to furniture_region furni and are not part of this state.
const addLabels = (entries: WiredLabelOrRegion[], labels: Record<number, IWiredLabelData>) => {
    for (const entry of entries) {
        if (entry.type === 0) labels[entry.furnitureId] = entry;
    }

    return labels;
};

export const useWiredLabelsStore = createVoltStore<WiredLabelsState & WiredLabelsActions>()((set) => ({
    labels: {},
    settingsFurniId: 0,

    replaceLabels: (entries) => set({ labels: addLabels(entries, {}) }),

    applyLabels: (updated, removedFurniIds) =>
        set((state) => {
            const labels = { ...state.labels };

            for (const furniId of removedFurniIds) delete labels[furniId];

            return { labels: addLabels(updated, labels) };
        }),

    openSettings: (furniId) => set({ settingsFurniId: furniId }),

    closeSettings: () => set({ settingsFurniId: 0 }),

    clear: () => set({ labels: {}, settingsFurniId: 0 }),
}));

/** Feeds the label store from the two labels packets and empties it when the room ends. */
export const useWiredLabelsEvents = () => {
    const replaceLabels = useWiredLabelsStore((state) => state.replaceLabels);
    const applyLabels = useWiredLabelsStore((state) => state.applyLabels);
    const clear = useWiredLabelsStore((state) => state.clear);

    useMessageEvent<WiredLabelsEvent>(WiredLabelsEvent, (event) => {
        const parser = event.getParser();

        if (parser) replaceLabels(parser.entries);
    });

    useMessageEvent<WiredLabelsUpdateEvent>(WiredLabelsUpdateEvent, (event) => {
        const parser = event.getParser();

        if (parser) applyLabels(parser.updated, parser.removedFurniIds);
    });

    useVoltEvent<RoomSessionEvent>(RoomSessionEvent.ENDED, () => clear());
    useVoltEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, () => clear());
};
