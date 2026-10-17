// Volt takes every packet header id from Volt-Renderer (IncomingHeader / OutgoingHeader), which
// scripts/protocol/sync-air-headers.py moves to each new Habbo AIR build. This check keeps it that way:
// it prints the renderer's AIR build and fails when Volt source uses a numeric header id directly.
//
//   node scripts/check-protocol-ids.mjs [--renderer ../Volt-Renderer] [--expect WIN63-...]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const option = name =>
{
    const index = process.argv.indexOf(name);
    return index < 0 ? undefined : process.argv[index + 1];
};
const renderer = resolve(root, option('--renderer') ?? '../Volt-Renderer');
const expected = option('--expect');

const hello = readFileSync(join(renderer, 'packages/communication/src/messages/outgoing/handshake/ClientHelloMessageComposer.ts'), 'utf8');
const build = /BUILD = '([\w-]+)'/.exec(hello)?.[1];
if(!build)
{
    console.error(`${ renderer }: no ClientHelloMessageComposer.BUILD`);
    process.exit(2);
}

// Header ids used as numbers instead of IncomingHeader.X / OutgoingHeader.X.
const patterns = [
    /\b(?:Incoming|Outgoing)Header\.\w+\s*=\s*-?\d+/,
    /\.(?:getHeader|header)\(\)\s*[!=]==?\s*\d+/,
    /\bheader\s*[!=]==?\s*\d{2,}/,
    /\b(?:events|composers)\.(?:get|has|set)\(\s*\d+/,
    /new\s+\w+(?:Message)?(?:Event|Composer)\(\s*\d{2,}\s*,\s*(?:null|undefined)/
];
const problems = [];
const walk = directory =>
{
    for(const name of readdirSync(directory))
    {
        const path = join(directory, name);
        if(statSync(path).isDirectory())
        {
            if(name !== 'node_modules') walk(path);
            continue;
        }
        if(!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name) || name === 'volt-renderer.mock.ts') continue;
        readFileSync(path, 'utf8').split('\n').forEach((line, index) =>
        {
            if(patterns.some(pattern => pattern.test(line))) problems.push(`${ relative(root, path) }:${ index + 1 }: ${ line.trim() }`);
        });
    }
};
walk(join(root, 'src'));

console.log(`Volt-Renderer header ids: AIR ${ build }`);
if(expected && expected !== build)
{
    console.error(`expected ${ expected }; run scripts/protocol/sync-air-headers.py in Volt-Renderer first`);
    process.exit(1);
}
if(problems.length)
{
    console.error(`numeric header ids in Volt (use IncomingHeader / OutgoingHeader):\n${ problems.join('\n') }`);
    process.exit(1);
}
console.log('Volt has no hard-coded header ids.');
