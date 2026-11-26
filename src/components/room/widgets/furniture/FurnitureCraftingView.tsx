import { CSSProperties, FC, MouseEvent, useState } from 'react';
import { ICraftingFurni, LocalizeText } from '../../../../api';
import craftBackground from '../../../../assets/images/crafting/craft_bg.png';
import frameBase from '../../../../assets/images/habbo-skin/slices/frame-ubuntu-3-base.png';
import { useTintedSkin } from '../../../../common';
import { AirSkinButton } from '../../../../common/air/AirSkinButton';
import { NativeText } from '../../../../common/native-text/NativeText';
import { useFurnitureCraftingWidget } from '../../../../hooks';
import { NativeModalView } from '../../../notification-center/views/native/NativeModalView';
import './FurnitureCraftingView.css';

// craftingwidget_xml: a 543x407 frame style 3 coloured 0x2d4f64. Positions below are the layout's, inside the frame's content area.
const FRAME_COLOR = 0x2d4f64;
const BUTTON_COLOR = 0x299f3a;
const BUTTON_WIDTH = 216;
const BAR_START_WIDTH = 14;
const PANEL_BACKGROUND = 0x24292b;
const BOARD_BACKGROUND = 0x343b3e;

interface TooltipState {
    text: string;
    x: number;
    y: number;
}

const at = (left: number, top: number, width?: number, height?: number): CSSProperties => ({ left, top, width, height });

const isPrimary = (event: MouseEvent) => event.button === 0;

