import {
    AddLinkEventTracker,
    ClaimProductMessageComposer,
    ClaimProductResultMessageEvent,
    HasClaimedProductMessageComposer,
    HasClaimedProductResponseMessageEvent,
    ILinkEventTracker,
    RemoveLinkEventTracker
} from '@volt/renderer';
import { CSSProperties, FC, useCallback, useEffect, useRef, useState } from 'react';
import { GetOptionalConfigurationValue, LocalizeText, SendMessageComposer } from '../../api';
import background from '../../assets/images/cursed-dragon-adoption/background.png';
import bluePackage from '../../assets/images/cursed-dragon-adoption/blue_package.png';
import evilFrank from '../../assets/images/cursed-dragon-adoption/evil_frank.png';
import purplePackage from '../../assets/images/cursed-dragon-adoption/purple_package.png';
import borderColorless from '../../assets/images/habbo-skin/slices/border-colorless-base.png';
import shinyDefault from '../../assets/images/habbo-skin/slices/button-shiny-default.png';
import shinyDisabled from '../../assets/images/habbo-skin/slices/button-shiny-disabled.png';
import shinyHover from '../../assets/images/habbo-skin/slices/button-shiny-hover.png';
import shinyPressed from '../../assets/images/habbo-skin/slices/button-shiny-pressed.png';
import frameBase from '../../assets/images/habbo-skin/slices/frame-ubuntu-3-base.png';
import { useTintedSkin, VoltCardHeaderView, VoltCardView } from '../../common';
import { useMessageEvent, useNotification } from '../../hooks';
import { CursedDragonPreviewView } from './CursedDragonPreviewView';

// CursedDragonAdoptionController.as:29-41 (AIR WIN63-202610151745-318700621, com/sulake/habbo/catalog/cursed_dragon_adoption).
export const CLAIM_STATE_UNKNOWN = 0;
export const CLAIM_STATE_FETCHING = 1;
export const CLAIM_STATE_AVAILABLE = 2;
export const CLAIM_STATE_CLAIMING = 3;
export const CLAIM_STATE_CLAIMED = 4;
export const CLAIM_STATE_UNAVAILABLE = 5;

const CHOICE_BLUE = 0;
const CHOICE_PURPLE = 1;
const DEFAULT_CLAIM_ID = 'cursed_dragon_adoption';

// cursed_dragon_adoption_xml colours.
const FRAME_COLOR = 0x302b39;
const HINT_COLOR = 0x231f2c;
const BLUE_BORDER_COLOR = 0x1e2029;
const PURPLE_BORDER_COLOR = 0x251f2c;
const BLUE_BUTTON_COLOR = 0x278b91;
const PURPLE_BUTTON_COLOR = 0x8b5fa6;

const getClaimId = () =>
{
    const claimId = String(GetOptionalConfigurationValue<unknown>('cursed_dragon_adoption.claim_id', '') ?? '');

    return claimId.length ? claimId : DEFAULT_CLAIM_ID;
};

/** A style-2 border (border_colorless) coloured like AIR, behind the content at blend 0.9. */
const ColoredBorder: FC<{ color: number; style: CSSProperties }> = ({ color, style }) =>
{
    const image = useTintedSkin(borderColorless, color);

    return <div aria-hidden="true" className="volt-cursed-dragon-border" style={{ ...style, borderImageSource: image ?? 'none' }} />;
};

/** button style 6 (button_shiny with the window colour), 162x32. */
const AdoptButton: FC<{ color: number; caption: string; disabled: boolean; onClick: () => void }> = ({ color, caption, disabled, onClick }) =>
{
    const normal = useTintedSkin(shinyDefault, color);
    const hover = useTintedSkin(shinyHover, color);
    const pressed = useTintedSkin(shinyPressed, color);
    const disabledSkin = useTintedSkin(shinyDisabled, color);
    const style = {
        '--volt-cursed-dragon-button': normal ?? 'none',
        '--volt-cursed-dragon-button-hover': hover ?? normal ?? 'none',
        '--volt-cursed-dragon-button-pressed': pressed ?? normal ?? 'none',
        '--volt-cursed-dragon-button-disabled': disabledSkin ?? normal ?? 'none'
    } as CSSProperties;

    return (
        <button className="volt-cursed-dragon-adopt" disabled={disabled} style={style} type="button" onClick={onClick}>
            {caption}
        </button>
    );
};

