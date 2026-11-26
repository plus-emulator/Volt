import { FC, useState } from 'react';
import { IsPhoneLayout, useVoltLayout } from '../../api';
import { Column } from '../../common';
import { OfferView } from '../catalog/views/targeted-offer/OfferView';
import { GroupRoomInformationView } from '../groups/views/GroupRoomInformationView';
import { NewFeatureNotificationsView } from '../new-feature/NewFeatureNotificationsView';
import { NotificationCenterView } from '../notification-center/NotificationCenterView';
import { PurseView } from '../purse/PurseView';
import { QuestTrackerView } from '../quests/QuestTrackerView';
import { MysteryBoxExtensionView } from '../room/widgets/mysterybox/MysteryBoxExtensionView';
import { RoomPromotesWidgetView } from '../room/widgets/room-promotes/RoomPromotesWidgetView';

export const RightSideView: FC<{}> = (props) => {
    const isPhone = IsPhoneLayout(useVoltLayout());
    const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);

    return (
        <div className="absolute top-0 right-1 z-10 w-[min(230px,calc(100vw-16px))] sm:w-[min(230px,calc(100vw-20px))] h-[calc(100%-55px)] pointer-events-none">
            {/* extension_grid_xml: 2px item spacing; the grid sits at y = 3 - 8 while the purse is in it. */}
            <Column gap={0} position="relative" alignItems="end" className="-mt-[5px] w-full gap-[2px]">
                <div className="relative left-px w-[230px] shrink-0">
                    <PurseView />
                </div>
                {isPhone && (
                    <button
                        aria-expanded={isExtensionsOpen}
                        aria-label={isExtensionsOpen ? 'Hide extras' : 'Show extras'}
                        className="volt-touch-extensions-toggle pointer-events-auto"
                        type="button"
                        onClick={() => setIsExtensionsOpen((value) => !value)}
                    />
                )}
                <div className="volt-touch-extensions contents" data-open={isPhone ? isExtensionsOpen : undefined}>
                    {/* AIR attaches the new_feature_<key> bars 2 s after start, below the purse. */}
                    <NewFeatureNotificationsView />
                    <QuestTrackerView />
                    <GroupRoomInformationView />
                    <OfferView />
                    <RoomPromotesWidgetView />
                    <MysteryBoxExtensionView />
                </div>
                <NotificationCenterView />
            </Column>
        </div>
    );
};
