import { IRoomCameraWidgetEffect } from '@volt/renderer';
import { FC } from 'react';
import { CameraEffectSelection, CameraPicture } from '../../api';
import { CameraWidgetCaptureView } from './views/CameraWidgetCaptureView';
import { CameraWidgetCheckoutView } from './views/CameraWidgetCheckoutView';
import { CameraWidgetEditorView } from './views/editor/CameraWidgetEditorView';

export const CAMERA_MODE_CAPTURE = 1;
export const CAMERA_MODE_EDITOR = 2;
export const CAMERA_MODE_CHECKOUT = 3;

interface CameraWidgetContentProps {
    mode: number;
    availableEffects: IRoomCameraWidgetEffect[];
    myLevel: number;
    selectedPicture: CameraPicture | null;
    checkoutEffects: CameraEffectSelection[];
    checkoutZoom: boolean;
    price: { credits: number; duckets: number; publishDucketPrice: number };
    onAction: (type: string) => void;
    onCheckout: (pictureUrl: string, effects?: CameraEffectSelection[], zoom?: boolean) => void;
}

export const CameraWidgetContent: FC<CameraWidgetContentProps> = ({
    mode,
    availableEffects,
    myLevel,
    selectedPicture,
    checkoutEffects,
    checkoutZoom,
    price,
    onAction,
    onCheckout
}) => (
    <>
        {mode === CAMERA_MODE_CAPTURE && (
            <CameraWidgetCaptureView onClose={() => onAction('close')} onDelete={() => onAction('delete')} onEdit={() => onAction('edit')} />
        )}
        {mode === CAMERA_MODE_EDITOR && selectedPicture && (
            <CameraWidgetEditorView
                availableEffects={availableEffects}
                myLevel={myLevel}
                picture={selectedPicture}
                onCancel={() => onAction('editor_cancel')}
                onCheckout={onCheckout}
                onClose={() => onAction('close')}
            />
        )}
        {mode === CAMERA_MODE_CHECKOUT && (
            <CameraWidgetCheckoutView
                picture={selectedPicture}
                effects={checkoutEffects}
                zoom={checkoutZoom}
                price={price}
                onCancelClick={() => onAction('editor_cancel')}
                onCloseClick={() => onAction('editor_cancel')}
            />
        )}
    </>
);
