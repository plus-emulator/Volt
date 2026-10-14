import type { IWiredLinkNetwork } from '@volt/renderer';

/** WiredLinkController.as validName L278: a name is at most 255 characters and contains a non-space character. */
export const WIRED_LINK_NAME_MAX_LENGTH = 255;

export const isValidWiredLinkName = (name: string): boolean => name.length <= WIRED_LINK_NAME_MAX_LENGTH && /\S/.test(name);

/** WiredLinkController.as canConnect L322: network 0 is always allowed; another network is allowed unless it is linked in this room and is not the furni's current network. */
export const canConnectWiredLink = (networks: readonly IWiredLinkNetwork[], networkId: string, selectedNetworkId: string): boolean => {
    if (networkId === '0') return true;

    const network = networks.find((entry) => entry.id === networkId);

    return !!network && (!network.linkedInCurrentRoom || networkId === selectedNetworkId);
};

/** WiredLinkNetworkTableObject.compare: networks linked in this room first, then by name. */
export const sortWiredLinkNetworks = (networks: readonly IWiredLinkNetwork[]): IWiredLinkNetwork[] =>
    [...networks].sort((a, b) => {
        if (a.linkedInCurrentRoom !== b.linkedInCurrentRoom) return a.linkedInCurrentRoom ? -1 : 1;

        return a.name.localeCompare(b.name);
    });

/** Official English texts (external_flash_texts.txt wiredlink.*) for the status and error keys, used when a key has no translation. */
export const WIRED_LINK_MESSAGE_FALLBACKS: Readonly<Record<string, string>> = {
    'wiredlink.error.1': 'Only the furniture owner can configure this Link.',
    'wiredlink.error.2': 'This network no longer exists or does not belong to you.',
    'wiredlink.error.3': 'Enter a network name containing text, with no more than 255 characters.',
    'wiredlink.error.4': 'You already have a network with that name. Please choose another.',
    'wiredlink.error.5': 'Another Link is already connected to this network in this room.',
    'wiredlink.error.6': 'The network identifier is invalid. Close and reopen this Link to refresh it.',
    'wiredlink.error.7': 'This Link is no longer available in the room.',
    'wiredlink.error.8': 'You have reached the network limit for your account. Delete an unused network before creating another.',
    'wiredlink.success.1': 'Connection saved.',
    'wiredlink.success.2': 'Network created. Choose its row, click Use selected network, then Save.',
    'wiredlink.success.3': 'Network renamed. Existing connections are unchanged.',
    'wiredlink.success.4': 'Network deleted. Its Links have been disconnected.',
    'wiredlink.deleted': 'This network was deleted. Its Links have been disconnected.',
    'wiredlink.receive.local.info': 'This Link will receive its own messages and dataframes without a network. Connect a network when you want to exchange messages with other rooms.'
};
