import { RoomObjectCategory } from '@volt/renderer';
import { Dispatch, FC, SetStateAction } from 'react';
import { LocalizeText } from '../../../../../api';
import { NativeCenteredField } from '../../../../../common/native-text/NativeCenteredField';
import { NativeText } from '../../../../../common/native-text/NativeText';
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
                <ContextMenuListItemView onClick={(event) => setIsDecorating(false)}>
                    <NativeCenteredField className="air-avatar-menu-decorate-label" width={101}>
                        <NativeText transparent background={0x2a2825} overrides={{ size: 11, color: 0xffffff }} text={LocalizeText('widget.avatar.stop_decorating')} textStyle="u_regular" />
                    </NativeCenteredField>
                </ContextMenuListItemView>
            </div>
        </ContextMenuView>
    );
};
