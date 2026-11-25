import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { StartVoltLayout } from './api/touch';
import { App } from './App';
import { LoadingView } from './components/loading/LoadingView';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false
        }
    }
});

import './css/habbo/HabboTheme.css';
import './css/index.css';

import './css/badges/BadgeLeaderboardView.css';
// CatalogExperience & CatalogAirMarket also style room furniture recolor & chest widgets.
import './css/catalog/CatalogExperience.css';
import './css/catalog/CatalogAirMarket.css';
import './css/floorplan-editor/FloorplanEditorView.css';

import './css/chat/Chats.css';
import './css/chat/ChatHistoryView.css';
import './css/chat/ChatInputHabbiconSelectorView.css';

import './css/common/Buttons.css';
import './css/habbo/HabboSkin.css';

import './css/forms/form_select.css';

import './css/friends/FriendsView.css';
import './css/groups/GroupView.css';
import './css/groups/GroupManagement.css';
import './css/groups/GroupInvitation.css';
import './css/groups/GroupForum.css';

import './css/hotelview/HotelView.css';

import './css/loading/LoadingView.css';

import './css/icons/icons.css';

import './css/layout/LayoutTrophy.css';

import './css/voltcard/VoltCardView.css';

import './css/notification/NotificationCenterView.css';
import './css/notification/NewFeatureNotification.css';
import './css/catalog/CursedDragonAdoption.css';
import './css/notification/HotelAlertToast.css';

import './css/purse/PurseView.css';

import './css/room/InfoStand.css';
import './css/room/FurnitureChestView.css';
import './css/room/NavigatorRoomInfo.css';
import './css/room/NavigatorRoomSettings.css';
import './css/room/RoomWidgets.css';
import './css/room/MonsterPlantBreeding.css';
import './css/room/WiredVariableFx.css';
import './css/room/VariableLeaderboard.css';
import './css/room/HighScoreDisplay.css';
import './css/room/WiredLabelLink.css';

import './css/slider.css';

import './css/toolbar/ToolBar.css';
import './css/user-profile/UserProfileView.css';
import './css/user-settings/UserSettingsView.css';

import './css/vault/VaultView.css';
import './css/widgets/FurnitureWidgets.css';
import './css/widgets/FurnitureNativeDialogs.css';
import './css/navigator/NavigatorView.css';
import './css/common/SharedComponentStyles.css';
import './css/common/ClassicScrollbar.css';

import './css/touch/TouchWindows.css';
import './css/touch/TouchRightSide.css';
import './css/touch/TouchHud.css';
import './css/touch/TouchChat.css';
import './css/touch/TouchRoom.css';
import './css/touch/TouchCatalog.css';
import './css/touch/TouchNavigator.css';
import './css/touch/TouchInventory.css';
import './css/touch/TouchSocial.css';
import './css/touch/TouchAvatarEditor.css';
import './css/touch/TouchInstall.css';
import './css/touch/TouchWired.css';
import './css/touch/TouchWiredTools.css';
import './css/touch/TouchFloorplan.css';
import './css/touch/TouchQuests.css';

// bootstrap.ts mounts the app once the configuration has loaded.
export const mountApp = () => {
    document.documentElement.classList.add('has-classic-scrollbar');
    StartVoltLayout();

    createRoot(document.getElementById('root')).render(
        <StrictMode>
            <QueryClientProvider client={queryClient}>
                <ErrorBoundary
                    fallbackRender={({ error }) => (
                        <LoadingView
                            isError={true}
                            message={`Something went wrong.\n${(error as Error)?.message ?? 'Unknown error'}`}
                        />
                    )}
                >
                    <App />
                </ErrorBoundary>
            </QueryClientProvider>
        </StrictMode>
    );
};
