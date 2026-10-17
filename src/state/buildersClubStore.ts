import { BuildersClubFurniCountMessageEvent, BuildersClubSubscriptionStatusMessageEvent, GetCommunication } from '@volt/renderer';
import { createVoltStore } from './createVoltStore';

/**
 * Builders Club membership as the server last pushed it: BuildersClubSubscriptionStatus (1910) after login and after
 * every membership or addon purchase, BuildersClubFurniCount (3928) when the placed BC furni count changes.
 * AIR keeps the same values on HabboCatalog (builderSecondsLeft, builderFurniLimit, builderFurniCount).
 */
export interface BuildersClubState
{
    received: boolean;
    secondsLeft: number;
    secondsLeftWithGrace: number;
    furniLimit: number;
    maxFurniLimit: number;
    furniCount: number;
    // performance.now() when secondsLeft arrived, so a page can count down from it.
    receivedAt: number;
}

const initialState = (): BuildersClubState => ({
    received: false,
    secondsLeft: 0,
    secondsLeftWithGrace: 0,
    furniLimit: 0,
    maxFurniLimit: 0,
    furniCount: 0,
    receivedAt: 0
});

export const useBuildersClubStore = createVoltStore<BuildersClubState>()(() => initialState());

export const clearBuildersClubStatus = () => useBuildersClubStore.setState(initialState());

let listeningCommunication: ReturnType<typeof GetCommunication> | null = null;
let statusEvent: BuildersClubSubscriptionStatusMessageEvent | null = null;
let furniCountEvent: BuildersClubFurniCountMessageEvent | null = null;

export const listenForBuildersClubStatus = () =>
{
    const communication = GetCommunication();

    clearBuildersClubStatus();

    if(listeningCommunication === communication) return;

    if(listeningCommunication)
    {
        if(statusEvent) listeningCommunication.removeMessageEvent(statusEvent);
        if(furniCountEvent) listeningCommunication.removeMessageEvent(furniCountEvent);
    }

    statusEvent = new BuildersClubSubscriptionStatusMessageEvent((event: BuildersClubSubscriptionStatusMessageEvent) =>
    {
        const parser = event.getParser();

        if(!parser) return;

        useBuildersClubStore.setState({
            received: true,
            secondsLeft: parser.secondsLeft,
            secondsLeftWithGrace: parser.secondsLeftWithGrace,
            furniLimit: parser.furniLimit,
            maxFurniLimit: parser.maxFurniLimit,
            receivedAt: performance.now()
        });
    });
    furniCountEvent = new BuildersClubFurniCountMessageEvent((event: BuildersClubFurniCountMessageEvent) =>
    {
        const parser = event.getParser();

        if(!parser) return;

        useBuildersClubStore.setState({ furniCount: parser.furniCount });
    });
    listeningCommunication = communication;
    communication.registerMessageEvent(statusEvent);
    communication.registerMessageEvent(furniCountEvent);
};
