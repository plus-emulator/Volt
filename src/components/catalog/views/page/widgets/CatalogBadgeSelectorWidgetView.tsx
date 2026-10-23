import { StringDataType } from '@volt/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeBadgeDescription, LocalizeBadgeName, LocalizeText, localizeWithFallback } from '../../../../../api';
import { ClassicScrollAreaView, LayoutBadgeImageView } from '../../../../../common';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogData, useCatalogUiState, useInventoryBadges } from '../../../../../hooks';

interface CatalogBadgeSelectorWidgetViewProps {
    className?: string;
}

const MAX_SEARCH_LENGTH = 40;

export const CatalogBadgeSelectorWidgetView: FC<CatalogBadgeSelectorWidgetViewProps> = (props) => {
    const { className = '' } = props;
    const [currentBadgeCode, setCurrentBadgeCode] = useState<string>(null);
    const [searchText, setSearchText] = useState('');
    const { currentOffer = null } = useCatalogData();
    const { setPurchaseOptions = null } = useCatalogUiState();
    const { badgeCodes = [], activate = null, deactivate = null } = useInventoryBadges();

    const excludedBadgeCodes = useMemo(
        () =>
            new Set(
                GetConfigurationValue<string>('badge.display.excluded.badgeCodes', '')
                    .split(',')
                    .map((badgeCode) => badgeCode.trim())
                    .filter(Boolean)
            ),
        []
    );

    const availableBadgeCodes = useMemo(() => badgeCodes.filter((badgeCode) => !excludedBadgeCodes.has(badgeCode)), [badgeCodes, excludedBadgeCodes]);
    const filteredBadgeCodes = useMemo(() => {
        const normalizedSearch = searchText.trim().toLocaleLowerCase();

        if (!normalizedSearch) return availableBadgeCodes;

        return availableBadgeCodes.filter((badgeCode) =>
            `${badgeCode} ${LocalizeBadgeName(badgeCode)} ${LocalizeBadgeDescription(badgeCode)}`.toLocaleLowerCase().includes(normalizedSearch)
        );
    }, [availableBadgeCodes, searchText]);

    const previewStuffData = useMemo(() => {
        if (!currentBadgeCode) return null;

        const stuffData = new StringDataType();

        stuffData.setValue(['0', currentBadgeCode, '', '']);

        return stuffData;
    }, [currentBadgeCode]);

    useEffect(() => {
        if (!currentOffer) return;

        setPurchaseOptions((prevValue) => {
            const newValue = { ...prevValue };

            newValue.extraParamRequired = true;
            newValue.extraData = (previewStuffData && previewStuffData.getValue(1)) || null;
            newValue.previewStuffData = previewStuffData;

            return newValue;
        });
    }, [currentOffer, previewStuffData, setPurchaseOptions]);

    useEffect(() => {
        if (!activate) return;

        const id = activate();

        return () => deactivate?.(id);
    }, [activate, deactivate]);

    useEffect(() => {
        if (!currentBadgeCode || availableBadgeCodes.includes(currentBadgeCode)) return;

        setCurrentBadgeCode(null);
    }, [availableBadgeCodes, currentBadgeCode]);

    useEffect(() => {
        if (!currentBadgeCode || filteredBadgeCodes.includes(currentBadgeCode)) return;

        setCurrentBadgeCode(null);
    }, [currentBadgeCode, filteredBadgeCodes]);

    return (
        <div className={`volt-catalog-badge-selector ${className}`.trim()}>
            {/* search_input_border (0, 0, 255x26): border style 105 with the input, its placeholder and cancel_search_btn. */}
            <div className="volt-catalog-badge-search">
                <input
                    aria-label={LocalizeText('generic.search')}
                    maxLength={MAX_SEARCH_LENGTH}
                    role="searchbox"
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value.slice(0, MAX_SEARCH_LENGTH))}
                    onKeyDown={(event) => {
                        if (event.key !== 'Escape') return;

                        event.preventDefault();
                        setSearchText('');
                    }}
                />
                {!searchText.length && (
                    <NativeText
                        ariaHidden
                        transparent
                        background={0xffffff}
                        className="volt-catalog-badge-search-placeholder"
                        overrides={{ color: 0x666666 }}
                        text={LocalizeText('generic.search')}
                        textStyle="u_regular"
                    />
                )}
                {!!searchText.length && (
                    <button
                        aria-label={localizeWithFallback('generic.clear', 'Clear')}
                        className="volt-catalog-badge-search-clear"
                        type="button"
                        onClick={() => setSearchText('')}
                    />
                )}
            </div>
            {/* badgeGrid (0, 30, 255x145): badgeGridItem tiles, 1px apart; an empty list shows an empty grid. */}
            <ClassicScrollAreaView className="volt-catalog-badge-scroll-area" scrollStep={45}>
                <div aria-label={LocalizeText('catalog_selectbadge')} className="volt-catalog-badge-grid" role="listbox">
                    {filteredBadgeCodes.map((badgeCode) => (
                        <div
                            key={badgeCode}
                            aria-label={badgeCode}
                            aria-selected={currentBadgeCode === badgeCode}
                            className={`volt-catalog-badge-tile ${currentBadgeCode === badgeCode ? 'is-selected' : ''}`.trim()}
                            role="option"
                            onClick={() => setCurrentBadgeCode(badgeCode)}
                        >
                            <LayoutBadgeImageView badgeCode={badgeCode} />
                        </div>
                    ))}
                </div>
            </ClassicScrollAreaView>
        </div>
    );
};
