import { GetNftTransferFeeMessageComposer, NftTransferFeeMessageEvent, NftTransferResultMessageEvent, TransferNftsMessageComposer } from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import { LocalizeText, NotificationBubbleType, SendMessageComposer } from '../../api';
import stampLarge from '../../assets/images/collectibles/collectables-icon-curator-stamp-large.png';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';
import { usePurse } from '../purse';

/** TransferNftsTab: the transfer fee, the linked wallet to move from and the transfer flow. */
export const useCollectiblesTransfer = (transferWallets: string[], stardustWallet: string) => {
    const [feePending, setFeePending] = useState(true);
    const [fee, setFee] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isTransferring, setIsTransferring] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const requestedRef = useRef(false);
    const { showSingleBubble = null, showConfirm = null } = useNotification();
    const { getCurrencyAmount } = usePurse();

    // initializeData
    useEffect(() => {
        if (requestedRef.current) return;

        requestedRef.current = true;
        SendMessageComposer(new GetNftTransferFeeMessageComposer());
    }, []);

    // initializeTransferWallets selects the first wallet.
    useEffect(() => {
        if (transferWallets) setSelectedIndex(transferWallets.length ? 0 : -1);
    }, [transferWallets]);

    useMessageEvent<NftTransferFeeMessageEvent>(NftTransferFeeMessageEvent, (event) => {
        setFee(event.getParser().transferFee);
        setFeePending(false);
    });

    useMessageEvent<NftTransferResultMessageEvent>(NftTransferResultMessageEvent, (event) => {
        const parser = event.getParser();
        const text = parser.success ? LocalizeText('collectibles.transfer.success') : LocalizeText('collectibles.transfer.error', ['id'], [String(parser.resultCode)]);

        showSingleBubble?.(text, NotificationBubbleType.INFO, stampLarge);
        setIsTransferring(false);
    });

    const selectedWallet = transferWallets && selectedIndex >= 0 && selectedIndex < transferWallets.length ? transferWallets[selectedIndex] : null;
    const ready = transferWallets !== null && !feePending;
    // updateTransferButtonState
    const canTransfer = fee <= getCurrencyAmount(1000) && !!stardustWallet && !isTransferring && selectedWallet !== null && !isConfirming;

    // The confirm is not modal, so onTransferConfirm reads the selected wallet when OK is pressed.
    const selectedWalletRef = useRef(selectedWallet);

    useEffect(() => {
        selectedWalletRef.current = selectedWallet;
    });

    // onTransferClicked + onTransferConfirm
    const transfer = () => {
        if (!selectedWallet) return;

        setIsConfirming(true);
        showConfirm?.(
            LocalizeText('collectibles.transfer.confirm'),
            () => {
                setIsConfirming(false);
                setIsTransferring(true);
                SendMessageComposer(new TransferNftsMessageComposer(selectedWalletRef.current));
            },
            () => setIsConfirming(false),
            null,
            null,
            LocalizeText('collectibles.transfer')
        );
    };

    return { ready, fee, selectedIndex, setSelectedIndex, canTransfer, transfer };
};
