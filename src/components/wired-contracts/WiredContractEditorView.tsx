import { FurnitureType, GetSessionDataManager, IFurnitureData, IWiredContractContents, IWiredContractNode, IWiredContractRule } from '@volt/renderer';
import { FC, PropsWithChildren, ReactNode, useMemo, useState } from 'react';
import { LocalizeText, localizeWithFallback } from '../../api';
import { LayoutFurniImageView, VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../common';
import { HabboDropMenuView } from '../../common/dropmenu/HabboDropMenuView';
import { NativeText } from '../../common/native-text/NativeText';
import { ChestButton } from '../room/widgets/furniture/ChestButton';
import creditsIcon from '../../assets/images/inventory/trading/credits-icon.png';
import { parseNativeSkin } from '../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../mod-tools/native/NativeSkinView';
import blueAtlas from '../../assets/mod-tools/skins/habbo-blue-skin.png';
import ubuntuAtlas from '../../assets/mod-tools/skins/habbo-ubuntu-skin.png';
import ruleXml from '../../assets/images/wired/native/contracts/border-5.xml?raw';
import nodeXml from '../../assets/images/wired/native/link/border-4.xml?raw';
import closeXml from '../../assets/images/wired/native/contracts/border-12.xml?raw';
import tableXml from '../../assets/images/wired/native/contracts/border-white.xml?raw';
import plusXml from '../../assets/images/wired/native/contracts/plus.xml?raw';
import closeIcon from '../../assets/images/wired/native/contracts/close.png';
import './WiredContractEditorView.css';

const SKINS = { rule: parseNativeSkin(ruleXml), node: parseNativeSkin(nodeXml), close: parseNativeSkin(closeXml), table: parseNativeSkin(tableXml), plus: parseNativeSkin(plusXml) };
const Skin: FC<{ type: keyof typeof SKINS; width: number; height: number; color?: number; state?: string }> = ({ type, width, height, color, state }) => <NativeSkinView skin={SKINS[type]} layout={{ rule: 'border_5', node: 'border_4', close: 'border_12', table: 'border_white', plus: 'button_plus_3' }[type]} atlas={type === 'plus' ? ubuntuAtlas : blueAtlas} width={width} height={height} color={color} state={state} className="wired-contract__skin" />;
const CloseIcon = () => <><Skin type="close" width={15} height={15} color={0xdddddd} /><img src={closeIcon} alt="" /></>;
const AddNode: FC<{ onClick: () => void }> = ({ onClick }) => {
    const [state, setState] = useState('default');
    return <button type="button" className="wired-contract__add-node" aria-label={localizeWithFallback('wiredcontracts.add_element.title', 'Add element')} onMouseEnter={() => setState('hovering')} onMouseLeave={() => setState('default')} onMouseDown={() => setState('pressed')} onMouseUp={() => setState('hovering')} onClick={onClick}><Skin type="plus" width={23} height={22} state={state} /></button>;
};

const L = LocalizeText;
const T: FC<{ text: string; bold?: boolean; background?: number }> = ({ text, bold, background = 0xe9e9e1 }) => <NativeText text={text} background={background} textStyle={bold ? 'u_bold' : 'u_regular'} />;
const Section: FC<PropsWithChildren<{ title: string; disabled?: boolean; headerOption?: ReactNode }>> = ({ title, disabled, children, headerOption }) => <fieldset className="wired-contract__section" disabled={disabled}><div className="wired-contract__section-title"><T text={title} bold />{headerOption}</div>{children}</fieldset>;
const CollapsedSection: FC<PropsWithChildren<{ title: string; disabled?: boolean }>> = ({ title, disabled, children }) => {
    const [open, setOpen] = useState(false);
    return <fieldset className="wired-contract__section" disabled={disabled}><button className="wired-contract__fold" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}><T text={title} bold /><span aria-hidden>{open ? '▾' : '▸'}</span></button><div hidden={!open}>{children}</div></fieldset>;
};
const Footer: FC<{ disabled?: boolean; onSave: () => void; onClose: () => void }> = ({ disabled, onSave, onClose }) => <div className="wired-contract__footer"><ChestButton wide disabled={disabled} onClick={onSave}>{L('wiredfurni.ready')}</ChestButton><ChestButton wide onClick={onClose}>{L('cancel')}</ChestButton></div>;
const Frame: FC<PropsWithChildren<{ title: string; width?: number; onClose: () => void; footer: ReactNode; className?: string }>> = ({ title, width = 262, onClose, footer, className = '', children }) => <VoltCardView frameStyle={3} isResizable={false} theme="primary-slim" offsetLeft={width === 420 ? 375 : 0} className={`wired-contract ${className}`} style={{ width }}><VoltCardHeaderView headerText={title} onCloseClick={onClose} /><VoltCardContentView>{children}{footer}</VoltCardContentView></VoltCardView>;

