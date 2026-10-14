/*
 * One row of a variable leaderboard (VariableLeaderboardRowView, roomevents/variable_leaderboard/views, build WIN63-202610131318-860371703):
 * rank, avatar head, username, then one cell per extra column (formatColumn L236). Cell widths follow the column width (70/90/120/170px).
 */
import { IVariableLeaderboardDescriptor, IVariableLeaderboardRow } from '@volt/renderer';
import { FC } from 'react';
import {
    formatVariableLeaderboardCell,
    IVariableLeaderboardTimeLabels,
    variableLeaderboardColumnPixelWidth
} from '../../../../api/wired/WiredVariableLeaderboard';
import { LayoutAvatarImageView } from '../../../../common';

interface VariableLeaderboardRowViewProps {
    row: IVariableLeaderboardRow;
    columns: IVariableLeaderboardDescriptor['columns'];
    now: number;
    labels: IVariableLeaderboardTimeLabels;
}

export const VariableLeaderboardRowView: FC<VariableLeaderboardRowViewProps> = ({ row, columns, now, labels }) => (
    <div className="volt-variable-leaderboard__row">
        <div className="volt-variable-leaderboard__rank">{row.rank}</div>
        <div className="volt-variable-leaderboard__face">
            <LayoutAvatarImageView figure={row.figure} headOnly={true} direction={2} />
        </div>
        <div
            className="volt-variable-leaderboard__cell volt-variable-leaderboard__cell--name"
            style={{ width: variableLeaderboardColumnPixelWidth(columns[0]?.width ?? 0) }}
        >
            {row.username}
        </div>
        {columns.slice(1).map((column, index) => (
            <div key={index} className="volt-variable-leaderboard__cell" style={{ width: variableLeaderboardColumnPixelWidth(column.width) }}>
                {formatVariableLeaderboardCell(row, column.type, now, labels)}
            </div>
        ))}
    </div>
);
