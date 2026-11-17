import { FC, ReactNode, useState } from 'react';
import { GetConfigurationValue, LocalizeText } from '../../../../../api';
import arrowDown from '../../../../../assets/images/chest/air-arrow-down.png';
import arrowUp from '../../../../../assets/images/chest/air-arrow-up.png';
import checkmark from '../../../../../assets/images/chest/air-checkmark-small.png';
import { VoltCardHeaderView, VoltCardView } from '../../../../../common';
import { HabboDropMenuView } from '../../../../../common/dropmenu/HabboDropMenuView';
import { ChestShinyButton, ChestText, ChestTitle } from './ChestAirParts';

/*
 * The Ubuntu wired UI builder (UbuntuPresetManager, wired_style_ubuntu) as the chest settings windows use it. Frame margins are
 * 1/33/1/8; the scrolling list starts at y 34 under a splitter. A section title sits 8px under its splitter, its slot border
 * (style 3, 0xdadada) 24px under the title, and the next splitter 8px under the border. Inside a border, labels start 10px down,
 * a field 24px under its label, an inner splitter 8px under a field and the border ends 10px under its last field.
 */
const LIST_TOP = 34;
const SCROLLBAR = 12;
const ROW = 21;

type Item =
    | { kind: 'checkboxes'; rows: { label: string; checked: boolean; onChange: (value: boolean) => void }[]; x: number; label?: string; disabled?: boolean }
    | { kind: 'input'; label: string; value: string; maxLength: number; onChange: (value: string) => void }
    | { kind: 'textarea'; label: string; value: string; maxLength: number; onChange: (value: string) => void }
    | { kind: 'dropdown'; label: string; value: number; options: { value: number; label: string }[]; onChange: (value: number) => void; note?: string; disabled?: boolean }
    | { kind: 'button'; content: ReactNode; disabled: boolean; done: boolean; onClick: () => void };

interface Section {
    title: string;
    items: Item[];
    /** An expandable section: a header with the arrow region and, when open, a text instead of a border. */
    expandable?: { open: boolean; onToggle: () => void; text: string; textHeight: number; onTextHeight: (height: number) => void };
}

interface Placed {
    key: string;
    node: ReactNode;
}

