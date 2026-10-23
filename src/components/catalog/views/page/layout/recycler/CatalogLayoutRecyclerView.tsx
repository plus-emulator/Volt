import {
    CatalogRuntimeConfigurationComposer,
    CatalogRuntimeConfigurationEvent,
    FurnitureListComposer,
    GetRecyclerStatusMessageComposer,
    RecycleItemsEntry,
    RecycleItemsMessageComposer,
    RecyclerFinishedMessageEvent,
    RecyclerStatusMessageEvent
} from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../../../api';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { useInventoryFurni, useMessageEvent } from '../../../../../../hooks';
import { CatalogAirShinyButton } from '../CatalogAirShinyButton';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import {
    addRecyclerSlot,
    getRecyclerEligibleItemIds,
    getRecyclerInventoryChoices,
    normalizeRecyclerSlotCount,
    RecyclerInventoryChoice,
    reconcileRecyclerSlots
} from './recycler.helpers';
import frankImage from '../../../../../../assets/images/collectibles/image-frank-dont-know.png';
import indicatorImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-indicator.png';
import machineImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-machine.png';
import pointerArrowImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-pointer-arrow.png';
import pointerBaseImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-pointer-base.png';
import titleImage from '../../../../../../assets/images/catalog/air/recycler/furnimatic-title.png';

const OPERATION_TIMEOUT_MS = 12000;

/** The page colour under the texts: 0xe9e9e1 under the layout's 0x21ffffff fill. */
const PAGE_BACKGROUND = 0xecece5;

/** recyclerWidget slot_bg_1..12: four columns 37px apart, rows at y 0, 44 and 90 of the slots container (37, 359). */
const SLOT_ROWS = [0, 44, 90];
const getSlotPosition = (index: number) => ({ left: 37 + (index % 4) * 37, top: 359 + SLOT_ROWS[Math.floor(index / 4)] });

