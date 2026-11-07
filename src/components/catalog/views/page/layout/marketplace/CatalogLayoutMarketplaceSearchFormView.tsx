import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { IMarketplaceSearchOptions, LocalizeText, MarketplaceOfferType, MarketplaceSearchType } from '../../../../../../api';
import { HabboDropMenuView } from '../../../../../../common/dropmenu/HabboDropMenuView';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { SubpixelText } from '../../../../../../common/native-text/SubpixelText';
import { CatalogAirShinyButton } from '../CatalogAirShinyButton';

/** The page colour under the search texts: 0xe9e9e1 under the layout's 0x21ffffff fill. */
export const MARKETPLACE_PAGE_BACKGROUND = 0xecece5;

const LABEL_COLOR = 0x666666;
const MAX_PRICE_LENGTH = 10;
const MAX_SEARCH_LENGTH = 40;

/** The offer_source_dropmenu caption and options are plain English in the layout and in setOfferSourceSelection. */
const OFFER_TYPE_CAPTION = 'Type';
const OFFER_TYPE_OPTIONS = [
    { value: MarketplaceOfferType.ALL, label: 'All' },
    { value: MarketplaceOfferType.COLLECTIBLES, label: 'Collectibles' },
    { value: MarketplaceOfferType.FURNI, label: 'Furni' }
];

export interface SearchFormViewProps {
    searchType: number;
    sortTypes: number[];
    combineUniques: boolean;
    offerType: number;
    onCombineUniquesChange(value: boolean): void;
    onOfferTypeChange(value: number): void;
    onSearch(options: IMarketplaceSearchOptions): void;
}

/** The parsed price input: empty means no limit (MarketPlaceCatalogWidget.doSearch). */
const toPrice = (value: string) => (value === '' ? -1 : parseInt(value));

/**
 * The search_container content: marketplace_search_simple for the activity and value tabs, marketplace_search_advanced
 * for the advanced tab. Positions are local to search_container (0, 30). Each tab builds a new form, like
 * selectSearchCategory, so the sort order and the inputs start empty again.
 */
export const SearchFormView: FC<SearchFormViewProps> = (props) => {
    const { searchType = null, sortTypes = null, combineUniques, offerType, onCombineUniquesChange, onOfferTypeChange, onSearch = null } = props;
    const [sortType, setSortType] = useState(sortTypes[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [min, setMin] = useState('');
    const [max, setMax] = useState('');
    const isAdvanced = searchType === MarketplaceSearchType.ADVANCED;
    const sortOptions = useMemo(() => sortTypes.map((type) => ({ value: type, label: LocalizeText(`catalog.marketplace.sort.${type}`) })), [sortTypes]);

    // The activity and value tabs search on opening and on every change of sort order, offer type or combine setting.
    useEffect(() => {
        if (isAdvanced) return;

        onSearch({ minPrice: -1, maxPrice: -1, query: '', type: sortType, combineUniques, offerType });
    }, [combineUniques, isAdvanced, offerType, onSearch, sortType]);

    const searchAdvanced = useCallback(
        (uniques: boolean) => {
            onSearch({ minPrice: toPrice(min), maxPrice: toPrice(max), type: sortType, query: searchQuery, combineUniques: uniques, offerType });
        },
        [max, min, offerType, onSearch, searchQuery, sortType]
    );

    // The advanced tab searches on a combine change too, but not on a new sort order or offer type.
    const onCombineUniquesToggle = (value: boolean) => {
        onCombineUniquesChange(value);

        if (isAdvanced) searchAdvanced(value);
    };

    const dropMenu = (className: string) => (
        <HabboDropMenuView<number>
            nativeCaption
            className={`volt-catalog-market-sort ${className}`}
            label={LocalizeText('catalog.marketplace.sort_order')}
            options={sortOptions}
            skinStyle={3}
            value={sortType}
            onSelect={setSortType}
        />
    );

    const offerTypeMenu = (className: string) => (
        <HabboDropMenuView<number>
            nativeCaption
            className={`volt-catalog-market-offer-type ${className}`}
            label={OFFER_TYPE_CAPTION}
            options={OFFER_TYPE_OPTIONS}
            skinStyle={3}
            value={offerType}
            onSelect={onOfferTypeChange}
        />
    );

    const label = (text: string, className: string) => (
        <NativeText
            background={MARKETPLACE_PAGE_BACKGROUND}
            className={`volt-catalog-market-label ${className}`}
            overrides={{ color: LABEL_COLOR }}
            text={text}
            textStyle="u_regular"
        />
    );

    // auto_size "right": a right-aligned field, so AIR draws it in sub-pixel mode at the right edge of its 88px window.
    const rightLabel = (text: string, className: string) => (
        <div className={`volt-catalog-market-label-right ${className}`}>
            <SubpixelText transparent background={MARKETPLACE_PAGE_BACKGROUND} color={LABEL_COLOR} text={text} textStyle="u_regular" />
        </div>
    );

    return (
        <>
            {!isAdvanced && (
                <>
                    {rightLabel(OFFER_TYPE_CAPTION, 'is-offer-type')}
                    {offerTypeMenu('is-simple')}
                    {rightLabel(LocalizeText('catalog.marketplace.sort_order'), 'is-sort')}
                    {dropMenu('is-simple')}
                </>
            )}
            {isAdvanced && (
                <>
                    {label(LocalizeText('catalog.marketplace.search_name'), 'is-name')}
                    <div className="volt-catalog-market-input is-name">
                        <input maxLength={MAX_SEARCH_LENGTH} type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
                    </div>
                    {label(LocalizeText('catalog.marketplace.search_price'), 'is-price')}
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
                    {label(OFFER_TYPE_CAPTION, 'is-offer-type')}
                    {offerTypeMenu('is-advanced')}
                    {label(LocalizeText('catalog.marketplace.sort_order'), 'is-sort')}
                    {dropMenu('is-advanced')}
                    <CatalogAirShinyButton
                        caption={LocalizeText('generic.search')}
                        className="volt-catalog-market-search-button"
                        rect={[250, 119, 100, 22]}
                        onClick={() => searchAdvanced(combineUniques)}
                    />
                </>
            )}
            <label className="volt-catalog-market-checkbox">
                <input checked={combineUniques} type="checkbox" onChange={(event) => onCombineUniquesToggle(event.target.checked)} />
            </label>
            {label(LocalizeText('catalog.marketplace.combine_uniques'), 'is-combine')}
        </>
    );
};
