import { GetRoomEngine, IGetImageListener, IImageResult, MapDataType, Vector3d } from '@volt/renderer';
import { CSSProperties, FC, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { ClassicScrollAreaView, VoltCardHeaderView, VoltCardView } from '../../../../common';
import { HabboDropMenuView } from '../../../../common/dropmenu/HabboDropMenuView';
import { IFurnitureRecolorPreviewSource, useFurnitureRecolorWidget } from '../../../../hooks';

const SCOPE_OPTIONS = [0, 1, 2, 3];

const toCssColour = (colour: number) => `#${(colour & 0xffffff).toString(16).padStart(6, '0')}`;

/** FurnitureRecolorPreviewView.render (AIR FurnitureRecolorPreviewView.as:76-93): the furni image with its MapData r/g/b replaced. */
const FurnitureRecolorPreview: FC<{ source: IFurnitureRecolorPreviewSource; color: number }> = ({ source, color }) =>
{
    const [imageUrl, setImageUrl] = useState<string>(null);
    const requestIdRef = useRef(0);

    useEffect(() =>
    {
        const requestId = ++requestIdRef.current;
        let isActive = true;

        const show = async (result: IImageResult) =>
        {
            if (!result?.data) return;

            const image = await result.getImage();

            if (image && isActive && requestIdRef.current === requestId) setImageUrl(image.src);
        };

        const objectData = new MapDataType();

        for (const [key, value] of Object.entries(source.data)) objectData.setValue(key, value);

        objectData.setValue('r', String((color >> 16) & 0xff));
        objectData.setValue('g', String((color >> 8) & 0xff));
        objectData.setValue('b', String(color & 0xff));

        const listener: IGetImageListener = {
            imageReady: (result) => void show(result),
            imageFailed: () =>
            {}
        };

        const result = GetRoomEngine().getFurnitureFloorImage(source.typeId, new Vector3d(source.direction), 64, listener, 0, source.extras, -1, -1, objectData);

        if (result?.data) void show(result);

        return () =>
        {
            isActive = false;
        };
    }, [source, color]);

    return <div className="volt-recolor__preview-image">{imageUrl && <img alt="" src={imageUrl} />}</div>;
};

const RecolorPalette: FC<{ colors: number[]; selectedColor: number; label: string; onSelect: (color: number) => void }> = ({ colors, selectedColor, label, onSelect }) => (
    <ClassicScrollAreaView className="h-full min-h-0">
        <div aria-label={label} className="volt-catalog-colour-grid" role="radiogroup">
            {colors.map((colour) =>
            {
                const isChosen = colour === selectedColor;

                return (
                    <button
                        key={colour}
                        aria-checked={isChosen}
                        aria-label={toCssColour(colour)}
                        className={`volt-catalog-colour-swatch ${isChosen ? 'is-chosen' : ''}`}
                        role="radio"
                        style={{ '--volt-swatch-colour': toCssColour(colour) } as CSSProperties}
                        type="button"
                        onClick={() => onSelect(colour)}
                    />
                );
            })}
        </div>
    </ClassicScrollAreaView>
);

/** AIR FurnitureRecolorView (furniture_recolor_xml, 388x551 style 3 frame, content origin 14,38). */
export const FurnitureRecolorView: FC = () =>
{
    const {
        objectId = -1,
        previewSource = null,
        originalColor = 0,
        selectedColor = 0,
        setSelectedColor = null,
        allowedColors = [],
        roomColors = [],
        scope = 0,
        setScope = null,
        apply = null,
        onClose = null
    } = useFurnitureRecolorWidget();

    if (objectId === -1 || !previewSource) return null;

    return (
        <VoltCardView className="volt-recolor" frameStyle={3} isResizable={false} uniqueKey="volt-furniture-recolor">
            <VoltCardHeaderView headerText={LocalizeText('furniture.recolor.title')} onCloseClick={onClose} />
            <span className="volt-recolor__caption volt-recolor__caption--preview">{LocalizeText('furniture.recolor.preview')}</span>
            <div className="volt-recolor__preview volt-recolor__preview--original">
                <FurnitureRecolorPreview color={originalColor} source={previewSource} />
            </div>
            <span className="volt-recolor__arrow" />
            <div className="volt-recolor__preview volt-recolor__preview--new">
                <FurnitureRecolorPreview color={selectedColor} source={previewSource} />
            </div>
            <span className="volt-recolor__caption volt-recolor__caption--palette">{LocalizeText('furniture.recolor.palette')}</span>
            <div className="volt-recolor__grid volt-recolor__grid--palette">
                <RecolorPalette colors={allowedColors} label={LocalizeText('furniture.recolor.palette')} selectedColor={selectedColor} onSelect={setSelectedColor} />
            </div>
            <span className="volt-recolor__caption volt-recolor__caption--room">{LocalizeText('furniture.recolor.room_colors')}</span>
            <div className="volt-recolor__grid volt-recolor__grid--room">
                <RecolorPalette colors={roomColors} label={LocalizeText('furniture.recolor.room_colors')} selectedColor={selectedColor} onSelect={setSelectedColor} />
            </div>
            <span className="volt-recolor__caption volt-recolor__caption--scope">{LocalizeText('furniture.recolor.scope')}</span>
            <HabboDropMenuView
                className="volt-recolor__scope"
                label={LocalizeText('furniture.recolor.scope')}
                options={SCOPE_OPTIONS.map((value) => ({ value, label: LocalizeText(`furniture.recolor.scope.${value}`) }))}
                skinStyle={3}
                value={scope}
                onSelect={(value) => setScope(Number(value))}
            />
            {/* FurnitureRecolorView.onPaletteColor (FurnitureRecolorView.as:91): Apply only for a colour of the furni's palette. */}
            <button className="habbo-btn-green volt-recolor__apply" disabled={!allowedColors.includes(selectedColor)} type="button" onClick={apply}>
                {LocalizeText('furniture.recolor.apply')}
            </button>
        </VoltCardView>
    );
};