interface RuleViewProps {
    title: string;
    rule: IWiredContractRule;
    onEdit: (index: number | null) => void;
    onChange: (rule: IWiredContractRule) => void;
    onRemove?: () => void;
}
const RuleView: FC<RuleViewProps> = ({ title, rule, onEdit, onChange, onRemove }) => <div className="wired-contract__rule">
    <Skin type="rule" width={246} height={68} color={0xdadada} /><T text={title} background={0xdadada} />
    {onRemove && <button className="wired-contract__remove-rule" type="button" aria-label={localizeWithFallback('wiredcontracts.remove_rule', 'Remove option')} onClick={onRemove}><CloseIcon /></button>}
    <div className="wired-contract__nodes">{rule.nodes.map((node, index) => <div className="wired-contract__node" key={index}>
        <button type="button" className="wired-contract__node-edit" aria-label={localizeWithFallback('wiredcontracts.edit_element.title', 'Edit element')} onClick={() => onEdit(index)}>
            <Skin type="node" width={42} height={42} color={0xeeeeee} />{node.type === 0 ? <img src={creditsIcon} alt={localizeWithFallback('wiredcontracts.element.type.0', 'Credits')} /> : node.itemType && <LayoutFurniImageView productType={node.itemType.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR} productClassId={node.itemType.typeId} extraData={node.itemType.legacyPosterId} direction={2} />}
            {(node.type === 0 || node.amount !== 1) && <span className="wired-contract__quantity">{node.amount}</span>}
        </button>
        <button type="button" className="wired-contract__remove-node" aria-label={localizeWithFallback('wiredcontracts.remove_element', 'Remove element')} onClick={() => onChange({ nodes: rule.nodes.filter((_, position) => position !== index) })}><CloseIcon /></button>
    </div>)}{rule.nodes.length < 5 && <AddNode onClick={() => onEdit(null)} />}</div>
</div>;

export interface WiredContractEditorViewProps {
    contents: IWiredContractContents;
    canWrite: boolean;
    saving?: boolean;
    error?: string;
    onSave: (contents: IWiredContractContents) => void;
    onClose: () => void;
}

