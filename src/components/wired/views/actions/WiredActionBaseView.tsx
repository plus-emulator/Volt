import { WiredActionDefinition } from '@volt/renderer';
import { CSSProperties, FC, PropsWithChildren, ReactNode, useEffect } from 'react';
import { GetWiredTimeLocale, LocalizeText, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionDelaySection } from './WiredActionDelaySection';
import { WiredBaseView } from '../WiredBaseView';

export interface WiredActionBaseViewProps {
    hasSpecialInput: boolean;
    requiresFurni: number;
    save: () => void;
    validate?: () => boolean;
    cardStyle?: CSSProperties;
    hideDelay?: boolean;
    footer?: ReactNode;
    footerCollapsible?: boolean;
    advancedAlwaysVisible?: boolean;
    selectionPreview?: ReactNode;
    /** False keeps furni picking on but leaves the picks section out (AIR forceHidePickFurniInstructions). */
    showSelection?: boolean;
    nativeLayout?: boolean;
}

export const WiredActionBaseView: FC<PropsWithChildren<WiredActionBaseViewProps>> = (props) => {
    const {
        requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_NONE,
        save = null,
        validate = null,
        hasSpecialInput = false,
        children = null,
        cardStyle = undefined,
        hideDelay = false,
        footer = null,
        footerCollapsible = true,
        advancedAlwaysVisible = false,
        selectionPreview = null,
        showSelection = true,
        nativeLayout = false
    } = props;
    const { trigger = null, actionDelay = 0, setActionDelay = null } = useWired();

    useEffect(() => {
        setActionDelay((trigger as WiredActionDefinition).delayInPulses);
    }, [trigger, setActionDelay]);

    return (
        <WiredBaseView
            hasSpecialInput={hasSpecialInput}
            requiresFurni={requiresFurni}
            save={save}
            validate={validate}
            wiredType="action"
            cardStyle={cardStyle}
            footer={footer}
            footerCollapsible={footerCollapsible}
            advancedAlwaysVisible={advancedAlwaysVisible}
            selectionPreview={selectionPreview}
            showSelection={showSelection}
            nativeLayout={nativeLayout}
            delay={
                !hideDelay && (
                    <WiredActionDelaySection className="volt-wired__section--delay" value={actionDelay} onChange={setActionDelay} />
                )
            }
            legacyDelay={
                !hideDelay && (
                    <>
                        {!!children && <div className="volt-wired__divider" />}
                        <div className="flex flex-col volt-wired__section volt-wired__section--delay">
                            <Text bold>{LocalizeText('wiredfurni.params.delay', ['seconds'], [GetWiredTimeLocale(actionDelay)])}</Text>
                            <Slider max={20} min={0} value={actionDelay} onChange={(event) => setActionDelay(event)} />
                        </div>
                    </>
                )
            }
        >
            {children}
        </WiredBaseView>
    );
};
