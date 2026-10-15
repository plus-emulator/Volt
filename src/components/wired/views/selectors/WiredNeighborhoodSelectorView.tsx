import { GetRoomEngine } from '@volt/renderer';
import { CSSProperties, Dispatch, FC, Fragment, MouseEvent as ReactMouseEvent, SetStateAction, useEffect, useId, useMemo, useRef, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredNumberInput } from '../WiredNumberInput';
import { WiredSection } from '../WiredSection';
import { WiredShellButton } from '../WiredShellHeaderView';
import { WiredSourceTypeSelector } from '../WiredSourceTypeSelector';
import { CLICKED_USER_SOURCE_VALUE, nativeSourceOptions, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredText } from '../WiredText';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { WiredSelectorOptionsSection } from './WiredSelectorOptionsSection';
import tileBase from '../../../../assets/images/floorplan-editor/air/tile-base.png';
import tileRoot from '../../../../assets/images/floorplan-editor/air/tile-entry.png';
import arrowLeft from '../../../../assets/images/wired/native/arrow-left.png';
import arrowRight from '../../../../assets/images/wired/native/arrow-right.png';
import addAsset from '../../../../assets/images/wired/native/neighborhood/add.png';
import removeAsset from '../../../../assets/images/wired/native/neighborhood/remove.png';
import referenceAsset from '../../../../assets/images/wired/native/neighborhood/reference.png';
import enlargeAsset from '../../../../assets/images/wired/native/neighborhood/enlarge.png';
import reduceAsset from '../../../../assets/images/wired/native/neighborhood/reduce.png';
import borderNAsset from '../../../../assets/images/wired/native/neighborhood/border-N.png';
import borderNEAsset from '../../../../assets/images/wired/native/neighborhood/border-NE.png';
import borderEAsset from '../../../../assets/images/wired/native/neighborhood/border-E.png';
import borderSEAsset from '../../../../assets/images/wired/native/neighborhood/border-SE.png';
import borderSAsset from '../../../../assets/images/wired/native/neighborhood/border-S.png';
import borderSWAsset from '../../../../assets/images/wired/native/neighborhood/border-SW.png';
import borderWAsset from '../../../../assets/images/wired/native/neighborhood/border-W.png';
import borderNWAsset from '../../../../assets/images/wired/native/neighborhood/border-NW.png';

type Tile = { x: number; y: number };

/** The native neighbourhood is 441 tiles: a square spiral from the anchor, east, north, west, south, with steps 1,1,2,2,3,3,... */
const NEIGHBORHOOD_TILE_COUNT = 441;
const NEIGHBORHOOD_WORDS = 14;
/** The last word carries only the final 25 tiles; its top seven bits are unused. */
const NEIGHBORHOOD_LAST_WORD_MASK = 0x01ffffff;

const buildNeighborhoodSpiral = (): Tile[] => {
    const tiles: Tile[] = [{ x: 0, y: 0 }];
    const directions = [
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: -1, y: 0 },
        { x: 0, y: 1 }
    ];
    let x = 0;
    let y = 0;
    let direction = 0;

    for (let step = 1; tiles.length < NEIGHBORHOOD_TILE_COUNT; step++) {
        for (let leg = 0; leg < 2 && tiles.length < NEIGHBORHOOD_TILE_COUNT; leg++) {
            for (let move = 0; move < step && tiles.length < NEIGHBORHOOD_TILE_COUNT; move++) {
                x += directions[direction].x;
                y += directions[direction].y;
                tiles.push({ x, y });
            }

            direction = (direction + 1) % directions.length;
        }
    }

    return tiles;
};

const NEIGHBORHOOD_SPIRAL = buildNeighborhoodSpiral();
const NEIGHBORHOOD_INDEX = new Map(NEIGHBORHOOD_SPIRAL.map((tile, index) => [`${tile.x},${tile.y}`, index]));

/** Packs picked tiles into the 14 signed words, bit i of the spiral in word i>>5 at bit i&31. */
const tilesToNeighborhoodWords = (tiles: Tile[]): number[] => {
    const words = Array.from({ length: NEIGHBORHOOD_WORDS }, () => 0);

    for (const tile of tiles) {
        const index = NEIGHBORHOOD_INDEX.get(`${tile.x},${tile.y}`);

        if (index === undefined) continue;

        words[index >>> 5] |= 1 << (index & 31);
    }

    return words;
};

