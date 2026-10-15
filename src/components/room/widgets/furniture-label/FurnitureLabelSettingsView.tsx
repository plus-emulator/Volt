// WIRED Label settings card (AIR WIN63-202610131318: FurnitureLabelSettingsView.as L14-120, COLORS L17; class_3636 saveLabelSettings L98; out 2970 WiredLabelSaveSettingsComposer). Opened from the infostand Settings button.
import { IWiredLabelData, WiredLabelSaveSettingsComposer } from '@volt/renderer';
import { FC, useState } from 'react';
import { SendMessageComposer, localizeWithFallback } from '../../../../api';
import { FURNITURE_LABEL_COLORS, FURNITURE_LABEL_COLOR_KEYS, FURNITURE_LABEL_VISIBILITY_EVERYONE, FURNITURE_LABEL_VISIBILITY_WIRED } from '../../../../api/wired/WiredLabel';
import { DraggableWindow } from '../../../../common';
import { HabboDropMenuView } from '../../../../common/dropmenu/HabboDropMenuView';
import { NativeText } from '../../../../common/native-text/NativeText';
import { FurnitureLabelColorPreview } from './FurnitureLabelColorPreview';
import { useWiredToolsState } from '../../../../hooks';
import { useWiredLabelsStore } from '../../../../hooks/rooms/widgets/useWiredLabelsState';

interface FurnitureLabelSettingsCardViewProps {
    label: IWiredLabelData;
    onClose: () => void;
}

/** Keyed by furni id, so each open starts from the label's current settings. */
const FURNITURE_LABEL_COLOR_NAMES = ['Blue', 'Teal', 'Green', 'Gold', 'Orange', 'Red', 'Purple', 'Charcoal'];

export const FurnitureLabelSettingsCardView: FC<FurnitureLabelSettingsCardViewProps> = (props) => {
    const { label, onClose } = props;
    const [colorIndex, setColorIndex] = useState(() => Math.max(0, FURNITURE_LABEL_COLORS.indexOf(label.bubbleColor)));
    const [visibility, setVisibility] = useState(label.visibility === FURNITURE_LABEL_VISIBILITY_EVERYONE ? FURNITURE_LABEL_VISIBILITY_EVERYONE : FURNITURE_LABEL_VISIBILITY_WIRED);
    const [alwaysOpen, setAlwaysOpen] = useState(label.alwaysOpen);

    const everyone = visibility === FURNITURE_LABEL_VISIBILITY_EVERYONE;

    const save = () => {
        SendMessageComposer(new WiredLabelSaveSettingsComposer(label.furnitureId, FURNITURE_LABEL_COLORS[colorIndex], visibility, everyone && alwaysOpen));
        onClose();
    };

    const title = localizeWithFallback('widget.furniture_label.settings.title', 'Label settings');
    const colorLabel = localizeWithFallback('widget.furniture_label.settings.color', 'Label color');
    const visibilityLabel = localizeWithFallback('widget.furniture_label.settings.visibility', 'Who can see this label?');

    return (
        <DraggableWindow handleSelector=".volt-furni-label-settings__titlebar">
            <section className="volt-furni-label-settings" role="dialog" aria-label={title}>
                <div className="volt-furni-label-settings__chrome" aria-hidden="true" />
                <div className="volt-furni-label-settings__titlebar">
                    <span className="volt-furni-label-settings__title"><NativeText text={title} textStyle="il_frame_title" background={0xe2e2e2} /></span>
                </div>
                <button className="volt-furni-label-settings__close" type="button" aria-label={localizeWithFallback('generic.close', 'Close')} onClick={onClose} />
                <div className="volt-furni-label-settings__content">
                    <label className="volt-furni-label-settings__color-label">
                        <NativeText text={colorLabel} textStyle="u_small" background={0xe2e2e2} overrides={{ bold: true }} />
                    </label>
                    <HabboDropMenuView<number> label={colorLabel} skinStyle={3} className="volt-furni-label-settings__color" value={colorIndex} onSelect={setColorIndex}
                        options={FURNITURE_LABEL_COLOR_KEYS.map((key, index) => ({ value: index, label: localizeWithFallback(`widget.furniture_label.settings.color.${key}`, FURNITURE_LABEL_COLOR_NAMES[index]) }))} />
                    <FurnitureLabelColorPreview color={FURNITURE_LABEL_COLORS[colorIndex]} />
                    <label className="volt-furni-label-settings__visibility-label">
                        <NativeText text={visibilityLabel} textStyle="u_small" background={0xe2e2e2} overrides={{ bold: true }} />
                    </label>
                    <HabboDropMenuView<number> label={visibilityLabel} skinStyle={3} className="volt-furni-label-settings__visibility" value={visibility} onSelect={setVisibility}
                        options={[
                            { value: FURNITURE_LABEL_VISIBILITY_EVERYONE, label: localizeWithFallback('widget.furniture_label.settings.visibility.everyone', 'Everyone') },
                            { value: FURNITURE_LABEL_VISIBILITY_WIRED, label: localizeWithFallback('widget.furniture_label.settings.visibility.wired', 'Users with Wired inspection rights') }
                        ]} />
                    <label className="volt-furni-label-settings__always-open" aria-disabled={!everyone}>
                        <input type="checkbox" checked={alwaysOpen} disabled={!everyone} onChange={(event) => setAlwaysOpen(event.target.checked)} />
                        <span><NativeText text={localizeWithFallback('widget.furniture_label.settings.always_open', 'Keep this label always open')}
                            textStyle="u_small" background={0xe2e2e2} overrides={{ size: 11, color: everyone ? 0 : 0x8c8c88 }} /></span>
                    </label>
                    <button className="volt-furni-label-settings__cancel fnd-button fnd-button-thick" type="button" onClick={onClose}>
                        <NativeText text={localizeWithFallback('generic.cancel', 'Cancel')} textStyle="button_shiny_bold" background={0xffffff} />
                    </button>
                    <button className="volt-furni-label-settings__save fnd-button fnd-button-thick fnd-button-green" type="button" onClick={save}>
                        <NativeText text={localizeWithFallback('wiredfurni.ready', 'Ready')} textStyle="button_shiny_bold" background={0xffffff} />
                    </button>
                </div>
            </section>
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
