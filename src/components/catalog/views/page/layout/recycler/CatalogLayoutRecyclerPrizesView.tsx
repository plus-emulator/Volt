import { GetRecyclerPrizesMessageComposer, RecyclerPrizeLevel, RecyclerPrizeProduct, RecyclerPrizesMessageEvent } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { GetFurnitureData, GetImageIconUrlForProduct, LocalizeText, SendMessageComposer } from '../../../../../../api';
import { ClassicScrollAreaView, LayoutFurniImageView, LayoutGridItem } from '../../../../../../common';
import { NativeText } from '../../../../../../common/native-text/NativeText';
import { useMessageEvent } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';
import bronzeStar from '../../../../../../assets/images/catalog/air/recycler/star-small-bronze.png';
import diamondStar from '../../../../../../assets/images/catalog/air/recycler/star-small-diamond.png';
import goldStar from '../../../../../../assets/images/catalog/air/recycler/star-small-gold.png';
import greenStar from '../../../../../../assets/images/catalog/air/recycler/star-small-green.png';
import greyStar from '../../../../../../assets/images/catalog/air/recycler/star-small-grey.png';
import pinkStar from '../../../../../../assets/images/catalog/air/recycler/star-small-pink.png';
import rubyStar from '../../../../../../assets/images/catalog/air/recycler/star-small-ruby.png';
import silverStar from '../../../../../../assets/images/catalog/air/recycler/star-small-silver.png';

/** RecyclerPrizesCatalogWidget.STAR_LEVELS: star_small_<level> for prize levels 1 to 8. */
const STARS = [bronzeStar, silverStar, goldStar, diamondStar, rubyStar, pinkStar, greenStar, greyStar];

/** The page colour behind the product texts; the level header sits on the white border style 0. */
const PAGE_BACKGROUND = 0xe9e9e1;
const LEVEL_BACKGROUND = 0xffffff;

const getPrizeName = (product: RecyclerPrizeProduct) => GetFurnitureData(product.productClassId, product.productType)?.name || product.name;

/**
 * AIR layout_recycler_prizes (1685, 659px shrunk to 460): productView (0, 0, 360x240) shows the selected prize, and itemList
 * (0, 237, 360x223) holds one recyclerPrizesWidgetLevelItem per level, 11px apart.
 */
export const CatalogLayoutRecyclerPrizesView: FC<CatalogLayoutProps> = ({ page }) => {
    const [levels, setLevels] = useState<RecyclerPrizeLevel[] | null>(null);
    const [selected, setSelected] = useState<RecyclerPrizeProduct>(null);

    useMessageEvent<RecyclerPrizesMessageEvent>(RecyclerPrizesMessageEvent, (event) => {
        const sorted = [...event.getParser().levels].sort((first, second) => first.levelId - second.levelId);

        setLevels(sorted);
        // onPrizesReceived: the first prize of the first level is selected.
        setSelected(sorted[0]?.products[0] ?? null);
    });

    useEffect(() => {
        SendMessageComposer(new GetRecyclerPrizesMessageComposer());
    }, []);

    const specialImage = page?.localization?.getImage(2);

    return (
        <div className="volt-catalog-recycler-prizes-air">
            {/* specialInfoWidget (100, 46, 142x73): ctlg_special_img, bottom centred, under the product view. */}
            {!!specialImage && <img alt="" className="volt-catalog-recycler-prizes-special" draggable={false} src={specialImage} />}
            <div className="volt-catalog-recycler-prizes-product">
                {selected && (
                    <>
                        <div className="volt-catalog-recycler-prizes-preview">
                            <LayoutFurniImageView direction={2} productClassId={selected.productClassId} productType={selected.productType} scale={1} />
                        </div>
                        <NativeText background={PAGE_BACKGROUND} className="volt-catalog-recycler-prizes-name" text={getPrizeName(selected)} textStyle="u_bold" />
                    </>
                )}
            </div>
            <ClassicScrollAreaView className="volt-catalog-recycler-prizes-list">
                {(levels ?? []).map((level) => (
                    <section key={level.levelId} className="volt-catalog-recycler-prize-level">
                        <div className="volt-catalog-recycler-prize-header">
                            <img alt="" draggable={false} src={STARS[level.levelId - 1] ?? STARS[STARS.length - 1]} />
                            <NativeText background={LEVEL_BACKGROUND} text={LocalizeText(`recycler.prizes.category.${level.levelId}`)} textStyle="u_bold" />
                            {level.levelId > 1 && (
                                <>
                                    <NativeText background={LEVEL_BACKGROUND} text=" -" textStyle="u_regular" />
                                    <NativeText
                                        background={LEVEL_BACKGROUND}
                                        text={LocalizeText('recycler.prizes.odds', ['odds'], [`1:${level.chance}`])}
                                        textStyle="u_italic"
                                    />
                                </>
                            )}
                        </div>
                        <div className="volt-catalog-recycler-prize-grid">
                            {level.products.map((product, index) => (
                                <LayoutGridItem
                                    key={`${product.productClassId}-${index}`}
                                    className="volt-catalog-recycler-prize-tile"
                                    itemActive={selected === product}
                                    itemImage={GetImageIconUrlForProduct(product.productType, product.productClassId)}
                                    title={getPrizeName(product)}
                                    onClick={() => setSelected(product)}
                                />
                            ))}
                        </div>
                    </section>
                ))}
            </ClassicScrollAreaView>
        </div>
    );
};