/** AIR PaymentContract / TradeContract / RewardContract: standalone 262px Ubuntu frames. */
export const WiredContractEditorView: FC<WiredContractEditorViewProps> = ({ contents, canWrite, saving = false, error, onSave, onClose }) => {
    const [draft, setDraft] = useState(() => ({ ...contents, definition: { youGiveRule: contents.definition.youGiveRule?.length ? contents.definition.youGiveRule : contents.contractType !== 2 ? [{ nodes: [] }] : null, youGetRule: contents.definition.youGetRule } }));
    const [editing, setEditing] = useState<{ side: 'give' | 'get'; rule: number; node: number | null }>(null);
    const patch = (change: Partial<IWiredContractContents>) => setDraft(current => ({ ...current, ...change }));
    const updateRule = (side: 'give' | 'get', index: number, rule: IWiredContractRule) => setDraft(current => ({ ...current, definition: { ...current.definition, ...(side === 'give' ? { youGiveRule: current.definition.youGiveRule.map((item, position) => position === index ? rule : item) } : { youGetRule: rule }) } }));
    const selectedRule = editing ? editing.side === 'give' ? draft.definition.youGiveRule[editing.rule] : draft.definition.youGetRule : null;
    const hasCredit = draft.definition.youGetRule?.nodes.some(node => node.type === 0) ?? false;
    const paymentRules = <>{draft.definition.youGiveRule?.map((rule, index) => <RuleView key={index} title={L('wiredcontracts.payment_rule', ['i'], [String(index + 1)])} rule={rule} onEdit={node => setEditing({ side: 'give', rule: index, node })} onChange={rule => updateRule('give', index, rule)} onRemove={index ? () => setDraft(current => ({ ...current, definition: { ...current.definition, youGiveRule: current.definition.youGiveRule.filter((_, position) => position !== index) } })) : undefined} />)}<ChestButton wide disabled={(draft.definition.youGiveRule?.length ?? 0) >= 3} onClick={() => setDraft(current => ({ ...current, definition: { ...current.definition, youGiveRule: [...current.definition.youGiveRule, { nodes: [] }] } }))}>{L('wiredcontracts.payment_add_more')}</ChestButton></>;
    const rewardRule = draft.definition.youGetRule && <RuleView title={L('wiredcontracts.reward_rule')} rule={draft.definition.youGetRule} onEdit={node => setEditing({ side: 'get', rule: 0, node })} onChange={rule => updateRule('get', 0, rule)} />;
    const save = () => {
        if (!canWrite || saving) return;
        onSave({ ...draft, definition: { ...draft.definition, youGiveRule: draft.definition.youGiveRule?.filter(rule => rule.nodes.length > 0) ?? null } });
    };
    return <>
        <Frame title={L(`wiredcontracts.${['payment', 'trade', 'reward'][draft.contractType]}_contract.title`)} onClose={onClose} footer={<Footer disabled={!canWrite || saving} onSave={save} onClose={onClose} />}>
            <fieldset disabled={!canWrite || saving} className="wired-contract__editable">
                {draft.contractType === 0 && <>
                    <Section title={L('wiredcontracts.payment_contract.mode')}>{[0, 1].map(mode => <label className="wired-contract__choice" key={mode}><input type="radio" name="wired-contract-payment-mode" checked={draft.paymentMode === mode} onChange={() => patch({ paymentMode: mode })} /><T text={L(`wiredcontracts.payment_contract.mode.${mode}`)} /></label>)}</Section>
                    <Section title={L('wiredcontracts.payment_contract.receive_text')}><input aria-label={L('wiredcontracts.payment_contract.receive_text')} className="wired-contract__input" maxLength={60} value={draft.receiveText} onChange={event => patch({ receiveText: event.target.value })} /></Section>
                </>}
                {draft.contractType !== 2 && <Section title={L('wiredcontracts.payment_requirements')} disabled={draft.contractType === 0 && draft.paymentMode !== 1}>{paymentRules}</Section>}
                {draft.contractType !== 0 && <Section title={L('wiredcontracts.reward_requirements')}>{rewardRule}</Section>}
                {draft.contractType === 0 && <CollapsedSection title={L('wiredcontracts.payment_contract.layout_type')}><HabboDropMenuView skinStyle={3} label={L('wiredcontracts.payment_contract.layout_type')} disabled={!canWrite || saving} value={draft.layoutType} options={['generic', 'games'].map((value, index) => ({ value, label: L(`wiredcontracts.payment_contract.layout_type.${index}`) }))} onSelect={layoutType => patch({ layoutType })} /></CollapsedSection>}
                {draft.contractType === 2 && <>
                    <Section title={L('wiredcontracts.reward_contract.reward_popup')}><textarea className="wired-contract__input" style={{ height: 52 }} maxLength={200} aria-label={L('wiredcontracts.reward_contract.reward_popup.text.tooltip')} title={L('wiredcontracts.reward_contract.reward_popup.text.tooltip')} value={draft.rewardText} onChange={event => patch({ rewardText: event.target.value })} /><label className="wired-contract__choice"><input type="checkbox" checked={draft.showDialog} onChange={event => patch({ showDialog: event.target.checked })} /><T text={L('wiredcontracts.reward_contract.reward_popup.show_by_default')} /></label></Section>
                    <CollapsedSection disabled={!hasCredit} title={L('wiredcontracts.reward_contract.earnings_category')}><HabboDropMenuView<number> skinStyle={3} label={L('wiredcontracts.reward_contract.earnings_category')} disabled={!canWrite || saving || !hasCredit} value={draft.rewardCategory} options={[11, 13].map(value => ({ value, label: L(`wiredfurni.params.earnings_category.${value}`) }))} onSelect={rewardCategory => patch({ rewardCategory })} /></CollapsedSection>
                </>}
            </fieldset>
            {error && <div role="alert" className="wired-contract__error">{error}</div>}
        </Frame>
        {editing && selectedRule && <ContractElementEditor key={`${editing.side}:${editing.rule}:${editing.node}`} initial={editing.node === null ? null : selectedRule.nodes[editing.node]} canWrite={canWrite && !saving} onClose={() => setEditing(null)} onSave={node => {
            updateRule(editing.side, editing.rule, { nodes: editing.node === null ? [...selectedRule.nodes, node] : selectedRule.nodes.map((item, index) => index === editing.node ? node : item) }); setEditing(null);
        }} />}
    </>;
};

