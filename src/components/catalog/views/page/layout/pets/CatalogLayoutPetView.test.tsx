import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SendMessageComposer } from '../../../../../../api';
import { useCatalogData, useCatalogUiState, useMessageEvent, useVoltEvent, useSellablePetPalette } from '../../../../../../hooks';
import { CatalogLayoutPetView } from './CatalogLayoutPetView';

const composerTypes = vi.hoisted(() => {
    class ApproveNameMessageComposer {
        public constructor(
            public readonly name: string,
            public readonly type: number
        ) {}
    }

    class PurchaseFromCatalogComposer {
        public constructor(
            public readonly pageId: number,
            public readonly offerId: number,
            public readonly extraData: string,
            public readonly amount: number
        ) {}
    }

    return { ApproveNameMessageComposer, PurchaseFromCatalogComposer };
});

const petAssetState = vi.hoisted(() => ({ colorsReady: true, downloadAsset: vi.fn() }));

vi.mock('@volt/renderer', () => ({
    ApproveNameMessageComposer: composerTypes.ApproveNameMessageComposer,
    ApproveNameMessageEvent: class {},
    ColorConverter: { int2rgb: (color: number) => `#${color.toString(16).padStart(6, '0')}` },
    GetRoomContentLoader: () => ({
        downloadAsset: petAssetState.downloadAsset,
        getPetNameForType: (type: number) => `pettype_${type}`
    }),
    GetRoomEngine: () => ({
        getPetColorResult: (_type: number, paletteId: number) =>
            petAssetState.colorsReady ? { primaryColor: paletteId, secondaryColor: paletteId + 1 } : null
    }),
    PurchaseFromCatalogComposer: composerTypes.PurchaseFromCatalogComposer,
    RoomContentLoadedEvent: class {
        public static RCLE_SUCCESS = 'RCLE_SUCCESS';
    }
}));

vi.mock('../../../../../../api', () => ({
    DispatchUiEvent: vi.fn(),
    GetPetAvailableColors: () => [[0xabcdef]],
    GetPetIndexFromLocalization: (localization: string) => Number(localization.split('_').at(-1)),
    LocalizeText: (key: string) => key,
    SanitizeHtml: (value: string) => value,
    SendMessageComposer: vi.fn(),
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../../../common', () => ({
    ClassicScrollAreaView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    LayoutPetImageView: ({ direction, paletteId, petColor, scale, typeId }: Record<string, unknown>) => (
        <span
            data-direction={direction}
            data-palette-id={paletteId}
            data-pet-color={petColor}
            data-scale={scale}
            data-testid="pet-image"
            data-type-id={typeId}
        />
    )
}));

