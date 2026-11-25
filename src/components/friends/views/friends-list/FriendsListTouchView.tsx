import { GetSessionDataManager, HabboSearchComposer } from '@volt/renderer';
import { FC, FormEvent, ReactNode, RefObject, useState } from 'react';
import { GetConfigurationValue, GetUserProfile, LocalizeText, MessengerFriend, MessengerRequest, OpenMessengerChat, SendMessageComposer } from '../../../../api';
import { LayoutAvatarImageView, LayoutBadgeImageView } from '../../../../common';
import { useFriends } from '../../../../hooks';

export type FriendsPanel = 'friends' | 'requests' | 'search';

interface FriendsListTouchViewProps {
    rootRef: RefObject<HTMLDivElement>;
    panel: FriendsPanel;
    onlineCaption: string;
    offlineCaption: string;
    selectedFriendsIds: number[];
    changePanel: (panel: FriendsPanel) => void;
    selectFriend: (userId: number) => void;
    onClose: () => void;
    onInvite: () => void;
    onHomepage: () => void;
    onRemove: () => void;
}

const FriendsTouchHead: FC<{ figure: string; group?: boolean; offline?: boolean }> = ({ figure, group = false, offline = false }) => (
    <div className={`vft-head${offline ? ' is-offline' : ''}`}>
        {!!figure && (group
            ? <LayoutBadgeImageView badgeCode={figure} isGroup showInfo={false} />
            : <LayoutAvatarImageView figure={figure} headOnly direction={2} nativeCroppedHead trimmed />)}
    </div>
);

const FriendsTouchRow: FC<{ figure: string; name: string; sub?: string; group?: boolean; offline?: boolean; selected?: boolean; onClick?: () => void; children?: ReactNode }> = ({
    figure, name, sub, group = false, offline = false, selected = false, onClick, children
}) => (
    <div className={`vft-row${offline ? ' is-offline' : ''}${selected ? ' is-selected' : ''}`} role="button" tabIndex={0} aria-pressed={selected}
        onClick={onClick} onKeyDown={(event) => { if (event.target === event.currentTarget && event.key === 'Enter') onClick?.(); }}>
        <FriendsTouchHead figure={figure} group={group} offline={offline} />
        <div className="vft-row-text">
            <div className="vft-row-name">{name}</div>
            {!!sub && <div className="vft-row-sub">{sub}</div>}
        </div>
        <div className="vft-row-actions" onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
);

const FriendsTouchIconButton: FC<{ icon: string; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
    <button type="button" className={`vft-icon-button ${icon}`} aria-label={label} title={label} onClick={onClick} />
);

