import { ISanctionStatusType } from '@volt/renderer';
import { FC } from 'react';
import { FaArrowCircleRight } from 'react-icons/fa';
import { CreateLinkEvent, LocalizeText } from '../../../api';
import { VoltCardContentView, VoltCardHeaderView, VoltCardView } from '../../../common';
import { useHelp } from '../../../hooks';

export const SanctionSatusView: FC<{}> = (props) => {
    const { sanctionInfo = null, setSanctionInfo = null } = useHelp();

    // Mirrors AIR WIN63-202610151745-318700621 com/sulake/habbo/help/SanctionInfo.as buildSanctionDescriptions.
    const nextSanctionDescription = (sanction: ISanctionStatusType) => {
        if (!sanction || !sanction.name?.length) return '';

        switch (sanction.name) {
            case 'ALERT':
                return LocalizeText('help.sanction.next.alert');
            case 'MUTE':
                return LocalizeText('help.sanction.next.mute', ['hours'], [sanction.lengthHours.toString()]);
            case 'BAN_PERMANENT':
                return LocalizeText('help.sanction.next.permban');
            default:
                if (sanction.lengthHours > 24) return LocalizeText('help.sanction.next.ban.days', ['days'], [Math.trunc(sanction.lengthHours / 24).toString()]);

                return LocalizeText('help.sanction.next.ban', ['hours'], [sanction.lengthHours.toString()]);
        }
    };

    if (!sanctionInfo) return null;

    const sanctions = (sanctionInfo.sanctions ?? []).filter((entry) => entry?.reason?.length);

    return (
        <VoltCardView className="volt-help min-w-0 w-[min(420px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]" theme="primary-slim">
            <VoltCardHeaderView headerText={LocalizeText('help.sanction.info.title')} onCloseClick={() => setSanctionInfo(null)} />
            <VoltCardContentView className="text-black">
                <div className="flex min-h-[170px] flex-col">
                    <div className="flex flex-col gap-3">
                        {!sanctions.length && <div>{LocalizeText('settings.help.sanction_information.description')}</div>}
                        {sanctions.map((entry, index) => {
                            const hasProbation = entry.probationHoursLeft > 0;
                            const nextName = entry.nextSanction?.name ?? '';
                            const showGradual = entry.isGradual && (hasProbation || nextName.length > 0);

                            return (
                                <div key={index} className="flex flex-col gap-1">
                                    {index > 0 && <hr className="my-1" />}
                                    <div>{entry.reason}</div>
                                    {showGradual && <div className="pt-2 font-bold">{LocalizeText('help.sanction.probation.reminder')}</div>}
                                    {showGradual && hasProbation && (
                                        <div>
                                            {LocalizeText('help.sanction.probation.days.left')} {Math.ceil(entry.probationHoursLeft / 24)}
                                        </div>
                                    )}
                                    {showGradual && nextName.length > 0 && <div className="pt-2">{nextSanctionDescription(entry.nextSanction)}</div>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                        <button type="button" className="help-link" onClick={() => CreateLinkEvent('habbopages/help')}>
                            <FaArrowCircleRight className="help-link__icon" />
                            {LocalizeText('help.main.faq.link.text')}
                        </button>
                        <button type="button" className="habbo-btn-green habbo-btn-green--auto" onClick={() => setSanctionInfo(null)}>
                            {LocalizeText('habbo.way.ok.button')}
                        </button>
                    </div>
                </div>
            </VoltCardContentView>
        </VoltCardView>
    );
};
