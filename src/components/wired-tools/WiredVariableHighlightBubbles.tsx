import { FC } from 'react';
import { useWiredCreatorToolsUiStore } from './wiredCreatorToolsUiStore';

export const WiredVariableHighlightBubbles: FC = () => {
    const overlays = useWiredCreatorToolsUiStore((s) => s.variableHighlightOverlays);

    if (!overlays.length) return null;

    return (
        <div className="pointer-events-none absolute left-0 top-0 z-30">
            {overlays.map((overlay) => (
                <div key={overlay.key} className="pointer-events-none absolute" style={{ left: overlay.x, top: overlay.y, transform: 'translateX(-50%)' }}>
                    <div className="absolute left-1/2 top-[-30px] -translate-x-1/2">
                        <div className="relative min-w-[24px] whitespace-nowrap rounded-[8px] bg-[#86aebccc] px-[8px] py-[4px] text-center text-[12px] font-bold leading-none text-white shadow-[inset_0_0_0_1px_rgba(176,211,225,.7)]">
                            {overlay.label}
                            <span className="absolute left-1/2 bottom-[-7px] z-10 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[7px] border-x-transparent border-t-[#86aebccc]" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
