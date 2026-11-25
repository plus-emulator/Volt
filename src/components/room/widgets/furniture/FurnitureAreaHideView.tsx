import { GetRoomEngine } from '@volt/renderer';
import { CSSProperties, FC, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LocalizeText, useVoltLayout } from '../../../../api';
import { DraggableWindow, VoltCardContentView, VoltCardView } from '../../../../common';
import { NativeText } from '../../../../common/native-text/NativeText';
import { useFurnitureAreaHideWidget } from '../../../../hooks';
import { Native0Button, Native0Checkbox } from '../../../mod-tools/native/NativeWindow0';
import { Native3Frame } from '../../../mod-tools/native/NativeWindow3';
import './FurnitureAreaHideView.css';

// AIR layout area_hide_ui: a 292x334 frame style 3 in 0x67a3bf with its content at the frame margins (6, 25).
const WIDTH = 292;
const HEIGHT = 334;
const PANEL_COLOR = 0xffffff;
const INFO_COLOR = 0x999999;

const rect = (x: number, y: number, width?: number): CSSProperties => ({ position: 'absolute', left: x, top: y, width });

/** Centred like AIR's window center(): whole pixels, rounded down. */
const centred = () => ({ x: Math.floor((window.innerWidth - WIDTH) / 2), y: Math.floor((window.innerHeight - HEIGHT) / 2) });

interface TextProps {
    x: number;
    y: number;
    text: string;
    width?: number;
    bold?: boolean;
    color?: number;
    dimmed: boolean;
}

// A u_small text window; while the hider is on the widget sets every text to blend 0.5.
const Text: FC<TextProps> = ({ x, y, text, width, bold = false, color = 0, dimmed }) => (
    <div style={{ ...rect(x, y, width), opacity: dimmed ? 0.5 : 1 }}>
        <NativeText background={PANEL_COLOR} maxWidth={width} overrides={{ bold, color }} text={text} textStyle="u_small" />
    </div>
);

interface OptionProps {
    y: number;
    name: string;
    label: string;
    info?: string;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
}

const Option: FC<OptionProps> = ({ y, name, label, info, checked, disabled, onToggle }) => (
    <>
        <div style={{ opacity: disabled ? 0.5 : 1 }}>
            <Native0Checkbox checked={checked} enabled={!disabled} name={name} x={7} y={y} onToggle={onToggle} />
        </div>
        <Text dimmed={disabled} text={label} width={240} x={26} y={y} />
        {info && <Text color={INFO_COLOR} dimmed={disabled} text={info} width={242} x={26} y={y + 16} />}
    </>
);

interface TouchOptionProps {
    label: string;
    info?: string;
    checked: boolean;
    disabled: boolean;
    onToggle: () => void;
}

const TouchOption: FC<TouchOptionProps> = ({ label, info, checked, disabled, onToggle }) => (
    <button
        aria-checked={checked}
        className={`volt-area-hide-touch__option ${checked ? 'is-checked' : ''}`}
        disabled={disabled}
        role="checkbox"
        type="button"
        onClick={onToggle}
    >
        <span aria-hidden="true" className="volt-area-hide-touch__checkbox" />
        <span className="volt-area-hide-touch__option-text">
            <span className="volt-area-hide-touch__option-label">{label}</span>
            {info && <span className="volt-area-hide-touch__option-info">{info}</span>}
        </span>
    </button>
);

