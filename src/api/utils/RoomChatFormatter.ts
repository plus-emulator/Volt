import { LocalizeText } from './LocalizeText';

const allowedColours: Map<string, string> = new Map();

allowedColours.set('r', 'red');
allowedColours.set('b', 'blue');
allowedColours.set('g', 'green');
allowedColours.set('y', 'yellow');
allowedColours.set('w', 'white');
allowedColours.set('o', 'orange');
allowedColours.set('c', 'cyan');
allowedColours.set('br', 'brown');
allowedColours.set('pr', 'purple');
allowedColours.set('pk', 'pink');

allowedColours.set('red', 'red');
allowedColours.set('blue', 'blue');
allowedColours.set('green', 'green');
allowedColours.set('yellow', 'yellow');
allowedColours.set('white', 'white');
allowedColours.set('orange', 'orange');
allowedColours.set('cyan', 'cyan');
allowedColours.set('brown', 'brown');
allowedColours.set('purple', 'purple');
allowedColours.set('pink', 'pink');

const encodeHTML = (str: string) => {
    return str.replace(/&#\d+;|[\u00A0-\u9999<>&]/gu, (match) => (match.length > 1 ? match : `&#${match.codePointAt(0)};`));
};

/** ChatMarkup.tokenize: splits into literal runs and bracket runs; a bracket run is closed by `]` and restarted by a further `[`. */
const tokenizeMarkup = (input: string): string[] => {
    const tokens: string[] = [];
    let current = '';
    let inBracket = false;

    for (const character of input) {
        if (character === '[') {
            if (current.length > 0) {
                tokens.push(current);
                current = '';
            }

            inBracket = true;
            current += character;
        } else if (character === ']' && inBracket) {
            current += character;
            tokens.push(current);
            current = '';
            inBracket = false;
        } else {
            current += character;
        }
    }

    if (current.length > 0) tokens.push(current);

    return tokens;
};

/** ChatMarkup.isMarkupToken: a closing token, or a bracket token of 3 to 10 characters. */
const isMarkupToken = (token: string) =>
    token.charAt(0) === '[' && token.charAt(token.length - 1) === ']' && (token.charAt(1) === '/' || (token.length > 2 && token.length <= 10));

/** ChatMarkup.isOpeningTableTabToken: `[a]`, in any case. */
const isOpeningTableTabToken = (token: string) => isMarkupToken(token) && token.charAt(1) !== '/' && token.substring(1, token.length - 1).toLowerCase() === 'a';

// ChatMarkup.COLOUR_ARRAY (colours for the usual dark-on-light bubble): the eight tags the message editor's palette offers.
const MARKUP_COLOURS: ReadonlyMap<string, string> = new Map(Object.entries({
    red: '#8b1919',
    orange: '#9c3b00',
    yellow: '#6f5b00',
    green: '#008000',
    cyan: '#007f7f',
    blue: '#004c99',
    purple: '#4c004c',
    pink: '#9c145b'
}));

const TABLE_TAB_HTML = '<span data-chat-table-tab="" style="display:inline-block;min-width:4em"></span>';

/** ChatMarkup.applyToElements: tags only take effect as a matched pair, with a stack; anything else stays as typed. */
const applyWiredTextMarkup = (content: string) => {
    if (content.length === 0) return '';

    const tokens = tokenizeMarkup(content);
    const tableTabs = tokens.some(isOpeningTableTabToken);
    const open: { tag: string; index: number }[] = [];

    for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];

        if (!isMarkupToken(token)) continue;

        let tag = token.substring(1, token.length - 1).toLowerCase();
        const closing = tag.charAt(0) === '/';

        if (tableTabs && isOpeningTableTabToken(token)) {
            if (index > 0) tokens[index - 1] = tokens[index - 1].replace(/[ \t]+$/, '');
            if (index + 1 < tokens.length) tokens[index + 1] = tokens[index + 1].replace(/^[ \t]+/, '');
            tokens[index] = TABLE_TAB_HTML;
        } else if (closing) {
            tag = tag.substring(1);

            if (open.length > 0 && open[open.length - 1].tag === tag) {
                const opener = open.pop();

                if (tag === 'b' || tag === 'i' || tag === 'u') {
                    const element = tag === 'b' ? 'strong' : tag === 'i' ? 'em' : 'u';

                    tokens[opener.index] = `<${element}>`;
                    tokens[index] = `</${element}>`;
                } else if (MARKUP_COLOURS.has(tag)) {
                    tokens[opener.index] = `<span style="color:${MARKUP_COLOURS.get(tag)}">`;
                    tokens[index] = '</span>';
                }
            }
        } else if (tag === 'b' || tag === 'i' || tag === 'u' || MARKUP_COLOURS.has(tag)) {
            open.push({ tag, index });
        }
    }

    return tokens.join('');
};