/** A bitmap window with pivot_point center: the image keeps its size (times the zoom) and sits on whole pixels in the middle. */
const PivotBitmap: FC<{ src: string; width: number; height: number; zoom?: number; blend?: number }> = ({ src, width, height, zoom = 1, blend = 1 }) => {
    const [size, setSize] = useState<{ src: string; width: number; height: number }>(null);
    const known = size?.src === src ? size : null;

    return (
        <img
            alt=""
            className="volt-crafting__bitmap"
            draggable={false}
            src={src}
            style={{
                left: known ? Math.floor((width - known.width * zoom) / 2) : 0,
                top: known ? Math.floor((height - known.height * zoom) / 2) : 0,
                width: known ? known.width * zoom : undefined,
                height: known ? known.height * zoom : undefined,
                opacity: blend,
                visibility: known ? 'visible' : 'hidden'
            }}
            onLoad={(event) => setSize({ src, width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
        />
    );
};

interface CraftingCellProps {
    furni: ICraftingFurni;
    count?: number;
    blend?: number;
    onDown: () => void;
    onTooltip: (tooltip: TooltipState) => void;
}

/** The 40x40 thumbnail container: the icon, a tooltip region with the furni name and the number_container badge. */
const CraftingCell: FC<CraftingCellProps> = ({ furni, count = 0, blend = 1, onDown, onTooltip }) => {
    const showTooltip = (event: MouseEvent) => onTooltip({ text: furni.name, x: event.clientX, y: event.clientY });

    return (
        <div
            className="volt-crafting__cell"
            onMouseDown={(event) => isPrimary(event) && onDown()}
            onMouseEnter={showTooltip}
            onMouseLeave={() => onTooltip(null)}
            onMouseMove={showTooltip}
        >
            {!!furni.iconUrl && <PivotBitmap blend={blend} height={40} src={furni.iconUrl} width={40} />}
            {count > 0 && (
                <div className="volt-crafting__count">
                    <NativeText nativeResolution background={0xffffff} overrides={{ color: 0x2f6982 }} text={String(count)} textStyle="regular" />
                </div>
            )}
        </div>
    );
};

export const FurnitureCraftingView: FC<{}> = () => {
    const {
        isOpen,
        header,
        infoText1,
        infoText2,
        icon,
        button,
        progress,
        recipes,
        ingredients,
        mixer,
        close,
        selectRecipe,
        selectIngredient,
        selectMixerItem,
        startCrafting,
        cancelProgress
    } = useFurnitureCraftingWidget();
    const frameImage = useTintedSkin(isOpen ? frameBase : null, FRAME_COLOR, 33);
    const [tooltip, setTooltip] = useState<TooltipState>(null);

    if (!isOpen) return null;

    const barWidth = progress <= 0 ? BAR_START_WIDTH : Math.trunc(BUTTON_WIDTH * progress);

    return (
        <NativeModalView keepOnTop>
            <section
                aria-label={LocalizeText('crafting.title')}
                aria-modal="true"
                className="volt-card-shell volt-card-frame-3 volt-crafting"
                role="dialog"
                style={frameImage ? ({ '--volt-card-frame-3': frameImage } as CSSProperties) : undefined}
            >
                <div className="volt-card-header-shell">
                    <span className="volt-card-title">{LocalizeText('crafting.title')}</span>
                    <div className="volt-card-close-button" onClick={close} />
                </div>
                <div className="volt-crafting__content">
                    <img alt="" className="volt-crafting__background" draggable={false} src={craftBackground} />
                    <div className="volt-crafting__abs" style={at(398, 198, 131, 101)}>
                        {!!icon?.iconUrl && <PivotBitmap height={101} src={icon.iconUrl} width={131} zoom={2} />}
                    </div>
                    <div className="volt-crafting__abs volt-crafting__heading" style={at(26, 32, 219, 21)}>
                        <NativeText
                            transparent
                            align="center"
                            background={0x8a7a6c}
                            overrides={{ size: 14, color: 0xcec7b6 }}
                            text={LocalizeText('crafting.title.products')}
                            textStyle="u_regular"
                        />
                    </div>
                    <div className="volt-crafting__abs volt-crafting__heading" style={at(26, 200, 219, 21)}>
                        <NativeText
                            transparent
                            align="center"
                            background={0x8a7a6c}
                            overrides={{ size: 14, color: 0xcec7b6 }}
                            text={LocalizeText('crafting.title.mixer')}
                            textStyle="u_regular"
                        />
                    </div>
                    {!!header && (
                        <div className="volt-crafting__abs" style={at(292, 33, 215, 28)}>
                            <NativeText
                                transparent
                                background={BOARD_BACKGROUND}
                                maxWidth={215}
                                overrides={{ size: 11, color: 0x9ca1a2 }}
                                text={header}
                                textStyle="u_regular"
                            />
                        </div>
                    )}
                    <div className="volt-crafting__abs volt-crafting__grid has-air-scrollbar" style={at(26, 69, 246, 108)}>
                        {recipes.map((recipe, index) => (
                            <CraftingCell
                                key={`${recipe.recipeName}-${index}`}
                                furni={recipe.furni}
                                onDown={() => selectRecipe(recipe)}
                                onTooltip={setTooltip}
                            />
                        ))}
                    </div>
                    <div className="volt-crafting__abs volt-crafting__grid has-air-scrollbar" style={at(26, 238, 246, 108)}>
                        {ingredients.map((ingredient, index) => (
                            <CraftingCell
                                key={`${ingredient.furni.className}-${index}`}
                                blend={ingredient.itemIds.length > 0 ? 1 : 0.2}
                                count={ingredient.itemIds.length}
                                furni={ingredient.furni}
                                onDown={() => selectIngredient(ingredient)}
                                onTooltip={setTooltip}
                            />
                        ))}
                    </div>
                    <div className="volt-crafting__abs volt-crafting__grid is-mixer" style={at(294, 71, 216, 85)}>
                        {mixer.map((item, index) => (
                            <CraftingCell
                                key={index}
                                blend={item.itemId !== 0 ? 1 : 0.2}
                                furni={item.furni}
                                onDown={() => selectMixerItem(index)}
                                onTooltip={setTooltip}
                            />
                        ))}
                    </div>
                    <div className="volt-crafting__abs volt-crafting__info" style={at(304, 180, 134)}>
                        <NativeText
                            transparent
                            background={PANEL_BACKGROUND}
                            maxWidth={134}
                            overrides={{ size: 11, color: 0x93999a }}
                            text={infoText1}
                            textStyle="u_regular"
                        />
                        <NativeText
                            transparent
                            background={PANEL_BACKGROUND}
                            maxWidth={134}
                            overrides={{ size: 11, color: 0x697577 }}
                            text={infoText2}
                            textStyle="u_regular"
                        />
                    </div>
                    {button.visible && (
                        <AirSkinButton
                            caption={LocalizeText(button.caption)}
                            className="volt-crafting__abs volt-crafting__craft"
                            disabled={!button.enabled}
                            height={30}
                            kind="green"
                            skinColor={BUTTON_COLOR}
                            style={at(294, 317)}
                            widthMax={BUTTON_WIDTH}
                            widthMin={BUTTON_WIDTH}
                            onMouseDown={(event) => isPrimary(event) && startCrafting()}
                        />
                    )}
                    {progress >= 0 && (
                        <div
                            className="volt-crafting__abs volt-crafting__progress"
                            style={at(285, 316, 225, 31)}
                            onMouseDown={(event) => isPrimary(event) && cancelProgress()}
                        >
                            <AirSkinButton
                                caption={LocalizeText('generic.cancel')}
                                className="volt-crafting__abs"
                                height={30}
                                kind="shiny"
                                style={at(9, 1)}
                                widthMax={BUTTON_WIDTH}
                                widthMin={BUTTON_WIDTH}
                            />
                            <div className="volt-crafting__abs volt-crafting__bar" style={at(9, 2, barWidth, 27)}>
                                <div className="volt-crafting__abs volt-crafting__bar-shade" style={at(0, 14, barWidth, 13)} />
                            </div>
                            <div className="volt-crafting__abs volt-crafting__bar-edge" style={at(9, 4, 1, 24)} />
                        </div>
                    )}
                </div>
            </section>
            {tooltip && (
                <div className="volt-crafting__tooltip" style={{ left: tooltip.x + 20, top: tooltip.y + 20 }}>
                    <NativeText transparent background={0x232323} text={tooltip.text} textStyle="u_tool_tip" />
                </div>
            )}
        </NativeModalView>
    );
};
