import { NavigatorDeleteSavedSearchComposer, NavigatorSavedSearch } from '@volt/renderer';
import { FC, MouseEvent, useEffect, useRef } from 'react';
import { IsPhoneLayout, LocalizeText, localizeWithFallback, SendMessageComposer, useVoltLayout } from '../../../../api';
import { NativeText } from '../../../../common/native-text/NativeText';
import { useNavigatorUiStore } from '../../../../hooks';

const LONG_PRESS_MS = 550;

export interface NavigatorSearchSavesResultItemViewProps {
    search: NavigatorSavedSearch;
}

const savedSearchLabel = (search: NavigatorSavedSearch) => {
    let code = search.code || '';

    if (code.startsWith('${')) code = code.slice(2, code.length - 1);
    if (code.startsWith('category__')) code = code.slice('category__'.length);

    const title = localizeWithFallback('navigator.searchcode.title.' + code, search.code || code);

    return search.filter ? `${title} - ${search.filter}` : title;
};

export const NavigatorSearchSavesResultItemView: FC<NavigatorSearchSavesResultItemViewProps> = (props) => {
    const { search = null } = props;
    const title = savedSearchLabel(search);
    const isPhone = IsPhoneLayout(useVoltLayout());
    const pressTimer = useRef<ReturnType<typeof setTimeout>>(null);
    const pressFired = useRef(false);

    const cancelPress = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);

        pressTimer.current = null;
    };

    useEffect(() => cancelPress, []);

    // Phones show saved searches as chips: a tap runs the search, a long press deletes it.
    const startPress = () => {
        if (!isPhone) return;

        cancelPress();
        pressFired.current = false;
        pressTimer.current = setTimeout(() => {
            pressFired.current = true;
            SendMessageComposer(new NavigatorDeleteSavedSearchComposer(search.id));
        }, LONG_PRESS_MS);
    };

    const openSearch = () => {
        if (pressFired.current) {
            pressFired.current = false;
            return;
        }

        useNavigatorUiStore.getState().setSearch(search.code, search.filter || '');
        useNavigatorUiStore.getState().show();
    };

    const deleteSearch = (event: MouseEvent) => {
        event.stopPropagation();
        SendMessageComposer(new NavigatorDeleteSavedSearchComposer(search.id));
    };

    return (
        <div className="saved-search-row">
            <button
                type="button"
                className="saved-search-row__open"
                title={LocalizeText('navigator.tooltip.open.saved.search')}
                onClick={openSearch}
                onContextMenu={isPhone ? (event) => event.preventDefault() : undefined}
                onPointerCancel={cancelPress}
                onPointerDown={startPress}
                onPointerLeave={cancelPress}
                onPointerUp={cancelPress}
            >
                <span className="saved-search-row__label">
                    <NativeText text={title} textStyle="u_regular" background={isPhone ? 0xe6e6e6 : 0xffffff} transparent={isPhone} nativeResolution />
                </span>
            </button>
            <button
                type="button"
                className="saved-search-row__delete"
                aria-label={`${LocalizeText('navigator.tooltip.remove.saved.search')} ${title}`}
                title={LocalizeText('navigator.tooltip.remove.saved.search')}
                onClick={deleteSearch}
            />
        </div>
    );
};
