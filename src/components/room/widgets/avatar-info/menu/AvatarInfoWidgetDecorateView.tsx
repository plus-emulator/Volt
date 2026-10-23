import { RoomObjectCategory } from '@volt/renderer';
import { Dispatch, FC, SetStateAction } from 'react';
import { LocalizeText } from '../../../../../api';
import { ContextMenuListItemView } from '../../context-menu/ContextMenuListItemView';
import { ContextMenuView } from '../../context-menu/ContextMenuView';

interface AvatarInfoWidgetDecorateViewProps {
    userId: number;
    userName: string;
    roomIndex: number;
    setIsDecorating: Dispatch<SetStateAction<boolean>>;
}

// AIR DecorateModeView: own_avatar_decorating bubble, offset -height - 10 and drawn at maximumBlend 0.8.
const DECORATE_ANCHOR_OFFSETS = { user: -10, other: -10 };
const DECORATE_STYLE = { opacity: 0.8 };

export const AvatarInfoWidgetDecorateView: FC<AvatarInfoWidgetDecorateViewProps> = (props) => {
    const { userId = -1, userName = '', roomIndex = -1, setIsDecorating = null } = props;

    return (
        <ContextMenuView
            anchorOffsets={DECORATE_ANCHOR_OFFSETS}
            category={RoomObjectCategory.UNIT}
            classNames={['volt-avatar-action-menu', 'volt-avatar-action-menu--own', 'volt-avatar-action-menu--decorate']}
            freezePositionOnHover={true}
            maximumVerticalLeadRatio={0.05}
            objectId={roomIndex}
            style={DECORATE_STYLE}
            onClose={null}
        >
            <div className="air-avatar-menu-buttons">
                <ContextMenuListItemView onClick={(event) => setIsDecorating(false)}>{LocalizeText('widget.avatar.stop_decorating')}</ContextMenuListItemView>
            </div>
        </ContextMenuView>
    );
};
