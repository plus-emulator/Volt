import { CatalogGroupsComposer, CreateLinkEvent, GetSessionDataManager, HabboGroupEntryData, StringDataType } from '@volt/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../api';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { useCatalogData, useCatalogUiState, useUserGroups } from '../../../../../hooks';

interface CatalogGuildSelectorWidgetViewProps {
    /** GuildForumSelectorCatalogWidget: the selector of the group forum page (layout guild_forum). */
    forumSelector?: boolean;
    /** Places the 170x85 widget in its layout. */
    className?: string;
}

/**
 * GuildForumSelectorCatalogWidget.filterGroupMemberships: a forum terminal can be bought for a group that already has a
 * forum, for a group the user owns, or for any group by staff (security level 4).
 */
export const filterGuildForumGroups = (groups: HabboGroupEntryData[], userId: number, isStaff: boolean): HabboGroupEntryData[] =>
    groups.filter((group) => group.hasForum || group.ownerId === userId || isStaff);

/** GuildSelectorCatalogWidget.populateAndSelectFavorite: the user's own pick, else the favourite group, else the first one. */
export const getInitialGuildIndex = (groups: HabboGroupEntryData[], pickedIndex: number): number => {
    if (pickedIndex >= 0 && pickedIndex < groups.length) return pickedIndex;

    let favouriteIndex = -1;

    groups.forEach((group, index) => {
        if (group.favourite) favouriteIndex = index;
    });

    if (favouriteIndex >= 0) return favouriteIndex;

    return groups.length ? 0 : -1;
};

