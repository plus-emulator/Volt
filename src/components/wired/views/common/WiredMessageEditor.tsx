import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { localizeWithFallback } from '../../../../api';
import { Text, VoltCardView } from '../../../../common';
import { WiredNativeContext } from '../WiredNativeContext';
import { WiredShellHeaderView } from '../WiredShellHeaderView';
import { WiredText } from '../WiredText';
import { WiredMessagePreview } from './WiredMessagePreview';
import { WiredMessageToolbarButton } from './WiredMessageToolbarButton';
import popoutIcon from '../../../../assets/images/wired/native/message_editor_popout.png';

/** The editor's limits come from the boxes' TextAreaParam(40, -1, 8, -1, 400): eight lines, 400 characters. */
export const WIRED_MESSAGE_EDITOR_MAX_LENGTH = 400;
export const WIRED_MESSAGE_EDITOR_MAX_LINES = 8;

/** MessageEditorPalettePreset.COLOR_OPTIONS: the tag names the chat markup knows, with the swatch colour (0xRRGGBB). */
export const WIRED_MESSAGE_EDITOR_COLORS: ReadonlyArray<readonly [string, number]> = [
    ['red', 9115929],
    ['orange', 10238720],
    ['yellow', 7297792],
    ['green', 32768],
    ['cyan', 32639],
    ['blue', 19609],
    ['purple', 4980812],
    ['pink', 10228827]
];

/** The popup is 700 wide and its text area 140 tall (MessageEditorPopupPreset). */
const POPUP_WIDTH = 700;
const EDITOR_HEIGHT = 140;
const DEFAULT_COLOR_INDICATOR = 9115929;

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

const clampText = (value: string, maxLines: number, maxLength: number) => {
    let text = value.replace(/\r\n?/g, '\n');
    if (maxLines >= 0) text = text.split('\n').slice(0, maxLines).join('\n');
    return maxLength > 0 ? text.slice(0, maxLength) : text;
};

interface WiredMessageEditorProps {
    value: string;
    onChange: (value: string) => void;
    /** `TextPlaceholders.placeholderNames` of the box's context; "Add placeholder" is disabled without any. */
    placeholderNames?: readonly string[];
    rows?: number;
    previewStyle?: number;
    previewUsername?: string;
    previewType?: number;
    previewWidth?: number;
    maxLength?: number;
    /** AIR uses -1 for no line limit. */
    maxLines?: number;
    height?: number;
    disabled?: boolean;
    showCompactCounter?: boolean;
}

/**
 * MessageEditorPreset: a compact text field with a button that pops out the full editor - bold / italic /
 * underline / colour tags around the selection, "Align" (`[a]`) and "Add placeholder" (`$(name)`) at the caret,
 * and a character counter.
 */
