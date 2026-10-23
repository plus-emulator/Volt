import { GetOfficialSongIdMessageComposer, GetSoundManager, MusicPriorities, OfficialSongIdMessageEvent, SongInfoReceivedEvent } from '@volt/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../api';
import { LayoutFurniImageView } from '../../../../../common';
import { NativeText } from '../../../../../common/native-text/NativeText';
import { getCatalogGridMetrics, useCatalogData, useCatalogDisplayPreferences, useMessageEvent, useVoltEvent } from '../../../../../hooks';
import { CatalogItemGridWidgetView } from '../widgets/CatalogItemGridWidgetView';
import { CatalogPurchaseSelectionPrompt } from '../widgets/CatalogPurchaseSelectionPrompt';
import { CatalogPurchaseWidgetView } from '../widgets/CatalogPurchaseWidgetView';
import { getCatalogPlainText } from '../../../catalogLocalization.helpers';
import { CatalogAirPriceDisplayView } from './CatalogAirPriceDisplayView';
import { CatalogAirShinyButton } from './CatalogAirShinyButton';
import { CatalogAirCentredView, CatalogAirStaticImageView } from './CatalogAirStaticImageView';
import { CatalogLayoutProps } from './CatalogLayout.types';

/** The catalog page colour behind the AIR text rasters. */
const PAGE_BACKGROUND = 0xe9e9e1;
/** playPreviewContainer: a #cccccc border style 2 at blend 0.5 over the page colour. */
const LISTEN_PANEL_BACKGROUND = 0xdbdbd7;

/**
 * AIR layout_soundmachine (360x460): itemGridWidget (0, 245, 360x180), the embedded songDiskProductViewWidget (0, 0, 360x240)
 * with ctlg_teaserimg_1, ctlg_product_name (u_bold, 10,16), ctlg_description (u_small, 10,34), ctlg_song_length (u_small,
 * 10,53) and playPreviewContainer (7, 195, 175x36), specialInfoWidget (110, 28) and purchaseWidget (0, 430).
 * ctlg_selectproduct is hidden in the layout and never shown.
 */