export const CatalogGuildSelectorWidgetView: FC<CatalogGuildSelectorWidgetViewProps> = (props) => {
    const { forumSelector = false, className = '' } = props;
    // var_1585: the entry the user picked from the drop menu; -1 until they pick one.
    const [pickedIndex, setPickedIndex] = useState<number>(-1);
    const { currentOffer = null } = useCatalogData();
    const { setPurchaseOptions = null } = useCatalogUiState();
    const { data: allGroups = null } = useUserGroups();

    // GuildMembershipsController.registerGuildSelectorWidget: every selector asks for the user's groups again (GetGuildMemberships 384).
    useEffect(() => {
        SendMessageComposer(new CatalogGroupsComposer());
    }, []);

    const groups = useMemo(() => {
        if (!allGroups || !forumSelector) return allGroups;

        const sessionData = GetSessionDataManager();

        return filterGuildForumGroups(allGroups, sessionData.userId, sessionData.hasSecurity(4));
    }, [allGroups, forumSelector]);

    const selectedIndex = groups ? getInitialGuildIndex(groups, pickedIndex) : -1;
    const selectedGroup = selectedIndex >= 0 ? groups[selectedIndex] : null;

    // selectGroup: the previewer gets ["0", group id, badge, colour 1, colour 2] and the purchase the group id as its extra parameter.
    const previewStuffData = useMemo(() => {
        if (!selectedGroup) return null;

        const stuffData = new StringDataType();

        stuffData.setValue(['0', selectedGroup.groupId.toString(), selectedGroup.badgeCode, selectedGroup.colorA, selectedGroup.colorB]);

        return stuffData;
    }, [selectedGroup]);

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

    // The members-only note only replaces the selector when the user is in no group at all; a forum selector whose filter
    // leaves nothing shows an empty drop menu, and the purchase waits for a group.
    // guildSelectorWidget: the members_only box (border style 2 in 0x5ea1ab) with white text and the find groups button.
    if (!allGroups || !allGroups.length) {
        return (
            <div className={`volt-catalog-guild-selector ${className}`.trim()}>
                <div className="volt-catalog-guild-members-only">
                    <NativeText
                        background={MEMBERS_ONLY_COLOR}
                        className="volt-catalog-guild-members-only-text"
                        maxWidth={147}
                        overrides={{ color: 0xffffff }}
                        text={LocalizeText('catalog.guild_selector.members_only')}
                        textStyle="u_regular"
                    />
                    <button
                        className="volt-catalog-guild-shiny-button volt-catalog-guild-find-groups"
                        type="button"
                        onClick={() => CreateLinkEvent('navigator/search/hotel_view/group:')}
                    >
                        <NativeText transparent background={0xffffff} text={LocalizeText('catalog.guild_selector.find_groups')} textStyle="button_shiny_regular" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={`volt-catalog-guild-selector ${className}`.trim()}>
            <GuildDropList groups={groups} selectedIndex={selectedIndex} onSelect={setPickedIndex} />
        </div>
    );
};

const MEMBERS_ONLY_COLOR = 0x5ea1ab;

/** guild_selector_widget_item: guild_colors is 21x14, black with a 1px border, colour A then colour B (GuildSelectorCatalogWidget.createGuildColorsBitmap). */
const GuildColors: FC<{ colorA: string; colorB: string }> = ({ colorA, colorB }) => (
    <span className="volt-catalog-guild-colors">
        <span style={{ backgroundColor: `#${colorA}` }} />
        <span style={{ backgroundColor: `#${colorB}` }} />
    </span>
);

/** guild_selector_widget_item (133x22): the group name label at (0, 4) and the colours at (112, 4). */
const GuildDropListItem: FC<{ group: HabboGroupEntryData; background: number }> = ({ group, background }) => (
    <span className="volt-catalog-guild-droplist-item">
        <NativeText background={background} className="volt-catalog-guild-droplist-name" text={group.groupName} textStyle="u_regular" />
        <GuildColors colorA={group.colorA} colorB={group.colorB} />
    </span>
);

// habbo_skin_droplist_xml droplist_item: default, hovering and selected fills.
const ITEM_BACKGROUND = 0xffffff;
const ITEM_HOVER_BACKGROUND = 0xd9d9d9;
const ITEM_SELECTED_BACKGROUND = 0xf2f2f2;

/**
 * The guild_selector droplist (style 3 falls back to habbo_skin_droplist_xml): closed it shows the selected item in its
 * item list at (6, 2); open, the expanded menu covers it and lists every item 22px high, plus a 3px padding row.
 */
const GuildDropList: FC<{ groups: HabboGroupEntryData[]; selectedIndex: number; onSelect: (index: number) => void }> = ({ groups, selectedIndex, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [hoverIndex, setHoverIndex] = useState(-1);
    const rootRef = useRef<HTMLDivElement>(null);
    const selectedGroup = selectedIndex >= 0 ? groups[selectedIndex] : null;

    useEffect(() => {
        if (!isOpen) return;

        const close = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
        };

        document.addEventListener('mousedown', close);

        return () => document.removeEventListener('mousedown', close);
    }, [isOpen]);

    const select = (index: number) => {
        onSelect(index);
        setIsOpen(false);
        setHoverIndex(-1);
    };

    return (
        <div ref={rootRef} className="volt-catalog-guild-droplist">
            <select className="sr-only" value={selectedIndex} onChange={(event) => select(parseInt(event.target.value))}>
                {groups.map((group, index) => (
                    <option key={group.groupId} value={index}>
                        {group.groupName}
                    </option>
                ))}
            </select>
            <div aria-hidden="true" className="volt-catalog-guild-droplist-frame" onClick={() => setIsOpen((value) => !value)}>
                {!!selectedGroup && (
                    <span className="volt-catalog-guild-droplist-value">
                        <GuildDropListItem background={ITEM_BACKGROUND} group={selectedGroup} />
                    </span>
                )}
            </div>
            {isOpen && (
                <div aria-hidden="true" className="volt-catalog-guild-droplist-frame is-open" style={{ height: Math.max(26, groups.length * 22 + 3 + 4) }}>
                    <span className="volt-catalog-guild-droplist-list">
                        {groups.map((group, index) => {
                            const background = index === hoverIndex ? ITEM_HOVER_BACKGROUND : index === selectedIndex ? ITEM_SELECTED_BACKGROUND : ITEM_BACKGROUND;

                            return (
                                <span
                                    key={group.groupId}
                                    className="volt-catalog-guild-droplist-option"
                                    style={{ backgroundColor: `#${background.toString(16).padStart(6, '0')}` }}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        select(index);
                                    }}
                                    onMouseEnter={() => setHoverIndex(index)}
                                    onMouseLeave={() => setHoverIndex(-1)}
                                >
                                    <GuildDropListItem background={background} group={group} />
                                </span>
                            );
                        })}
                    </span>
                </div>
            )}
        </div>
    );
};
