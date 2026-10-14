import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredDropdown } from '../WiredDropdown';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredCheckboxOption, WiredRadioGroup } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredConditionBaseView } from './WiredConditionBaseView';

type Range = { mode: number; exact: number; from: number; to: number };
const range = (enabled: number, from: number, to: number, fallback: number): Range => !enabled
    ? { mode: 0, exact: fallback, from: fallback, to: fallback }
    : from === to ? { mode: 1, exact: from, from: fallback, to: fallback } : { mode: 2, exact: fallback, from, to };
const wire = (value: Range, fallback: number): [number, number, number] => value.mode === 0 ? [0, fallback, fallback] : value.mode === 1 ? [1, value.exact, value.exact] : [1, value.from, value.to];
const L = (key: string) => LocalizeText(`wiredfurni.params.time.${key}`);

/** AIR ChronoRangeFilterPreset: three independent fields, with inactive drafts kept mounted. */
const ChronoRange: FC<{ name: string; min: number; max: number; value: Range; onChange: (next: Range) => void }> = ({ name, min, max, value, onChange }) => {
    const input = (field: 'exact' | 'from' | 'to') => <WiredNumberInput ariaLabel={`${L(`${name}_selection`)} ${field}`} min={min} max={max} width={name === 'year' ? 35 : 25} value={value[field]} onChange={next => onChange({ ...value, [field]: next })} />;
    return <WiredSection title={L(`${name}_selection`)}><WiredRadioGroup name={`chrono-${name}`} value={value.mode} onChange={mode => onChange({ ...value, mode })} options={[
        { id: 0, label: L('skip') },
        { id: 1, label: L('exact'), inlineExtra: input('exact') },
        { id: 2, label: L('range'), inlineExtra: <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{input('from')}<WiredText text="-" />{input('to')}</div> }
    ]} /></WiredSection>;
};
const ChronoMask: FC<{ name: string; count: number; columns: number; mask: number; onChange: (next: number) => void }> = ({ name, count, columns, mask, onChange }) => <WiredSection title={L(`${name}_selection`)}>
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, columnGap: 5 }}>{Array.from({ length: count }, (_, i) => <WiredCheckboxOption key={i} last={i >= count - columns} label={L(`${name}.${i + 1}`)} checked={!!(mask & (1 << i))} onChange={enabled => onChange(enabled ? mask | (1 << i) : mask & ~(1 << i))} />)}</div>
</WiredSection>;

/** DateMatches / TimeMatches / class_4206. The wire uses enabled/min/max, not the display radio ID. */
export const WiredChronoConditionView: FC<{ date: boolean }> = ({ date }) => {
    const { trigger, setIntParams, setStringParam } = useWired();
    const configured = GetConfigurationValue<string>('wired.timezones', '').split(',').map(zone => zone.trim()).filter(Boolean);
    const [timezone, setTimezone] = useState(configured[0] || 'UTC');
    const zones = [...new Set([timezone, ...(configured.length ? configured : ['UTC'])])];
    const [first, setFirst] = useState(() => range(0, 0, 0, date ? 1 : 0));
    const [second, setSecond] = useState(() => range(0, 0, 0, 0));
    const [third, setThird] = useState(() => range(0, 0, 0, 0));
    const [weekdays, setWeekdays] = useState(127);
    const [months, setMonths] = useState(4095);
    useEffect(() => {
        if (!trigger) return;
        const p = trigger.intData;
        setTimezone(trigger.stringData || configured[0] || 'UTC');
        if (date) {
            setFirst(range(p[0] ?? 0, p[3] ?? 1, p[4] ?? 1, 1));
            setSecond(range(p[1] ?? 0, p[6] ?? 0, p[7] ?? 0, 0));
            setWeekdays(p[2] ?? 127); setMonths(p[5] ?? 4095);
        } else {
            setFirst(range(p[2] ?? 0, p[7] ?? 0, p[8] ?? 0, 0));
            setSecond(range(p[1] ?? 0, p[5] ?? 0, p[6] ?? 0, 0));
            setThird(range(p[0] ?? 0, p[3] ?? 0, p[4] ?? 0, 0));
        }
    }, [date, trigger]);
    const save = () => {
        const a = wire(first, date ? 1 : 0), b = wire(second, 0), c = wire(third, 0);
        setIntParams(date ? [a[0], b[0], weekdays, a[1], a[2], months, b[1], b[2]] : [c[0], b[0], a[0], c[1], c[2], b[1], b[2], a[1], a[2]]);
        setStringParam(timezone);
    };
    return <WiredConditionBaseView nativeLayout hasSpecialInput requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
        {date ? <>
            <ChronoMask name="weekday" count={7} columns={2} mask={weekdays} onChange={setWeekdays} />
            <ChronoRange name="day" min={1} max={31} value={first} onChange={setFirst} />
            <ChronoMask name="month" count={12} columns={3} mask={months} onChange={setMonths} />
            <ChronoRange name="year" min={0} max={9999} value={second} onChange={setSecond} />
        </> : <>
            <ChronoRange name="hour" min={0} max={23} value={first} onChange={setFirst} />
            <ChronoRange name="minute" min={0} max={59} value={second} onChange={setSecond} />
            <ChronoRange name="second" min={0} max={59} value={third} onChange={setThird} />
        </>}
        {zones.length > 1 && <WiredSection title={L('timezone_selection')}><WiredDropdown caption={LocalizeText('wiredfurni.tooltip.timezone')} value={zones.indexOf(timezone)} options={zones.map((zone, id) => ({ id, label: zone }))} onChange={id => setTimezone(zones[id])} /></WiredSection>}
    </WiredConditionBaseView>;
};