export const WiredMessageEditor: FC<WiredMessageEditorProps> = ({ value, onChange, placeholderNames = [], rows = 4, previewStyle = 34, previewUsername = '', previewType = 0, previewWidth = 0, maxLength = WIRED_MESSAGE_EDITOR_MAX_LENGTH, maxLines = WIRED_MESSAGE_EDITOR_MAX_LINES, height, disabled = false, showCompactCounter = true }) => {
    const [open, setOpen] = useState(false);
    const [paletteOpen, setPaletteOpen] = useState(false);
    const [placeholderOpen, setPlaceholderOpen] = useState(false);
    const [colorIndicator, setColorIndicator] = useState(DEFAULT_COLOR_INDICATOR);
    const popupArea = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!open) {
            setPaletteOpen(false);
            setPlaceholderOpen(false);
        }
    }, [open]);

    useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    const change = (next: string) => {
        if (!disabled) onChange(clampText(next, maxLines, maxLength));
    };

    /** Puts `replacement` over the selection and leaves the caret/selection where the editor wants it. */
    const edit = (build: (before: string, selected: string, after: string) => { text: string; start: number; end: number }) => {
        if (disabled) return false;
        const area = popupArea.current;
        const start = area?.selectionStart ?? value.length;
        const end = area?.selectionEnd ?? value.length;
        const result = build(value.slice(0, start), value.slice(start, end), value.slice(end));
        const next = clampText(result.text, maxLines, maxLength);

        if (next !== result.text) return false;

        onChange(next);
        requestAnimationFrame(() => {
            area?.focus();
            area?.setSelectionRange(result.start, result.end);
        });

        return true;
    };

    /** MessageEditorPopupPreset.applyTag: wraps the selection; nothing happens without one. */
    const wrapSelection = (tag: string) => {
        const area = popupArea.current;

        if (!area || area.selectionStart === area.selectionEnd) return false;

        return edit((before, selected, after) => ({
            text: `${before}[${tag}]${selected}[/${tag}]${after}`,
            start: before.length + tag.length + 2,
            end: before.length + tag.length + 2 + selected.length
        }));
    };

    const insertAtCaret = (text: string) =>
        edit((before, _selected, after) => ({ text: `${before}${text}${after}`, start: before.length + text.length, end: before.length + text.length }));

    const popup = open && !disabled
        ? createPortal(
              <WiredNativeContext.Provider value={true}>
              <VoltCardView className="volt-wired volt-wired--official volt-wired--style-illumina volt-wired-message-editor" theme="primary-slim" isResizable={false} style={{ width: POPUP_WIDTH, minWidth: POPUP_WIDTH, maxWidth: POPUP_WIDTH }}>
                  <div role="dialog" aria-label={localizeWithFallback('wiredfurni.params.message_editor.title', 'Message editor')}>
                  <WiredShellHeaderView shellStyle="illumina" title={localizeWithFallback('wiredfurni.params.message_editor.title', 'Message editor')} onClose={() => setOpen(false)} menuItems={[]} showMenu={false} />
                  <div className="volt-wired-message-editor__body">
                  <div className="volt-wired-message-editor__toolbar">

                      <WiredMessageToolbarButton kind="left" width={17} text="B" bold title={localizeWithFallback('wiredfurni.params.message_editor.bold.tooltip', 'Bold')} onClick={() => wrapSelection('b')} />
                      <span className="volt-wired-message-editor__divider" />
                      <WiredMessageToolbarButton kind="middle" width={14} text="I" italic title={localizeWithFallback('wiredfurni.params.message_editor.italic.tooltip', 'Italic')} onClick={() => wrapSelection('i')} />
                      <span className="volt-wired-message-editor__divider" />
                      <WiredMessageToolbarButton kind="right" width={17} text="U" underline title={localizeWithFallback('wiredfurni.params.message_editor.underline.tooltip', 'Underline')} onClick={() => wrapSelection('u')} />
                      <WiredMessageToolbarButton className="is-color" kind="unetched" width={19} text="A" color={colorIndicator} title={localizeWithFallback('wiredfurni.params.message_editor.color.tooltip', 'Colour')} onClick={() => setPaletteOpen(current => !current)} />
                      <div className="volt-wired-message-editor__references">
                          <WiredMessageToolbarButton kind="plain" width={45} text={localizeWithFallback('wiredfurni.params.message_editor.align', 'Align')} title={localizeWithFallback('wiredfurni.params.message_editor.align.tooltip', 'Align')} onClick={() => insertAtCaret('[a]')} />
                          <WiredMessageToolbarButton kind="plain" width={105} text={localizeWithFallback('wiredfurni.params.message_editor.add_placeholder', 'Add placeholder')} disabled={placeholderNames.length === 0} onClick={() => setPlaceholderOpen(current => !current)} />
                      </div>
                      <span className="volt-wired-message-editor__counter"><WiredText soft text={`${value.length}/${maxLength}`} /></span>
                      {paletteOpen && (
                          <div className="volt-wired-message-editor__palette">
                              {WIRED_MESSAGE_EDITOR_COLORS.map(([name, color]) => (
                                  <button
                                      key={name}
                                      type="button"
                                      aria-label={name}
                                      className="volt-wired-message-editor__swatch"
                                      style={{ backgroundColor: hex(color) }}
                                      title={localizeWithFallback(`wiredfurni.params.message_editor.color.${name}.tooltip`, name)}
                                      onClick={() => {
                                          setPaletteOpen(false);
                                          if (wrapSelection(name)) setColorIndicator(color);
                                      }}
                                  />
                              ))}
                          </div>
                      )}
                      {placeholderOpen && placeholderNames.length > 0 && (
                          <div className="absolute right-0 top-full z-10 flex max-h-40 w-[180px] flex-col overflow-y-auto rounded border border-black bg-white">
                              {placeholderNames.map((name) => (
                                  <button
                                      key={name}
                                      type="button"
                                      className="px-1 text-left hover:bg-black/10"
                                      onClick={() => {
                                          setPlaceholderOpen(false);
                                          insertAtCaret(`$(${name})`);
                                      }}
                                  >
                                      {name}
                                  </button>
                              ))}
                          </div>
                      )}
                  </div>
                  <textarea
                      ref={popupArea}
                      className="volt-wired-message-editor__textarea"
                      style={{ height: EDITOR_HEIGHT }}
                      maxLength={maxLength > 0 ? maxLength : undefined}
                      value={value}
                      onChange={(event) => change(event.target.value)}
                  />
                  <WiredMessagePreview value={value} styleId={previewStyle} username={previewUsername} type={previewType} width={previewWidth} />
                  </div>
                  </div>
              </VoltCardView>
              </WiredNativeContext.Provider>,
              document.body
          )
        : null;

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-start gap-1">
                <textarea
                    className={`form-control form-control-sm flex-1${height === undefined ? ' volt-wired__resizable-textarea' : ''}`}
                    style={height === undefined ? undefined : { height, resize: 'none' }}
                    disabled={disabled}
                    maxLength={maxLength > 0 ? maxLength : undefined}
                    rows={rows}
                    value={value}
                    onChange={(event) => change(event.target.value)}
                />
                <button
                    type="button"
                    className="px-1"
                    disabled={disabled}
                    aria-label={localizeWithFallback('wiredfurni.params.message_editor.open.tooltip', 'Open the message editor')}
                    title={localizeWithFallback('wiredfurni.params.message_editor.open.tooltip', 'Open the message editor')}
                    onClick={() => setOpen((current) => !current)}
                >
                    <img src={popoutIcon} width={15} height={15} alt="" draggable={false} />
                </button>
            </div>
            {showCompactCounter && <Text small>{`${value.length}/${maxLength}`}</Text>}
            {popup}
        </div>
    );
};

/** The `$(name)` placeholders a box's wired context offers (context section 7); empty when the server sent none. */
export const getWiredTextPlaceholderNames = (contexts: ReadonlyArray<{ type: number }> | undefined | null): string[] => {
    const section = contexts?.find((context): context is { type: 7; placeholderNames: string[] } => context.type === 7);

    return section?.placeholderNames ?? [];
};
