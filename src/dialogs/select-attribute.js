import {ATTRIBUTES, ID} from '../config';
import {localize} from '../helpers/i18n';

export default async function selectAttribute(actor) {
    return new Promise(async (resolve, reject) => {
        const attributes = ATTRIBUTES.map((a) => ({
            id: a,
            value: actor.attribute(a),
        }));
        const data = {attributes};

        const template = await renderTemplate(
            `systems/${ID}/templates/dialogs/roll_attribute.hbs`,
            data,
        );

        const buttons = {
            cancel: {
                label: localize('cancel'),
            },
        };

        let dialog;

        const render = (html) => {
            html.find('.attribute-selector-attr').on('click', (e) => {
                const attr = e.currentTarget.dataset.attr;
                resolve(attr);
                dialog.close();
            });
        };

        dialog = new Dialog(
            {
                title: localize('rolls.dialog.select_attribute.title'),
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