/** Places every section with the builder's spacing; returns the elements in list coordinates and the content height. */
const layout = (sections: Section[], width: number, scrollbar: number): { placed: Placed[]; height: number } => {
    const placed: Placed[] = [];
    const boxWidth = width - 16 - scrollbar;
    const fieldWidth = boxWidth - 24;
    let y = 41 - LIST_TOP;
    const at = (key: string, left: number, top: number, node: ReactNode, extra = {}) =>
        placed.push({ key, node: <div key={key} className="volt-chest-preset__at" style={{ left, top, ...extra }}>{node}</div> });

    sections.forEach((section, index) => {
        if (index > 0) {
            at(`split-${index}`, 0, y, null, { width: width - 2 - scrollbar, height: 1, background: '#b5b5b5' });
            y += 8;
        }

        at(`title-${index}`, 7, y, <ChestText bold background={0xe9e9e1} text={section.title} />);

        if (section.expandable) {
            const { open, onToggle, text, textHeight, onTextHeight } = section.expandable;
            placed.push({
                key: `toggle-${index}`,
                node: (
                    <button key={`toggle-${index}`} aria-expanded={open} aria-label={section.title} className="volt-chest-preset__toggle" style={{ left: width - 25 - scrollbar, top: y + 2 }} type="button" onClick={onToggle}>
                        <img alt="" draggable={false} src={open ? arrowUp : arrowDown} />
                    </button>
                ),
            });
            y += 24;
            if (open) {
                at(`text-${index}`, 8, y - 1, <ChestText truncate background={0xe9e9e1} maxWidth={width - 16 - scrollbar} text={text} onHeight={onTextHeight} />);
                y += textHeight + 7;
            }
            return;
        }

        const boxTop = y + 24;
        let cy = boxTop + 10;
        let first = true;
        const nodes: Placed[] = [];
        const separate = () => {
            if (!first) {
                nodes.push({ key: `inner-${cy}`, node: <div key={`inner-${index}-${cy}`} className="volt-chest-preset__at" style={{ left: 12, top: cy + 8, width: boxWidth - 10, height: 1, background: '#b5b5b5' }} /> });
                cy += 16;
            }
            first = false;
        };
        const boxAt = (key: string, left: number, top: number, node: ReactNode) =>
            nodes.push({ key, node: <div key={key} className="volt-chest-preset__at" style={{ left, top }}>{node}</div> });

        section.items.forEach((item, itemIndex) => {
            const key = `${index}-${itemIndex}`;
            if (item.kind === 'checkboxes') {
                separate();
                let rowY = cy + 1;
                if (item.label) {
                    boxAt(`l-${key}`, 19, cy, <ChestText bold background={0xd9d9d9} text={item.label} />);
                    rowY = cy + 25;
                }
                item.rows.forEach((row, rowIndex) => {
                    boxAt(
                        `c-${key}-${rowIndex}`,
                        item.x - 1,
                        rowY + rowIndex * ROW,
                        <label className={`volt-chest-preset__checkbox${item.disabled ? ' is-disabled' : ''}`}>
                            <input checked={row.checked} disabled={item.disabled} type="checkbox" onChange={(event) => row.onChange(event.target.checked)} />
                            <ChestText background={0xd9d9d9} className="volt-chest-preset__checkbox-label" text={row.label} />
                        </label>,
                    );
                });
                cy = rowY + (item.rows.length - 1) * ROW + 15;
                return;
            }

            separate();
            if (item.kind === 'button') {
                boxAt(
                    `b-${key}`,
                    12,
                    cy,
                    <span className="volt-chest-preset__button-row" style={{ width: fieldWidth + 14 }}>
                        <button className="volt-catalog-air-shiny volt-chest-preset__container-button" data-air-name="wired_upgrade_button" disabled={item.disabled} style={{ width: fieldWidth - 7, height: 27 }} type="button" onClick={item.onClick}>
                            {item.content}
                        </button>
                        {item.done && <img alt="" draggable={false} src={checkmark} />}
                    </span>,
                );
                cy += 26;
                return;
            }

            boxAt(`l-${key}`, 19, cy, <ChestText bold background={0xd9d9d9} text={item.label} />);
            cy += 24;
            if (item.kind === 'input' || item.kind === 'textarea') {
                const height = item.kind === 'input' ? 24 : 64;
                boxAt(
                    `f-${key}`,
                    19,
                    cy,
                    <span className={`volt-chest-preset__field is-${item.kind}`} style={{ width: fieldWidth, height }}>
                        {item.kind === 'input' ? (
                            <input maxLength={item.maxLength} type="text" value={item.value} onChange={(event) => item.onChange(event.target.value)} />
                        ) : (
                            <textarea maxLength={item.maxLength} value={item.value} onChange={(event) => item.onChange(event.target.value)} />
                        )}
                    </span>,
                );
                cy += height - 1;
                return;
            }

            boxAt(
                `d-${key}`,
                19,
                cy,
                <HabboDropMenuView<number> disabled={item.disabled} label={item.label} options={item.options} skinStyle={3} style={{ width: fieldWidth }} value={item.value} onSelect={item.onChange} />,
            );
            cy += 23;
            if (item.note) {
                boxAt(`n-${key}`, 20, cy + 6, <ChestText background={0xd9d9d9} blend={0.5} text={item.note} />);
                cy += 22;
            }
        });

        const boxLast = cy + 10;
        placed.push({ key: `box-${index}`, node: <div key={`box-${index}`} className="volt-chest-preset__box" style={{ left: 7, top: boxTop, width: boxWidth, height: boxLast - boxTop + 1 }} /> });
        placed.push(...nodes);
        y = boxLast + 8;
    });

    return { placed, height: y };
};

interface ChestPresetFrameProps {
    title: string;
    width: number;
    sections: Section[];
    onReady: () => void;
    onCancel: () => void;
}