export const CatalogLayoutRecyclerView: FC<CatalogLayoutProps> = () => {
    const { groupItems = [] } = useInventoryFurni();
    const [slots, setSlots] = useState<RecyclerInventoryChoice[]>([]);
    const [status, setStatus] = useState<number>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [finished, setFinished] = useState(false);
    const operationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const configurationRequestIdRef = useRef(`recycler-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const [slotCount, setSlotCount] = useState(() => normalizeRecyclerSlotCount(8));
    const selectedIds = useMemo(() => new Set(slots.map((slot) => slot.itemId)), [slots]);
    const eligibleIds = useMemo(() => getRecyclerEligibleItemIds(groupItems), [groupItems]);
    const choices = useMemo(() => getRecyclerInventoryChoices(groupItems, selectedIds), [groupItems, selectedIds]);
    const enabled = status !== null && status !== RecyclerStatusMessageEvent.SYSTEM_STATUS_DISABLED;
    // RecyclerLogic.ducketCost: catalog.getInteger("recycler.ducket_cost", 0); a zero cost hides the cost row.
    const ducketCost = Number(GetConfigurationValue<number>('recycler.ducket_cost', 0)) || 0;

    const clearOperationTimeout = useCallback(() => {
        if (!operationTimeoutRef.current) return;

        clearTimeout(operationTimeoutRef.current);
        operationTimeoutRef.current = null;
    }, []);

    useMessageEvent<RecyclerStatusMessageEvent>(RecyclerStatusMessageEvent, (event) => {
        const parser = event.getParser();

        setStatus(parser.recyclerStatus);
        setSecondsLeft(Math.max(0, parser.recyclerTimeoutSeconds));
    });

    useMessageEvent<CatalogRuntimeConfigurationEvent>(CatalogRuntimeConfigurationEvent, (event) => {
        const parser = event.getParser();

        if (parser.protocolVersion !== 1 || parser.requestId !== configurationRequestIdRef.current) return;

        setSlotCount(normalizeRecyclerSlotCount(parser.recyclerSlotCount));
    });

    useMessageEvent<RecyclerFinishedMessageEvent>(RecyclerFinishedMessageEvent, (event) => {
        clearOperationTimeout();
        setProcessing(false);

        if (event.getParser().recyclerFinishedStatus === RecyclerFinishedMessageEvent.FINISHED_OK) {
            setSlots([]);
            setFinished(true);
        }

        SendMessageComposer(new GetRecyclerStatusMessageComposer());
    });

    useEffect(() => {
        SendMessageComposer(new FurnitureListComposer());
        SendMessageComposer(new GetRecyclerStatusMessageComposer());
        SendMessageComposer(new CatalogRuntimeConfigurationComposer(configurationRequestIdRef.current));

        return clearOperationTimeout;
    }, [clearOperationTimeout]);

    useEffect(() => {
        if (secondsLeft <= 0) return;

        const timer = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);

        return () => clearInterval(timer);
    }, [secondsLeft > 0]);

    useEffect(() => {
        setSlots((current) => reconcileRecyclerSlots(current, eligibleIds));
    }, [eligibleIds]);

    const addChoice = (choice: RecyclerInventoryChoice) => {
        if (processing) return;

        setFinished(false);
        setSlots((current) => addRecyclerSlot(current, choice, slotCount, eligibleIds));
        setPickerOpen(false);
    };

    const recycle = () => {
        if (processing || !enabled || secondsLeft > 0) return;

        const validSlots = reconcileRecyclerSlots(slots, eligibleIds);

        if (validSlots.length !== slotCount) {
            setSlots(validSlots);
            return;
        }

        setFinished(false);
        setProcessing(true);
        SendMessageComposer(new RecycleItemsMessageComposer(...validSlots.map((slot) => new RecycleItemsEntry(slot.itemId))));
        clearOperationTimeout();
        operationTimeoutRef.current = setTimeout(() => setProcessing(false), OPERATION_TIMEOUT_MS);
    };

    const canRecycle = !processing && enabled && secondsLeft <= 0 && slots.length === slotCount;

    return (
        <div className={`volt-catalog-recycler-air${processing ? ' is-processing' : ''}`}>
            <img alt="" className="volt-catalog-recycler-machine" draggable={false} src={machineImage} />
            <img alt="" className="volt-catalog-recycler-title" draggable={false} src={titleImage} />
            {ducketCost > 0 && (
                <div className="volt-catalog-recycler-cost">
                    <NativeText background={PAGE_BACKGROUND} text={ducketCost.toString()} textStyle="u_bold" />
                    <span className="volt-catalog-recycler-cost-icon" />
                </div>
            )}
            <CatalogAirShinyButton
                caption={
                    secondsLeft > 0
                        ? LocalizeText('catalog.recycler.button.wait', ['s'], [secondsLeft.toString()])
                        : LocalizeText('catalog.recycler.button.recycle')
                }
                disabled={!canRecycle}
                rect={[19, 299, 194, 30]}
                tint="green"
                onClick={recycle}
            />
            <div className="volt-catalog-recycler-panel is-slots">
                <span className="is-left" />
                <span className="is-slice" />
                <span className="is-right" />
            </div>
            <div aria-label={LocalizeText('catalog.recycler.button.recycle')} className="volt-catalog-recycler-slots" role="list">
                {Array.from({ length: slotCount }, (_, index) => {
                    const slot = slots[index];

                    return (
                        <button
                            key={index}
                            aria-label={slot?.name ?? `${index + 1}`}
                            className="volt-catalog-recycler-slot"
                            disabled={processing}
                            role="listitem"
                            style={getSlotPosition(index)}
                            title={slot?.name}
                            type="button"
                            onClick={() =>
                                slot
                                    ? setSlots((current) => current.filter((_, slotIndex) => slotIndex !== index))
                                    : setPickerOpen((open) => !open)
                            }
                        >
                            {slot?.iconUrl && <img alt="" draggable={false} src={slot.iconUrl} />}
                        </button>
                    );
                })}
            </div>
            <div className="volt-catalog-recycler-panel is-indicator">
                <span className="is-left" />
                <span className="is-slice" />
                <span className="is-right" />
            </div>
            <img alt="" className="volt-catalog-recycler-indicator" draggable={false} src={indicatorImage} />
            <div className="volt-catalog-recycler-pointer">
                <img alt="" className="is-arrow" draggable={false} src={pointerArrowImage} />
                <img alt="" className="is-base" draggable={false} src={pointerBaseImage} />
            </div>
            {/* Volt keeps its inventory list instead of AIR's drag from the room or inventory: an empty slot opens it. */}
            {pickerOpen && !processing && (
                <div className="volt-catalog-recycler-picker">
                    {choices.length ? (
                        choices.map((choice) => (
                            <button
                                key={choice.itemId}
                                disabled={slots.length >= slotCount}
                                title={choice.name}
                                type="button"
                                onClick={() => addChoice(choice)}
                            >
                                {choice.iconUrl && <img alt="" draggable={false} src={choice.iconUrl} />}
                            </button>
                        ))
                    ) : (
                        <NativeText
                            background={0xffffff}
                            className="volt-catalog-recycler-picker-empty"
                            maxWidth={300}
                            text={LocalizeText('inventory.furni.preview.not_recyclable')}
                            textStyle="u_regular"
                        />
                    )}
                </div>
            )}
            {status !== null && !enabled && (
                <div className="volt-catalog-recycler-disabled">
                    <img alt="" className="volt-catalog-recycler-frank" draggable={false} src={frankImage} />
                    <div className="volt-catalog-recycler-bubble">
                        <NativeText
                            background={0xe9e9e1}
                            maxWidth={107}
                            text={localizeWithFallback('recycler.broken', LocalizeText('recycler.info.closed'))}
                            textStyle="u_regular"
                        />
                    </div>
                </div>
            )}
            {finished && <span className="volt-catalog-recycler-finished" aria-live="polite">{LocalizeText('recycler.info.finished')}</span>}
        </div>
    );
};
