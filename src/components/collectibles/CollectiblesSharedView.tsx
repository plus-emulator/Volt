import { CSSProperties, FC, ReactNode, useEffect, useState } from 'react';
import bgStar from '../../assets/images/collectibles/bg-star-300x300.png';
import scoreBackground from '../../assets/images/collectibles/collectables-score-background.png';
import scoreBackgroundGradient2 from '../../assets/images/collectibles/collectables-score-background-gradient2.png';
import scoreBackgroundRight from '../../assets/images/collectibles/collectables-score-background-right.png';
import { SanitizeHtml } from '../../api';
import { at, SlotBorder, TintedBitmap, toCssColor } from './CollectiblesSkinView';

/** collection_preview_bg: the dark style-3 panel behind every product preview, with the star turning 20 degrees a second. */
export const CollectiblesPreviewBackground: FC<{ width?: number; children?: ReactNode }> = ({ width = 290, children = null }) => (
    <SlotBorder className="volt-collectibles-preview-bg" color={0x3d1f39} style={at(0, 0, width, 260)}>
        <TintedBitmap blend={0.3} src={scoreBackground} style={at(-15, -8, 166, 286)} />
        <TintedBitmap blend={0.3} src={scoreBackgroundRight} style={at(139, -18, 166, 286)} />
        <TintedBitmap blend={0.7} color={0x45ace2} src={scoreBackgroundGradient2} style={at(0, 0, 290, 260)} />
        <img alt="" className="volt-collectibles-bg-star" draggable={false} src={bgStar} style={at(-5, -20, 300, 300)} />
        {children}
    </SlotBorder>
);

interface CollectiblesNavigationNodeViewProps {
    title: string;
    active: boolean;
    /** The shop's item_hilight_outer is hidden, so only the grey selection background shows. */
    blueHighlight: boolean;
    /** progress_color_hint and the hover percentage of a collection node. */
    progress?: { color: number; percent: number; started: boolean };
    onClick: () => void;
}

/** item_template of the navigation lists (CollectionsNavigationNodeRenderer / ShopNavigationNodeRenderer). */
export const CollectiblesNavigationNodeView: FC<CollectiblesNavigationNodeViewProps> = ({ title, active, blueHighlight, progress = null, onClick }) => {
    const [hovered, setHovered] = useState(false);
    // The layout's etching shows until the first look update (activate, deactivate or hover), which sets the inactive etching to 0.
    const [touched, setTouched] = useState(false);
    const highlighted = active || hovered;
    const etched = highlighted || !touched;

    useEffect(() => {
        if (highlighted) setTouched(true);
    }, [highlighted]);

    return (
        <div className="volt-collectibles-nav-node" onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            {highlighted && (
                <div className="volt-collectibles-nav-highlight" style={at(1, 0, 178, 21)}>
                    {blueHighlight && (
                        <div className="volt-collectibles-nav-highlight-outer" style={at(0, 0, 178, 20)}>
                            <div className="volt-collectibles-nav-highlight-inner" style={at(0, 2, 178, 16)} />
                        </div>
                    )}
                </div>
            )}
            <div className={`volt-collectibles-nav-title ${highlighted ? 'is-active' : ''} ${etched ? 'is-etched' : ''}`} style={{ left: 7, top: 2 }}>
                {title}
            </div>
            {progress?.started && hovered && (
                <div className="volt-collectibles-abs" style={at(120, 3, 36, 15)}>
                    <SlotBorder color={progress.color} style={at(0, 0, 36, 14)} />
                    <div className="volt-collectibles-nav-progress-text" style={at(2, 0, 32, 15)}>{`${progress.percent}%`}</div>
                </div>
            )}
            {progress?.started && <div className="volt-collectibles-abs" style={at(0, 1, 4, 19, { backgroundColor: toCssColor(progress.color) })} />}
        </div>
    );
};

/** AIR html text windows: <font color> becomes a coloured span before the usual sanitizing. */
export const CollectiblesHtmlText: FC<{ html: string; className?: string; style?: CSSProperties; onLinkClick?: (href: string) => void }> = ({ html, className = '', style, onLinkClick = null }) => {
    const markup = SanitizeHtml((html ?? '').replace(/<font\s+color=["']?(#[0-9a-fA-F]{6})["']?\s*>/g, '<span style="color:$1">').replace(/<\/font>/g, '</span>'));

    return (
        <div
            className={`volt-collectibles-html ${className}`.trim()}
            dangerouslySetInnerHTML={{ __html: markup }}
            style={style}
            onClick={(event) => {
                const link = (event.target as HTMLElement).closest('a');

                if (!link || !onLinkClick) return;

                event.preventDefault();
                onLinkClick(link.getAttribute('href'));
            }}
        />
    );
};
