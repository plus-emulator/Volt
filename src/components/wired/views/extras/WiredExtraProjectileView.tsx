import { FC, PropsWithChildren, useEffect, useMemo, useState } from 'react';
import {
    clampProjectileParam,
    defaultProjectileParams,
    isProjectileVariableEnabled,
    LocalizeText,
    localizeWithFallback,
    normalizeProjectileParams,
    PROJECTILE_DISTANCE_FIXED,
    PROJECTILE_DISTANCE_NORMAL,
    PROJECTILE_DISTANCE_OVERSHOOT,
    PROJECTILE_INTERNAL_VARIABLES,
    PROJECTILE_PARAM_BUNNY_HOP,
    PROJECTILE_PARAM_CHANGE_SHOOTER_DIRECTION,
    PROJECTILE_PARAM_CURVE_STRENGTH,
    PROJECTILE_PARAM_DIRECTIONAL_SYSTEM,
    PROJECTILE_PARAM_DISTANCE_BY_HEIGHT,
    PROJECTILE_PARAM_DISTANCE_BY_X,
    PROJECTILE_PARAM_DISTANCE_BY_Y,
    PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE,
    PROJECTILE_PARAM_DISTANCE_IS_VARIABLE,
    PROJECTILE_PARAM_DISTANCE_MODE,
    PROJECTILE_PARAM_DISTANCE_TARGET,
    PROJECTILE_PARAM_DISTANCE_TILES,
    PROJECTILE_PARAM_DISTANCE_USER_SOURCE,
    PROJECTILE_PARAM_INTERNAL_VARIABLES,
    PROJECTILE_PARAM_ROTATE,
    PROJECTILE_PARAM_ROTATION_OFFSET,
    PROJECTILE_PARAM_SCALE_TIME_WITH_DISTANCE,
    PROJECTILE_PARAM_SHOOTER_SOURCE,
    PROJECTILE_PARAM_SPEED_INCREASE,
    PROJECTILE_PARAM_TIME_FURNI_SOURCE,
    PROJECTILE_PARAM_TIME_IS_VARIABLE,
    PROJECTILE_PARAM_TIME_PER_TILE,
    PROJECTILE_PARAM_TIME_TARGET,
    PROJECTILE_PARAM_COUNT,
    PROJECTILE_PARAM_TIME_USER_SOURCE,
    toggleProjectileVariable,
    WiredFurniType
} from '../../../../api';
import { Text } from '../../../../common';
import { WiredSlider } from '../WiredSlider';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredRadioGroup, WiredCheckboxOption } from '../WiredOptions';
import { WiredSection } from '../WiredSection';
import { WiredText } from '../WiredText';
import { WiredDropdown } from '../WiredDropdown';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectorView } from '../WiredFurniSelectorView';
import { nativeSourceOptions, WiredSourceOption } from '../WiredSourcesSelector';
import { WiredVariablePicker } from '../WiredVariablePicker';
import { buildWiredVariablePickerEntries, createFallbackVariableEntry, flattenWiredVariablePickerEntries, WiredVariablePickerTarget } from '../WiredVariablePickerData';
import { WIRED_VARIABLE_ABSENT, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
import { useWiredNativeVariables } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { WiredProjectileDirectionGrid } from './WiredProjectileDirectionGrid';

const DIRECTIONAL_SYSTEMS: Array<{ fallback: string; value: number }> = [
    { fallback: '8 directions, straight', value: 0 },
    { fallback: '8 directions, diffuse', value: 1 },
    { fallback: '4 directions, prefer vertical', value: 2 },
    { fallback: '4 directions, prefer horizontal', value: 3 }
];

const DISTANCE_MODES: Array<{ fallback: string; key: string; value: number }> = [
    { fallback: 'Fly to the target', key: 'normal', value: PROJECTILE_DISTANCE_NORMAL },
    { fallback: 'Fly past the target', key: 'overshoot', value: PROJECTILE_DISTANCE_OVERSHOOT },
    { fallback: 'Always fly the same distance', key: 'fixed', value: PROJECTILE_DISTANCE_FIXED }
];

const DISTANCE_AXES: Array<{ fallback: string; key: string; param: number }> = [
    { fallback: 'X', key: 'x', param: PROJECTILE_PARAM_DISTANCE_BY_X },
    { fallback: 'Y', key: 'y', param: PROJECTILE_PARAM_DISTANCE_BY_Y },
    { fallback: 'Height', key: 'height', param: PROJECTILE_PARAM_DISTANCE_BY_HEIGHT }
];

/** Native merged variable target codes. */
const VARIABLE_TARGETS: Array<{ key: WiredVariablePickerTarget; value: number; fallback: string }> = [
    { key: 'furni', value: 0, fallback: 'Furni' },
    { key: 'user', value: 1, fallback: 'User' },
    { key: 'global', value: -10, fallback: 'Global' },
    { key: 'context', value: -20, fallback: 'Context' }
];

type SectionKey = 'info' | 'direction' | 'trajectory' | 'time' | 'rotation' | 'variables';

const INITIALLY_OPEN: Record<SectionKey, boolean> = {
    info: true,
    direction: true,
    trajectory: false,
    time: false,
    rotation: false,
    variables: false
};

const text = (key: string, fallback: string, parameters: string[] = null, replacements: string[] = null) =>
    localizeWithFallback(`wiredfurni.params.projectile.${key}`, fallback, parameters, replacements);

const targetKeyOf = (value: number): WiredVariablePickerTarget => VARIABLE_TARGETS.find((target) => target.value === value)?.key ?? 'user';

const ProjectileSection: FC<PropsWithChildren<{ title: string; open: boolean; first?: boolean; onToggle: () => void }>> = (props) => {
    const { title, open, onToggle, children } = props;

    return (
        <WiredSection className="volt-wired__collapsible-section" title={
            <button aria-expanded={open} className="volt-wired__section-toggle" type="button" onClick={onToggle}>
                <span className={open ? 'is-expanded' : ''} aria-hidden="true" />
                <WiredText bold text={title} />
            </button>
        }>
            {open && <div className="flex flex-col gap-2">{children}</div>}
        </WiredSection>
    );
};

const Checkbox = WiredCheckboxOption;

const NumberField: FC<{ disabled?: boolean; label: string; value: number; onChange: (value: number) => void }> = ({ disabled = false, label, value, onChange }) => (
    <label className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-50' : ''}`}>
        <Text small>{label}</Text>
        <WiredNumberInput disabled={disabled} min={0} max={100000} value={value} onChange={onChange} />
    </label>
);

const SourceSelect: FC<{ label: string; options: WiredSourceOption[]; value: number; disabled?: boolean; onChange: (value: number) => void }> = ({ label, options, value, disabled = false, onChange }) => (
    <label className="flex items-center justify-between gap-2">
        <Text small>{label}</Text>
        <WiredDropdown caption={label} disabled={disabled} value={value} onChange={onChange} options={options.map((option) => ({ id: option.value, label: LocalizeText(option.label) }))} />
    </label>
);

interface ValueOrVariableProps {
    min: number;
    max: number;
    name: string;
    label: string;
    value: number;
    fromVariable: boolean;
    target: number;
    token: string;
    userSource: number;
    furniSource: number;
    userSources: WiredSourceOption[];
    furniSources: WiredSourceOption[];
    onValue: (value: number) => void;
    onFromVariable: (fromVariable: boolean) => void;
    onTarget: (target: number) => void;
    onToken: (token: string) => void;
    onUserSource: (source: number) => void;
    onFurniSource: (source: number) => void;
}

/** Habbo's "set value / from variable" pair, as the time per tile and the distance use it. */
const ValueOrVariable: FC<ValueOrVariableProps> = (props) => {
    const { name, label, value, fromVariable, target, token, userSource, furniSource, userSources } = props;
    const { userVariableDefinitions = [], furniVariableDefinitions = [], roomVariableDefinitions = [], contextVariableDefinitions = [] } = useWiredNativeVariables();
    const targetKey = targetKeyOf(target);

    const entries = useMemo(() => {
        const definitions =
            targetKey === 'furni'
                ? furniVariableDefinitions
                : targetKey === 'global'
                  ? roomVariableDefinitions
                  : targetKey === 'context'
                    ? contextVariableDefinitions
                    : userVariableDefinitions;
        const built = buildWiredVariablePickerEntries(targetKey, 'change-reference', definitions);

        if (!token || flattenWiredVariablePickerEntries(built).some((entry) => entry.token === token)) return built;

        const fallback = createFallbackVariableEntry(targetKey, token);

        return fallback ? [fallback, ...built] : built;
    }, [contextVariableDefinitions, furniVariableDefinitions, roomVariableDefinitions, targetKey, token, userVariableDefinitions]);

    return (
        <div className="flex flex-col gap-1">
            <WiredRadioGroup name={name} value={fromVariable ? 1 : 0} onChange={(value) => props.onFromVariable(value === 1)} options={[
                { id: 0, label, extra: <WiredNumberInput min={props.min} max={props.max} disabled={fromVariable} value={value} onChange={props.onValue} /> },
                { id: 1, label: LocalizeText('wiredfurni.params.variables.reference_value.from_variable') }
            ]} />
            {fromVariable && (
                <div className="flex flex-col gap-1 volt-wired__projectile-indent">
                    <WiredDropdown caption={`${label} variable type`} value={target} options={VARIABLE_TARGETS.map((option) => ({ id: option.value, label: text(`variable_target.${option.key}`, option.fallback) }))} onChange={(value) => { props.onTarget(value); props.onToken(''); }} />
                    <WiredVariablePicker entries={entries} recentScope="projectile-reference" selectedToken={token} onSelect={(entry) => props.onToken(entry.token)} />
                    {targetKey === 'user' && (
                        <SourceSelect label={text('variable_source', 'Read it from:')} options={userSources} value={userSource} onChange={props.onUserSource} />
                    )}
                    {targetKey === 'furni' && (
                        <SourceSelect label={text('variable_source', 'Read it from:')} options={props.furniSources} value={furniSource} onChange={props.onFurniSource} />
                    )}
                </div>
            )}
        </div>
    );
};

export const WiredExtraProjectileView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setUserSources = null, setFurniSources = null } = useWired();
    const [params, setParams] = useState<number[]>(defaultProjectileParams);
    const [curved, setCurved] = useState(false);
    const [timeToken, setTimeToken] = useState('');
    const [distanceToken, setDistanceToken] = useState('');
    const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(INITIALLY_OPEN);
    const userSources = nativeSourceOptions(trigger?.inputSources?.usersAllowed[1], 'users');

    useEffect(() => {
        if (!trigger) return;

        // variableIds: [0] the time variable, [1] the distance variable; an empty entry is "not from a variable".
        // The first 19 ints are the card's params; the five sources are the U and F tails (time user U0, shooter U1,
        // distance user U2; time furni F1, distance furni F2), read back into the same slots the form edits.
        const nextParams = normalizeProjectileParams(trigger.intData);

        nextParams[PROJECTILE_PARAM_TIME_USER_SOURCE] = trigger.userSources[0] ?? 0;
        nextParams[PROJECTILE_PARAM_SHOOTER_SOURCE] = trigger.userSources[1] ?? 0;
        nextParams[PROJECTILE_PARAM_DISTANCE_USER_SOURCE] = trigger.userSources[2] ?? 0;
        nextParams[PROJECTILE_PARAM_TIME_FURNI_SOURCE] = trigger.furniSources[1] ?? trigger.inputSources?.furniDefaults[1] ?? 0;
        nextParams[PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE] = trigger.furniSources[2] ?? 0;
        setParams(nextParams);
        setCurved(nextParams[PROJECTILE_PARAM_CURVE_STRENGTH] !== 0);
        setTimeToken(tokenOfVariableSlot(trigger.variableIds[0]));
        setDistanceToken(tokenOfVariableSlot(trigger.variableIds[1]));
    }, [trigger]);

    const setParam = (index: number, value: number) =>
        setParams((current) => current.map((entry, position) => (position === index ? clampProjectileParam(index, value) : entry)));
    const setFlag = (index: number, checked: boolean) => setParam(index, checked ? 1 : 0);
    const toggleSection = (key: SectionKey) => setOpenSections((current) => ({ ...current, [key]: !current[key] }));

    const rotates = params[PROJECTILE_PARAM_ROTATE] === 1;
    const changesShooter = params[PROJECTILE_PARAM_CHANGE_SHOOTER_DIRECTION] === 1;
    const scalesTime = params[PROJECTILE_PARAM_SCALE_TIME_WITH_DISTANCE] === 1;
    const distanceMode = params[PROJECTILE_PARAM_DISTANCE_MODE];
    const rotationOffset = params[PROJECTILE_PARAM_ROTATION_OFFSET];
    const variablesMask = params[PROJECTILE_PARAM_INTERNAL_VARIABLES];
    const timeFromVariable = params[PROJECTILE_PARAM_TIME_IS_VARIABLE] === 1;
    const distanceFromVariable = params[PROJECTILE_PARAM_DISTANCE_IS_VARIABLE] === 1;

    const save = () => {
        const savedParams = normalizeProjectileParams(params).slice(0, PROJECTILE_PARAM_COUNT);
        savedParams[PROJECTILE_PARAM_CURVE_STRENGTH] = curved ? params[PROJECTILE_PARAM_CURVE_STRENGTH] : 0;
        setIntParams(savedParams);
        setUserSources([params[PROJECTILE_PARAM_TIME_USER_SOURCE], params[PROJECTILE_PARAM_SHOOTER_SOURCE], params[PROJECTILE_PARAM_DISTANCE_USER_SOURCE]]);
        setFurniSources([100, params[PROJECTILE_PARAM_TIME_FURNI_SOURCE], params[PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE]]);
        setStringParam('');
        setVariableIds([timeFromVariable ? variableSlotOf(timeToken) : WIRED_VARIABLE_ABSENT, distanceFromVariable ? variableSlotOf(distanceToken) : WIRED_VARIABLE_ABSENT]);
    };

    return (
        <WiredExtraBaseView
            footer={<WiredFurniSelectorView />}
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            showSelection={false}
            validate={() => !(scalesTime && timeFromVariable && !timeToken) && !(distanceMode !== PROJECTILE_DISTANCE_NORMAL && distanceFromVariable && !distanceToken)}
        >
            <>
                <ProjectileSection first open={openSections.info} title={LocalizeText('wiredfurni.params.general_box_info')} onToggle={() => toggleSection('info')}>
                    <Text small>
                        {text(
                            'usage_info',
                            'This box is meant for projectile furni. Use it to add extra features to a projectile that is already being moved by Wired.'
                        )}
                    </Text>
                </ProjectileSection>

                <ProjectileSection open={openSections.direction} title={text('direction', 'Projectile direction:')} onToggle={() => toggleSection('direction')}>
                    <Checkbox
                        checked={rotates}
                        label={text('new_direction_enabled', 'Rotate the projectile in the moving direction')}
                        onChange={(checked) => setFlag(PROJECTILE_PARAM_ROTATE, checked)}
                    />
                    <div className="flex flex-col gap-1">
                        <Text small>{text('directional_system', 'System:')}</Text>
                        <WiredDropdown caption={text('directional_system', 'System:')} disabled={!rotates} value={params[PROJECTILE_PARAM_DIRECTIONAL_SYSTEM]} options={DIRECTIONAL_SYSTEMS.map((system) => ({ id: system.value, label: text(`directional_system.${system.value}`, system.fallback) }))} onChange={(value) => setParam(PROJECTILE_PARAM_DIRECTIONAL_SYSTEM, value)} />
                    </div>
                    <WiredProjectileDirectionGrid disabled={!rotates} system={params[PROJECTILE_PARAM_DIRECTIONAL_SYSTEM]} />
                    <Checkbox
                        checked={changesShooter}
                        disabled={!rotates}
                        label={text('change_shooter_direction', "Visually change the shooter's direction")}
                        onChange={(checked) => setFlag(PROJECTILE_PARAM_CHANGE_SHOOTER_DIRECTION, checked)}
                    />
                    <div className="flex flex-col gap-1 volt-wired__projectile-indent">
                        <Checkbox
                            checked={params[PROJECTILE_PARAM_BUNNY_HOP] === 1}
                            disabled={!rotates || !changesShooter}
                            label={text('bunny_hop', 'Do a little hop when shooting sideways')}
                            onChange={(checked) => setFlag(PROJECTILE_PARAM_BUNNY_HOP, checked)}
                        />
                        {changesShooter && (
                            <SourceSelect
                                label={text('shooter.source', 'Shooter:')}
                                disabled={!rotates}
                                options={userSources}
                                value={params[PROJECTILE_PARAM_SHOOTER_SOURCE]}
                                onChange={(value) => setParam(PROJECTILE_PARAM_SHOOTER_SOURCE, value)}
                            />
                        )}
                    </div>
                </ProjectileSection>

                <ProjectileSection open={openSections.trajectory} title={text('animation_trajectory', 'Animation trajectory:')} onToggle={() => toggleSection('trajectory')}>
                    <WiredSection title={text('animation_trajectory.trajectory', 'Trajectory:')}>
                        <WiredRadioGroup name="projectileTrajectory" value={curved ? 1 : 0} onChange={(value) => setCurved(value === 1)} options={[
                            { id: 0, label: text('animation_trajectory.trajectory.0', 'Straight'), extra: <WiredText wrap text={text('animation_trajectory.trajectory.0.info', 'Move directly towards the target.')} /> },
                            { id: 1, label: text('animation_trajectory.trajectory.1', 'Curved'), extra: (
                                <label className="flex items-center justify-between gap-2">
                                    <WiredText text={text('animation_trajectory.trajectory.1.extra', 'Curve strength:')} />
                                    <WiredNumberInput min={-1000} max={1000} value={params[PROJECTILE_PARAM_CURVE_STRENGTH]} disabled={!curved} onChange={(value) => setParam(PROJECTILE_PARAM_CURVE_STRENGTH, value)} />
                                </label>
                            ) }
                        ]} />
                    </WiredSection>
                    <WiredSection title={text('animation_trajectory.distance', 'Distance:')}>
                        <WiredRadioGroup name="projectileDistanceMode" value={distanceMode} onChange={(value) => setParam(PROJECTILE_PARAM_DISTANCE_MODE, value)} options={DISTANCE_MODES.map((mode) => ({ id: mode.value, label: text(`animation_trajectory.distance.${mode.value}`, mode.fallback) }))} />
                    </WiredSection>
                    {distanceMode !== PROJECTILE_DISTANCE_NORMAL && (
                        <div className="volt-wired__projectile-indent">
                            <ValueOrVariable
                                min={-64} max={64}
                                fromVariable={distanceFromVariable}
                                furniSource={params[PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE]}
                                label={text('distance.tiles', 'Tiles:')}
                                name="projectileDistanceValue"
                                target={params[PROJECTILE_PARAM_DISTANCE_TARGET]}
                                token={distanceToken}
                                userSource={params[PROJECTILE_PARAM_DISTANCE_USER_SOURCE]}
                                userSources={nativeSourceOptions(trigger?.inputSources?.usersAllowed[2], 'users')}
                                furniSources={nativeSourceOptions(trigger?.inputSources?.furniAllowed[2], 'furni')}
                                value={params[PROJECTILE_PARAM_DISTANCE_TILES]}
                                onFromVariable={(fromVariable) => setFlag(PROJECTILE_PARAM_DISTANCE_IS_VARIABLE, fromVariable)}
                                onFurniSource={(source) => setParam(PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE, source)}
                                onTarget={(target) => setParam(PROJECTILE_PARAM_DISTANCE_TARGET, target)}
                                onToken={setDistanceToken}
                                onUserSource={(source) => setParam(PROJECTILE_PARAM_DISTANCE_USER_SOURCE, source)}
                                onValue={(value) => setParam(PROJECTILE_PARAM_DISTANCE_TILES, value)}
                            />
                        </div>
                    )}
                </ProjectileSection>

                <ProjectileSection open={openSections.time} title={text('animation_time', 'Animation time:')} onToggle={() => toggleSection('time')}>
                    <Checkbox
                        checked={scalesTime}
                        label={text('override_animation_time', 'Scale the animation time with the distance')}
                        onChange={(checked) => setFlag(PROJECTILE_PARAM_SCALE_TIME_WITH_DISTANCE, checked)}
                    />
                    {scalesTime && (
                        <>
                            <ValueOrVariable
                                min={1} max={100000}
                                fromVariable={timeFromVariable}
                                furniSource={params[PROJECTILE_PARAM_TIME_FURNI_SOURCE]}
                                label={text('time_per_tile', 'Time per tile (ms):')}
                                name="projectileTimeValue"
                                target={params[PROJECTILE_PARAM_TIME_TARGET]}
                                token={timeToken}
                                userSource={params[PROJECTILE_PARAM_TIME_USER_SOURCE]}
                                userSources={nativeSourceOptions(trigger?.inputSources?.usersAllowed[0], 'users')}
                                furniSources={nativeSourceOptions(trigger?.inputSources?.furniAllowed[1], 'furni')}
                                value={params[PROJECTILE_PARAM_TIME_PER_TILE]}
                                onFromVariable={(fromVariable) => setFlag(PROJECTILE_PARAM_TIME_IS_VARIABLE, fromVariable)}
                                onFurniSource={(source) => setParam(PROJECTILE_PARAM_TIME_FURNI_SOURCE, source)}
                                onTarget={(target) => setParam(PROJECTILE_PARAM_TIME_TARGET, target)}
                                onToken={setTimeToken}
                                onUserSource={(source) => setParam(PROJECTILE_PARAM_TIME_USER_SOURCE, source)}
                                onValue={(value) => setParam(PROJECTILE_PARAM_TIME_PER_TILE, value)}
                            />
                            <Text small>{text('distance_options', 'Measure the distance by:')}</Text>
                            <div className="flex items-center gap-3 volt-wired__projectile-indent">
                                {DISTANCE_AXES.map((axis) => (
                                    <Checkbox
                                        key={axis.key}
                                        checked={params[axis.param] === 1}
                                        label={text(`distance_${axis.key === 'height' ? 'z' : axis.key}`, axis.fallback)}
                                        onChange={(checked) => setFlag(axis.param, checked)}
                                    />
                                ))}
                            </div>
                            <NumberField
                                label={text('increase_speed', 'Speed increase (ms):')}
                                value={params[PROJECTILE_PARAM_SPEED_INCREASE]}
                                onChange={(value) => setParam(PROJECTILE_PARAM_SPEED_INCREASE, value)}
                            />
                        </>
                    )}
                </ProjectileSection>

                <ProjectileSection
                    open={openSections.rotation}
                    title={text('rotation_offset', 'Shift the rotation by %offset%', ['offset'], [String(rotationOffset)]).replace('%offset%', String(rotationOffset))}
                    onToggle={() => toggleSection('rotation')}
                >
                    <WiredSlider max={7} min={0} step={1} disabled={!rotates} value={rotationOffset} onChange={(value) => setParam(PROJECTILE_PARAM_ROTATION_OFFSET, value)} />
                </ProjectileSection>

                <ProjectileSection open={openSections.variables} title={text('projectile.variables', 'Projectile internal variables:')} onToggle={() => toggleSection('variables')}>
                    {PROJECTILE_INTERNAL_VARIABLES.map((variable, bit) => (
                        <Checkbox
                            key={variable}
                            checked={isProjectileVariableEnabled(variablesMask, bit)}
                            label={variable}
                            onChange={(checked) => setParam(PROJECTILE_PARAM_INTERNAL_VARIABLES, toggleProjectileVariable(variablesMask, bit, checked))}
                        />
                    ))}
                </ProjectileSection>
            </>
        </WiredExtraBaseView>
    );
};
