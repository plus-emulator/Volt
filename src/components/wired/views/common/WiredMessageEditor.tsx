import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { localizeWithFallback } from '../../../../api';
import { Text } from '../../../../common';
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
export const WiredMessageEditor: FC<WiredMessageEditorProps> = ({ value, onChange, placeholderNames = [], rows = 4, maxLength = WIRED_MESSAGE_EDITOR_MAX_LENGTH, maxLines = WIRED_MESSAGE_EDITOR_MAX_LINES, height, disabled = false, showCompactCounter = true }) => {
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
              <div
                  className="fixed left-1/2 top-1/2 z-[10000] -translate-x-1/2 -translate-y-1/2 rounded border border-black bg-[#e9e9e1] p-2 shadow-lg"
                  style={{ width: POPUP_WIDTH, maxWidth: '96vw' }}
              >
                  <div className="mb-2 flex items-center justify-between">
                      <Text bold>{localizeWithFallback('wiredfurni.params.message_editor.title', 'Message editor')}</Text>
                      <button type="button" aria-label="close" className="px-1" onClick={() => setOpen(false)}>
                          x
                      </button>
                  </div>
                  <div className="relative mb-1 flex items-center gap-1">
                      <button type="button" className="px-2 font-bold" title={localizeWithFallback('wiredfurni.params.message_editor.bold.tooltip', 'Bold')} onClick={() => wrapSelection('b')}>
                          B
                      </button>
                      <button type="button" className="px-2 italic" title={localizeWithFallback('wiredfurni.params.message_editor.italic.tooltip', 'Italic')} onClick={() => wrapSelection('i')}>
                          I
                      </button>
                      <button type="button" className="px-2 underline" title={localizeWithFallback('wiredfurni.params.message_editor.underline.tooltip', 'Underline')} onClick={() => wrapSelection('u')}>
                          U
                      </button>
                      <button
                          type="button"
                          className="px-2 font-bold"
                          style={{ color: hex(colorIndicator) }}
                          title={localizeWithFallback('wiredfurni.params.message_editor.color.tooltip', 'Colour')}
                          onClick={() => setPaletteOpen((current) => !current)}
                      >
                          A
                      </button>
                      <div className="flex flex-1 items-center justify-center gap-1">
                          <button
                              type="button"
                              className="px-2"
                              title={localizeWithFallback('wiredfurni.params.message_editor.align.tooltip', 'Align')}
                              onClick={() => insertAtCaret('[a]')}
                          >
                              {localizeWithFallback('wiredfurni.params.message_editor.align', 'Align')}
                          </button>
                          <button
                              type="button"
                              className="px-2"
                              disabled={placeholderNames.length === 0}
                              onClick={() => setPlaceholderOpen((current) => !current)}
                          >
                              {localizeWithFallback('wiredfurni.params.message_editor.add_placeholder', 'Add placeholder')}
                          </button>
                      </div>
                      <Text small>{`${value.length}/${maxLength}`}</Text>
                      {paletteOpen && (
                          <div className="absolute left-0 top-full z-10 flex gap-1 rounded border border-black bg-white p-1">
                              {WIRED_MESSAGE_EDITOR_COLORS.map(([name, color]) => (
                                  <button
                                      key={name}
                                      type="button"
                                      aria-label={name}
                                      className="h-4 w-4 border border-black"
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
                      className="form-control form-control-sm w-full"
                      style={{ height: EDITOR_HEIGHT }}
                      maxLength={maxLength > 0 ? maxLength : undefined}
                      value={value}
                      onChange={(event) => change(event.target.value)}
                  />
              </div>,
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