interface Candidate { itemType: NonNullable<IWiredContractNode['itemType']>; code: string; name: string; tradeable: boolean; }
const POSTER_IDS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,83,500,501,502,503,504,505,506,507,508,509,510,511,512,513,514,515,516,517,518,520,521,522,523,1000,1001,1002,1003,1004,1005,1006,2000,2001,2002,2003,2004,2005,2006,2007,2008];
export const contractItemCandidates = (items: IFurnitureData[]): Candidate[] => items.flatMap(item => {
    if (!item.className) return [];
    const itemType = { isWallItem: item.type === FurnitureType.WALL, typeId: item.id, legacyPosterId: '' };
    if (itemType.isWallItem && item.className === 'poster') return POSTER_IDS.map(id => ({ itemType: { ...itemType, legacyPosterId: String(id) }, code: `poster*${id}`, name: L(`poster_${id}_name`), tradeable: item.tradeable !== false }));
    return [{ itemType, code: item.fullName || item.className, name: item.name || item.className, tradeable: item.tradeable !== false }];
}).sort((a, b) => a.name.localeCompare(b.name));
const itemKey = (item: IWiredContractNode['itemType']) => item ? `${item.isWallItem}:${item.typeId}:${item.legacyPosterId || ''}` : '';

/** AIR AddEditContractElement: type/amount across the top; code, search and a 234px furniture table. */
export const ContractElementEditor: FC<{ initial: IWiredContractNode | null; canWrite: boolean; onSave: (node: IWiredContractNode) => void; onClose: () => void }> = ({ initial, canWrite, onSave, onClose }) => {
    const [type, setType] = useState<0 | 1>(initial?.type ?? 0);
    const [amount, setAmount] = useState(String(initial?.amount ?? 1));
    const [selected, setSelected] = useState(initial?.itemType ?? null);
    const [query, setQuery] = useState('');
    const [scrollTop, setScrollTop] = useState(0);
    const candidates = useMemo(() => contractItemCandidates(GetSessionDataManager().getAllFurnitureData() ?? []), []);
    const selectedCandidate = candidates.find(candidate => itemKey(candidate.itemType) === itemKey(selected));
    const filtered = useMemo(() => query.length < 2 ? candidates : candidates.filter(candidate => `${candidate.name} ${candidate.code}`.toLowerCase().includes(query.toLowerCase())), [candidates, query]);
    const number = Number(amount);
    const valid = /^\d+$/.test(amount) && Number.isInteger(number) && number >= 1 && number <= (type === 0 ? 100000 : 500) && (type === 0 || !!selectedCandidate?.tradeable);
    const first = Math.max(0, Math.floor(scrollTop / 20) - 2);
    const visible = filtered.slice(first, first + 18);
    return <Frame width={420} className="wired-contract--element" title={L(initial ? 'wiredcontracts.edit_element.title' : 'wiredcontracts.add_element.title')} onClose={onClose} footer={<Footer disabled={!canWrite || !valid} onClose={onClose} onSave={() => { if (canWrite && valid) onSave({ type, amount: number, itemType: type === 1 ? selected : null }); }} />}>
        <fieldset disabled={!canWrite} className="wired-contract__editable">
            <div className="wired-contract__element-top"><Section title={L('wiredcontracts.element.type')}>{([0, 1] as const).map(value => <label className="wired-contract__choice" key={value}><input type="radio" name="wired-contract-element-type" checked={type === value} onChange={() => setType(value)} /><T text={L(`wiredcontracts.element.type.${value}`)} /></label>)}</Section><Section title={L('wiredcontracts.element.amount')}><input className="wired-contract__input" style={{ width: 88 }} inputMode="numeric" value={amount} aria-invalid={!valid} aria-label={L('wiredcontracts.element.amount')} onChange={event => setAmount(event.target.value)} /></Section></div>
            <Section title={L('wiredcontracts.element.itemtype.selection')} disabled={type !== 1} headerOption={selected && <span className="wired-contract__selected-icon"><LayoutFurniImageView productType={selected.isWallItem ? FurnitureType.WALL : FurnitureType.FLOOR} productClassId={selected.typeId} extraData={selected.legacyPosterId} direction={2} /></span>}>
                <label className="wired-contract__named"><T text={L('wiredcontracts.element.itemtype.furni_code')} /><input className="wired-contract__input" style={{ width: 158 }} aria-label={L('wiredcontracts.element.itemtype.furni_code')} readOnly value={selectedCandidate?.code ?? ''} /></label>
                <label className="wired-contract__named"><T text={L('wiredcontracts.element.itemtype.search')} /><input className="wired-contract__input" style={{ width: 158 }} aria-label={L('wiredcontracts.element.itemtype.search')} maxLength={220} value={query} onChange={event => { setQuery(event.target.value); setScrollTop(0); }} /></label>
                <div className="wired-contract__item-table"><Skin type="table" width={404} height={234} />
                    <div className="wired-contract__item-heading">{['furni_name', 'furni_code', 'furni_type'].map(key => <span key={key}><T text={L(`wiredcontracts.element.itemtype.col.${key}`)} bold background={0xffffff} /></span>)}</div>
                    <div className="wired-contract__item-scroll" onScroll={event => setScrollTop(event.currentTarget.scrollTop)}><div role="listbox" aria-label={L('wiredcontracts.element.itemtype.selection')} style={{ height: filtered.length * 20, position: 'relative' }}>{visible.map((candidate, index) => <button role="option" aria-selected={itemKey(candidate.itemType) === itemKey(selected)} key={itemKey(candidate.itemType)} type="button" className="wired-contract__item-row" data-even={(first + index) % 2 === 0} style={{ top: (first + index) * 20 }} onClick={() => setSelected(candidate.itemType)}><span>{candidate.name}</span><span>{candidate.code}</span><span>{L(candidate.itemType.isWallItem ? 'inventory.furni.tab.wall' : 'inventory.furni.tab.floor')}</span></button>)}</div></div>
                </div>
                <T text={L('wiredcontracts.element.show_count', ['amount'], [String(filtered.length)])} />
            </Section>
        </fieldset>
    </Frame>;
};
