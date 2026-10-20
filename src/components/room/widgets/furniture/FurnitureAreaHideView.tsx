import { GetRoomEngine } from '@volt/renderer';
import { FC } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Column, Flex, VoltCardContentView, VoltCardHeaderView, VoltCardView, Text } from '../../../../common';
import { useFurnitureAreaHideWidget } from '../../../../hooks';

export const FurnitureAreaHideView: FC<{}> = (props) => {
    const {
        objectId = -1,
        isOn,
        wallItems,
        inverted,
        invisibility,
        save = null,
        toggleOnOff = null,
        onClose = null
    } = useFurnitureAreaHideWidget();

    if (objectId === -1) return null;

    return (
        <VoltCardView
            theme="primary-slim"
            className="volt-room-widget-area-hide min-w-0 w-[min(400px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
        >
            <VoltCardHeaderView headerText={LocalizeText('widget.areahide.title')} onCloseClick={onClose} />
            <VoltCardContentView overflow="hidden" justifyContent="between">
                <Column gap={2}>
                    <Column gap={1}>
                        <Text bold>{LocalizeText('wiredfurni.params.area_selection')}</Text>
                        <Text bold>{LocalizeText('wiredfurni.params.area_selection.info')}</Text>
                    </Column>
                    <Flex gap={1}>
                        <Button fullWidth variant="primary" disabled={isOn} onClick={(event) => GetRoomEngine().areaSelectionManager.startSelecting()}>
                            {LocalizeText('wiredfurni.params.area_selection.select')}
                        </Button>
                        <Button fullWidth variant="primary" disabled={isOn} onClick={(event) => GetRoomEngine().areaSelectionManager.clearHighlight()}>
                            {LocalizeText('wiredfurni.params.area_selection.clear')}
                        </Button>
                    </Flex>
                </Column>
                <Column gap={1}>
                    <Text bold>{LocalizeText('widget.areahide.options')}</Text>
                    <Flex gap={1}>
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="setWallItems"
                            checked={wallItems}
                            disabled={isOn}
                            onChange={(event) => save({ wallItems: event.target.checked })}
                        />
                        <Text>{LocalizeText('widget.areahide.options.wallitems')}</Text>
                    </Flex>
                    <Flex gap={1}>
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="setInverted"
                            checked={inverted}
                            disabled={isOn}
                            onChange={(event) => save({ inverted: event.target.checked })}
                        />
                        <Column gap={1}>
                            <Text>{LocalizeText('widget.areahide.options.invert')}</Text>
                            <Text>{LocalizeText('widget.areahide.options.invert.info')}</Text>
                        </Column>
                    </Flex>
                    <Flex gap={1}>
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="setInvisibility"
                            checked={invisibility}
                            disabled={isOn}
                            onChange={(event) => save({ invisibility: event.target.checked })}
                        />
                        <Column gap={1}>
                            <Text>{LocalizeText('widget.areahide.options.invisibility')}</Text>
                            <Text>{LocalizeText('widget.areahide.options.invisibility.info')}</Text>
                        </Column>
                    </Flex>
                </Column>
                <Button fullWidth variant="primary" onClick={toggleOnOff}>
                    {LocalizeText(isOn ? 'widget.dimmer.button.off' : 'widget.dimmer.button.on')}
                </Button>
            </VoltCardContentView>
        </VoltCardView>
    );
};