export const FurnitureAreaHideView: FC<{}> = () => {
    const layout = useVoltLayout();
    const isTouch = layout !== 'desktop';
    const {
        objectId = -1,
        isOn,
        rootX = 0,
        rootY = 0,
        width = 0,
        length = 0,
        selecting,
        wallItems,
        inverted,
        invisibility,
        save = null,
        startSelecting = null,
        clearArea = null,
        toggleOnOff = null,
        onClose = null
    } = useFurnitureAreaHideWidget();
    const [selectWidth, setSelectWidth] = useState(0);
    const prevAreaRef = useRef<{ rootX: number; rootY: number; width: number; length: number } | null>(null);

    if (objectId === -1) return null;

    if (isTouch) {
        const onStartSelecting = () => {
            prevAreaRef.current = { rootX, rootY, width, length };
            startSelecting();
        };

        const onCancelSelecting = () => {
            const previous = prevAreaRef.current;

            prevAreaRef.current = null;
            clearArea();

            if (previous && previous.width > 0 && previous.length > 0) {
                save(previous);
                GetRoomEngine().areaSelectionManager.setHighlight(previous.rootX, previous.rootY, previous.width, previous.length);
            }
        };

        if (selecting) {
            return createPortal(
                <div className="volt-area-hide-selecting-bar" role="status">
                    <span className="volt-area-hide-selecting-bar__text">Drag across tiles in the room to select area</span>
                    <button className="volt-area-hide-touch__btn is-danger volt-area-hide-selecting-bar__cancel" type="button" onClick={onCancelSelecting}>
                        {LocalizeText('generic.cancel')}
                    </button>
                </div>,
                document.body
            );
        }

        const hasArea = width > 0 && length > 0;

        return (
            <VoltCardView
                classNames={['volt-area-hide-touch']}
                frameStyle={3}
                isResizable={false}
                touchPresentation="half"
                uniqueKey="area-hide"
            >
                <div className="volt-card-header-shell drag-handler">
                    <span className="volt-card-title">{LocalizeText('widget.areahide.title')}</span>
                    <button
                        aria-label={LocalizeText('generic.close')}
                        className="volt-card-close-button"
                        type="button"
                        onClick={onClose}
                        onPointerDown={(event) => event.stopPropagation()}
                    />
                </div>
                <VoltCardContentView className="volt-area-hide-touch__content" overflow="hidden">
                    <div className="volt-area-hide-touch__scroll">
                        <section className={`volt-area-hide-touch__section ${isOn ? 'is-dimmed' : ''}`}>
                            <div className="volt-area-hide-touch__section-head">
                                <h3 className="volt-area-hide-touch__heading">{LocalizeText('widget.areahide.area_selection')}</h3>
                                {hasArea && (
                                    <span className="volt-area-hide-touch__badge">
                                        {width} × {length}
                                    </span>
                                )}
                            </div>
                            <p className="volt-area-hide-touch__info">{LocalizeText('widget.areahide.area_selection.info')}</p>
                            <div className="volt-area-hide-touch__actions">
                                <button
                                    className="volt-area-hide-touch__btn"
                                    disabled={isOn || selecting}
                                    type="button"
                                    onClick={onStartSelecting}
                                >
                                    {LocalizeText('widget.areahide.area_selection.select')}
                                </button>
                                <button
                                    className="volt-area-hide-touch__btn"
                                    disabled={isOn}
                                    type="button"
                                    onClick={clearArea}
                                >
                                    {LocalizeText('widget.areahide.area_selection.clear')}
                                </button>
                            </div>
                        </section>

                        <section className={`volt-area-hide-touch__section ${isOn ? 'is-dimmed' : ''}`}>
                            <h3 className="volt-area-hide-touch__heading">{LocalizeText('widget.areahide.options')}</h3>
                            <div className="volt-area-hide-touch__options">
                                <TouchOption
                                    checked={wallItems}
                                    disabled={isOn}
                                    label={LocalizeText('widget.areahide.options.wallitems')}
                                    onToggle={() => save({ wallItems: !wallItems })}
                                />
                                <TouchOption
                                    checked={inverted}
                                    disabled={isOn}
                                    info={LocalizeText('widget.areahide.options.invert.info')}
                                    label={LocalizeText('widget.areahide.options.invert')}
                                    onToggle={() => save({ inverted: !inverted })}
                                />
                                <TouchOption
                                    checked={invisibility}
                                    disabled={isOn}
                                    info={LocalizeText('widget.areahide.options.invisibility.info')}
                                    label={LocalizeText('widget.areahide.options.invisibility')}
                                    onToggle={() => save({ invisibility: !invisibility })}
                                />
                            </div>
                        </section>
                    </div>
                    <div className="volt-area-hide-touch__footer">
                        <button
                            className={`volt-area-hide-touch__btn volt-area-hide-touch__toggle ${isOn ? 'is-danger' : 'is-primary'}`}
                            type="button"
                            onClick={toggleOnOff}
                        >
                            {LocalizeText(isOn ? 'widget.areahide.button.off' : 'widget.areahide.button.on')}
                        </button>
                    </div>
                </VoltCardContentView>
            </VoltCardView>
        );
    }

    return (
        <DraggableWindow handleSelector=".native3-title" initialPosition={centred()} uniqueKey="area-hide">
            <Native3Frame color={0x67a3bf} height={HEIGHT} title={LocalizeText('widget.areahide.title')} width={WIDTH} onClose={onClose}>
                <div className="furniture-area-hide__panel">
                    <Text bold dimmed={isOn} text={LocalizeText('widget.areahide.area_selection')} x={6} y={7} />
                    <Text dimmed={isOn} text={LocalizeText('widget.areahide.area_selection.info')} width={262} x={6} y={27} />
                    <Native0Button
                        enabled={!isOn && !selecting}
                        fit="left"
                        height={24}
                        label={LocalizeText('widget.areahide.area_selection.select')}
                        name="select_button"
                        width={211}
                        x={6}
                        y={73}
                        onClick={startSelecting}
                        onFit={setSelectWidth}
                    />
                    {/* button_container is an itemlist_horizontal with 12px spacing. */}
                    <Native0Button
                        enabled={!isOn}
                        fit="left"
                        height={24}
                        label={LocalizeText('widget.areahide.area_selection.clear')}
                        name="clear_button"
                        width={205}
                        x={6 + selectWidth + 12}
                        y={73}
                        onClick={clearArea}
                    />
                    <Text bold dimmed={isOn} text={LocalizeText('widget.areahide.options')} x={6} y={105} />
                    <Option
                        checked={wallItems}
                        disabled={isOn}
                        label={LocalizeText('widget.areahide.options.wallitems')}
                        name="wallitems_checkbox"
                        y={125}
                        onToggle={() => save({ wallItems: !wallItems })}
                    />
                    <Option
                        checked={inverted}
                        disabled={isOn}
                        info={LocalizeText('widget.areahide.options.invert.info')}
                        label={LocalizeText('widget.areahide.options.invert')}
                        name="invert_checkbox"
                        y={145}
                        onToggle={() => save({ inverted: !inverted })}
                    />
                    <Option
                        checked={invisibility}
                        disabled={isOn}
                        info={LocalizeText('widget.areahide.options.invisibility.info')}
                        label={LocalizeText('widget.areahide.options.invisibility')}
                        name="invisiblity_checkbox"
                        y={193}
                        onToggle={() => save({ invisibility: !invisibility })}
                    />
                </div>
                <Native0Button
                    fit="right"
                    height={24}
                    label={LocalizeText(isOn ? 'widget.areahide.button.off' : 'widget.areahide.button.on')}
                    name="on_off_button"
                    width={151}
                    x={126}
                    y={272}
                    onClick={toggleOnOff}
                />
            </Native3Frame>
        </DraggableWindow>
    );
};
