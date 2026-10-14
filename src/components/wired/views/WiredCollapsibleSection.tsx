import { FC, PropsWithChildren, useState } from 'react';
import { WiredSection } from './WiredSection';
import { WiredText } from './WiredText';

/** SectionParam.COLLAPSED: an initially folded section whose header toggles its contents. */
export const WiredCollapsibleSection: FC<PropsWithChildren<{ title: string }>> = ({ title, children }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <WiredSection className="volt-wired__collapsible-section" title={
            <button className="volt-wired__section-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
                <span className={expanded ? 'is-expanded' : ''} aria-hidden="true" />
                <WiredText text={title} bold />
            </button>
        }>
            {expanded && children}
        </WiredSection>
    );
};
