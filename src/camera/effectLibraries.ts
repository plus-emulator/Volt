interface IEffectMapEntry
{
    id?: unknown;
    lib?: unknown;
}

export function buildAvatarEffectLibraries(effects: IEffectMapEntry[]): Map<string, string[]>
{
    const libraries = new Map<string, string[]>();

    for(const effect of effects)
    {
        if(!effect || ((typeof effect.id !== 'string') && (typeof effect.id !== 'number')) || (typeof effect.lib !== 'string') || !effect.lib.length) continue;

        const id = String(effect.id);
        const mapped = libraries.get(id) ?? [];

        if(!mapped.includes(effect.lib)) mapped.push(effect.lib);

        libraries.set(id, mapped);
    }

    return libraries;
}

export function avatarEffectsReady(users: { effect?: number }[], libraries: Map<string, string[]>, isLoaded: (library: string) => boolean): boolean
{
    let ready = true;

    for(const user of users)
    {
        if(!user.effect) continue;

        const mapped = libraries.get(String(user.effect));

        if(!mapped?.length) throw new Error(`Missing avatar effect mapping ${ user.effect }`);

        for(const library of mapped) if(!isLoaded(library)) ready = false;
    }

    return ready;
}
