import { FC } from 'react';
import backIcon from '../../../../assets/images/navigator/air/button-back.png';

export interface CatalogTouchBackBarProps {
    backLabel: string;
    title: string;
    onBack: () => void;
}

/** Phone portrait page step: a back chip to the category list and the page name. */
export const CatalogTouchBackBar: FC<CatalogTouchBackBarProps> = ({ backLabel, title, onBack }) => (
    <div className="volt-catalog-touch-back-bar">
        <button className="volt-catalog-touch-back" type="button" onClick={onBack}>
            <img alt="" src={backIcon} />
            <span>{backLabel}</span>
        </button>
        <span className="volt-catalog-touch-back-title">{title}</span>
    </div>
);
