import { AIR_CHAT_STYLE_FLAGS, AirChatStyleFlags } from '../chat/airChatStyles';

export interface ChatStyleDefinition
{
    styleId: number;
    isSystemStyle?: boolean;
    isHcOnly?: boolean;
    isAmbassadorOnly?: boolean;
    isStaffOverrideable?: boolean;
    isPurchasable?: boolean;
}

export interface ChatStyleAccess
{
    hasClub: boolean;
    isAmbassador: boolean;
    /** hasSecurity(4) */
    hasSecurity: boolean;
    nftStyleIds?: ReadonlyArray<number>;
    purchasableStyleIds?: ReadonlyArray<number>;
}

const isNftChatStyle = (id: number) => id >= 1000 && id <= 9999;
const isStaticStyle = (id: number) => id < 1000;

const fromConfig = (definition: ChatStyleDefinition): AirChatStyleFlags => ({
    id: definition.styleId,
    system: definition.isSystemStyle,
    hcOnly: definition.isHcOnly,
    ambassadorOnly: definition.isAmbassadorOnly,
    staffOverrideable: definition.isStaffOverrideable,
    purchasable: definition.isPurchasable
});

const hasFlags = (definition: ChatStyleDefinition) => Object.keys(definition).some(key => key !== 'styleId');

// The AIR chatstyles_xml library; chat.styles entries that carry flags replace or extend it (custom hotel styles).
export const getChatStyleLibrary = (overrides: ChatStyleDefinition[] = []): AirChatStyleFlags[] =>
{
    const library = new Map<number, AirChatStyleFlags>(AIR_CHAT_STYLE_FLAGS.map(style => [ style.id, style ]));

    for(const definition of (overrides ?? [])) if(definition && hasFlags(definition)) library.set(definition.styleId, fromConfig(definition));

    return [ ...library.values() ];
};

// RoomChatInputView.createOrUpdateChatStylesView (AIR RoomChatInputView.as:356-425): non-system styles in library order;
// static styles: staff-overrideable ones for security 4, ambassador ones for security 4 or ambassadors, then
// disabled.custom.chat.styles, then HC-only ones for club members and the rest for everyone; NFT and purchasable
// styles only when owned. allowedIds (the server's chat style list) narrows the result once it has arrived.
export const getSelectableChatStyleIds = (library: AirChatStyleFlags[], allowedIds: ReadonlyArray<number>, disabled: string, access: ChatStyleAccess): number[] =>
{
    const allowed = (allowedIds?.length ?? 0) > 0 ? new Set(allowedIds) : null;
    const disabledIds = new Set(String(disabled ?? '').split(','));
    const nft = new Set(access.nftStyleIds ?? []);
    const purchasable = new Set(access.purchasableStyleIds ?? []);
    const selectable: number[] = [];

    const add = (id: number) =>
    {
        if(!allowed || allowed.has(id)) selectable.push(id);
    };

    for(const style of (library ?? []))
    {
        if(!style || style.system) continue;

        const id = style.id;

        if(isNftChatStyle(id))
        {
            if(nft.has(id)) add(id);

            continue;
        }

        if(isStaticStyle(id) && !style.purchasable)
        {
            if(style.staffOverrideable && access.hasSecurity)
            {
                add(id);
                continue;
            }

            if(style.ambassadorOnly && (access.hasSecurity || access.isAmbassador))
            {
                add(id);
                continue;
            }

            if(disabledIds.has(id.toString())) continue;

            if(style.hcOnly && access.hasClub)
            {
                add(id);
                continue;
            }

            if(!style.hcOnly && !style.ambassadorOnly)
            {
                add(id);
                continue;
            }
        }

        if(purchasable.has(id)) add(id);
    }

    return selectable;
};
