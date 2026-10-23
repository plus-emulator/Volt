import {
    GetRoomAdPurchaseInfoComposer,
    PurchaseRoomAdMessageComposer,
    RoomAdPurchaseInfoEvent,
    RoomAdPurchaseInitiatedComposer,
    RoomEntryData
} from '@volt/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, IPurchasableOffer, LocalizeText, SendMessageComposer } from '../../../../../api';
import { localizeWithFallback } from '../../../../../api/utils/localizeWithFallback';
import { HabboDropMenuView } from '../../../../../common/dropmenu/HabboDropMenuView';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogActions, useCatalogData, useMessageEvent, useNavigatorData, useNotification, useRoomPromote } from '../../../../../hooks';
import { CatalogPriceBoxView } from '../widgets/CatalogPriceBoxView';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { CatalogLayoutProps } from './CatalogLayout.types';

/** The catalog page colour behind the AIR text rasters. */
const PAGE_BACKGROUND = 0xe9e9e1;

/** RoomAdsCatalogWidget.setDefaultRoom: names longer than 25 characters are cut and end in "...". */
const getRoomCaption = (name: string) => (name.length > 25 ? name.substring(0, 25) + '...' : name);

/** RoomAdsCatalogWidget.selectedOffer: the only offer, else the club offer that matches the buyer's VIP state. */
const pickRoomAdOffer = (offers: IPurchasableOffer[], isVip: boolean): IPurchasableOffer => {
    if (!offers?.length) return null;
    if (offers.length === 1) return offers[0];

    return offers.find((offer) => (offer.clubLevel === 2 && isVip) || (offer.clubLevel !== 2 && !isVip)) ?? null;
};

/**
 * AIR layout_roomads (360x460): ctlg_text_1 (u_headline_small) at 10,14, the event category dropmenu at 10,44, three
 * u_small labels, the name and description inputs in border style 105, the room dropmenu at 10,345, price_container at
 * 158,384 and purchaseWidget at 0,416 with the NO_GIFT_OPTION and ROOM_INITIATE_PURCHASE tags.
 */
