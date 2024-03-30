import {ID} from '../config';
import {localize} from '../helpers/i18n';

export default async function selectActor(crew) {
    return new Promise(async (resolve, reject) => {
        const members = crew.members();
        if (members.length === 0) {
            ui.notifications.warn(localize('errors.crew_empty'));
            reject();
            return;
        }

        // There is no point in presenting a dialog if there is only 1.
        if (members.length === 1) {
            resolve(members[0]);
            return;
        }

        const data = {members};

        const template = await renderTemplate(
            `systems/${ID}/templates/dialogs/roll_select_actor.hbs`,
            data,
        );

        const buttons = {
            cancel: {
                label: localize('cancel'),
            },
        };

        let dialog;

        const render = (html) => {
            html.find('.actor').on('click', (e) => {
                const index = e.currentTarget.dataset.index;
                resolve(members[index]);
                dialog.close();
            });
        };

        dialog = new Dialog(
            {
                title: localize('rolls.dialog.select_actor.title'),
                content: template,
                buttons: buttons,
                default: 'cancel',
                render,
                close: reject,
            },
            {
                classes: ['coriolis-roll-dialog', 'coriolis-window'],
            },
        );

        dialog.render(true);
    });
}