const neighborhoodWordsToTiles = (words: number[]): Tile[] =>
    NEIGHBORHOOD_SPIRAL.filter((_, index) => {
        const wordIndex = index >>> 5;
        const word = (words[wordIndex] ?? 0) & (wordIndex === NEIGHBORHOOD_WORDS - 1 ? NEIGHBORHOOD_LAST_WORD_MASK : -1);

        return ((word >>> (index & 31)) & 1) === 1;
    });

const tileIncluded = (tiles: Tile[], x: number, y: number) => tiles.some((tile) => tile.x === x && tile.y === y);

type DrawMode = 'add' | 'remove' | 'root';
const outsideSmall = (tiles: Tile[]) => tiles.some(({ x, y }) => Math.abs(x) > 5 || Math.abs(y) > 5);
const BORDERS = [borderNAsset, borderNEAsset, borderEAsset, borderSEAsset, borderSAsset, borderSWAsset, borderWAsset, borderNWAsset];

/** AIR FloorDrawingPreset: original 18x9 pixels at an 8x4 isometric step, not rescaled diamonds. */
const NeighborhoodGrid: FC<{ selectedTiles: Tile[]; root: Tile; radius: number; mode: DrawMode; onChange: Dispatch<SetStateAction<Tile[]>>; onRoot: (tile: Tile) => void }> = ({ selectedTiles, root, radius, mode, onChange, onRoot }) => {
    const id = useId().replace(/:/g, '');
    const drag = useRef<{ start: Tile; last: Tile; original: Tile[]; rectangle: boolean }>(null);
    const dimension = radius * 2 + 1;
    const position = (x: number, y: number) => ({ x: 8 * (x - y + 1) + 8 * dimension, y: 4 * (x + y + 1) + 4 });
    useEffect(() => {
        const stop = () => { drag.current = null; };
        window.addEventListener('mouseup', stop);
        return () => window.removeEventListener('mouseup', stop);
    }, []);
    const paint = (tile: Tile, initial = false) => {
        const action = drag.current;
        if (!action) return;
        if (mode === 'root') { onRoot(tile); action.last = tile; return; }
        const affected: Tile[] = [];
        if (action.rectangle) {
            for (let x = Math.min(action.start.x, tile.x); x <= Math.max(action.start.x, tile.x); x++)
                for (let y = Math.min(action.start.y, tile.y); y <= Math.max(action.start.y, tile.y); y++) affected.push({ x, y });
        } else {
            // Include crossed cells when a fast pointer skips a tile (AIR interpolationPoints).
            let { x, y } = initial ? tile : action.last;
            const dx = Math.abs(tile.x - x), dy = Math.abs(tile.y - y), sx = x < tile.x ? 1 : -1, sy = y < tile.y ? 1 : -1;
            let error = dx - dy;
            while (true) {
                affected.push({ x, y });
                if (x === tile.x && y === tile.y) break;
                const twice = 2 * error;
                if (twice > -dy) { error -= dy; x += sx; }
                if (twice < dx) { error += dx; y += sy; }
            }
        }
        onChange(previous => {
            let result = action.rectangle ? [...action.original] : [...previous];
            for (const cell of affected) {
                if (Math.abs(cell.x) > radius || Math.abs(cell.y) > radius) continue;
                if (mode === 'add') { if (!tileIncluded(result, cell.x, cell.y)) result.push(cell); }
                else result = result.filter(current => current.x !== cell.x || current.y !== cell.y);
            }
            return result;
        });
        action.last = tile;
    };
    const begin = (event: ReactMouseEvent, tile: Tile) => { if (event.button !== 0) return; event.preventDefault(); drag.current = { start: tile, last: tile, original: selectedTiles, rectangle: event.shiftKey }; paint(tile, true); };
    const borders: Array<{ x: number; y: number; image: string }> = [];
    for (let index = 0; index < dimension; index++) {
        borders.push({ x: index, y: -1, image: BORDERS[0] }, { x: index, y: dimension, image: BORDERS[4] }, { x: -1, y: index, image: BORDERS[6] }, { x: dimension, y: index, image: BORDERS[2] });
    }
    borders.push({ x: -1, y: -1, image: BORDERS[7] }, { x: dimension, y: -1, image: BORDERS[1] }, { x: dimension, y: dimension, image: BORDERS[3] }, { x: -1, y: dimension, image: BORDERS[5] });
    return <svg data-testid="neighborhood-grid" data-radius={radius} width={dimension * 16 + 34} height={dimension * 8 + 17} style={{ display: 'block', flexShrink: 0, imageRendering: 'pixelated', background: '#ccc' }} onContextMenu={event => event.preventDefault()}>
        <defs>
            <filter id={`${id}-selected`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0.4 0 0 0  0 0 0.8 0 0  0 0 0 1 0" /></filter>
            <filter id={`${id}-empty`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0.2 0 0 0 0  0 0.2 0 0 0  0 0 0.2 0 0  0 0 0 1 0" /></filter>
        </defs>
        {Array.from({ length: dimension * dimension }, (_, index) => {
            const x = index % dimension, y = Math.floor(index / dimension), tile = { x: x - radius, y: y - radius }, selected = tileIncluded(selectedTiles, tile.x, tile.y), point = position(x, y);
            return <g key={index} data-tile={`${tile.x},${tile.y}`} data-selected={selected} transform={`translate(${point.x} ${point.y})`}>
                <image href={tileBase} width={18} height={9} filter={`url(#${id}-${selected ? 'selected' : 'empty'})`} pointerEvents="none" />
                <polygon points="9,0 18,4.5 9,9 0,4.5" fill="transparent" style={{ cursor: 'pointer' }} onMouseDown={event => begin(event, tile)} onMouseEnter={event => { if (event.buttons & 1) paint(tile); }}><title>{`(${tile.x}, ${tile.y})`}</title></polygon>
            </g>;
        })}
        {Math.abs(root.x) <= radius && Math.abs(root.y) <= radius && <image data-root href={tileRoot} {...position(root.x + radius, root.y + radius)} width={18} height={9} pointerEvents="none" />}
        {borders.map((border, index) => <image key={index} href={border.image} {...position(border.x, border.y)} width={18} height={9} pointerEvents="none" />)}
    </svg>;
};

export const WiredNeighborhoodSelectorView: FC = () => {
    const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
    const [usersAnchor, setUsersAnchor] = useState(true);
    const [sourceValue, setSourceValue] = useState(0);
    const [root, setRoot] = useState<Tile>({ x: 0, y: 0 });
    const [mode, setMode] = useState<DrawMode>('add');
    const [bigMode, setBigMode] = useState(false);
    const smallAllowed = !outsideSmall(selectedTiles);
    const { trigger, setIntParams, setUserSources, setFurniSources } = useWired();
    const userOptions = useMemo(() => nativeSourceOptions(trigger?.inputSources?.usersAllowed[0], 'users'), [trigger]);
    const furniOptions = useMemo(() => nativeSourceOptions(trigger?.inputSources?.furniAllowed[0], 'furni'), [trigger]);
    const availableUserSources = useAvailableUserSources(trigger, userOptions);
    useEffect(() => { GetRoomEngine().areaSelectionManager.clearHighlight(); GetRoomEngine().areaSelectionManager.deactivate(); }, []);
    useEffect(() => {
        if (!trigger) return;
        const params = trigger.intData, users = params[0] === 1, tiles = neighborhoodWordsToTiles(params.slice(3, 3 + NEIGHBORHOOD_WORDS));
        setUsersAnchor(users);
        setSourceValue(users ? trigger.userSources[0] ?? 0 : trigger.furniSources[0] ?? 100);
        setRoot({ x: params[1] ?? 0, y: params[2] ?? 0 });
        setSelectedTiles(tiles);
        setMode('add');
        setBigMode(previous => previous || outsideSmall(tiles));
    }, [trigger]);
    useEffect(() => {
        if (usersAnchor && sourceValue === CLICKED_USER_SOURCE_VALUE && !availableUserSources.some(option => option.value === CLICKED_USER_SOURCE_VALUE)) setSourceValue(0);
    }, [availableUserSources, sourceValue, usersAnchor]);
    const save = () => {
        setIntParams([usersAnchor ? 1 : 0, root.x, root.y, ...tilesToNeighborhoodWords(selectedTiles)]);
        setUserSources([usersAnchor ? sourceValue : 0]);
        setFurniSources([usersAnchor ? 100 : sourceValue]);
    };
    const options = usersAnchor ? availableUserSources : furniOptions;
    const sourceIndex = Math.max(0, options.findIndex(option => option.value === sourceValue));
    const cycleSource = (direction: number) => { if (options.length) setSourceValue(options[(sourceIndex + direction + options.length) % options.length].value); };
    const tools: Array<{ mode: DrawMode; image: string; label: string }> = [{ mode: 'add', image: addAsset, label: 'Add tiles' }, { mode: 'remove', image: removeAsset, label: 'Remove tiles' }, { mode: 'root', image: referenceAsset, label: 'Set root tile' }];
    return <WiredSelectorBaseView nativeLayout hasSpecialInput requiresFurni={!usersAnchor && sourceValue === 100 ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE} selectionPreview={<></>} widthMultiplier={bigMode ? 1.7 : 1} save={save} footerCollapsible={false}
        footer={<><WiredSelectorOptionsSection /><WiredSection title={LocalizeText('wiredfurni.params.sources.merged.title.neighborhood')} headerOption={<WiredSourceTypeSelector types={['furni', 'user']} value={usersAnchor ? 'user' : 'furni'} onChange={type => { const users = type === 'user'; if (users !== usersAnchor) { setUsersAnchor(users); setSourceValue((users ? availableUserSources : furniOptions)[0]?.value ?? (users ? 0 : 100)); } }} />}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minHeight: 31 }}>
                <WiredShellButton shellStyle="illumina" className="volt-wired__icon-button" aria-label="Previous source" onClick={() => cycleSource(-1)}><img src={arrowLeft} alt="" /></WiredShellButton>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'center' }}><WiredText wrap text={options[sourceIndex] ? LocalizeText(options[sourceIndex].label) : ''} /></span>
                <WiredShellButton shellStyle="illumina" className="volt-wired__icon-button" aria-label="Next source" onClick={() => cycleSource(1)}><img src={arrowRight} alt="" /></WiredShellButton>
            </div>
        </WiredSection></>}>
        <WiredSection title={LocalizeText('wiredfurni.params.neighborhood_selection')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                {tools.map(tool => <Fragment key={tool.mode}><WiredShellButton shellStyle="illumina" aria-label={tool.label} title={tool.label} aria-pressed={mode === tool.mode} className={mode === tool.mode ? 'is-selected' : ''} style={{ width: 25, height: 25, minWidth: 25, flex: '0 0 25px', padding: 0, ...(mode === tool.mode ? { '--wired-button-offset-y': '-50px' } : {}) } as CSSProperties} onClick={() => setMode(tool.mode)}><img src={tool.image} alt="" style={{ imageRendering: 'pixelated' }} /></WiredShellButton>{tool.mode === 'remove' && <span aria-hidden style={{ width: 2, height: 25, background: 'linear-gradient(to right, #777 0 1px, #fff 1px 2px)' }} />}</Fragment>)}
                <WiredShellButton shellStyle="illumina" aria-label={bigMode ? 'Small neighborhood' : 'Large neighborhood'} title={bigMode ? 'Small neighborhood' : 'Large neighborhood'} disabled={!smallAllowed} style={{ width: 25, height: 25, minWidth: 25, flex: '0 0 25px', padding: 0, marginLeft: 'auto' }} onClick={() => { if (smallAllowed) setBigMode(value => !value); }}><img src={bigMode ? reduceAsset : enlargeAsset} alt="" /></WiredShellButton>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', padding: 5, background: '#ccc', border: '1px solid #999' }}><NeighborhoodGrid selectedTiles={selectedTiles} root={root} radius={bigMode ? 10 : 5} mode={mode} onChange={setSelectedTiles} onRoot={setRoot} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 5 }}>
                <WiredText text="x:" /><WiredNumberInput ariaLabel="Root x" width={20} min={-64} max={64} value={root.x} onChange={x => setRoot(current => ({ ...current, x }))} />
                <WiredText text="y:" /><WiredNumberInput ariaLabel="Root y" width={20} min={-64} max={64} value={root.y} onChange={y => setRoot(current => ({ ...current, y }))} />
            </div>
        </WiredSection>
    </WiredSelectorBaseView>;
};
