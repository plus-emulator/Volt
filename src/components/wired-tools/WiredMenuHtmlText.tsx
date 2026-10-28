import { CSSProperties, FC, useEffect, useState } from 'react';
import { measureSubpixelText, SubpixelText } from '../../common/native-text/SubpixelText';

interface Line {
    text: string;
    pen: number;
}

/**
 * Word wraps at the field width minus the 2 px gutters; a word moves to the next line once the line would be wider.
 * Explicit line breaks (`\n`, `\r` or an escaped `\\n` from the texts) always start a new line.
 */
const wrap = async (text: string, wrapWidth: number | undefined): Promise<{ text: string; width: number }[]> => {
    const lines: { text: string; width: number }[] = [];
    for (const paragraph of text.split(/\\n|\r|\n/)) {
        let line = '';
        for (const word of paragraph.split(' ')) {
            const next = line ? `${line} ${word}` : word;
            if (line && wrapWidth !== undefined && (await measureSubpixelText('u_regular', next)) > wrapWidth) {
                lines.push({ text: line, width: await measureSubpixelText('u_regular', line) });
                line = word;
            } else line = next;
        }
        lines.push({ text: line, width: await measureSubpixelText('u_regular', line) });
    }

    return lines;
};

interface WiredMenuHtmlTextProps {
    text: string;
    /** The html window's width. */
    width: number;
    /** Line height: the u_regular line plus the window's leading. */
    lineHeight: number;
    wordWrap?: boolean;
    style?: CSSProperties;
}

/**
 * A multiline html window with auto size "center": the text field takes the widest line's width, floor(width + 4), and is centred
 * in the window with rounding; Flash then centres every line in the field on whole pixels of its floored width.
 */
export const WiredMenuHtmlText: FC<WiredMenuHtmlTextProps> = ({ text, width, lineHeight, wordWrap = false, style }) => {
    const [lines, setLines] = useState<Line[]>(null);

    useEffect(() => {
        let disposed = false;
        wrap(text, wordWrap ? width - 4 : undefined)
            .then((wrapped) => {
                if (disposed) return;
                const fieldWidth = Math.floor(Math.max(...wrapped.map((line) => line.width)) + 4);
                const fieldLeft = Math.round((width - fieldWidth) / 2);
                setLines(wrapped.map((line) => ({ text: line.text, pen: fieldLeft + 2 + (fieldWidth - 4 - Math.floor(line.width)) / 2 })));
            })
            .catch(() => undefined);

        return () => {
            disposed = true;
        };
    }, [text, width, wordWrap]);

    return (
        <div style={{ position: 'absolute', width, ...style }}>
            {lines?.map((line, index) => (
                <SubpixelText
                    key={index}
                    transparent
                    background={0xffffff}
                    penX={line.pen}
                    style={{ position: 'absolute', left: 0, top: index * lineHeight }}
                    text={line.text}
                    textStyle="u_regular"
                    width={width}
                />
            ))}
        </div>
    );
};