vi.mock('../../../../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));

vi.mock('../../../../../../common/dropmenu/HabboDropMenuView', () => ({
    HabboDropMenuView: ({ label, options, value }: { label: string; options: { value: number; label: string }[]; value: number }) => (
        <div aria-label={label} data-value={value} role="listbox">
            {options.map((option) => (
                <span key={option.value} role="option" aria-selected={option.value === value}>
                    {option.label}
                </span>
            ))}
        </div>
    )
}));

const userDataState = vi.hoisted(() => ({ clubLevel: 0 }));
const notificationState = vi.hoisted(() => ({ simpleAlert: vi.fn() }));
const purchaseState = vi.hoisted(() => ({ openConfirmation: vi.fn() }));

vi.mock('../../../../../../hooks', () => ({
    useCatalogData: vi.fn(),
    useCatalogUiState: vi.fn(),
    useMessageEvent: vi.fn(),
    useNotification: () => ({ simpleAlert: notificationState.simpleAlert }),
    useVoltEvent: vi.fn(),
    useSellablePetPalette: vi.fn(),
    useUserDataSnapshot: () => ({ clubLevel: userDataState.clubLevel })
}));

vi.mock('../../widgets/CatalogAddOnBadgeWidgetView', () => ({ CatalogAddOnBadgeWidgetView: () => null }));
vi.mock('./CatalogPetPriceDisplayView', () => ({ CatalogPetPriceDisplayView: () => <div data-testid="pet-price" /> }));
// The standard purchase widget: its Buy button runs the layout's purchase override.
vi.mock('../../widgets/CatalogPurchaseWidgetView', () => ({
    CatalogPurchaseWidgetView: ({ purchaseOverride }: { purchaseOverride: (isGift: boolean, openConfirmation: () => void) => void }) => (
        <button type="button" onClick={() => purchaseOverride(false, purchaseState.openConfirmation)}>
            buy
        </button>
    )
}));

const page = {
    localization: { getText: () => '' },
    offers: [],
    pageId: 91
};

const offer = (petType: number) => ({
    localizationId: `pet_${petType}`,
    offerId: 51,
    product: { productData: { type: `pet_${petType}` } }
});

const palette = (type: number, paletteId: number, sellable = true) => ({ breedId: paletteId, paletteId, rare: false, sellable, type });

let approveNameHandler: ((event: { getParser: () => { result: number } }) => void) | null = null;
let contentLoadedHandler: ((event: { contentType: string }) => void) | null = null;

afterEach(cleanup);

beforeEach(() => {
    vi.clearAllMocks();
    approveNameHandler = null;
    contentLoadedHandler = null;
    petAssetState.colorsReady = true;
    userDataState.clubLevel = 0;
    vi.mocked(useCatalogUiState).mockReturnValue({ setCurrentOffer: vi.fn(), setPurchaseOptions: vi.fn() } as any);
    vi.mocked(useMessageEvent).mockImplementation((_event: unknown, handler: any) => {
        approveNameHandler = handler;
    });
    vi.mocked(useVoltEvent).mockImplementation((_type: any, handler: any) => {
        contentLoadedHandler = handler;
    });
});

describe('pet catalog layout', () => {
    it('renders the new pet image and the sixteen-character name field', async () => {
        const currentOffer = offer(8);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer } as any);
        vi.mocked(useSellablePetPalette).mockReturnValue({ data: { palettes: [palette(8, 10), palette(7, 11), palette(8, 12, false)] } } as any);

        render(<CatalogLayoutPetView page={{ ...page, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);

        expect(await screen.findByTestId('pet-image')).toBeInTheDocument();
        expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '16');
        expect(screen.getByTestId('pet-image')).toHaveAttribute('data-type-id', '8');
        expect(screen.getByTestId('pet-image')).toHaveAttribute('data-direction', '3');
        expect(screen.getByTestId('pet-image')).toHaveAttribute('data-scale', '2');
    });

    it('locks an HC-only breed for a non-HC member', async () => {
        userDataState.clubLevel = 0;
        const currentOffer = offer(8);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer } as any);
        vi.mocked(useSellablePetPalette).mockReturnValue({ data: { palettes: [{ ...palette(8, 10), clubOnly: true }] } } as any);

        render(<CatalogLayoutPetView page={{ ...page, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);

        expect(await screen.findByRole('radio', { name: 'catalog.pets.choose.color 1 - Habbo Club only' })).toBeDisabled();
    });

    it('unlocks an HC-only breed for an HC member', async () => {
        userDataState.clubLevel = 2;
        const currentOffer = offer(8);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer } as any);
        vi.mocked(useSellablePetPalette).mockReturnValue({ data: { palettes: [{ ...palette(8, 10), clubOnly: true }] } } as any);

        render(<CatalogLayoutPetView page={{ ...page, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);

        expect(await screen.findByRole('radio', { name: 'catalog.pets.choose.color 1' })).not.toBeDisabled();
    });

    it('downloads the pet asset and shows the palettes once its colors arrive for new pets', async () => {
        petAssetState.colorsReady = false;
        const currentOffer = offer(8);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer } as any);
        vi.mocked(useSellablePetPalette).mockReturnValue({ data: { palettes: [palette(8, 10)] } } as any);

        render(<CatalogLayoutPetView page={{ ...page, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);

        expect(screen.queryByTestId('pet-image')).not.toBeInTheDocument();
        expect(petAssetState.downloadAsset).toHaveBeenCalledWith('pettype_8');

        petAssetState.colorsReady = true;
        act(() => contentLoadedHandler?.({ contentType: 'pettype_9' }));
        expect(screen.queryByTestId('pet-image')).not.toBeInTheDocument();

        act(() => contentLoadedHandler?.({ contentType: 'pettype_8' }));

        expect(await screen.findByTestId('pet-image')).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'catalog.pets.choose.color 1' })).toBeInTheDocument();
    });

    it('renders the legacy breed menu and colors with the fifteen-character name field', async () => {
        const currentOffer = offer(7);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer } as any);
        vi.mocked(useSellablePetPalette).mockReturnValue({ data: { palettes: [palette(7, 20), palette(7, 21)] } } as any);

        render(<CatalogLayoutPetView page={{ ...page, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);

        expect(await screen.findAllByRole('option')).toHaveLength(2);
        expect(screen.getByTestId('pet-image')).toHaveAttribute('data-type-id', '7');
        expect(screen.getByTestId('pet-image')).toHaveAttribute('data-palette-id', '20');
        expect(screen.getByTestId('pet-image')).toHaveAttribute('data-pet-color', '11259375');
        expect(screen.getByTestId('pet-image')).toHaveAttribute('data-direction', '2');
        expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '15');
        expect(screen.getByRole('radio', { name: 'catalog.pets.choose.color 1' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByTestId('pet-image').closest('.volt-catalog-pet-layout')).toHaveClass('is-legacy');
    });

    it('alerts on an empty name and sends no approval request', async () => {
        const currentOffer = offer(8);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer } as any);
        vi.mocked(useSellablePetPalette).mockReturnValue({ data: { palettes: [palette(8, 10)] } } as any);

        render(<CatalogLayoutPetView page={{ ...page, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);

        fireEvent.click(await screen.findByRole('button', { name: 'buy' }));

        expect(notificationState.simpleAlert).toHaveBeenCalledWith('catalog.alert.petname.empty', null, null, null, 'catalog.alert.purchaseerror.title');
        expect(vi.mocked(SendMessageComposer)).not.toHaveBeenCalled();
    });

    it('approves the name first and opens the purchase confirmation only when it is accepted', async () => {
        const currentOffer = offer(8);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer } as any);
        vi.mocked(useSellablePetPalette).mockReturnValue({ data: { palettes: [palette(8, 10)] } } as any);

        render(<CatalogLayoutPetView page={{ ...page, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);

        fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Nova' } });
        fireEvent.click(screen.getByRole('button', { name: 'buy' }));
        fireEvent.click(screen.getByRole('button', { name: 'buy' }));

        expect(vi.mocked(SendMessageComposer)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(SendMessageComposer).mock.calls[0][0]).toBeInstanceOf(composerTypes.ApproveNameMessageComposer);
        expect(purchaseState.openConfirmation).not.toHaveBeenCalled();

        act(() => approveNameHandler?.({ getParser: () => ({ result: 0 }) }));

        await waitFor(() => expect(purchaseState.openConfirmation).toHaveBeenCalledTimes(1));
    });

    it('alerts with the name error when the approval fails', async () => {
        const currentOffer = offer(8);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer } as any);
        vi.mocked(useSellablePetPalette).mockReturnValue({ data: { palettes: [palette(8, 10)] } } as any);

        render(<CatalogLayoutPetView page={{ ...page, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);

        fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'No' } });
        fireEvent.click(screen.getByRole('button', { name: 'buy' }));
        act(() => approveNameHandler?.({ getParser: () => ({ result: 2 }) }));

        expect(notificationState.simpleAlert).toHaveBeenCalledWith('catalog.alert.petname.short', null, null, null, 'catalog.alert.purchaseerror.title');
        expect(purchaseState.openConfirmation).not.toHaveBeenCalled();
    });

    it('drops an approval result when the user has already changed catalog page', async () => {
        const currentOffer = offer(8);
        vi.mocked(useCatalogData).mockReturnValue({ currentOffer } as any);
        vi.mocked(useSellablePetPalette).mockReturnValue({ data: { palettes: [palette(8, 10)] } } as any);

        const { rerender } = render(<CatalogLayoutPetView page={{ ...page, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);

        fireEvent.change(await screen.findByRole('textbox'), { target: { value: 'Nova' } });
        fireEvent.click(screen.getByRole('button', { name: 'buy' }));
        expect(vi.mocked(SendMessageComposer)).toHaveBeenCalledTimes(1);

        rerender(<CatalogLayoutPetView page={{ ...page, pageId: 92, offers: [currentOffer] } as any} hideNavigation={() => undefined} />);
        act(() => approveNameHandler?.({ getParser: () => ({ result: 0 }) }));

        expect(purchaseState.openConfirmation).not.toHaveBeenCalled();
    });
});
