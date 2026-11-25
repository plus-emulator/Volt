import {
    AddLinkEventTracker,
    convertNumbersForSaving,
    convertSettingToNumber,
    FloorHeightMapEvent,
    GetOccupiedTilesMessageComposer,
    GetRoomEntryTileMessageComposer,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomEntryTileMessageEvent,
    RoomOccupiedTilesMessageEvent,
    RoomVisualizationSettingsEvent,
    UpdateFloorPropertiesMessageComposer
} from '@volt/renderer';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { GetLocalStorage, LocalizeText, SendMessageComposer, SetLocalStorage, useVoltLayout } from '../../api';
import { Base, VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../common';
import { useMessageEvent, useVoltEvent } from '../../hooks';
import { useFloorplanLiveSync } from '../../hooks/rooms/widgets/useFloorplanLiveSync';
import { airHeightHex } from './air/airHeightColor';
import { useFloorplanReducer } from './hooks/useFloorplanReducer';
import { MAX_WALL_HEIGHT, MIN_WALL_HEIGHT } from './state/constants';
import { serializeTilemap } from './state/encoding';
import { localizeOr } from './state/localize';
import { areaCount } from './state/selectors';
import { EntryDir, ThicknessLevel } from './state/types';
import { Floorplan3DView } from './views/Floorplan3DView';
import { FloorplanCanvasSVG } from './views/FloorplanCanvasSVG';
import { FloorplanHeightPicker } from './views/FloorplanHeightPicker';
import { FloorplanImportExport } from './views/FloorplanImportExport';
import { FloorplanOptionsPanel } from './views/FloorplanOptionsPanel';
import { FloorplanPreviewSVG } from './views/FloorplanPreviewSVG';
import { FloorplanToolbar } from './views/FloorplanToolbar';
import { FloorplanWallHeightSlider } from './views/FloorplanWallHeightSlider';

export type FloorplanEditorExternalSession = {
    tilemap: string;
    occupiedTiles?: boolean[][];
    title?: string;
    onClose: () => void;
    onSave: (tilemap: string) => void;
};

type Props = {
    externalSession?: FloorplanEditorExternalSession;
};

export const PREVIEW_3D_STORAGE_KEY = 'volt.floorplan.preview3d';

const readPreview3dPreference = (): boolean => {
    try {
        return GetLocalStorage<boolean>(PREVIEW_3D_STORAGE_KEY) === true;
    } catch {
        return false;
    }
};

const clampThickness = (v: number): ThicknessLevel => {
    if (v <= 0) return 0;
    if (v >= 3) return 3;
    return (v | 0) as ThicknessLevel;
};

export const FloorplanEditorLegacyView: FC<Props> = ({ externalSession }) => {
    const isTouch = useVoltLayout() !== 'desktop';
    const [roomVisible, setRoomVisible] = useState(false);
    const [importExportVisible, setImportExportVisible] = useState(false);
    const [liveSync, setLiveSync] = useState(true);
    const [panMode, setPanMode] = useState(false);
    const [touchView, setTouchView] = useState<'map' | 'preview'>('map');
    const [autoPickup, setAutoPickup] = useState(false);
    const [preview3d, setPreview3d] = useState(readPreview3dPreference);
    const { state, dispatch, loadFromServer, undo, redo, canUndo, canRedo } = useFloorplanReducer();
    const isExternal = !!externalSession;
    const isVisible = isExternal || roomVisible;
    const originalRef = useRef<{
        tilemap: string;
        entryPoint: [number, number];
        entryPointDir: number;
        thicknessWall: ThicknessLevel;
        thicknessFloor: ThicknessLevel;
        wallHeight: number;
    } | null>(null);

    const area = useMemo(() => areaCount(state.tiles), [state.tiles]);

    const { setBaseline, mergeBaseline, revert: revertLivePreview } = useFloorplanLiveSync({ enabled: !isExternal && liveSync && isVisible, state });

    useVoltEvent<RoomEngineEvent>(RoomEngineEvent.DISPOSED, () => {
        if (!isExternal) setRoomVisible(false);
    });

    useEffect(() => {
        if (!externalSession) return;

        const rows = externalSession.tilemap.split(/\r\n|\r|\n/).filter((row) => row.length > 0);
        let entryPoint: [number, number] = [0, 0];
        outer: for (let y = 0; y < rows.length; y++) {
            for (let x = 0; x < rows[y].length; x++) {
                if (rows[y].charAt(x).toLowerCase() === 'x') continue;
                entryPoint = [x, y];
                break outer;
            }
        }

        const settings = {
            tilemap: externalSession.tilemap,
            entryPoint,
            entryPointDir: 2,
            thicknessWall: 1 as ThicknessLevel,
            thicknessFloor: 1 as ThicknessLevel,
            wallHeight: MIN_WALL_HEIGHT
        };
        originalRef.current = settings;
        loadFromServer(settings);
        if (externalSession.occupiedTiles) dispatch({ type: 'SET_OCCUPIED_TILES', map: externalSession.occupiedTiles });
    }, [dispatch, externalSession?.occupiedTiles, externalSession?.tilemap, loadFromServer]);

    useEffect(() => {
        if (!isVisible || isExternal) return;
        SendMessageComposer(new GetRoomEntryTileMessageComposer());
        SendMessageComposer(new GetOccupiedTilesMessageComposer());
    }, [isExternal, isVisible]);

    useMessageEvent<RoomOccupiedTilesMessageEvent>(RoomOccupiedTilesMessageEvent, (event) => {
        if (isExternal) return;
        dispatch({ type: 'SET_OCCUPIED_TILES', map: event.getParser().blockedTilesMap });
    });

    useMessageEvent<RoomEntryTileMessageEvent>(RoomEntryTileMessageEvent, (event) => {
        if (isExternal) return;
        const parser = event.getParser();
        originalRef.current = {
            tilemap: originalRef.current?.tilemap ?? '',
            entryPoint: [parser.x, parser.y],
            entryPointDir: parser.direction,
            thicknessWall: originalRef.current?.thicknessWall ?? 1,
            thicknessFloor: originalRef.current?.thicknessFloor ?? 1,
            wallHeight: originalRef.current?.wallHeight ?? -1
        };
        dispatch({ type: 'SET_DOOR', x: parser.x, y: parser.y, source: 'remote' });
        dispatch({ type: 'SET_DOOR_DIR', dir: ((parser.direction | 0) & 7) as EntryDir, source: 'remote' });
        mergeBaseline({ doorX: parser.x, doorY: parser.y, doorDir: (parser.direction | 0) & 7 });
    });

    useMessageEvent<FloorHeightMapEvent>(FloorHeightMapEvent, (event) => {
        if (isExternal) return;
        const parser = event.getParser();
        originalRef.current = {
            tilemap: parser.model,
            entryPoint: originalRef.current?.entryPoint ?? [0, 0],
            entryPointDir: originalRef.current?.entryPointDir ?? 2,
            thicknessWall: originalRef.current?.thicknessWall ?? 1,
            thicknessFloor: originalRef.current?.thicknessFloor ?? 1,
            wallHeight: parser.wallHeight + 1
        };
        loadFromServer({
            tilemap: parser.model,
            entryPoint: originalRef.current.entryPoint,
            entryPointDir: originalRef.current.entryPointDir,
            thicknessWall: originalRef.current.thicknessWall,
            thicknessFloor: originalRef.current.thicknessFloor,
            wallHeight: parser.wallHeight + 1
        });
        setBaseline({
            tilemap: parser.model,
            doorX: originalRef.current.entryPoint[0],
            doorY: originalRef.current.entryPoint[1],
            doorDir: originalRef.current.entryPointDir,
            thicknessWall: originalRef.current.thicknessWall,
            thicknessFloor: originalRef.current.thicknessFloor,
            wallHeight: parser.wallHeight + 1
        });
    });

    useMessageEvent<RoomVisualizationSettingsEvent>(RoomVisualizationSettingsEvent, (event) => {
        if (isExternal) return;
        const parser = event.getParser();
        const wall = clampThickness(convertSettingToNumber(parser.thicknessWall));
        const floor = clampThickness(convertSettingToNumber(parser.thicknessFloor));
        originalRef.current = {
            tilemap: originalRef.current?.tilemap ?? '',
            entryPoint: originalRef.current?.entryPoint ?? [0, 0],
            entryPointDir: originalRef.current?.entryPointDir ?? 2,
            thicknessWall: wall,
            thicknessFloor: floor,
            wallHeight: originalRef.current?.wallHeight ?? -1
        };
        dispatch({ type: 'SET_THICKNESS', wall, floor, source: 'remote' });
        mergeBaseline({ thicknessWall: wall, thicknessFloor: floor });
    });

    useEffect(() => {
        if (!isVisible) return;
        const handler = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey)) return;
            const target = e.target as HTMLElement | null;
            const tag = target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
            const key = e.key.toLowerCase();
            if (key === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            } else if ((key === 'z' && e.shiftKey) || key === 'y') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isVisible, undo, redo]);

    useEffect(() => {
        if (isExternal) return;
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');
                if (parts.length < 2) return;
                switch (parts[1]) {
                    case 'show':
                        setRoomVisible(true);
                        return;
                    case 'hide':
                        setRoomVisible(false);
                        return;
                    case 'toggle':
                        setRoomVisible((v) => !v);
                        return;
                }
            },
            eventUrlPrefix: 'floor-editor/'
        };
        AddLinkEventTracker(linkTracker);
        return () => RemoveLinkEventTracker(linkTracker);
    }, [isExternal]);

    const onWallHeightChange = (value: number) => {
        if (isNaN(value) || value <= 0) value = MIN_WALL_HEIGHT;
        if (value > MAX_WALL_HEIGHT) value = MAX_WALL_HEIGHT;
        dispatch({ type: 'SET_WALL_HEIGHT', value, source: 'local' });
    };

    const saveFloorChanges = () => {
        if (externalSession) {
            externalSession.onSave(serializeTilemap(state.tiles));
            externalSession.onClose();
            return;
        }

        SendMessageComposer(
            new UpdateFloorPropertiesMessageComposer(
                serializeTilemap(state.tiles),
                state.door.x,
                state.door.y,
                state.door.dir,
                convertNumbersForSaving(state.thickness.wall),
                convertNumbersForSaving(state.thickness.floor),
                state.wallHeight - 1
            )
        );
    };

    const choosePreview = (use3d: boolean) => {
        setPreview3d(use3d);
        try {
            SetLocalStorage(PREVIEW_3D_STORAGE_KEY, use3d);
        } catch {
        }
    };

    const revertChanges = () => {
        const o = originalRef.current;
        if (!o) return;
        loadFromServer(o);
        if (!isExternal && liveSync) revertLivePreview();
    };

    const closeEditor = () => {
        setImportExportVisible(false);
        if (externalSession) externalSession.onClose();
        else setRoomVisible(false);
    };

    return (
        <>
            {isVisible && (
                <VoltCardView
                    uniqueKey="floorpan-editor"
                    className="w-[1010px] h-[620px]"
                    classNames={['volt-floorplan-window', ...(isTouch ? ['is-touch-editor', 'is-touch-legacy'] : [])]}
                    theme="primary-slim"
                    touchPresentation="full"
                    isResizable={false}
                >
                    <VoltCardHeaderView headerText={externalSession?.title ?? LocalizeText('floor.plan.editor.title')} onCloseClick={closeEditor} />
                    <VoltCardContentView overflow="hidden" className="flex flex-col">
                        {isTouch ? (
                            <div className="fp-bc is-touch is-legacy">
                                <div className="fp-touch-stage" data-testid={touchView === 'map' ? 'floorplan-plan-panel' : 'floorplan-preview-panel'}>
                                    {touchView === 'map' ? (
                                        <FloorplanCanvasSVG state={state} dispatch={dispatch} panMode={panMode} />
                                    ) : preview3d ? (
                                        <Floorplan3DView state={state} dispatch={dispatch} panMode={panMode} />
                                    ) : (
                                        <div className="fp-stage" data-testid="floorplan-preview-2d">
                                            <FloorplanPreviewSVG state={state} />
                                        </div>
                                    )}
                                    <div className="fp-touch-stage-controls is-bottom-left">
                                        {(touchView === 'map' || preview3d) && (
                                            <div className="fp-touch-mode-group" role="group" aria-label="Canvas gesture mode">
                                                <button
                                                    type="button"
                                                    className={`fp-touch-chip ${!panMode ? 'is-active' : ''}`}
                                                    aria-pressed={!panMode}
                                                    onClick={() => setPanMode(false)}
                                                >
                                                    Paint
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`fp-touch-chip ${panMode ? 'is-active' : ''}`}
                                                    aria-pressed={panMode}
                                                    onClick={() => setPanMode(true)}
                                                >
                                                    Pan
                                                </button>
                                            </div>
                                        )}
                                        <div className="fp-touch-stage-right">
                                            {touchView === 'preview' && (
                                                <div className="fp-touch-mode-group" role="group" aria-label={localizeOr('floor.plan.editor.preview.mode', 'Preview')}>
                                                    <button
                                                        type="button"
                                                        data-testid="floorplan-view-2d"
                                                        className={`fp-touch-chip ${!preview3d ? 'is-active' : ''}`}
                                                        onClick={() => choosePreview(false)}
                                                    >
                                                        2D
                                                    </button>
                                                    <button
                                                        type="button"
                                                        data-testid="floorplan-view-3d"
                                                        className={`fp-touch-chip ${preview3d ? 'is-active' : ''}`}
                                                        onClick={() => choosePreview(true)}
                                                    >
                                                        3D
                                                    </button>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                className={`fp-touch-chip ${touchView === 'preview' ? 'is-active' : ''}`}
                                                onClick={() => setTouchView((value) => (value === 'map' ? 'preview' : 'map'))}
                                            >
                                                {touchView === 'map' ? 'Preview' : 'Map'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="fp-touch-palette">
                                    <section className="fp-touch-card">
                                        <FloorplanToolbar
                                            state={state}
                                            dispatch={dispatch}
                                            canUndo={canUndo}
                                            canRedo={canRedo}
                                            onUndo={undo}
                                            onRedo={redo}
                                            panMode={panMode}
                                            setPanMode={setPanMode}
                                            includeDoor={!isExternal}
                                        />
                                        <div className="fp-touch-height">
                                            <div className="fp-touch-row-head">
                                                <span className="fp-touch-label">{localizeOr('floor.plan.editor.tile.height', 'Set height')}</span>
                                                <span className="fp-touch-area" data-testid="floorplan-area">
                                                    {localizeOr('floor.plan.editor.area', `Area: ${area.total} (${area.walkable} tiles)`, ['total', 'walkable'], [String(area.total), String(area.walkable)])}
                                                </span>
                                                <span
                                                    className="fp-touch-height-badge"
                                                    data-testid="brush-height-badge"
                                                    style={{ backgroundColor: airHeightHex(state.brush.h) }}
                                                >
                                                    {state.brush.h}
                                                </span>
                                            </div>
                                            <div className="fp-touch-stepper-row">
                                                <button
                                                    type="button"
                                                    className="fp-touch-btn is-step"
                                                    aria-label="Decrease tile height"
                                                    disabled={state.brush.h <= 0}
                                                    onClick={() => dispatch({ type: 'BRUSH_SET', h: Math.max(0, state.brush.h - 1) })}
                                                >
                                                    −
                                                </button>
                                                <FloorplanHeightPicker selectedH={state.brush.h} onSelect={(h) => dispatch({ type: 'BRUSH_SET', h })} />
                                                <button
                                                    type="button"
                                                    className="fp-touch-btn is-step"
                                                    aria-label="Increase tile height"
                                                    disabled={state.brush.h >= 29}
                                                    onClick={() => dispatch({ type: 'BRUSH_SET', h: Math.min(29, state.brush.h + 1) })}
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </section>

                                    {!isExternal && (
                                        <section className="fp-touch-card">
                                            <FloorplanOptionsPanel state={state} dispatch={dispatch} />
                                            <div className="fp-touch-wall">
                                                <div className="fp-touch-row-head">
                                                    <span className="fp-touch-label">{LocalizeText('floor.editor.wall.height')}</span>
                                                    <span className="fp-touch-wall-value" data-testid="wall-height-badge">
                                                        {state.wallHeight}
                                                    </span>
                                                </div>
                                                <div className="fp-touch-stepper-row">
                                                    <button
                                                        type="button"
                                                        className="fp-touch-btn is-step"
                                                        aria-label="Decrease wall height"
                                                        disabled={state.wallHeight <= MIN_WALL_HEIGHT}
                                                        onClick={() => onWallHeightChange(state.wallHeight - 1)}
                                                    >
                                                        −
                                                    </button>
                                                    <FloorplanWallHeightSlider value={state.wallHeight} onChange={onWallHeightChange} />
                                                    <button
                                                        type="button"
                                                        className="fp-touch-btn is-step"
                                                        aria-label="Increase wall height"
                                                        disabled={state.wallHeight >= MAX_WALL_HEIGHT}
                                                        onClick={() => onWallHeightChange(state.wallHeight + 1)}
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="fp-touch-toggles">
                                                <button
                                                    type="button"
                                                    data-testid="floorplan-live-sync"
                                                    data-active={liveSync ? 'true' : 'false'}
                                                    className={`fp-touch-pill ${liveSync ? 'is-on' : ''}`}
                                                    onClick={() => setLiveSync((v) => !v)}
                                                >
                                                    {liveSync ? 'Live preview ON' : 'Live preview OFF'}
                                                </button>
                                                <button
                                                    type="button"
                                                    data-testid="floorplan-auto-pickup"
                                                    data-active={autoPickup ? 'true' : 'false'}
                                                    className={`fp-touch-pill ${autoPickup ? 'is-on' : ''}`}
                                                    onClick={() => setAutoPickup((v) => !v)}
                                                >
                                                    {autoPickup ? 'Pick up blocking furni ON' : 'Pick up blocking furni OFF'}
                                                </button>
                                            </div>
                                        </section>
                                    )}
                                </div>

                                <div className="fp-touch-footer">
                                    <button type="button" className="fp-touch-btn is-danger" data-testid="floorplan-revert" onClick={revertChanges}>
                                        {LocalizeText('floor.plan.editor.reload')}
                                    </button>
                                    <button type="button" className="fp-touch-btn" data-testid="floorplan-import-export" onClick={() => setImportExportVisible(true)}>
                                        {LocalizeText('floor.plan.editor.import.export')}
                                    </button>
                                    <button type="button" className="fp-touch-btn is-primary" data-testid="floorplan-save" onClick={saveFloorChanges}>
                                        {LocalizeText('floor.plan.editor.save')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                        <div className="fp-body">
                            <div className="fp-controls">
                                <FloorplanToolbar
                                    state={state}
                                    dispatch={dispatch}
                                    canUndo={canUndo}
                                    canRedo={canRedo}
                                    onUndo={undo}
                                    onRedo={redo}
                                    panMode={panMode}
                                    setPanMode={setPanMode}
                                    includeDoor={!isExternal}
                                />
                                {!isExternal && <FloorplanOptionsPanel state={state} dispatch={dispatch} />}
                            </div>
                            <div className="fp-panels">
                                <div className="fp-panel" data-testid="floorplan-plan-panel">
                                    <div className="fp-panel-head">
                                        <div className="fp-badge is-brush" data-testid="brush-height-badge" title="Brush height">
                                            {state.brush.h}
                                        </div>
                                        <span className="fp-panel-title">{localizeOr('floor.plan.editor.tile.height', 'Set height')}</span>
                                        <span className="fp-panel-info" data-testid="floorplan-area">
                                            {localizeOr('floor.plan.editor.area', `Area: ${area.total} (${area.walkable} tiles)`, ['total', 'walkable'], [String(area.total), String(area.walkable)])}
                                        </span>
                                    </div>
                                    <div className="fp-panel-body">
                                        <FloorplanHeightPicker selectedH={state.brush.h} onSelect={(h) => dispatch({ type: 'BRUSH_SET', h })} />
                                        <FloorplanCanvasSVG state={state} dispatch={dispatch} panMode={panMode} />
                                    </div>
                                </div>
                                <div className="fp-panel" data-testid="floorplan-preview-panel">
                                    <div className="fp-panel-head">
                                        <div className="fp-badge" data-testid="wall-height-badge" title="Wall height">
                                            {state.wallHeight}
                                        </div>
                                        <span className="fp-panel-title">{LocalizeText('floor.editor.wall.height')}</span>
                                        <div className="fp-view-switch" data-testid="floorplan-view-switch" role="group" aria-label={localizeOr('floor.plan.editor.preview.mode', 'Preview')}>
                                            <button
                                                type="button"
                                                data-testid="floorplan-view-2d"
                                                data-active={preview3d ? 'false' : 'true'}
                                                className={`fp-pill ${preview3d ? '' : 'is-on'}`}
                                                title={localizeOr('floor.plan.editor.preview.2d.title', 'Flat preview (light, works on every device)')}
                                                onClick={() => choosePreview(false)}
                                            >
                                                2D
                                            </button>
                                            <button
                                                type="button"
                                                data-testid="floorplan-view-3d"
                                                data-active={preview3d ? 'true' : 'false'}
                                                className={`fp-pill ${preview3d ? 'is-on' : ''}`}
                                                title={localizeOr('floor.plan.editor.preview.3d.title', '3D preview (WebGL, editable, heavier)')}
                                                onClick={() => choosePreview(true)}
                                            >
                                                3D
                                            </button>
                                        </div>
                                    </div>
                                    <div className="fp-panel-body">
                                        <FloorplanWallHeightSlider value={state.wallHeight} onChange={onWallHeightChange} />
                                        {preview3d ? (
                                            <Floorplan3DView state={state} dispatch={dispatch} panMode={panMode} />
                                        ) : (
                                            <div className="fp-stage" data-testid="floorplan-preview-2d">
                                                <FloorplanPreviewSVG state={state} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="fp-footer">
                                <Base pointer className="fp-btn is-red" data-testid="floorplan-revert" onClick={revertChanges}>
                                    {LocalizeText('floor.plan.editor.reload')}
                                </Base>
                                {!isExternal && (
                                    <div className="fp-footer-middle">
                                        <Base
                                            pointer
                                            data-testid="floorplan-live-sync"
                                            data-active={liveSync ? 'true' : 'false'}
                                            className={`fp-toggle ${liveSync ? 'is-on' : ''}`}
                                            onClick={() => setLiveSync((v) => !v)}
                                            title="Local in-room preview while drawing (does not save to server)"
                                        >
                                            <span className="fp-toggle-dot" />
                                            {liveSync ? 'Live preview ON' : 'Live preview OFF'}
                                        </Base>
                                        <Base
                                            pointer
                                            data-testid="floorplan-auto-pickup"
                                            data-active={autoPickup ? 'true' : 'false'}
                                            className={`fp-toggle is-warm ${autoPickup ? 'is-on' : ''}`}
                                            onClick={() => setAutoPickup((v) => !v)}
                                            title="On save: pick up furniture blocking the new floor plan and return it to its owner's inventory"
                                        >
                                            <span className="fp-toggle-dot" />
                                            {autoPickup ? 'Pick up blocking furni ON' : 'Pick up blocking furni OFF'}
                                        </Base>
                                    </div>
                                )}
                                <div className={`fp-footer-right ${isExternal ? 'ml-auto' : ''}`}>
                                    <Base pointer className="fp-btn is-grey" data-testid="floorplan-import-export" onClick={() => setImportExportVisible(true)}>
                                        {LocalizeText('floor.plan.editor.import.export')}
                                    </Base>
                                    <Base pointer className="fp-btn is-blue" data-testid="floorplan-save" onClick={saveFloorChanges}>
                                        {LocalizeText('floor.plan.editor.save')}
                                    </Base>
                                </div>
                            </div>
                        </div>
                        )}
                    </VoltCardContentView>
                </VoltCardView>
            )}
            {importExportVisible && (
                <FloorplanImportExport
                    state={state}
                    dispatch={dispatch}
                    showLoad
                    onClose={() => setImportExportVisible(false)}
                    onSaveFromText={(raw) => {
                        if (externalSession) {
                            externalSession.onSave(raw);
                            setImportExportVisible(false);
                            externalSession.onClose();
                            return;
                        }
                        SendMessageComposer(
                            new UpdateFloorPropertiesMessageComposer(
                                raw,
                                state.door.x,
                                state.door.y,
                                state.door.dir,
                                convertNumbersForSaving(state.thickness.wall),
                                convertNumbersForSaving(state.thickness.floor),
                                state.wallHeight - 1
                            )
                        );
                    }}
                    onRevertText={() => originalRef.current?.tilemap ?? serializeTilemap(state.tiles)}
                />
            )}
        </>
    );
};