export const CatalogLayoutSoundMachineView: FC<CatalogLayoutProps> = (props) => {
    const { page = null } = props;
    const [songId, setSongId] = useState(-1);
    const [officialSongId, setOfficialSongId] = useState('');
    const [songLength, setSongLength] = useState<number | null>(null);
    const { currentOffer = null } = useCatalogData();
    const { density = 'standard', showTilePrices = true } = useCatalogDisplayPreferences();
    const gridMetrics = getCatalogGridMetrics(density);

    const updateSongLength = useCallback((id: number) => {
        if (id <= 0) return;

        const controller = GetSoundManager().musicController;
        const songInfo = controller?.getSongInfo(id);

        if (!songInfo) {
            controller?.requestSongInfoWithoutSamples(id);
            return;
        }

        setSongLength(Math.max(0, Math.floor(songInfo.length / 1000)));
    }, []);

    const previewSong = (previewSongId: number) => {
        if (previewSongId <= 0 || songLength === null) return;

        const controller = GetSoundManager().musicController;

        if (!controller) return;

        controller.playSong(previewSongId, MusicPriorities.PRIORITY_PURCHASE_PREVIEW, 15, 40, 0.5, 2);
    };

    useMessageEvent<OfficialSongIdMessageEvent>(OfficialSongIdMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser.officialSongId !== officialSongId) return;

        setSongId(parser.songId > 0 ? parser.songId : -1);
    });

    useVoltEvent<SongInfoReceivedEvent>(SongInfoReceivedEvent.SIR_TRAX_SONG_INFO_RECEIVED, (event) => {
        if (event.id !== songId) return;

        updateSongLength(event.id);
    });

    useEffect(() => {
        setSongLength(null);
        setSongId(-1);
        setOfficialSongId('');

        if (!currentOffer) return;

        const product = currentOffer.product;

        if (!product) return;

        if (product.extraParam.length > 0) {
            const id = parseInt(product.extraParam);

            if (id > 0) {
                setSongId(id);
            } else {
                setOfficialSongId(product.extraParam);
                SendMessageComposer(new GetOfficialSongIdMessageComposer(product.extraParam));
            }
        }

        return () => GetSoundManager().musicController?.stop(MusicPriorities.PRIORITY_PURCHASE_PREVIEW);
    }, [currentOffer]);

    useEffect(() => {
        updateSongLength(songId);
    }, [songId, updateSongLength]);

    useEffect(() => {
        return () => GetSoundManager().musicController?.stop(MusicPriorities.PRIORITY_PURCHASE_PREVIEW);
    }, []);

    const formattedSongLength = useMemo(() => {
        if (songLength === null) return '';

        const minutes = Math.floor(songLength / 60);
        const seconds = String(songLength % 60).padStart(2, '0');

        return LocalizeText('catalog.song.length', ['min', 'sec'], [String(minutes), seconds]);
    }, [songLength]);

    const teaserImage = page?.localization?.getImage(1) ?? null;
    const specialImage = page?.localization?.getImage(2) ?? null;
    const description = currentOffer ? currentOffer.localizationDescription : getCatalogPlainText(page?.localization?.getText(1) ?? '');
    const specialText = getCatalogPlainText(page?.localization?.getText(2) ?? '');

    return (
        <div className="volt-catalog-sound-layout">
            {/* songDiskProductViewWidget (0, 0, 360x240), embedded. */}
            <section className="volt-catalog-sound-product">
                {/* ctlg_teaserimg_1: the page teaser until an offer is picked, then the 64px furni image, both centred. */}
                {!currentOffer && !!teaserImage && <CatalogAirStaticImageView height={240} pivot="center" src={teaserImage} width={360} />}
                {currentOffer && (
                    <CatalogAirCentredView height={240} width={360}>
                        <LayoutFurniImageView
                            direction={90}
                            extraData={currentOffer.product.extraParam}
                            productClassId={currentOffer.product.productClassId}
                            productType={currentOffer.product.productType}
                        />
                    </CatalogAirCentredView>
                )}
                {currentOffer && (
                    <NativeText
                        background={PAGE_BACKGROUND}
                        className="volt-catalog-sound-title"
                        maxWidth={175}
                        overrides={{ color: 0x000000 }}
                        text={currentOffer.localizationName}
                        textStyle="u_bold"
                    />
                )}
                {!!description && (
                    <NativeText background={PAGE_BACKGROUND} className="volt-catalog-sound-description" overrides={{ color: 0x000000 }} text={description} textStyle="u_small" />
                )}
                {!!formattedSongLength && (
                    <NativeText background={PAGE_BACKGROUND} className="volt-catalog-sound-length" text={formattedSongLength} textStyle="u_small" />
                )}
                {currentOffer && <CatalogAirPriceDisplayView className="volt-catalog-sound-price" offer={currentOffer} />}
                {/* playPreviewContainer: shown once the picked disk carries a song id. */}
                {!!currentOffer?.product.extraParam.length && (
                    <div className="volt-catalog-sound-listen-panel">
                        <NativeText background={LISTEN_PANEL_BACKGROUND} className="volt-catalog-sound-listen-text" text={LocalizeText('play_preview')} textStyle="u_small" />
                        <CatalogAirShinyButton
                            caption={LocalizeText('play_preview_button')}
                            className="volt-catalog-sound-listen"
                            disabled={songId <= 0 || songLength === null}
                            rect={[102, 8, 66, 22]}
                            onClick={() => previewSong(songId)}
                        />
                    </div>
                )}
            </section>

            {/* specialInfoWidget (110, 28, 142x73): hidden once an offer is picked. */}
            {!currentOffer && (
                <div className="volt-catalog-sound-special-info">
                    {!!specialImage && <CatalogAirStaticImageView height={73} pivot="center" src={specialImage} width={142} />}
                    {!!specialText && (
                        <div className="volt-catalog-sound-special-text">
                            <NativeText
                                align="center"
                                background={PAGE_BACKGROUND}
                                overrides={{ size: 11, italic: true, color: 0x333333 }}
                                text={specialText}
                                textStyle="u_regular"
                                width={139}
                            />
                        </div>
                    )}
                </div>
            )}

            <div className="volt-catalog-sound-grid volt-catalog-grid-shell">
                <CatalogItemGridWidgetView
                    className={`volt-catalog-grid volt-catalog-grid-density-${density}`}
                    showPrices={showTilePrices}
                    {...gridMetrics}
                />
            </div>

            <div className="volt-catalog-sound-purchase volt-catalog-purchase-row">
                {currentOffer ? (
                    <div className="volt-catalog-offer-actions">
                        <CatalogPurchaseWidgetView />
                    </div>
                ) : (
                    <CatalogPurchaseSelectionPrompt />
                )}
            </div>
        </div>
    );
};
