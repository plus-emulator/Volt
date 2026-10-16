import { CSSProperties, FC, PropsWithChildren, ReactNode } from 'react';
import { WiredFurniType } from '../../../../api';
import { WiredBaseView } from '../WiredBaseView';

export interface WiredConditionBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    /** AIR advancedAlwaysVisible: the footer is the expanded advanced wrapper with no toggle. */
    advancedAlwaysVisible?: boolean;
    selectionPreview?: ReactNode;
    nativeLayout?: boolean;
}

export const WiredConditionBaseView: FC<PropsWithChildren<WiredConditionBaseViewProps>> = (props) => {
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        cardStyle = undefined,
        hasSpecialInput = false,
        children = null,
        footer = null,
        footerCollapsible = true,
        advancedAlwaysVisible = false,
        selectionPreview = null,
        nativeLayout = false
    } = props;

    const onSave = () => save && save();

    return (
        <WiredBaseView
            hasSpecialInput={hasSpecialInput}
            requiresFurni={requiresFurni}
            save={onSave}
            validate={validate}
            cardStyle={cardStyle}
            wiredType="condition"
            footer={footer}
            footerCollapsible={footerCollapsible}
            advancedAlwaysVisible={advancedAlwaysVisible}
            selectionPreview={selectionPreview}
            nativeLayout={nativeLayout}
        >
            {children}
        </WiredBaseView>
    );
};
