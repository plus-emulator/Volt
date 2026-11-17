import { RoomPreviewer } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../../api';
import emptyChestImage from '../../../../../assets/images/chest/air-furni-chest-empty.png';
import { LayoutRoomPreviewerView } from '../../../../../common';
import { ChestFurniGroup } from '../chestFurniGrouping';
import { FurniChestGridItem } from '../FurniChestGridItem';
import { FurniChestSearchBar } from '../FurniChestSearchBar';
import { ChestShinyButton, ChestText } from './ChestAirParts';

interface FurniChestContentsViewProps {
    entries: ChestFurniGroup[];
    showSearch: boolean;
    searchDraft: string;
    onSearchDraftChange: (value: string) => void;
    onSearchApply: (value: string) => void;
    onSearchClear: () => void;
    selectedKey: string;
    selectedGroup: ChestFurniGroup | null;
    onSelect: (key: string) => void;
    label: (group: ChestFurniGroup) => string;
    roomPreviewer: RoomPreviewer;
    withdrawAmount: string;
    onWithdrawAmountChange: (value: string) => void;
    canWithdraw: boolean;
    onWithdraw: () => void;
}

/**
 * furni_chest_contents: the item grid border (style 2, 0xe3e3e3) stretches with the window, the 175px preview panel (style 2,
 * 0xd8d8d8) keeps its width and moves with the right edge, and the withdraw row stays 31px above its bottom.
 */
export const FurniChestContentsView: FC<FurniChestContentsViewProps> = (props) => {
    const { entries, showSearch, searchDraft, onSearchDraftChange, onSearchApply, onSearchClear, selectedKey, selectedGroup, onSelect, label, roomPreviewer, withdrawAmount, onWithdrawAmountChange, canWithdraw, onWithdraw } = props;

    return (
        <div className="volt-chest-air__furni">
            <div className="volt-chest-air__grid-border">
                {showSearch && (
                    <FurniChestSearchBar draft={searchDraft} onApply={onSearchApply} onClear={onSearchClear} onDraftChange={onSearchDraftChange} />
                )}
                {entries.length === 0 && (
                    <div className="volt-chest-air__no-items">
                        <ChestText background={0xe2e2e2} blend={0.5} text={LocalizeText('wiredchests.furni_chest.no_items')} />
                    </div>
                )}
                <div className={`volt-chest-air__grid${showSearch ? ' has-search' : ''}`}>
                    {entries.map((group) => (
                        <FurniChestGridItem key={group.key} group={group} selected={selectedKey === group.key} title={label(group)} onSelect={() => onSelect(group.key)} />
                    ))}
                </div>
            </div>
            <div className="volt-chest-air__right-panel">
                <div className="volt-chest-air__preview-border">
                    {selectedGroup ? (
                        <>
                            <ChestText bold background={0xd7d7d7} className="volt-chest-air__furni-name" maxWidth={190} text={label(selectedGroup)} />
                            <div className="volt-chest-air__preview-image">
                                <LayoutRoomPreviewerView fitParent roomPreviewer={roomPreviewer} onPreviewClick={() => {}} />
                            </div>
                        </>
                    ) : (
                        <img alt="" className="volt-chest-air__placeholder" draggable={false} src={emptyChestImage} />
                    )}
                </div>
                <div className="volt-chest-air__withdraw">
                    <input
                        className="volt-chest-air__withdraw-input"
                        data-air-name="withdraw_input"
                        inputMode="numeric"
                        type="text"
                        value={withdrawAmount}
                        onChange={(event) => onWithdrawAmountChange(event.target.value.replace(/\D/g, ''))}
                    />
                    <ChestShinyButton airName="withdraw_btn" caption={LocalizeText('wiredchests.withdraw')} disabled={!selectedGroup || !canWithdraw} rect={[40, 0, 73, 22]} onClick={onWithdraw} />
                </div>
            </div>
        </div>
    );
};
