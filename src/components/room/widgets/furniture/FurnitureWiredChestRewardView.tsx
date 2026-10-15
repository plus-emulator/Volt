import { AddLinkEventTracker, FurnitureType, ILinkEventTracker, IWiredTradeNode, RemoveLinkEventTracker, WIRED_TRADE_NODE_FURNI, WIRED_TRANSACTION_SUCCESS_REWARD, WiredTransactionSuccessEvent } from '@volt/renderer';
import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, ProductImageUtility, WIRED_CHEST_REWARD_LINK } from '../../../../api';
import { Button, Column, Flex, LayoutCurrencyIcon, VoltCardContentView, VoltCardHeaderView, VoltCardView, Text } from '../../../../common';
import { useMessageEvent, useRoom } from '../../../../hooks';

interface RewardReceipt {
    roomId: number;
    nodes: IWiredTradeNode[];
    text: string;
}

/**
 * The reward contents of WiredTransactionSuccess (125, successType 2). It belongs to the room it arrived in and opens
 * by itself only when openByDefault is set; otherwise the success notification opens it.
 */
export const FurnitureWiredChestRewardView: FC = () => {
    const { roomSession = null } = useRoom();
    const roomId = roomSession?.roomId ?? -1;
    const [receipt, setReceipt] = useState<RewardReceipt>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setReceipt(null);
        setOpen(false);
    }, [roomId]);

    useMessageEvent<WiredTransactionSuccessEvent>(WiredTransactionSuccessEvent, (event) => {
        if (roomId === -1) return;

        const parser = event.getParser();

        if (parser.successType !== WIRED_TRANSACTION_SUCCESS_REWARD || !parser.hasRewardContents) return;

        setReceipt({ roomId, nodes: [...parser.rewardRule.nodes], text: parser.rewardText });
        setOpen(parser.openByDefault);
    });

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                if (url === WIRED_CHEST_REWARD_LINK) setOpen(true);
            },
            eventUrlPrefix: 'wiredchestreward/',
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    if (!receipt || receipt.roomId !== roomId) return null;

    const title = localizeWithFallback('wiredrewards.title', 'Rewards');
    const close = () => {
        setOpen(false);
        setReceipt(null);
    };

    if (!open) return null;

    return (
        <VoltCardView theme="primary-slim" className="volt-wired-chest-reward" style={{ width: 340 }}>
            <VoltCardHeaderView headerText={title} onCloseClick={close} />
            <VoltCardContentView>
                <Column gap={2}>
                    <Text>{receipt.text || localizeWithFallback('wiredrewards.desc_default', 'Congratulations! You received some stuff :)')}</Text>
                    {receipt.nodes.map((node, index) => (
                        <Flex key={index} alignItems="center" gap={2}>
                            {node.type === WIRED_TRADE_NODE_FURNI && node.itemType ? (
                                <img
                                    alt=""
                                    width={64}
                                    height={64}
                                    src={ProductImageUtility.getProductImageUrl(
                                        node.itemType.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR,
                                        node.itemType.typeId,
                                        node.itemType.legacyPosterId,
                                    )}
                                />
                            ) : (
                                <LayoutCurrencyIcon type={-1} />
                            )}
                            <Text bold>{node.amount}</Text>
                        </Flex>
                    ))}
                    <Button onClick={close}>{localizeWithFallback('wiredrewards.ok', 'Yayy')}</Button>
                </Column>
            </VoltCardContentView>
        </VoltCardView>
    );
};
