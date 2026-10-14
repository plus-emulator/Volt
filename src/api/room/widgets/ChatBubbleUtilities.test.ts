import { afterEach, expect, it, vi } from 'vitest';
import { ChatBubbleUtilities } from './ChatBubbleUtilities';
vi.mock('../../volt/GetConfigurationValue', () => ({ GetConfigurationValue: () => false }));
afterEach(() => {
    vi.restoreAllMocks();
    ChatBubbleUtilities.AVATAR_IMAGE_CACHE.clear();
    ChatBubbleUtilities.AVATAR_COLOR_CACHE.clear();
});

it('retains 1000 speakers and touches hot heads and colours together', async () => {
    for (let i = 0; i < 1000; i++) {
        ChatBubbleUtilities.AVATAR_IMAGE_CACHE.set(`low:normal:figure-${i}`, `image-${i}`);
        ChatBubbleUtilities.AVATAR_COLOR_CACHE.set(`figure-${i}`, i);
    }
    const render = vi.spyOn(ChatBubbleUtilities, 'setFigureImage');
    for (let i = 0; i < 1000; i++) expect(await ChatBubbleUtilities.getUserImage(`figure-${i}`)).toBe(`image-${i}`);
    await ChatBubbleUtilities.getUserImage('figure-0');
    expect([...ChatBubbleUtilities.AVATAR_IMAGE_CACHE.keys()].at(-1)).toBe('low:normal:figure-0');
    expect([...ChatBubbleUtilities.AVATAR_COLOR_CACHE.keys()].at(-1)).toBe('figure-0');
    expect(render).not.toHaveBeenCalled();
});

it('coalesces concurrent head rendering while keeping resolution variants distinct', async () => {
    let finish: (value: string) => void;
    const render = vi.spyOn(ChatBubbleUtilities, 'setFigureImage').mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const requests = Array.from({ length: 100 }, () => ChatBubbleUtilities.getUserImage('same'));
    expect(render).toHaveBeenCalledOnce();
    const high = ChatBubbleUtilities.getUserImage('same', true);
    expect(render).toHaveBeenCalledTimes(2);
    finish('head');
    expect(await Promise.all([...requests, high])).toEqual(Array(101).fill('head'));
});

it('allows retry after a head render fails', async () => {
    const render = vi.spyOn(ChatBubbleUtilities, 'setFigureImage').mockRejectedValueOnce(new Error('decode')).mockResolvedValue('retry');
    await expect(ChatBubbleUtilities.getUserImage('same')).rejects.toThrow('decode');
    await expect(ChatBubbleUtilities.getUserImage('same')).resolves.toBe('retry');
    expect(render).toHaveBeenCalledTimes(2);
});
