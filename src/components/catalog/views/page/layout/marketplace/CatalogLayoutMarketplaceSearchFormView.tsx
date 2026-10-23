import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { IMarketplaceSearchOptions, LocalizeText, MarketplaceSearchType } from '../../../../../../api';
import { HabboDropMenuView } from '../../../../../../common/dropmenu/HabboDropMenuView';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { SubpixelText } from '../../../../../../common/native-text/SubpixelText';
import { CatalogAirShinyButton } from '../CatalogAirShinyButton';

/** The page colour under the search texts: 0xe9e9e1 under the layout's 0x21ffffff fill. */
export const MARKETPLACE_PAGE_BACKGROUND = 0xecece5;

const LABEL_COLOR = 0x666666;
const MAX_PRICE_LENGTH = 10;
const MAX_SEARCH_LENGTH = 40;

export interface SearchFormViewProps {
    searchType: number;
    sortTypes: number[];
    combineUniques: boolean;
    onCombineUniquesChange(value: boolean): void;
    onSearch(options: IMarketplaceSearchOptions): void;
}

/** The parsed price input: empty means no limit (MarketPlaceCatalogWidget.doSearch). */
const toPrice = (value: string) => (value === '' ? -1 : parseInt(value));

/**
 * The search_container content: marketplace_search_simple for the activity and value tabs, marketplace_search_advanced
 * for the advanced tab. Positions are local to search_container (0, 30).
 */
export const SearchFormView: FC<SearchFormViewProps> = (props) => {
    const { searchType = null, sortTypes = null, combineUniques, onCombineUniquesChange, onSearch = null } = props;
    const [sortType, setSortType] = useState(sortTypes ? sortTypes[0] : 3);
    const [searchQuery, setSearchQuery] = useState('');
    const [min, setMin] = useState('');
    const [max, setMax] = useState('');
    const isAdvanced = searchType === MarketplaceSearchType.ADVANCED;
    const sortOptions = useMemo(() => sortTypes.map((type) => ({ value: type, label: LocalizeText(`catalog.marketplace.sort.${type}`) })), [sortTypes]);

    const onSortTypeChange = useCallback(
        (value: number) => {
            setSortType(value);

            // onWidgetEvent: a new sort order searches again on the activity and value tabs only.
            if (!isAdvanced) onSearch({ minPrice: -1, maxPrice: -1, query: '', type: value });
        },
        [isAdvanced, onSearch]
    );

    const onClickSearch = useCallback(() => {
        onSearch({ minPrice: toPrice(min), maxPrice: toPrice(max), type: sortType, query: searchQuery });
    }, [max, min, onSearch, searchQuery, sortType]);

    useEffect(() => {
        if (!sortTypes || !sortTypes.length) return;

        const firstSortType = sortTypes[0];

        setSortType(firstSortType);

        if (searchType === MarketplaceSearchType.BY_ACTIVITY || MarketplaceSearchType.BY_VALUE === searchType)
            onSearch({ minPrice: -1, maxPrice: -1, query: '', type: firstSortType });
    }, [onSearch, searchType, sortTypes]);

    const dropMenu = (className: string) => (
        <HabboDropMenuView<number>
            nativeCaption
            className={`volt-catalog-market-sort ${className}`}
            label={LocalizeText('catalog.marketplace.sort_order')}
            options={sortOptions}
            skinStyle={3}
            value={sortType}
            onSelect={onSortTypeChange}
        />
    );

    const label = (key: string, className: string) => (
        <NativeText
            background={MARKETPLACE_PAGE_BACKGROUND}
            className={`volt-catalog-market-label ${className}`}
            overrides={{ color: LABEL_COLOR }}
            text={LocalizeText(key)}
            textStyle="u_regular"
        />
    );

    return (
        <>
            {!isAdvanced && (
                <>
                    {/* The centred sort_order text across the 360px container at (0, 23). */}
                    <SubpixelText
                        transparent
                        align="center"
                        background={MARKETPLACE_PAGE_BACKGROUND}
                        className="volt-catalog-market-label is-sort-centred"
                        color={LABEL_COLOR}
                        text={LocalizeText('catalog.marketplace.sort_order')}
                        textStyle="u_regular"
                        width={360}
                    />
                    {dropMenu('is-simple')}
                </>
            )}
            {isAdvanced && (
                <>
                    {label('catalog.marketplace.search_name', 'is-name')}
                    <div className="volt-catalog-market-input is-name">
                        <input maxLength={MAX_SEARCH_LENGTH} type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
                    </div>
                    {label('catalog.marketplace.search_price', 'is-price')}
                    <div className="volt-catalog-market-input is-min">
                        <input
                            inputMode="numeric"
                            maxLength={MAX_PRICE_LENGTH}
                            type="text"
                            value={min}
                            onChange={(event) => setMin(event.target.value.replace(/[^0-9]/g, ''))}
                        />
                    </div>
                    <div className="volt-catalog-market-input is-max">
                        <input
                            inputMode="numeric"
                            maxLength={MAX_PRICE_LENGTH}
                            type="text"
                            value={max}
                            onChange={(event) => setMax(event.target.value.replace(/[^0-9]/g, ''))}
                        />
                    </div>
                    {label('catalog.marketplace.sort_order', 'is-sort')}
                    {dropMenu('is-advanced')}
                    <CatalogAirShinyButton caption={LocalizeText('generic.search')} className="volt-catalog-market-search-button" rect={[250, 90, 100, 22]} onClick={onClickSearch} />
                </>
            )}
            <label className="volt-catalog-market-checkbox">
                <input checked={combineUniques} type="checkbox" onChange={(event) => onCombineUniquesChange(event.target.checked)} />
            </label>
            {label('catalog.marketplace.combine_uniques', 'is-combine')}
        </>
    );
};