export const FriendsListTouchView: FC<FriendsListTouchViewProps> = ({
    rootRef, panel, onlineCaption, offlineCaption, selectedFriendsIds, changePanel, selectFriend, onClose, onInvite, onHomepage, onRemove
}) => {
    const [filter, setFilter] = useState('');
    const [closed, setClosed] = useState(() => new Set([-1]));
    const { onlineFriends = [], offlineFriends = [], requestRows: requests = [], searchResults, searchValue, setSearchValue, sentRequests, requestFriend, requestResponse, followFriend } = useFriends();
    const persistentChat = GetConfigurationValue<boolean>('friend_list.persistent_message_status.enabled', false);
    const pendingCount = requests.filter((request) => request.state === MessengerRequest.PENDING).length;
    const query = filter.trim().toLowerCase();
    const matches = (friend: MessengerFriend) => !query || friend.name.toLowerCase().includes(query);
    const sections = [
        { id: 0, caption: onlineCaption, friends: onlineFriends.filter((friend) => friend.categoryId === 0 && matches(friend)) },
        { id: -1, caption: offlineCaption, friends: offlineFriends.filter(matches) }
    ];

    const toggleSection = (id: number) => setClosed((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const value = searchValue.trim();
        if (value.length) SendMessageComposer(new HabboSearchComposer(value));
    };

    const tabs: [FriendsPanel, string][] = [
        ['friends', `${LocalizeText('friendlist.friends')} (${onlineFriends.length + offlineFriends.length})`],
        ...(requests.length ? [['requests', `${LocalizeText('friendlist.tab.friendrequests')} (${pendingCount})`] as [FriendsPanel, string]] : []),
        ['search', LocalizeText('generic.search')]
    ];

    return <div ref={rootRef} className="volt-friends-touch">
        <div className="vft-header">
            <span className="vft-title">{LocalizeText('friendlist.friends')}</span>
            <button type="button" className="vft-close" data-volt-close aria-label={LocalizeText('generic.close')} onClick={onClose} />
        </div>
        <div className="vft-tabs" role="tablist">
            {tabs.map(([id, caption]) => <button key={id} type="button" role="tab" aria-selected={panel === id}
                className={`vft-tab${panel === id ? ' is-active' : ''}`} onClick={() => changePanel(id)}>{caption}</button>)}
        </div>
        {panel === 'friends' && <>
            <div className="vft-field">
                <input type="search" value={filter} placeholder={LocalizeText('friendlist.tip.search')} aria-label={LocalizeText('friendlist.tip.search')}
                    onChange={(event) => setFilter(event.target.value)} />
            </div>
            <div className="vft-list">
                {sections.map((section) => {
                    const open = !closed.has(section.id);
                    const offline = section.id === -1;
                    return <section key={section.id} className={`vft-section${offline ? ' is-offline' : ''}`}>
                        <button type="button" className={`vft-section-header${open ? ' is-open' : ''}`} aria-expanded={open} onClick={() => toggleSection(section.id)}>
                            {`${section.caption} (${section.friends.length})`}
                        </button>
                        {open && section.friends.map((friend) => {
                            const canChat = friend.online || (persistentChat && (friend.persistedMessageUser || friend.pocketHabboUser));
                            return <FriendsTouchRow key={friend.id} figure={friend.figure} group={friend.id < 0} offline={offline}
                                name={friend.realName ? `${friend.name} (${friend.realName})` : friend.name} sub={friend.motto}
                                selected={selectedFriendsIds.includes(friend.id)} onClick={() => selectFriend(friend.id)}>
                                {canChat && <FriendsTouchIconButton icon="chat" label={LocalizeText('friendlist.tip.im')} onClick={() => OpenMessengerChat(friend.id)} />}
                                {friend.followingAllowed && <FriendsTouchIconButton icon="follow" label={LocalizeText('friendlist.tip.follow')} onClick={() => followFriend(friend)} />}
                            </FriendsTouchRow>;
                        })}
                    </section>;
                })}
            </div>
            {!!selectedFriendsIds.length && <div className="vft-bar">
                <button type="button" className="vft-button invite" aria-label={LocalizeText('friendlist.tip.invite')} onClick={onInvite} />
                <button type="button" className="vft-button home" aria-label={LocalizeText('friendlist.tip.home')} disabled={selectedFriendsIds.length !== 1} onClick={onHomepage} />
                <button type="button" className="vft-button remove" aria-label={LocalizeText('friendlist.tip.remove')} onClick={onRemove} />
            </div>}
        </>}
        {panel === 'requests' && <>
            <div className="vft-list">
                {requests.map((request) => <FriendsTouchRow key={request.id} figure={request.figureString} name={request.name}
                    sub={request.state === MessengerRequest.PENDING ? '' : LocalizeText(request.state === MessengerRequest.ACCEPTED ? 'friendlist.request.accepted'
                        : request.state === MessengerRequest.DECLINED ? 'friendlist.request.declined' : 'friendlist.request.failed')}
                    onClick={() => GetUserProfile(request.requesterUserId)}>
                    {request.state === MessengerRequest.PENDING && <>
                        <FriendsTouchIconButton icon="accept" label={LocalizeText('friendlist.tip.accept')} onClick={() => requestResponse(request.id, true)} />
                        <FriendsTouchIconButton icon="decline" label={LocalizeText('friendlist.tip.decline')} onClick={() => requestResponse(request.id, false)} />
                    </>}
                </FriendsTouchRow>)}
            </div>
            <div className="vft-bar">
                <button type="button" className="vft-button text" disabled={!pendingCount} onClick={() => requestResponse(-1, true)}>{LocalizeText('friendlist.requests.acceptall')}</button>
                <button type="button" className="vft-button text" disabled={!pendingCount} onClick={() => requestResponse(-1, false)}>{LocalizeText('friendlist.requests.dismissall')}</button>
            </div>
        </>}
        {panel === 'search' && <>
            <form className="vft-field vft-search" onSubmit={submitSearch}>
                <input type="search" enterKeyHint="search" value={searchValue} aria-label={LocalizeText('generic.search')}
                    onChange={(event) => setSearchValue(event.target.value)} />
                <button type="submit" className="vft-button search" aria-label={LocalizeText('generic.search')} />
            </form>
            <div className="vft-list">
                {[false, true].map((other) => {
                    const results = other ? searchResults.others : searchResults.friends;
                    const kind = other ? 'others' : 'friends';
                    return <section key={kind} className="vft-section">
                        <div className="vft-section-header is-static">{LocalizeText(results.length ? `friendlist.search.${kind}caption` : `friendlist.search.no${kind}found`, ['cnt'], [String(results.length)])}</div>
                        {results.map((result) => <FriendsTouchRow key={result.avatarId} figure={result.avatarFigure} group={result.avatarId < 0} name={result.avatarName}
                            sub={result.avatarMotto} onClick={() => { if (result.avatarId > 0) GetUserProfile(result.avatarId); }}>
                            {!other && (result.isAvatarOnline || persistentChat) && <FriendsTouchIconButton icon="chat" label={LocalizeText('friendlist.tip.im')}
                                onClick={() => OpenMessengerChat(result.avatarId)} />}
                            {other && result.avatarId !== GetSessionDataManager().userId && !sentRequests.includes(result.avatarId) && <FriendsTouchIconButton icon="add"
                                label={LocalizeText('friendlist.tip.addfriend')} onClick={() => requestFriend(result.avatarId, result.avatarName)} />}
                        </FriendsTouchRow>)}
                    </section>;
                })}
            </div>
        </>}
    </div>;
};
