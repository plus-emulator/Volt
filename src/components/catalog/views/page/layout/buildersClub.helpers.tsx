import { FC } from 'react';
import { GetProductDataForLocalization, LocalizeText } from '../../../../../api';
import { SubpixelText } from '../../../../../common/native-text/SubpixelText';
import { useBuildersClubStore } from '../../../../../state/buildersClubStore';

export const BUILDERS_CLUB_ADDONS_LAYOUT = 'builders_club_addons';
export const BUILDERS_CLUB_MEMBERSHIP_PAGE = 'builders_club_membership';

// CatalogOffer.localizationName: the productdata name for the offer's localization key, otherwise the key's localization.
export const getBuildersClubOfferName = (localizationId: string): string =>
{
    const name = GetProductDataForLocalization(localizationId)?.name;

    return name || LocalizeText(localizationId);
};

export const useBuildersClubSecondsLeft = () => useBuildersClubStore((state) => state.secondsLeft);

interface BuildersClubButtonProps {
    caption: string;
    /** The window colour of the button_thick: 0x0a9bc5 (blue) or 0xdda100 (yellow). */
    tint: 'blue' | 'yellow';
    width: number;
    height: number;
    className?: string;
    disabled?: boolean;
    name?: string;
    onClick?: () => void;
}

const TINT_COLOR = { blue: 0x0a9bc5, yellow: 0xdda100 };

/**
 * button_thick style 5 (habbo_skin_button_shiny_thick, 5px caps) multiplied by the window colour. The caption is the
 * _BTN_TEXT label of habbo_window_layout_button_shiny_thick_black: button_shiny_bold (u_bold) in white, margins 10/5/10/6,
 * centred on the button, so the 18px text field sits 5px below the top of a centred 29px label.
 */
export const BuildersClubButton: FC<BuildersClubButtonProps> = ({ caption, tint, width, height, className = '', disabled = false, name, onClick }) => (
    <button
        className={`volt-bc-button is-${tint} ${className}`.trim()}
        data-name={name}
        disabled={disabled}
        style={{ width, height }}
        type="button"
        onClick={onClick}
    >
        <SubpixelText
            transparent
            align="center"
            background={TINT_COLOR[tint]}
            className="volt-bc-button-caption"
            color={0xffffff}
            style={{ top: Math.floor((height - 29) / 2) + 5 }}
            text={caption}
            textStyle="u_bold"
            width={width}
        />
    </button>
);