/** CursedDragonAdoptionController + CursedDragonAdoptionView: opened by the link cursed_dragon_adoption/open. */
export const CursedDragonAdoptionView: FC<{}> = () =>
{
    const [isVisible, setIsVisible] = useState(false);
    const [claimState, setClaimState] = useState(CLAIM_STATE_UNKNOWN);
    const [isConfirming, setIsConfirming] = useState(false);
    const claimStateRef = useRef(CLAIM_STATE_UNKNOWN);
    const claimIdRef = useRef<string>(null);
    const { showConfirm = null } = useNotification();
    const frameImage = useTintedSkin(frameBase, FRAME_COLOR, 33);

    const updateClaimState = useCallback((state: number) =>
    {
        claimStateRef.current = state;
        setClaimState(state);
    }, []);

    const getCurrentClaimId = () =>
    {
        if (!claimIdRef.current) claimIdRef.current = getClaimId();

        return claimIdRef.current;
    };

    // :111-124
    const open = useCallback(() =>
    {
        const state = claimStateRef.current;

        if (state !== CLAIM_STATE_FETCHING && state !== CLAIM_STATE_CLAIMING && state !== CLAIM_STATE_CLAIMED)
        {
            updateClaimState(CLAIM_STATE_FETCHING);
            SendMessageComposer(new HasClaimedProductMessageComposer(getCurrentClaimId()));
        }

        setIsVisible(true);
    }, [updateClaimState]);

    // :126-135
    const makeClaim = useCallback((choice: number) =>
    {
        if (claimStateRef.current !== CLAIM_STATE_AVAILABLE || (choice !== CHOICE_BLUE && choice !== CHOICE_PURPLE)) return;

        updateClaimState(CLAIM_STATE_CLAIMING);
        SendMessageComposer(new ClaimProductMessageComposer(getCurrentClaimId(), choice));
    }, [updateClaimState]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');

                if (parts.length >= 2 && parts[1] === 'open') open();
            },
            eventUrlPrefix: 'cursed_dragon_adoption/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [open]);

    // :137-146
    useMessageEvent<HasClaimedProductResponseMessageEvent>(HasClaimedProductResponseMessageEvent, (event) =>
    {
        const parser = event.getParser();

        if (parser.claimId !== getCurrentClaimId() || claimStateRef.current !== CLAIM_STATE_FETCHING) return;

        updateClaimState(parser.hasClaimed ? CLAIM_STATE_CLAIMED : CLAIM_STATE_AVAILABLE);
    });

    // :148-169: 0 claimed and 1 already claimed end as claimed, 2 not found and 3 not active as unavailable, anything else can be tried again.
    useMessageEvent<ClaimProductResultMessageEvent>(ClaimProductResultMessageEvent, (event) =>
    {
        const parser = event.getParser();

        if (parser.claimId !== getCurrentClaimId() || claimStateRef.current !== CLAIM_STATE_CLAIMING) return;

        switch (parser.result)
        {
            case 0:
            case 1:
                updateClaimState(CLAIM_STATE_CLAIMED);
                break;
            case 2:
            case 3:
                updateClaimState(CLAIM_STATE_UNAVAILABLE);
                break;
            default:
                updateClaimState(CLAIM_STATE_AVAILABLE);
        }
    });

    const canClaim = claimState === CLAIM_STATE_AVAILABLE;

    // CursedDragonAdoptionView.as:92-114
    const confirmAdoption = (choice: number) =>
    {
        if (!canClaim || isConfirming) return;

        const colour = LocalizeText(choice === CHOICE_BLUE ? 'cursed_dragon_adoption.blue.name' : 'cursed_dragon_adoption.purple.name');

        setIsConfirming(true);
        showConfirm(
            LocalizeText('cursed_dragon_adoption.confirm.desc', ['colour'], [colour]),
            () =>
            {
                setIsConfirming(false);
                makeClaim(choice);
            },
            () => setIsConfirming(false),
            null,
            null,
            LocalizeText('cursed_dragon_adoption.confirm.title')
        );
    };

    if (!isVisible) return null;

    // :61-73
    const caption = LocalizeText(claimState === CLAIM_STATE_CLAIMED ? 'cursed_dragon_adoption.adopted' : 'cursed_dragon_adoption.adopt');
    const buttonsDisabled = !canClaim || isConfirming;

    return (
        <VoltCardView
            className="volt-cursed-dragon-adoption"
            frameStyle={3}
            isResizable={false}
            nativeShadow
            style={frameImage ? ({ '--volt-card-frame-3': frameImage } as CSSProperties) : undefined}
            uniqueKey="cursed-dragon-adoption"
        >
            <VoltCardHeaderView headerText={LocalizeText('cursed_dragon_adoption.title')} onCloseClick={() => setIsVisible(false)} />
            <div className="volt-card-content-shell volt-cursed-dragon-content">
                <img alt="" className="volt-cursed-dragon-scene" draggable={false} src={background} />
                <div className="volt-cursed-dragon-dragon-scene">
                    <ColoredBorder color={HINT_COLOR} style={{ left: 105, top: 13, width: 578, height: 30 }} />
                    <div className="volt-cursed-dragon-text volt-cursed-dragon-choice-hint">{LocalizeText('cursed_dragon_adoption.choose')}</div>
                    <img alt="" className="volt-cursed-dragon-package is-blue" draggable={false} src={bluePackage} />
                    <img alt="" className="volt-cursed-dragon-package is-purple" draggable={false} src={purplePackage} />
                    <CursedDragonPreviewView />
                    <div className="volt-cursed-dragon-choice is-blue">
                        <ColoredBorder color={BLUE_BORDER_COLOR} style={{ left: 0, top: 0, width: 286, height: 84 }} />
                        <div className="volt-cursed-dragon-choice-line" />
                        <div className="volt-cursed-dragon-text volt-cursed-dragon-choice-name">{LocalizeText('cursed_dragon_adoption.blue')}</div>
                        <AdoptButton caption={caption} color={BLUE_BUTTON_COLOR} disabled={buttonsDisabled} onClick={() => confirmAdoption(CHOICE_BLUE)} />
                    </div>
                    <div className="volt-cursed-dragon-choice is-purple">
                        <ColoredBorder color={PURPLE_BORDER_COLOR} style={{ left: 0, top: 0, width: 286, height: 84 }} />
                        <div className="volt-cursed-dragon-choice-line" />
                        <div className="volt-cursed-dragon-text volt-cursed-dragon-choice-name">{LocalizeText('cursed_dragon_adoption.purple')}</div>
                        <AdoptButton caption={caption} color={PURPLE_BUTTON_COLOR} disabled={buttonsDisabled} onClick={() => confirmAdoption(CHOICE_PURPLE)} />
                    </div>
                </div>
                <div className="volt-cursed-dragon-introduction">
                    <div className="volt-cursed-dragon-text volt-cursed-dragon-eyebrow">{LocalizeText('cursed_dragon_adoption.eyebrow')}</div>
                    <div className="volt-cursed-dragon-text volt-cursed-dragon-title">{LocalizeText('cursed_dragon_adoption.intro.title')}</div>
                    <div className="volt-cursed-dragon-text volt-cursed-dragon-body">{LocalizeText('cursed_dragon_adoption.intro.body')}</div>
                    <img alt="" className="volt-cursed-dragon-evil-frank" draggable={false} src={evilFrank} />
                    <div className="volt-cursed-dragon-intro-line is-blue" />
                    <div className="volt-cursed-dragon-intro-line is-purple" />
                </div>
            </div>
        </VoltCardView>
    );
};