/** createFramePreset: the list scrolls once it is taller than screen height / 2.4 (less the list chrome), then the Ready / Cancel row. */
const ChestPresetFrame: FC<ChestPresetFrameProps> = ({ title, width, sections, onReady, onCancel }) => {
    const maxHeight = Math.floor(window.screen.height / 2.4) - 12;
    const scrolling = layout(sections, width, 0).height > maxHeight;
    const { placed, height } = layout(sections, width, scrolling ? SCROLLBAR : 0);
    const viewport = Math.min(height, maxHeight);
    const footer = LIST_TOP + viewport;
    const buttonWidth = Math.ceil((width - 29) / 2);

    return (
        <VoltCardView className="volt-chest-preset" frameStyle={3} isResizable={false} style={{ width, height: footer + 38 }} unconstrainedPosition>
            <VoltCardHeaderView headerText="" onCloseClick={onCancel}>
                <ChestTitle text={title} />
            </VoltCardHeaderView>
            <div className={`volt-chest-preset__list${height > viewport ? ' is-scrolling' : ''}`} style={{ height: viewport }}>
                <div style={{ position: 'relative', height }}>{placed.map((item) => item.node)}</div>
            </div>
            <div className="volt-chest-preset__footer" style={{ top: footer }} />
            <ChestShinyButton airName="ready_button" caption={LocalizeText('wiredfurni.ready')} rect={[8, footer + 8, buttonWidth, 24]} onClick={onReady} />
            <ChestShinyButton airName="cancel_button" caption={LocalizeText('cancel')} rect={[width - 8 - buttonWidth, footer + 8, buttonWidth, 24]} onClick={onCancel} />
        </VoltCardView>
    );
};

export interface ChestSettingsDraft {
    name: string;
    description: string;
    open: boolean;
    donate: boolean;
    state: number;
    previewMode: number;
    previewAmount: number;
}

interface ChestSettingsWindowProps {
    isFurni: boolean;
    chestTypeLabel: string;
    draft: ChestSettingsDraft;
    onChange: (draft: ChestSettingsDraft) => void;
    /** The chest is (or is being made) a Wired chest: the upgrade button is off and the checkmark shows. */
    wiredDone: boolean;
    onUpgrade: () => void;
    onReady: () => void;
    onCancel: () => void;
}

const range = (count: number, start = 0) => Array.from({ length: count }, (_, index) => index + start);

/** ChestSettingsUI: access, info, appearance (preview only for furni chests) and the Wired upgrade, 300px wide. */
export const ChestSettingsWindow: FC<ChestSettingsWindowProps> = ({ isFurni, chestTypeLabel, draft, onChange, wiredDone, onUpgrade, onReady, onCancel }) => {
    const set = (patch: Partial<ChestSettingsDraft>) => onChange({ ...draft, ...patch });
    const appearance: Item[] = [
        { kind: 'dropdown', label: LocalizeText('wiredchests.settings.appearance.state'), value: draft.state, options: range(4).map((value) => ({ value, label: LocalizeText(`wiredchests.settings.appearance.state.${value}`) })), onChange: (state) => set({ state }) },
    ];
    if (isFurni) {
        appearance.push(
            { kind: 'dropdown', label: LocalizeText('wiredchests.settings.appearance.preview'), value: draft.previewMode, options: range(8).map((value) => ({ value, label: LocalizeText(`wiredchests.settings.appearance.preview.${value}`) })), onChange: (previewMode) => set({ previewMode }), note: LocalizeText('wiredchests.settings.appearance.preview.note') },
            { kind: 'dropdown', label: LocalizeText('wiredchests.settings.appearance.preview_amount'), value: draft.previewAmount, options: range(4, 1).map((value) => ({ value, label: String(value) })), onChange: (previewAmount) => set({ previewAmount }), disabled: draft.previewMode === 0 },
        );
    }

    return (
        <ChestPresetFrame
            sections={[
                {
                    title: LocalizeText('wiredchests.settings.access'),
                    items: [{ kind: 'checkboxes', x: 13, rows: [
                        { label: LocalizeText('wiredchests.settings.access.open'), checked: draft.open, onChange: (open) => set({ open }) },
                        { label: LocalizeText('wiredchests.settings.access.donate'), checked: draft.donate, onChange: (donate) => set({ donate }) },
                    ] }],
                },
                {
                    title: LocalizeText('wiredchests.settings.info'),
                    items: [
                        { kind: 'input', label: LocalizeText('wiredchests.settings.info.name'), value: draft.name, maxLength: 30, onChange: (name) => set({ name }) },
                        { kind: 'textarea', label: LocalizeText('wiredchests.settings.info.desc'), value: draft.description, maxLength: 200, onChange: (description) => set({ description }) },
                    ],
                },
                { title: LocalizeText('wiredchests.settings.appearance'), items: appearance },
                {
                    title: LocalizeText('wiredchests.settings.wired'),
                    items: [{
                        kind: 'button',
                        disabled: wiredDone,
                        done: wiredDone,
                        onClick: onUpgrade,
                        content: (
                            <span className="volt-chest-preset__button-content">
                                <img alt="" draggable={false} src={`${GetConfigurationValue<string>('image.library.url', '')}catalogue/icon_80.png`} />
                                <ChestText background={0xeeeeee} text={LocalizeText('wiredchests.settings.wired.upgrade')} />
                            </span>
                        ),
                    }],
                },
            ]}
            title={LocalizeText('wiredchests.settings.title', ['chest_type'], [chestTypeLabel])}
            width={300}
            onCancel={onCancel}
            onReady={onReady}
        />
    );
};

