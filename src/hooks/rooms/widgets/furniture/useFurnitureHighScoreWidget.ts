import { GetRoomEngine, HighScoreDataType, ObjectDataFactory, RoomEngineTriggerWidgetEvent, RoomObjectVariable } from '@volt/renderer';
import { useState } from 'react';
import { useVoltEvent } from '../../../events';

// The order is the client contract, not ours: the server sends an index into this list.
// Two of the five are times rather than points, which changes both the column header and
// how the value is written.
const SCORE_TYPES = ['perteam', 'mostwins', 'classic', 'fastesttime', 'longesttime'];
const CLEAR_TYPES = ['alltime', 'daily', 'weekly', 'monthly'];

// Seconds as H:MM:SS past the hour, MM:SS below it. Anything else stays a plain number.
export const scoreToTime = (score: number, parts: number) => {
    const divisors = [60, 60, 24];

    if (parts < 1 || parts > divisors.length) return `${ score }`;

    let remaining = score;
    let out = '';

    for (let i = 0; i < parts; i++) {
        let piece: string;

        if (i === parts - 1) {
            piece = `${ remaining }`;
        } else {
            piece = `${ remaining % divisors[i] }`;
            remaining = Math.floor(remaining / divisors[i]);
        }

        if (piece.length < 2 && i < 2) piece = `0${ piece }`;

        out = `${ piece }:${ out }`;
    }

    return out.slice(0, -1);
};

export const getScoreType = (type: number) => SCORE_TYPES[type];
export const getClearType = (type: number) => CLEAR_TYPES[type];

// A board whose type never arrived reads as -1, which would index the list with -1.
export const isConfigured = (scoreType: number, clearType: number) =>
    scoreType >= 0 && scoreType < SCORE_TYPES.length && clearType >= 0 && clearType < CLEAR_TYPES.length;

// The official client decides this from the type's own name, not from a separate list.
export const isTimeScore = (scoreType: number) => (SCORE_TYPES[scoreType] ?? '').includes('time');

export const formatScore = (score: number, scoreType: number) => {
    if (!isTimeScore(scoreType)) return `${ score }`;

    return scoreToTime(score, score >= 3600 ? 3 : 2);
};

export interface HighScoreDisplay
{
    roomId: number;
    objectId: number;
    category: number;
    stuffData: HighScoreDataType;
}

// One board shows at a time: opening a board replaces the open one, and only the open board's hide event closes it.
const useFurnitureHighScoreWidgetState = () => {
    const [display, setDisplay] = useState<HighScoreDisplay>(null);

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_HIGH_SCORE_DISPLAY, (event) => {
        const roomObject = GetRoomEngine().getRoomObject(event.roomId, event.objectId, event.category);

        if (!roomObject) return;

        const formatKey = roomObject.model.getValue<number>(RoomObjectVariable.FURNITURE_DATA_FORMAT);
        const stuffData = ObjectDataFactory.getData(formatKey) as HighScoreDataType;

        stuffData.initializeFromRoomObjectModel(roomObject.model);

        setDisplay({ roomId: event.roomId, objectId: event.objectId, category: event.category, stuffData });
    });

    useVoltEvent<RoomEngineTriggerWidgetEvent>(RoomEngineTriggerWidgetEvent.REQUEST_HIDE_HIGH_SCORE_DISPLAY, (event) => {
        setDisplay((previous) => (previous && previous.roomId === event.roomId && previous.objectId === event.objectId) ? null : previous);
    });

    return { display, getScoreType, getClearType, isConfigured, isTimeScore, formatScore };
};

export const useFurnitureHighScoreWidget = useFurnitureHighScoreWidgetState;
