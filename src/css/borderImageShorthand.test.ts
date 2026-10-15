import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

const cssFiles = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? cssFiles(path) : path.endsWith('.css') ? [path] : [];
});

// The production minifier turns `border-image: none` into an empty `border-image:` declaration, which browsers drop.
// Use the `border-image-source: none` longhand instead.
it('never uses the border-image none shorthand', () => {
    const offenders = cssFiles('src').filter(path => /border-image\s*:\s*none/.test(readFileSync(path, 'utf8')));
    expect(offenders).toEqual([]);
});
