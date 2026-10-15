import { GetWiredContractContentsComposer, IWiredContractContents, UpdateWiredContractComposer, WiredContractContentsEvent, WiredContractOpenEvent, WiredContractUpdateResultEvent } from '@volt/renderer';
import { useEffect, useRef, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../api';
import { useMessageEvent, useRoom } from '../../hooks';
import { useWiredToolsState } from '../../hooks/wired-tools';
import { WiredContractEditorView } from './WiredContractEditorView';

/** Native contract editing is independent of stack Wired configuration and visitor trade offers. */
export const WiredContractView = () => {
    const { roomSession } = useRoom();
    const { roomSettings } = useWiredToolsState();
    const roomId = roomSession?.roomId ?? -1;
    const [contents, setContents] = useState<IWiredContractContents>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const requested = useRef<number>(null);
    const pending = useRef<number>(null);
    const generation = useRef(0);
    const canWrite = roomSettings.roomId === roomId && roomSettings.canModify;
    const close = () => { requested.current = null; pending.current = null; setContents(null); setSaving(false); setError(''); };
    useEffect(close, [roomId]);
    useMessageEvent<WiredContractOpenEvent>(WiredContractOpenEvent, event => {
        if (roomId === -1) return;
        const id = event.getParser().contractId;
        if (id <= 0) return;
        close(); requested.current = id;
        SendMessageComposer(new GetWiredContractContentsComposer(id));
    });
    useMessageEvent<WiredContractContentsEvent>(WiredContractContentsEvent, event => {
        const parser = event.getParser();
        if (roomId === -1 || parser.contractId !== requested.current) return;
        // Copy the parser's data; the connection can reuse parser instances for later messages.
        const definition = { youGiveRule: parser.definition.youGiveRule?.map(rule => ({ nodes: rule.nodes.map(node => ({ ...node, itemType: node.itemType ? { ...node.itemType } : null })) })) ?? null, youGetRule: parser.definition.youGetRule ? { nodes: parser.definition.youGetRule.nodes.map(node => ({ ...node, itemType: node.itemType ? { ...node.itemType } : null })) } : null };
        if ((parser.contractType !== 2 && !definition.youGiveRule) || (parser.contractType !== 0 && !definition.youGetRule)) return;
        generation.current++;
        setContents({ contractId: parser.contractId, contractType: parser.contractType, definition, paymentMode: parser.paymentMode, receiveText: parser.receiveText, layoutType: parser.layoutType, rewardCategory: parser.rewardCategory, showDialog: parser.showDialog, rewardText: parser.rewardText });
        setSaving(false); setError('');
    });
    useMessageEvent<WiredContractUpdateResultEvent>(WiredContractUpdateResultEvent, event => {
        const result = event.getParser();
        if (result.contractId !== pending.current || result.contractId !== requested.current) return;
        pending.current = null; setSaving(false);
        if (result.isSuccess) close(); else setError(LocalizeText(`wiredcontracts.error.${result.failCode}`));
    });
    if (!contents) return null;
    return <WiredContractEditorView key={`${contents.contractId}:${generation.current}`} contents={contents} canWrite={canWrite} saving={saving} error={error} onClose={close} onSave={next => {
        if (!canWrite || saving || next.contractId !== requested.current) return;
        pending.current = next.contractId; setSaving(true); setError('');
        SendMessageComposer(new UpdateWiredContractComposer(next));
    }} />;
};
