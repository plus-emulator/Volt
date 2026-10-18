import { GetRenderer, GetRoomEngine, GetTicker, RoomId, RoomObjectUserType, RoomPreviewer, TextureUtils, Vector3d, VoltLogger, VoltTicker } from '@volt/renderer';
import { Point } from 'pixi.js';
import { FC, useEffect, useRef, useState } from 'react';
import { PIXEL_ART_RENDERING } from '../../common/layout/PixelArtRendering';

// CursedDragonPreviewView.as (AIR WIN63-202610151745-318700621, com/sulake/habbo/catalog/cursed_dragon_adoption).
const CANVAS_ID = 1;
const PET_TYPE = 37;
const ZOOM = 2;
const CYCLE_MS = 24000;
const PERCH_Y = 18;

// dragon_live_preview (1,44 786x248) and the two packages (127,151 136x150 in blue_preview 5,42 and purple_preview 394,42) of cursed_dragon_adoption_xml.
const WIDGET = { x: 1, y: 44, width: 786, height: 248 };
const PACKAGES = [
    { objectId: 1, palette: 0, direction: 2, x: 5 + 127, y: 42 + 151, width: 136 },
    { objectId: 2, palette: 1, direction: 4, x: 394 + 127, y: 42 + 151, width: 136 }
];

// update(): blue flames 3-7 s and eats 11-17 s, purple flames 5-9 s and eats 13-19 s of a 24 s cycle.
const getPosture = (objectId: number, elapsed: number) =>
{
    if (objectId === 1) return elapsed >= 3000 && elapsed < 7000 ? 'flm' : elapsed >= 11000 && elapsed < 17000 ? 'eat' : 'std';

    return elapsed >= 5000 && elapsed < 9000 ? 'flm' : elapsed >= 13000 && elapsed < 19000 ? 'eat' : 'std';
};

/**
 * The two cursed dragons (pet type 37, palette 0 blue and 1 purple, colour ffffff) standing on their packages. The room canvas is half the widget
 * and drawn at zoom 2 without walls or floor; the pets stay hidden until both palettes are known (:99-108).
 */
export const CursedDragonPreviewView: FC<{}> = () =>
{
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() =>
    {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        const roomEngine = GetRoomEngine();

        if (!canvas || !context || !roomEngine) return;

        const previewerId = ++RoomPreviewer.PREVIEW_COUNTER;
        const previewer = new RoomPreviewer(roomEngine, previewerId);
        const roomId = RoomId.makeRoomPreviewerId(previewerId);
        const canvasWidth = WIDGET.width / ZOOM;
        const canvasHeight = WIDGET.height / ZOOM;
        const postures = new Map<number, string>();
        let texture: ReturnType<typeof TextureUtils.createRenderTexture> = null;
        let frameImageData: ImageData = null;
        let isInitialized = false;
        let arePetsAdded = false;
        let isShown = false;
        let elapsed = 0;
        let failures = 0;

        previewer.backgroundColor = null;
        previewer.disableUpdate = true;

        // initializeCanvas (:118-140)
        const initializeCanvas = () =>
        {
            if (!previewer.isRoomEngineReady || !previewer.getRoomCanvas(canvasWidth, canvasHeight)) return false;

            if (!roomEngine.getRoomInstanceGeometry(roomId, CANVAS_ID)) return false;

            previewer.updateRoomWallsAndFloorVisibility(false, false);
            roomEngine.setRoomInstanceRenderingCanvasOffset(roomId, CANVAS_ID, new Point(0, 0));

            texture = TextureUtils.createRenderTexture(canvasWidth, canvasHeight);

            return !!texture;
        };

        // addPet (:148-158): the pet stands centred on its package, 18 bitmap pixels below the package top.
        const addPet = (objectId: number, palette: number, direction: number, packageX: number, packageY: number, packageWidth: number) =>
        {
            const x = packageX - WIDGET.x + packageWidth / 2;
            const y = packageY - WIDGET.y + PERCH_Y * ZOOM;
            const geometry = roomEngine.getRoomInstanceGeometry(roomId, CANVAS_ID);
            const screenPoint = new Point(x / ZOOM - Math.trunc(WIDGET.width / 2 / ZOOM), y / ZOOM - Math.trunc(WIDGET.height / 2 / ZOOM));
            const planePosition = geometry.getPlanePosition(screenPoint, new Vector3d(), new Vector3d(1, 0, 0), new Vector3d(0, 1, 0));

            if (!planePosition) return;

            roomEngine.addRoomObjectUser(
                roomId,
                objectId,
                new Vector3d(planePosition.x, planePosition.y, 0),
                new Vector3d(direction * 45),
                direction * 45,
                RoomObjectUserType.getTypeNumber(RoomObjectUserType.PET),
                `${ PET_TYPE } ${ palette } ffffff`
            );
            roomEngine.updateRoomObjectUserPosture(roomId, objectId, 'std');
        };

        const setPosture = (objectId: number, posture: string) =>
        {
            if (postures.get(objectId) === posture) return;

            postures.set(objectId, posture);
            roomEngine.updateRoomObjectUserPosture(roomId, objectId, posture);
        };

        const paint = () =>
        {
            const renderingCanvas = previewer.getRenderingCanvas();

            if (!texture || !renderingCanvas) return;

            GetRenderer().render({ target: texture, container: renderingCanvas.master, clear: true, clearColor: [0, 0, 0, 0] });

            const { pixels, width, height } = GetRenderer().texture.getPixels(texture);

            if (canvas.width !== width || canvas.height !== height)
            {
                canvas.width = width;
                canvas.height = height;
                frameImageData = null;
            }

            if (!frameImageData) frameImageData = context.createImageData(width, height);

            frameImageData.data.set(pixels);
            context.putImageData(frameImageData, 0, 0);
        };

        // update (:83-108)
        const update = (ticker: VoltTicker) =>
        {
            if (failures >= 6) return;

            try
            {
                if (!isInitialized && !(isInitialized = initializeCanvas())) return;

                if (!arePetsAdded)
                {
                    for (const entry of PACKAGES) addPet(entry.objectId, entry.palette, entry.direction, entry.x, entry.y, entry.width);

                    arePetsAdded = true;
                    postures.clear();
                }

                if (!roomEngine.getPetColorResult(PET_TYPE, 0) || !roomEngine.getPetColorResult(PET_TYPE, 1)) return;

                if (!isShown)
                {
                    isShown = true;
                    setIsVisible(true);
                }

                elapsed = (elapsed + ticker.deltaMS) % CYCLE_MS;

                for (const entry of PACKAGES) setPosture(entry.objectId, getPosture(entry.objectId, elapsed));

                if (previewer.getRenderingCanvas()?.canvasUpdated !== false) paint();
            }
            catch (error)
            {
                failures++;

                if (failures >= 6) VoltLogger.error('CursedDragonPreviewView stopped rendering', error);
            }
        };

        GetTicker().add(update);

        return () =>
        {
            GetTicker().remove(update);

            if (arePetsAdded)
            {
                for (const entry of PACKAGES) roomEngine.removeRoomObjectUser(roomId, entry.objectId);
            }

            previewer.dispose();
            texture?.destroy(true);
        };
    }, []);

    return (
        <div className="volt-cursed-dragon-live-preview" style={{ visibility: isVisible ? 'visible' : 'hidden' }}>
            <canvas ref={canvasRef} aria-hidden="true" style={{ display: 'block', width: '100%', height: '100%', imageRendering: PIXEL_ART_RENDERING }} />
        </div>
    );
};
