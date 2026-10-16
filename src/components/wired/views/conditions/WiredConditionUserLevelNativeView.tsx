import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredSliderSection } from '../WiredSlider';
import { hasWiredAdvancedSources, WiredAdvancedSourceRow, WiredAdvancedSourceRows } from '../WiredAdvancedSourceRows';
import { WiredConditionBaseView } from './WiredConditionBaseView';

/**
 * AIR LevelMatches (`USER_LEVEL`, condition 44, build WIN63-202610131318-860371703): int params [level 1..30,
 * comparison 0 lower than, 1 equals, 2 higher than]. The advanced section is whatever the server lists: a users quantifier and
 * the users source.
 */

const USER_LEVEL_SOURCES: WiredAdvancedSourceRow[] = [{ kind: 'users', slot: 0 }];
const LEVEL_MIN = 1;
const LEVEL_MAX = 30;
const COMPARISON_OPTIONS = [0, 1, 2].map((id) => ({ id, label: LocalizeText(`wiredfurni.params.comparison.${id}`) }));

export const WiredConditionUserLevelNativeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [level, setLevel] = useState(LEVEL_MIN);
    const [comparison, setComparison] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        setLevel(Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, trigger.intData[0] ?? LEVEL_MIN)));
        setComparison(trigger.intData[1] === 1 || trigger.intData[1] === 2 ? trigger.intData[1] : 0);
    }, [trigger]);

    const save = () => setIntParams([level, comparison]);

    return (
        <WiredConditionBaseView hasSpecialInput={true} nativeLayout={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}
            footer={hasWiredAdvancedSources(trigger, USER_LEVEL_SOURCES) && <WiredAdvancedSourceRows rows={USER_LEVEL_SOURCES} />}>
            <WiredSliderSection
                max={LEVEL_MAX}
                min={LEVEL_MIN}
                titleKey="wiredfurni.params.level_selection"
                unit="level"
                value={level}
                onChange={setLevel}
            />
            <WiredSection title={LocalizeText('wiredfurni.params.comparison_selection')}>
                <WiredRadioGroup name="userLevelComparison" options={COMPARISON_OPTIONS} value={comparison} onChange={setComparison} />
            </WiredSection>
        </WiredConditionBaseView>
    );
};
