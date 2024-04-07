import {localize} from '../helpers/i18n';

export default async function selectArmorMode() {
    return new Promise(async (resolve, reject) => {
        const buttons = {
            damage: {
                label: localize('rolls.dialog.select_armor_type.damage'),
                callback: () => {
                    resolve('rating');
                },
            },
            blight: {
                label: localize('rolls.dialog.select_armor_type.blight'),
                callback: () => {
                    resolve('blight_protection');
                },
            },
        };

        let dialog = new Dialog(
            {
                title: localize('rolls.dialog.select_armor_type.title'),
                content: '',
                buttons: buttons,
                default: 'damage',
                close: reject,
            },
            {
                classes: ['coriolis-roll-dialog', 'coriolis-window'],
            },
        );

        dialog.render(true);
    });
}
