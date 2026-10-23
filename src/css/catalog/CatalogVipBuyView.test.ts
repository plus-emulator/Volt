import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('club membership catalog layout', () => {
    it('matches the AIR vip_buy geometry and integrated offer actions', () => {
        const css = readFileSync(join(process.cwd(), 'src/css/catalog/CatalogAirClub.css'), 'utf8');
        const sharedCss = readFileSync(join(process.cwd(), 'src/css/catalog/CatalogVipBuyView.css'), 'utf8');
        const teaser = css.match(/\.volt-air-club \.volt-club-teaser\s*\{([^}]+)\}/)?.[1] ?? '';
        const introCopy = css.match(/\.volt-air-club \.volt-club-vip-copy\s*\{([^}]+)\}/)?.[1] ?? '';
        const offers = css.match(/\.volt-air-club \.volt-club-vip-offers\s*\{([^}]+)\}/)?.[1] ?? '';
        const wideOffer = css.match(/\.volt-air-club-vip-item\s*\{([^}]+)\}/)?.[1] ?? '';

        expect(teaser).toContain('top: 3px');
        expect(teaser).toContain('left: 3px');
        expect(teaser).toContain('width: 152px');
        expect(introCopy).toContain('left: 161px');
        expect(introCopy).toContain('width: 198px');
        expect(offers).toContain('left: 19px');
        expect(offers).toContain('top: 170px');
        expect(offers).toContain('width: 336px');
        expect(offers).toContain('height: 257px');
        expect(offers).toContain('overflow: hidden');
        expect(wideOffer).toContain('width: 320px');
        expect(wideOffer).toContain('height: 75px');
        expect(css).toContain('left: 225px');
        expect(sharedCss).toContain('border-image-source: var(--habbo-skin-shiny-thick-green)');
    });

});
