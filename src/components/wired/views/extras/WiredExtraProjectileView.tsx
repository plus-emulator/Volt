import { FC, PropsWithChildren, useEffect, useState } from 'react';
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
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { nativeSourceOptions, WiredMergedSourceSection, WiredSourcesSelector } from '../WiredSourcesSelector';
import { getWiredValueTargetCode, normalizeWiredValueTarget, WiredActionValueOrVariableSection } from '../actions/WiredActionValueOrVariableSection';
import { WIRED_VARIABLE_ABSENT, tokenOfVariableSlot, variableSlotOf } from '../../../../api';
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

interface ValueOrVariableProps {
    min: number;
    max: number;
    label: string;
    value: number;
    fromVariable: boolean;
    target: number;
    token: string;
    userSource: number;
    furniSource: number;
    /** The merged slot pair this section claims (mergedSelections [[1,0],[2,2]]). */
    furniSlot: number;
    userSlot: number;
    recentScope: string;
    onValue: (value: number) => void;
    onFromVariable: (fromVariable: boolean) => void;
    onTarget: (target: number) => void;
    onToken: (token: string) => void;
    onUserSource: (source: number) => void;
    onFurniSource: (source: number) => void;
    onValidityChange?: (valid: boolean) => void;
}

/**
 * The time per tile and the distance: AIR class_3959.as:133-136 builds both as value-or-variable sections (ids 1 and 0) that claim
 * merged slots 1 and 0 ([[1,0],[2,2]], L279), so the variable holder's source row sits in each section's popup (ValueOrVariablePopupPreset
 * attachInputSource L156-181), with the furni/user/room/context type selector in the popup's "Variables:" header.
 */
const ValueOrVariable: FC<ValueOrVariableProps> = (props) => {
    const targetKey = normalizeWiredValueTarget(props.target);

    return (
        <WiredActionValueOrVariableSection
            title={props.label}
            targetTitle={LocalizeText('wiredfurni.params.variables.reference_value.target')}
            recentScope={props.recentScope}
            min={props.min}
            max={props.max}
            option={props.fromVariable ? 1 : 0}
            onOptionChange={(option) => props.onFromVariable(option === 1)}
            literal={props.value}
            onLiteralChange={props.onValue}
            target={targetKey}
            onTargetChange={(target) => props.onTarget(getWiredValueTargetCode(target))}
            variableToken={props.token}
            onVariableTokenChange={props.onToken}
            onValidityChange={props.onValidityChange}
            popupSources={<WiredMergedSourceSection bare scope={targetKey} title="wiredfurni.params.sources.merged.title.variables" furniSlot={props.furniSlot} userSlot={props.userSlot}
                furniSource={props.furniSource} userSource={props.userSource} onChangeFurni={props.onFurniSource} onChangeUsers={props.onUserSource} />}
        />
    );
};

export const WiredExtraProjectileView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setVariableIds = null, setUserSources = null, setFurniSources = null, furniIds = [] } = useWired();
    const [timeValid, setTimeValid] = useState(true);
    const [distanceValid, setDistanceValid] = useState(true);
    const [params, setParams] = useState<number[]>(defaultProjectileParams);
    const [curved, setCurved] = useState(false);
    const [timeToken, setTimeToken] = useState('');
    const [distanceToken, setDistanceToken] = useState('');
    const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(INITIALLY_OPEN);
    // "The projectile:" is furni selection 0 (class_3959.as:243); the server's default for it is the stack's moved furni.
    const [projectileSource, setProjectileSource] = useState(901);

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
        setProjectileSource(trigger.furniSources[0] ?? trigger.inputSources?.furniDefaults[0] ?? 901);
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
        setFurniSources([projectileSource, params[PROJECTILE_PARAM_TIME_FURNI_SOURCE], params[PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE]]);
        setStringParam('');
        setVariableIds([timeFromVariable ? variableSlotOf(timeToken) : WIRED_VARIABLE_ABSENT, distanceFromVariable ? variableSlotOf(distanceToken) : WIRED_VARIABLE_ABSENT]);
    };

    // AIR's advanced settings (UserDefinedRoomEventsCtrl.createAdvancedSections): the unmerged furni selection 0 "The projectile:" and
    // user selection 1 "The shooter:"; the shooter row is greyed unless the projectile rotates and changes the shooter's direction
    // (class_3959.as:262-275). forceHidePickFurniInstructions drops the picks section and puts the pick count in the label instead.
    const advanced = (
        <>
            <WiredFurniSelectionSourceRow
                title="wiredfurni.params.sources.furni.title.projectile"
                options={nativeSourceOptions(trigger?.inputSources?.furniAllowed[0] ?? [0, 100, 200, 201, 901], 'furni')}
                value={projectileSource}
                onChange={setProjectileSource}
                selectionKind="primary"
                selectionActive={true}
                selectionCount={furniIds.length}
                selectionLimit={trigger?.maximumItemSelectionCount ?? 0}
                selectionEnabledValues={[100]}
                showSelectionToggle={false}
            />
            <WiredSourcesSelector
                showUsers={true}
                userSlot={1}
                usersTitle="wiredfurni.params.sources.users.title.shooter"
                userSource={params[PROJECTILE_PARAM_SHOOTER_SOURCE]}
                rowDisabled={!rotates || !changesShooter}
                onChangeUsers={(value) => setParam(PROJECTILE_PARAM_SHOOTER_SOURCE, value)}
            />
        </>
    );

    return (
        <WiredExtraBaseView
            footer={advanced}
            hasSpecialInput={true}
            nativeLayout={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            showSelection={false}
            validate={() => !(scalesTime && (!timeValid || (timeFromVariable && !timeToken))) && !(distanceMode !== PROJECTILE_DISTANCE_NORMAL && (!distanceValid || (distanceFromVariable && !distanceToken)))}
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
                                recentScope="projectile-distance"
                                furniSlot={2}
                                userSlot={2}
                                target={params[PROJECTILE_PARAM_DISTANCE_TARGET]}
                                token={distanceToken}
                                userSource={params[PROJECTILE_PARAM_DISTANCE_USER_SOURCE]}
                                value={params[PROJECTILE_PARAM_DISTANCE_TILES]}
                                onFromVariable={(fromVariable) => setFlag(PROJECTILE_PARAM_DISTANCE_IS_VARIABLE, fromVariable)}
                                onFurniSource={(source) => setParam(PROJECTILE_PARAM_DISTANCE_FURNI_SOURCE, source)}
                                onTarget={(target) => setParam(PROJECTILE_PARAM_DISTANCE_TARGET, target)}
                                onToken={setDistanceToken}
                                onValidityChange={setDistanceValid}
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
                                recentScope="projectile-time"
                                furniSlot={1}
                                userSlot={0}
                                target={params[PROJECTILE_PARAM_TIME_TARGET]}
                                token={timeToken}
                                userSource={params[PROJECTILE_PARAM_TIME_USER_SOURCE]}
                                value={params[PROJECTILE_PARAM_TIME_PER_TILE]}
                                onFromVariable={(fromVariable) => setFlag(PROJECTILE_PARAM_TIME_IS_VARIABLE, fromVariable)}
                                onFurniSource={(source) => setParam(PROJECTILE_PARAM_TIME_FURNI_SOURCE, source)}
                                onTarget={(target) => setParam(PROJECTILE_PARAM_TIME_TARGET, target)}
                                onToken={setTimeToken}
                                onValidityChange={setTimeValid}
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
