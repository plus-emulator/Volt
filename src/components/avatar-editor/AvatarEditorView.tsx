import { AddLinkEventTracker, AvatarFigurePartType, ILinkEventTracker, RemoveLinkEventTracker } from '@volt/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { IsPhoneLayout } from '../../api';
import { lazyWindow } from '../../common/lazyWindow';
import { useAvatarEditor } from '../../hooks';

const INITIAL_EDITOR_POSITION = { x: 100, y: 30 };

const LazyAvatarEditorWindow = lazyWindow(
    () => import('./AvatarEditorWindow').then((module) => ({ default: module.AvatarEditorWindow })),
    'AvatarEditor'
);

export const AvatarEditorView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [editorPosition, setEditorPosition] = useState(INITIAL_EDITOR_POSITION);
    const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
    const { setIsVisible: setEditorVisibility, setClothingChangeData = null } = useAvatarEditor();

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        if (parts[2] && parts[3] && (parts[2] === AvatarFigurePartType.MALE || parts[2] === AvatarFigurePartType.FEMALE)) {
                            setClothingChangeData({ objectId: Number(parts[3]), gender: parts[2] });
                            setIsWardrobeOpen(false);
                        } else {
                            setClothingChangeData(null);
                            setIsWardrobeOpen(!IsPhoneLayout());
                        }
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setClothingChangeData(null);
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setClothingChangeData(null);
                        setIsVisible((prevValue) => {
                            if (!prevValue) setIsWardrobeOpen(!IsPhoneLayout());

                            return !prevValue;
                        });
                        return;
                }
            },
            eventUrlPrefix: 'avatar-editor/'
        };

        const classicLinkTracker: ILinkEventTracker = {
            eventUrlPrefix: 'avatareditor/',
            linkReceived: (url) => {
                if (url.split('/')[1] !== 'open') return;

                setClothingChangeData(null);
                setIsWardrobeOpen(!IsPhoneLayout());
                setIsVisible((visible) => !visible);
            }
        };

        AddLinkEventTracker(linkTracker);
        AddLinkEventTracker(classicLinkTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            RemoveLinkEventTracker(classicLinkTracker);
        };
    }, [setClothingChangeData]);

    useEffect(() => {
        setEditorVisibility(isVisible);

        if (!isVisible) {
            setClothingChangeData(null);
            setIsWardrobeOpen(false);
        }
    }, [isVisible, setEditorVisibility, setClothingChangeData]);

    const onClose = useCallback(() => setIsVisible(false), []);

    if (!isVisible) return null;

    return (
        <LazyAvatarEditorWindow
            editorPosition={editorPosition}
            isWardrobeOpen={isWardrobeOpen}
            onChunkError={onClose}
            onClose={onClose}
            setEditorPosition={setEditorPosition}
            setIsWardrobeOpen={setIsWardrobeOpen}
        />
    );
};
