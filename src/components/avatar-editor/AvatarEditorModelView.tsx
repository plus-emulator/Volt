import { AvatarEditorFigureCategory, AvatarFigurePartType, FigureDataContainer } from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IAvatarEditorCategory, LocalizeText } from '../../api';
import { NativeText } from '../../common/native-text/NativeText';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorIcon } from './AvatarEditorIcon';
import { AvatarEditorFigureSetView } from './figure-set';
import { AvatarEditorPaletteSetView } from './palette-set';
import { useAvatarEditorGridWheel } from '../../hooks/avatar-editor/useAvatarEditorGridWheel';

export const AvatarEditorModelView: FC<{
    name: string;
    categories: IAvatarEditorCategory[];
}> = (props) => {
    const { name = '', categories = [] } = props;
    const container = useRef<HTMLDivElement>(null);
    const [activeSetType, setActiveSetType] = useState<string>(() => categories[0]?.setType ?? '');
    const {
        gender = null,
        selectedParts = null,
        setGender = null,
        selectedColorParts = null,
        getFirstSelectableColor = null,
        selectEditorColor = null
    } = useAvatarEditor();

    const resolvedSetType = useMemo(() => {
        if (categories.some((category) => category.setType === activeSetType)) return activeSetType;

        return categories[0]?.setType ?? '';
    }, [categories, activeSetType]);

    const activeCategory = useMemo(() => {
        return categories.find((category) => category.setType === resolvedSetType) ?? null;
    }, [categories, resolvedSetType]);

    useAvatarEditorGridWheel(container, !!activeCategory);

    // AIR WIN63-202610151745-318700621 common/AvatarEditorGridView.as:144 showPalettes: one palette per colour layer of the worn part, none without one.
    const paletteCount = useMemo(() => {
        const partId = selectedParts?.[resolvedSetType];

        if (partId === undefined || partId === null || partId < 0) return 0;

        const partItem = activeCategory?.partItems.find((item) => !item.isClear && !item.isGetMore && item.id === partId);

        if (partItem) return partItem.maxPaletteCount ?? 0;

        // CategoryBaseModel.updateSelection: a worn part outside the grid shows as many palettes as it has colours.
        return selectedColorParts?.[resolvedSetType]?.length ?? 0;
    }, [activeCategory, resolvedSetType, selectedColorParts, selectedParts]);

    const selectSet = useCallback(
        (setType: string) => {
            const selectedPalettes = selectedColorParts?.[setType];

            if (!selectedPalettes || !selectedPalettes.length) selectEditorColor?.(setType, 0, getFirstSelectableColor?.(setType));

            setActiveSetType(setType);
        },
        [getFirstSelectableColor, selectEditorColor, selectedColorParts]
    );

    useEffect(() => {
        if (!resolvedSetType) return;

        const selectedPalettes = selectedColorParts?.[resolvedSetType];

        if (resolvedSetType === activeSetType && selectedPalettes?.length) return;

        selectSet(resolvedSetType);
    }, [activeSetType, resolvedSetType, selectSet, selectedColorParts]);

    if (!activeCategory) return null;

    return (
        <div ref={container} className="volt-avatar-editor-model">
            <div className={`volt-avatar-editor-subcategories${name === AvatarEditorFigureCategory.GENERIC ? ' is-gender' : ''}`}>
                {name === AvatarEditorFigureCategory.GENERIC && (
                    <>
                        <button type="button" className="category-item gender-category-item" onClick={() => setGender(AvatarFigurePartType.MALE)}>
                            <AvatarEditorIcon icon="male" selected={gender === FigureDataContainer.MALE} />
                            <NativeText className="volt-avatar-editor-gender-text" text={LocalizeText('avatareditor.generic.boy')} textStyle="u_bold" background={0xe9e9e1} />
                        </button>
                        <button type="button" className="category-item gender-category-item" onClick={() => setGender(AvatarFigurePartType.FEMALE)}>
                            <AvatarEditorIcon icon="female" selected={gender === FigureDataContainer.FEMALE} />
                            <NativeText className="volt-avatar-editor-gender-text" text={LocalizeText('avatareditor.generic.girl')} textStyle="u_bold" background={0xe9e9e1} />
                        </button>
                    </>
                )}
                {name !== AvatarEditorFigureCategory.GENERIC &&
                    categories.map((category) => (
                        <button
                            type="button"
                            key={category.setType}
                            className="category-item"
                            aria-pressed={resolvedSetType === category.setType}
                            onClick={() => selectSet(category.setType)}
                        >
                            <AvatarEditorIcon icon={category.setType} selected={resolvedSetType === category.setType} />
                        </button>
                    ))}
            </div>

            <div className="volt-avatar-editor-parts-grid">
                <AvatarEditorFigureSetView category={activeCategory} columnCount={6} />
            </div>

            <div className={`volt-avatar-editor-palettes${paletteCount >= 2 ? ' dual-palette' : ''}`}>
                {paletteCount >= 1 && (
                    <div className="avatar-editor-palette-set-view">
                        <AvatarEditorPaletteSetView category={activeCategory} columnCount={paletteCount >= 2 ? 9 : 20} paletteIndex={0} />
                    </div>
                )}
                {paletteCount >= 2 && (
                    <div className="avatar-editor-palette-set-view">
                        <AvatarEditorPaletteSetView category={activeCategory} columnCount={9} paletteIndex={1} />
                    </div>
                )}
            </div>
        </div>
    );
};