export interface ChestNotificationsDraft {
    full: boolean;
    donation: boolean;
    withdraw: boolean;
    empty: boolean;
    wired: boolean;
    mode: number;
}

interface ChestNotificationsWindowProps {
    chestTypeLabel: string;
    wiredEnabled: boolean;
    draft: ChestNotificationsDraft;
    onChange: (draft: ChestNotificationsDraft) => void;
    onReady: () => void;
    onCancel: () => void;
}

/** ChestNotificationSettingsUI: a collapsed info section, the notifications and the mode, 350px wide. */
export const ChestNotificationsWindow: FC<ChestNotificationsWindowProps> = ({ chestTypeLabel, wiredEnabled, draft, onChange, onReady, onCancel }) => {
    const [infoOpen, setInfoOpen] = useState(false);
    const [infoHeight, setInfoHeight] = useState(0);
    const set = (patch: Partial<ChestNotificationsDraft>) => onChange({ ...draft, ...patch });
    const key = 'wiredchests.notification_settings';

    return (
        <ChestPresetFrame
            sections={[
                {
                    title: LocalizeText(`${key}.notification_info`),
                    items: [],
                    expandable: { open: infoOpen, onToggle: () => setInfoOpen((value) => !value), text: LocalizeText(`${key}.notification_info.desc`).replace(/\\n/g, '\n'), textHeight: infoHeight, onTextHeight: setInfoHeight },
                },
                {
                    title: LocalizeText(`${key}.enable_notifications`),
                    items: [
                        { kind: 'checkboxes', x: 20, label: LocalizeText(`${key}.enable_notifications.generic`), rows: [
                            { label: LocalizeText(`${key}.enable_notifications.generic.0`), checked: draft.full, onChange: (full) => set({ full }) },
                            { label: LocalizeText(`${key}.enable_notifications.generic.1`), checked: draft.donation, onChange: (donation) => set({ donation }) },
                        ] },
                        { kind: 'checkboxes', x: 20, label: LocalizeText(`${key}.enable_notifications.wired`), disabled: !wiredEnabled, rows: [
                            { label: LocalizeText(`${key}.enable_notifications.wired.0`), checked: draft.withdraw, onChange: (withdraw) => set({ withdraw }) },
                            { label: LocalizeText(`${key}.enable_notifications.wired.1`), checked: draft.empty, onChange: (empty) => set({ empty }) },
                            { label: LocalizeText(`${key}.enable_notifications.wired.2`), checked: draft.wired, onChange: (wired) => set({ wired }) },
                        ] },
                    ],
                },
                {
                    title: LocalizeText(`${key}.notification_mode`),
                    items: [{ kind: 'dropdown', label: LocalizeText(`${key}.notification_mode.when`), value: draft.mode, options: range(2).map((value) => ({ value, label: LocalizeText(`${key}.notification_mode.when.${value}`) })), onChange: (mode) => set({ mode }) }],
                },
            ]}
            title={LocalizeText(`${key}.title`, ['chest_type'], [chestTypeLabel])}
            width={350}
            onCancel={onCancel}
            onReady={onReady}
        />
    );
};