export const CatalogLayoutRoomAdsView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const [eventName, setEventName] = useState<string>('');
    const [eventDesc, setEventDesc] = useState<string>('');
    const [rooms, setRooms] = useState<RoomEntryData[]>(null);
    const [roomIndex, setRoomIndex] = useState<number>(0);
    const [categoryIndex, setCategoryIndex] = useState<number>(0);
    const [extended, setExtended] = useState<boolean>(false);
    const [isVip, setIsVip] = useState<boolean>(false);
    const { eventCategories = null, navigatorData = null } = useNavigatorData();
    const { promoteInformation, isExtended, setIsExtended } = useRoomPromote();
    const { currentOffer = null } = useCatalogData();
    const { selectCatalogOffer = null } = useCatalogActions();
    const { simpleAlert = null } = useNotification();
    const extendedRoomRef = useRef<RoomEntryData>(null);

    const visibleCategories = useMemo(() => (eventCategories ?? []).filter((category) => category.visible), [eventCategories]);

    useMessageEvent<RoomAdPurchaseInfoEvent>(RoomAdPurchaseInfoEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        // setExtendData: the room whose event is being extended has an event, so the server leaves it out; AIR adds it back.
        const nextRooms = [...(parser.rooms ?? [])];

        if (extendedRoomRef.current && !nextRooms.some((room) => room.roomId === extendedRoomRef.current.roomId)) nextRooms.push(extendedRoomRef.current);

        // setDefaultRoom: the room the user is in, else the first one.
        const activeIndex = nextRooms.findIndex((room) => room.roomId === navigatorData?.currentRoomId);

        setRooms(nextRooms);
        setRoomIndex(Math.max(0, activeIndex));
        setIsVip(parser.isVip);
    });

    useEffect(() => {
        SendMessageComposer(new GetRoomAdPurchaseInfoComposer());
        // purchaseWidget carries ROOM_INITIATE_PURCHASE: PurchaseCatalogWidget.init reports the opened room ad page.
        SendMessageComposer(new RoomAdPurchaseInitiatedComposer());
    }, []);

    useEffect(() => {
        const offer = pickRoomAdOffer(page?.offers, isVip);

        if (offer && offer !== currentOffer) selectCatalogOffer?.(offer);
    }, [page, isVip, currentOffer, selectCatalogOffer]);

    useEffect(() => {
        const promoteData = promoteInformation?.data ?? null;

        if (!isExtended || !promoteData) return;

        const roomName = navigatorData?.enteredGuestRoom?.roomId === promoteData.flatId ? navigatorData.enteredGuestRoom.roomName : promoteData.eventName;

        extendedRoomRef.current = new RoomEntryData(promoteData.flatId, roomName, false);
        setEventName(promoteData.eventName);
        setEventDesc(promoteData.eventDescription);
        setCategoryIndex(Math.max(0, promoteData.categoryId - 1));
        setExtended(true);
        setIsExtended(false);
        SendMessageComposer(new GetRoomAdPurchaseInfoComposer());
    }, [isExtended, promoteInformation, navigatorData, setIsExtended]);

    const selectedRoom = rooms?.[roomIndex] ?? null;
    const selectedCategory = visibleCategories[categoryIndex] ?? null;

    const roomOptions = rooms?.length
        ? rooms.map((room, index) => ({ value: index, label: getRoomCaption(room.roomName) }))
        : [{ value: 0, label: LocalizeText('roomad.no.available.room') }];

    const categoryOptions = visibleCategories.map((category, index) => ({
        value: index,
        // A hotel without the AIR text keeps the category name it sent.
        label: localizeWithFallback(`navigator.searchcode.title.eventcategory__${category.id}`, category.name)
    }));

    // getExtensionMinutes only adds the time left on the current event when roomad.limited_extension is on.
    const durationMinutes = GetConfigurationValue<number>('room_ad.duration.minutes', 120);

    const canStartPurchase = () => {
        if (!selectedRoom) {
            simpleAlert?.(LocalizeText('roomad.alert.no.available.room'), null, null, null, LocalizeText('roomad.error.title'));

            return false;
        }

        if (eventName.length < 5 || eventName.startsWith(' ')) {
            simpleAlert?.(LocalizeText('roomad.alert.name.empty'), null, null, null, LocalizeText('roomad.error.title'));

            return false;
        }

        return true;
    };

    const purchaseAd = () => {
        if (!currentOffer || !selectedRoom) return;

        SendMessageComposer(
            new PurchaseRoomAdMessageComposer(page.pageId, currentOffer.offerId, selectedRoom.roomId, eventName, extended, eventDesc, selectedCategory?.id ?? -1)
        );

        // onPurchaseConfirmationEvent: clear both inputs and ask for the room list again.
        setEventName('');
        setEventDesc('');
        setExtended(false);
        extendedRoomRef.current = null;
        SendMessageComposer(new GetRoomAdPurchaseInfoComposer());
    };

    return (
        <div className="volt-catalog-roomads-layout">
            <NativeText
                className="volt-catalog-roomads-text"
                background={PAGE_BACKGROUND}
                text={LocalizeText('roomad.catalog_text', ['duration'], [String(durationMinutes)])}
                textStyle="u_headline_small"
            />
            <HabboDropMenuView<number>
                nativeCaption
                className="volt-catalog-roomads-categories"
                label={LocalizeText('navigator.category')}
                options={categoryOptions}
                skinStyle={3}
                value={categoryIndex}
                onSelect={setCategoryIndex}
            />
            <NativeText className="volt-catalog-roomads-label is-name" background={PAGE_BACKGROUND} text={LocalizeText('roomad.catalog_name')} textStyle="u_small" />
            <div className="volt-catalog-roomads-input is-name">
                <input maxLength={25} type="text" value={eventName} onChange={(event) => setEventName(event.target.value)} />
            </div>
            <NativeText
                className="volt-catalog-roomads-label is-description"
                background={PAGE_BACKGROUND}
                text={LocalizeText('roomad.catalog_description')}
                textStyle="u_small"
            />
            <div className="volt-catalog-roomads-input is-description">
                <textarea maxLength={100} value={eventDesc} onChange={(event) => setEventDesc(event.target.value)} />
            </div>
            <NativeText className="volt-catalog-roomads-label is-room" background={PAGE_BACKGROUND} text={LocalizeText('roomad.catalog_roomname')} textStyle="u_small" />
            <HabboDropMenuView<number>
                nativeCaption
                className="volt-catalog-roomads-rooms"
                label={LocalizeText('roomad.catalog_roomname')}
                options={roomOptions}
                skinStyle={3}
                value={roomIndex}
                onSelect={setRoomIndex}
            />
            <CatalogPriceBoxView background={PAGE_BACKGROUND} className="volt-catalog-roomads-price" offer={currentOffer} />
            <div className="volt-catalog-roomads-purchase">
                {currentOffer && (
                    <div className="volt-catalog-offer-actions">
                        <CatalogPurchaseWidgetView noGiftOption canStartPurchase={canStartPurchase} purchaseCallback={purchaseAd} />
                    </div>
                )}
            </div>
        </div>
    );
};
