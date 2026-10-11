import { FurnitureType, IWiredTradeNode, WIRED_TRADE_NODE_FURNI, WiredChestRewardEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, ProductImageUtility } from '../../../../api';
import { Button, Column, Flex, LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useMessageEvent, useRoom } from '../../../../hooks';

interface RewardReceipt {
    roomId: number;
    nodes: IWiredTradeNode[];
    text: string;
}

/**
 * The receipt the server sends after a chest pays out (reward contract or the Give from chest effects).
 * It belongs to the room it arrived in, and it opens by itself only when the server says so.
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

    useMessageEvent<WiredChestRewardEvent>(WiredChestRewardEvent, (event) => {
        if (roomId === -1) return;

        const parser = event.getParser();

        setReceipt({ roomId, nodes: [...parser.nodes], text: parser.text });
        setOpen(parser.openByDefault);
    });

    if (!receipt || receipt.roomId !== roomId) return null;

    const title = localizeWithFallback('wiredrewards.title', 'Rewards');
    const close = () => {
        setOpen(false);
        setReceipt(null);
    };

    if (!open) {
        return (
            <Button className="fixed bottom-20 right-4" onClick={() => setOpen(true)}>
                {title}
            </Button>
        );
    }

    return (
        <OctaneCardView theme="primary-slim" className="octane-wired-chest-reward" style={{ width: 340 }}>
            <OctaneCardHeaderView headerText={title} onCloseClick={close} />
            <OctaneCardContentView>
                <Column gap={2}>
                    <Text>{receipt.text || localizeWithFallback('wiredrewards.desc_default', 'Congratulations! You received some stuff :)')}</Text>
                    {receipt.nodes.map((node, index) => (
                        <Flex key={index} alignItems="center" gap={2}>
                            {node.kind === WIRED_TRADE_NODE_FURNI ? (
                                <img
                                    alt=""
                                    width={64}
                                    height={64}
                                    src={ProductImageUtility.getProductImageUrl(node.wallItem ? FurnitureType.WALL : FurnitureType.FLOOR, node.spriteId, '')}
                                />
                            ) : (
                                <LayoutCurrencyIcon type={node.currencyType} />
                            )}
                            <Text bold>{node.amount}</Text>
                        </Flex>
                    ))}
                    <Button onClick={close}>{localizeWithFallback('wiredrewards.ok', 'Yayy')}</Button>
                </Column>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
