import { GetRoomEngine, RoomAreaSelectionManager } from '@volt/renderer';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredButtonRow } from '../WiredButtonRow';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';

/** AIR InArea (FurniInArea, UsersInArea): one area section with Select Area / Clear, the area kept as [x, y, width, height]. */
export const WiredSelectorInAreaView: FC<{}> = () =>
{
    const [rootX, setRootX] = useState(0);
    const [rootY, setRootY] = useState(0);
    const [areaWidth, setAreaWidth] = useState(0);
    const [areaHeight, setAreaHeight] = useState(0);
    // Both buttons need an activated area selection manager; Select Area stays disabled from the click until the drag (or Clear) reports an area.
    const [isAreaActive, setIsAreaActive] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    // True only while this window's own activate() succeeded: another selector's activation is never touched, cleared or deactivated from here.
    const ownsAreaSelection = useRef(false);
    const { trigger = null, setIntParams } = useWired();

    // Filter and inverse are category fields of the selector save, not owned ints.
    const save = useCallback(() => setIntParams([rootX, rootY, areaWidth, areaHeight]), [rootX, rootY, areaWidth, areaHeight, setIntParams]);

    useEffect(() =>
    {
        if(!trigger) return;

        // InArea.onAreaSelected: the manager reports the dragged area, and (0, 0, 0, 0) after Clear.
        const callback = (x: number, y: number, w: number, h: number) =>
        {
            setRootX(x);
            setRootY(y);
            setAreaWidth(w);
            setAreaHeight(h);
            setIsSelecting(false);
        };

        const manager = GetRoomEngine().areaSelectionManager;
        const activated = manager.activate(callback, RoomAreaSelectionManager.HIGHLIGHT_BRIGHTEN);
        const params = trigger.intData;

        ownsAreaSelection.current = activated;

        setRootX(params[0] ?? 0);
        setRootY(params[1] ?? 0);
        setAreaWidth(params[2] ?? 0);
        setAreaHeight(params[3] ?? 0);

        // InArea.onEditStart highlights the saved area whatever its size; an empty area draws nothing.
        if(activated) manager.setHighlight(params[0] ?? 0, params[1] ?? 0, params[2] ?? 0, params[3] ?? 0);

        setIsAreaActive(activated);
        setIsSelecting(false);

        return () =>
        {
            if(ownsAreaSelection.current) GetRoomEngine().areaSelectionManager.deactivate();

            ownsAreaSelection.current = false;
        };
    }, [trigger]);

    const selectArea = () =>
    {
        // InArea.onSelect runs only from an enabled button: an owned manager that is idle.
        if(!ownsAreaSelection.current || GetRoomEngine().areaSelectionManager.areaSelectionState !== RoomAreaSelectionManager.NOT_SELECTING_AREA) return;

        setIsSelecting(true);
        GetRoomEngine().areaSelectionManager.startSelecting();
    };

    // InArea.onClear: clearHighlight reports (0, 0, 0, 0) through the callback.
    const clearArea = () =>
    {
        if(ownsAreaSelection.current) GetRoomEngine().areaSelectionManager.clearHighlight();
    };

    return (
        <WiredSelectorBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={0} save={save} hideDelay={true}>
            <WiredSection title={LocalizeText('wiredfurni.params.area_selection')}>
                <WiredText soft={true} wrap={true} text={LocalizeText('wiredfurni.params.area_selection.info')} />
                <WiredButtonRow
                    buttons={[
                        { id: 'select', label: LocalizeText('wiredfurni.params.area_selection.select'), disabled: !isAreaActive || isSelecting, onClick: selectArea },
                        { id: 'clear', label: LocalizeText('wiredfurni.params.area_selection.clear'), disabled: !isAreaActive, onClick: clearArea }
                    ]}
                />
            </WiredSection>
            <WiredSelectorOptionsSection />
        </WiredSelectorBaseView>
    );
};
