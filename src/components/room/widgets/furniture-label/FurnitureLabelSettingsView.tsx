// WIRED Label settings card (AIR WIN63-202610131318: FurnitureLabelSettingsView.as L14-120, COLORS L17; class_3636 saveLabelSettings L98; out 2970 WiredLabelSaveSettingsComposer). Opened from the infostand Settings button.
import { IWiredLabelData, WiredLabelSaveSettingsComposer } from '@volt/renderer';
import { FC, useState } from 'react';
import { SendMessageComposer, localizeWithFallback } from '../../../../api';
import { FURNITURE_LABEL_COLORS, FURNITURE_LABEL_COLOR_KEYS, FURNITURE_LABEL_VISIBILITY_EVERYONE, FURNITURE_LABEL_VISIBILITY_WIRED, wiredLabelBubbleColor } from '../../../../api/wired/WiredLabel';
import { Button, Column, DraggableWindow, Flex, Text, VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../../../common';
import { useWiredToolsState } from '../../../../hooks';
import { useWiredLabelsStore } from '../../../../hooks/rooms/widgets/useWiredLabelsState';

interface FurnitureLabelSettingsCardViewProps {
    label: IWiredLabelData;
    onClose: () => void;
}

/** Keyed by furni id, so each open starts from the label's current settings. */
const FURNITURE_LABEL_COLOR_NAMES = ['Blue', 'Teal', 'Green', 'Gold', 'Orange', 'Red', 'Purple', 'Charcoal'];

const FurnitureLabelSettingsCardView: FC<FurnitureLabelSettingsCardViewProps> = (props) => {
    const { label, onClose } = props;
    const [colorIndex, setColorIndex] = useState(() => Math.max(0, FURNITURE_LABEL_COLORS.indexOf(label.bubbleColor)));
    const [visibility, setVisibility] = useState(label.visibility === FURNITURE_LABEL_VISIBILITY_EVERYONE ? FURNITURE_LABEL_VISIBILITY_EVERYONE : FURNITURE_LABEL_VISIBILITY_WIRED);
    const [alwaysOpen, setAlwaysOpen] = useState(label.alwaysOpen);

    const everyone = visibility === FURNITURE_LABEL_VISIBILITY_EVERYONE;

    const save = () => {
        SendMessageComposer(new WiredLabelSaveSettingsComposer(label.furnitureId, FURNITURE_LABEL_COLORS[colorIndex], visibility, everyone && alwaysOpen));
        onClose();
    };

    return (
        <DraggableWindow handleSelector=".volt-card-header-shell">
            <VoltCardView theme="primary-slim" className="volt-furni-label-settings w-[min(340px,calc(100vw-16px))]">
                <VoltCardHeaderView headerText={localizeWithFallback('widget.furniture_label.settings.title', 'Label settings')} onCloseClick={onClose} />
                <VoltCardContentView overflow="hidden" justifyContent="between">
                    <Column gap={2}>
                        <Column gap={1}>
                            <Text bold>{localizeWithFallback('widget.furniture_label.settings.color', 'Label color')}</Text>
                            <Flex gap={2} alignItems="center">
                                <select className="form-select form-select-sm" value={colorIndex} onChange={(event) => setColorIndex(parseInt(event.target.value, 10))}>
                                    {FURNITURE_LABEL_COLOR_KEYS.map((key, index) => (
                                        <option key={key} value={index}>
                                            {localizeWithFallback(`widget.furniture_label.settings.color.${key}`, FURNITURE_LABEL_COLOR_NAMES[index])}
                                        </option>
                                    ))}
                                </select>
                                <span className="volt-furni-label-settings__swatch" style={{ backgroundColor: wiredLabelBubbleColor(FURNITURE_LABEL_COLORS[colorIndex]) }} />
                            </Flex>
                        </Column>
                        <Column gap={1}>
                            <Text bold>{localizeWithFallback('widget.furniture_label.settings.visibility', 'Who can see this label?')}</Text>
                            <select
                                className="form-select form-select-sm"
                                value={visibility}
                                onChange={(event) => setVisibility(parseInt(event.target.value, 10) === FURNITURE_LABEL_VISIBILITY_EVERYONE ? FURNITURE_LABEL_VISIBILITY_EVERYONE : FURNITURE_LABEL_VISIBILITY_WIRED)}
                            >
                                <option value={FURNITURE_LABEL_VISIBILITY_EVERYONE}>{localizeWithFallback('widget.furniture_label.settings.visibility.everyone', 'Everyone')}</option>
                                <option value={FURNITURE_LABEL_VISIBILITY_WIRED}>{localizeWithFallback('widget.furniture_label.settings.visibility.wired', 'Users with Wired inspection rights')}</option>
                            </select>
                        </Column>
                        <Flex gap={1} alignItems="center">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="furniLabelAlwaysOpen"
                                checked={alwaysOpen}
                                disabled={!everyone}
                                onChange={(event) => setAlwaysOpen(event.target.checked)}
                            />
                            <Text>{localizeWithFallback('widget.furniture_label.settings.always_open', 'Keep this label always open')}</Text>
                        </Flex>
                    </Column>
                    <Flex gap={1} justifyContent="end">
                        <Button variant="primary" onClick={onClose}>
                            {localizeWithFallback('generic.cancel', 'Cancel')}
                        </Button>
                        <Button variant="primary" onClick={save}>
                            {localizeWithFallback('save', 'Save')}
                        </Button>
                    </Flex>
                </VoltCardContentView>
            </VoltCardView>
        </DraggableWindow>
    );
};

/** Shown while a settings target is set, the label still exists and the user may write labels. */
export const FurnitureLabelSettingsView: FC<{}> = () => {
    const furniId = useWiredLabelsStore((state) => state.settingsFurniId);
    const label = useWiredLabelsStore((state) => (state.settingsFurniId > 0 ? state.labels[state.settingsFurniId] : undefined));
    const closeSettings = useWiredLabelsStore((state) => state.closeSettings);
    const { roomSettings } = useWiredToolsState();

    if (!furniId || !label || !roomSettings.canModify) return null;

    return <FurnitureLabelSettingsCardView key={furniId} label={label} onClose={closeSettings} />;
};
