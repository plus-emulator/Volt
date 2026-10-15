import { FC } from 'react';
import system0 from '../../../../assets/images/wired/native/directional_system_0.png';
import system1 from '../../../../assets/images/wired/native/directional_system_1.png';
import system2 from '../../../../assets/images/wired/native/directional_system_2.png';
import system3 from '../../../../assets/images/wired/native/directional_system_3.png';

const DIRECTIONAL_SYSTEM_IMAGES = [system0, system1, system2, system3];

/** AIR25 class_3959.onDirectionalIdSet selects this bitmap by the stored system id. */
export const WiredProjectileDirectionGrid: FC<{ system: number; disabled?: boolean }> = ({ system, disabled = false }) => (
    <div className="volt-wired__projectile-grid" style={{ opacity: disabled ? 0.4 : 1 }}>
        <img alt="" aria-hidden="true" draggable={false} width={192} height={97} src={DIRECTIONAL_SYSTEM_IMAGES[system] ?? system0} style={{ imageRendering: 'pixelated' }} />
    </div>
);
