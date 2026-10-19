import { INftWardrobeItem } from '@volt/renderer';
import { CSSProperties, FC } from 'react';
import { LocalizeText } from '../../api';
import { NativeText } from '../../common/native-text/NativeText';
import { ClassicScrollAreaView } from '../../common/scroll-area/ClassicScrollAreaView';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorHotLookThumbnailView } from './AvatarEditorHotLookThumbnailView';

// AIR WIN63-202610151745-318700621 wardrobe/NftOutfit.as initNftColors: button colour, active button colour per collection.
const COLLECTION_BUTTON_COLORS: Record<string, [number, number]> = {
    'habbo:avatar': [0xff6800, 0xff8823],
    'habbo:clothes': [0xa09ab3, 0xb3adc5],
    'habbo:avatar_genesis': [0x1d97a7, 0x3ca9b9]
};

// nft/NftWardrobeParamView.as getLocalizedCollectionName / getCollectionTextColor.
const COLLECTION_INFO: Record<string, { name: string; color: number }> = {
    'habbo:avatar': { name: 'wardrobe.token.avatar.name', color: 0xff8823 },
    'habbo:clothes': { name: 'wardrobe.token.clothing.name', color: 0xb3adc5 },
    'habbo:avatar_genesis': { name: 'wardrobe.token.crafted_avatar.name', color: 0x1acae1 }
};

const toCss = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/** The Avatar Collectibles tab (nft/NftAvatarsView.as, AvatarEditorContent nfts_content): the user's collectible avatars to choose from. */
export const AvatarEditorNftView: FC = () =>
{
    const { nftAvatars, selectedNft, selectNftAvatar } = useAvatarEditor();
    const selected = selectedNft ? nftAvatars.find((avatar) => avatar.id === selectedNft.id) : null;
    const info = selected && selectedNft.infoVisible ? COLLECTION_INFO[selected.contractKey] : null;
    const infoText = selected && selectedNft.infoVisible ? `${info ? LocalizeText(info.name) : 'null'} #${selected.id}` : null;

    const getButtonStyle = (avatar: INftWardrobeItem): CSSProperties =>
    {
        const colors = COLLECTION_BUTTON_COLORS[avatar.contractKey];

        if (!colors) return undefined;

        return { backgroundColor: toCss(selectedNft?.id === avatar.id ? colors[1] : colors[0]) };
    };

    return <div className="volt-avatar-editor-hotlooks volt-avatar-editor-nfts">
        <NativeText className="volt-avatar-editor-hotlooks-title" text={LocalizeText('avatareditor.nfts.title')} textStyle="u_bold" background={0xe9e9e1} overrides={{ size: 20 }} />
        <NativeText className="volt-avatar-editor-hotlooks-choose" text={LocalizeText('avatareditor.nfts.choose')} textStyle="u_regular" background={0xe9e9e1} />
        <div className="volt-avatar-editor-nfts-grid">
            <ClassicScrollAreaView contentClassName="volt-avatar-editor-nfts-items" scrollStep={50}>
                {nftAvatars.map((avatar, index) => <button
                    type="button"
                    key={`${avatar.id}:${index}`}
                    className={`volt-avatar-editor-hotlook volt-avatar-editor-nft${avatar.contractKey in COLLECTION_BUTTON_COLORS ? ' is-tinted' : ''}`}
                    style={getButtonStyle(avatar)}
                    aria-pressed={selectedNft?.id === avatar.id}
                    aria-label={LocalizeText('avatareditor.nfts.choose')}
                    onClick={() => selectNftAvatar(avatar)}
                >
                    {avatar.figureString && <AvatarEditorHotLookThumbnailView figure={avatar.figureString} gender={avatar.gender.toUpperCase()} />}
                </button>)}
            </ClassicScrollAreaView>
        </div>
        {infoText && <div className="volt-avatar-editor-nft-info">
            <NativeText text={infoText} textStyle="u_bold" background={0x454545} overrides={{ size: 10, color: info?.color ?? 0xffffff }} maxWidth={122} />
        </div>}
    </div>;
};
