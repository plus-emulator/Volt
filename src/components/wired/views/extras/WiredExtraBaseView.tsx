import { WiredActionDefinition } from '@volt/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredBaseView, WiredSaveConfirmation } from '../WiredBaseView';

export interface WiredExtraBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean;
    confirmSave?: WiredSaveConfirmation;
    cardStyle?: CSSProperties;
    footer?: ReactNode;
    headerControls?: ReactNode;
    footerCollapsible?: boolean;
    /** AIR advancedAlwaysVisible: the footer is the expanded advanced wrapper with no toggle. */
    advancedAlwaysVisible?: boolean;
    selectionPreview?: ReactNode;
    nativeLayout?: boolean;
    showSelection?: boolean;
}

export const WiredExtraBaseView: FC<PropsWithChildren<WiredExtraBaseViewProps>> = (props) => {
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        confirmSave = undefined,
        hasSpecialInput = false,
        children = null,
        cardStyle = undefined,
        footer = null,
        headerControls = null,
        footerCollapsible = true,
        advancedAlwaysVisible = false,
        selectionPreview = null,
        showSelection = true,
        nativeLayout = false
    } = props;
    const { trigger = null, setActionDelay = null } = useWired();

    useEffect(() => {
        setActionDelay((trigger as WiredActionDefinition)?.delayInPulses ?? 0);
    }, [trigger, setActionDelay]);

    return (
        <WiredBaseView
            hasSpecialInput={hasSpecialInput}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            confirmSave={confirmSave}
            wiredType="extra"
            cardStyle={cardStyle}
            footer={footer}
            headerControls={headerControls}
            footerCollapsible={footerCollapsible}
            advancedAlwaysVisible={advancedAlwaysVisible}
            selectionPreview={selectionPreview}
            nativeLayout={nativeLayout}
            showSelection={showSelection}
        >
            {children}
        </WiredBaseView>
    );
};
