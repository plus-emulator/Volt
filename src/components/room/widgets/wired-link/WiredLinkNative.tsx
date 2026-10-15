import { CSSProperties, FC, PropsWithChildren, ReactNode, useLayoutEffect, useRef, useState } from 'react';
import { NativeText } from '../../../../common/native-text/NativeText';
import blueAtlas from '../../../../assets/mod-tools/skins/habbo-blue-skin.png';
import borderWhiteXml from '../../../../assets/mod-tools/skins/skin-border_white.xml?raw';
import border4Xml from '../../../../assets/images/wired/native/link/border-4.xml?raw';
import borderColorlessXml from '../../../../assets/images/wired/native/link/border-colorless.xml?raw';
import borderShadowXml from '../../../../assets/images/wired/native/link/border-shadow.xml?raw';
import { parseNativeSkin } from '../../../mod-tools/native/NativeSkin';
import { NativeSkinView } from '../../../mod-tools/native/NativeSkinView';

const SKINS = {
    white: { skin: parseNativeSkin(borderWhiteXml), layout: 'border_white' },
    input: { skin: parseNativeSkin(border4Xml), layout: 'border_4' },
    colorless: { skin: parseNativeSkin(borderColorlessXml), layout: 'border_colorless' },
    shadow: { skin: parseNativeSkin(borderShadowXml), layout: 'border_colorless_dropshadow' }
};

/** The four border styles used by wired_link_view_xml / wired_link_connections_view_xml. */
export const WiredLinkBorder: FC<PropsWithChildren<{ kind: keyof typeof SKINS; color?: number; className?: string; style?: CSSProperties }>> = ({ kind, color, className = '', style, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    useLayoutEffect(() => {
        const element = ref.current;
        const update = () => setSize({ width: Math.round(element.clientWidth), height: Math.round(element.clientHeight) });
        const observer = new ResizeObserver(update);
        observer.observe(element);
        update();
        return () => observer.disconnect();
    }, []);
    return <div ref={ref} className={`volt-wired-link-air__border ${className}`} style={style}>
        {size.width > 0 && size.height > 0 && <NativeSkinView {...SKINS[kind]} atlas={blueAtlas} {...size} color={color} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />}
        {children}
    </div>;
};

export const WiredLinkText: FC<{ text: string; background?: number; color?: number; bold?: boolean; size?: number; underline?: boolean }> = ({ text, background = 0xe9e9e1, color = 0, bold = false, size = 12, underline = false }) =>
    <NativeText text={text} textStyle="u_regular" background={background} overrides={{ color, bold, size, underline }} />;

export const WiredLinkAction: FC<{ text: string; onClick: () => void; background?: number; color?: number; className?: string; disabled?: boolean }> = ({ text, onClick, background, color = 0x0000ee, className = '', disabled = false }) =>
    <button type="button" className={`volt-wired-link-air__action ${className}`} disabled={disabled} onClick={onClick}><WiredLinkText text={text} background={background} color={color} underline /></button>;

export interface WiredLinkColumn { title: string; fraction: number; left?: boolean }
/** TableView's 23px heading, 20px alternating rows and fixed column ratios. */
export const WiredLinkTable = <T,>({ columns, rows, rowKey, cell }: { columns: WiredLinkColumn[]; rows: T[]; rowKey: (row: T) => string; cell: (row: T, column: number, background: number) => ReactNode }) => {
    const grid = { gridTemplateColumns: columns.map(column => `${column.fraction}fr`).join(' ') };
    return <WiredLinkBorder kind="white" className="volt-wired-link-air__table">
        <div role="row" className="volt-wired-link-air__table-heading" style={grid}>
            {columns.map((column, index) => <div role="columnheader" key={index} style={{ textAlign: column.left ? 'left' : 'center' }}><WiredLinkText text={column.title} bold background={0xffffff} /></div>)}
        </div>
        <div className="volt-wired-link-air__table-scroll" role="rowgroup">
            {rows.map((row, index) => {
                const background = index % 2 ? 0xf9f9f9 : 0xeaeaea;
                return <div role="row" className="volt-wired-link-air__table-row" key={rowKey(row)} style={{ ...grid, backgroundColor: `#${background.toString(16)}` }}>
                    {columns.map((column, columnIndex) => <div role="cell" key={columnIndex} style={{ textAlign: column.left ? 'left' : 'center' }}>{cell(row, columnIndex, background)}</div>)}
                </div>;
            })}
        </div>
    </WiredLinkBorder>;
};
