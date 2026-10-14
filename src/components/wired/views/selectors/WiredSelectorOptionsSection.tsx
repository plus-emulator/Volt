import { LocalizeText } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredCheckboxGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';

/** UserDefinedRoomEventsCtrl.createSelectorOptions: category flags, never owned int parameters. */
export const WiredSelectorOptionsSection = () => {
    const { filter = false, setFilter, inverse = false, setInverse } = useWired();
    return <WiredSection title={LocalizeText('wiredfurni.params.selector_options_selector')}>
        <WiredCheckboxGroup>
            <WiredCheckboxOption checked={filter} onChange={setFilter} label={LocalizeText('wiredfurni.params.selector_option.0')} />
            <WiredCheckboxOption checked={inverse} onChange={setInverse} label={LocalizeText('wiredfurni.params.selector_option.1')} last />
        </WiredCheckboxGroup>
    </WiredSection>;
};