const FONT_NAMED_COLORS = new Set([
    'red',
    'green',
    'blue',
    'yellow',
    'white',
    'black',
    'orange',
    'cyan',
    'brown',
    'purple',
    'pink',
    'magenta',
    'violet',
    'gray',
    'grey',
    'lime',
    'teal',
    'gold',
    'silver',
    'navy',
    'maroon',
    'olive',
    'indigo'
]);

export const sanitizeFontColor = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    if (raw.length > 20) return null;

    const value = raw.trim().toLowerCase();

    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(value)) return value;
    if (FONT_NAMED_COLORS.has(value)) return value;

    return null;
};

export type FontSegment = { color: string | null; text: string };

const FONT_COLOR_ATTR = /color\s*=\s*(?:"([^"]{1,32})"|'([^']{1,32})'|([^\s"'>]{1,32}))/i;

export const parseFontSegments = (input: string): FontSegment[] => {
    if (!input) return [];

    const pattern = /<font\b([^>]{0,200}?)>([\s\S]{0,200}?)<\/font>/gi;
    const segments: FontSegment[] = [];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(input)) !== null) {
        if (match.index > lastIndex) {
            segments.push({ color: null, text: input.slice(lastIndex, match.index) });
        }

        const colorMatch = FONT_COLOR_ATTR.exec(match[1] || '');
        const rawColor = colorMatch ? colorMatch[1] || colorMatch[2] || colorMatch[3] : null;
        const color = sanitizeFontColor(rawColor);

        segments.push({ color, text: match[2] });
        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < input.length) {
        segments.push({ color: null, text: input.slice(lastIndex) });
    }

    return segments;
};

const applyFontMarkup = (content: string) => {
    const fontPattern = /&#60;font\b([^&]{0,200}?)&#62;([\s\S]{0,4000}?)&#60;\/font&#62;/gi;
    const colorAttr = /color\s*=\s*(?:"([^"]{1,32})"|'([^']{1,32})'|([^\s"'>]{1,32}))/i;

    let previous = '';
    let next = content;
    let guard = 0;

    while (previous !== next && guard < 20) {
        previous = next;
        next = next.replace(fontPattern, (_match, attrs: string, inner: string) => {
            const colorMatch = colorAttr.exec(attrs || '');
            const rawColor = colorMatch ? colorMatch[1] || colorMatch[2] || colorMatch[3] : null;
            const color = sanitizeFontColor(rawColor);

            if (!color) return inner;

            return `<span style="color:${color}">${inner}</span>`;
        });
        guard++;
    }

    return next;
};

export const RoomChatFormatter = (content: string) => {
    let result = '';

    content = encodeHTML(content);
    content = applyFontMarkup(content);
    content = applyWiredTextMarkup(content);

    if (content.startsWith('@') && content.indexOf('@', 1) > -1) {
        let match = null;

        while ((match = /@[a-zA-Z]+@/g.exec(content)) !== null) {
            const colorTag = match[0].toString();
            const colorName = colorTag.substr(1, colorTag.length - 2);
            const text = content.replace(colorTag, '');

            if (!allowedColours.has(colorName)) {
                result = text;
            } else {
                const color = allowedColours.get(colorName);
                result = '<span style="color: ' + color + '">' + text + '</span>';
            }
            break;
        }
    } else {
        result = content;
    }

    return result.replace(/\r\n|\r|\n/g, '<br />');
};
