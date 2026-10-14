import { FC } from 'react';
import { WiredChestAmountCondition } from './WiredChestAmountCondition';

/** AIR ChestHasAmount: the chests' total contents compared with an amount or a variable. */
export const WiredConditionChestHasItemsView: FC<{}> = () => <WiredChestAmountCondition itemTypes={false} />;
