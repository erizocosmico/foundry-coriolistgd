import {ID} from '../config';
import {localize} from '../helpers/i18n';

export default async function addDiceModifiers({
    base,
    baseBonus,
    gear,
    attribute,
    condition,
    item,
}) {
    const data = {
        baseDice: base,
        isTalent: item?.type === 'talent',
        isBirdAbility: item?.type === 'bird_ability',
        baseBonus: baseBonus,
        baseTotal: base + baseBonus + (condition ? -2 : 0),
        gearDice: gear,
        attribute,
        condition,
        isAttack: item?.type === 'creature_attack',
        item,
    };

    let baseMod = 0;
    let gearMod = 0;
    return new Promise(async (resolve, reject) => {
        const template = await renderTemplate(
            `systems/${ID}/templates/dialogs/roll_modifiers.hbs`,
            data,
        );
        const buttons = {
            roll: {
                label: localize('roll'),
                callback: (html) => {
                    const base = Number(html.find('#roll-base-dice').text()) || 0;
                    const gear = Number(html.find('#roll-gear-dice').text()) || 0;
                    return resolve({base, gear});
                },
            },
            cancel: {
                label: localize('cancel'),
            },
        };

        const render = (html) => {
            const $base = html.find('#roll-base-dice');
            const $baseTotal = html.find('.roll-dice-base-total');
            const $baseModifier = html.find('.roll-dice-base-modifier');
            const $gear = html.find('#roll-gear-dice');
            const $gearTotal = html.find('.roll-dice-gear-total');
            const $gearModifier = html.find('.roll-dice-gear-modifier');

            html.find('.roll-dice-counter-btn').click((e) => {
                const delta = Number(e.currentTarget.dataset.delta);
                const dice = e.currentTarget.dataset.dice;

                if (dice === 'base') {
                    const newTotal = base + baseBonus + baseMod + delta + (condition ? -2 : 0);
                    if (newTotal < 1) return;
                    baseMod += delta;

                    $base.text(baseMod);
                    $baseModifier.text(baseMod);
                    $baseTotal.text(base + baseBonus + baseMod + (condition ? -2 : 0));
                } else if (dice === 'gear') {
                    const newTotal = gear + gearMod + delta;
                    if (newTotal < 0) return;
                    gearMod += delta;

                    $gear.text(gearMod);
                    $gearModifier.text(gearMod);
                    $gearTotal.text(gear + gearMod);
                }
            });
        };

        new Dialog(
            {
                title: localize('rolls.dialog.modifiers.title'),
                content: template,
                buttons: buttons,
                default: 'roll',
                render,
                close: reject,
            },
            {
                classes: ['coriolis-roll-dialog', 'coriolis-window'],
            },
        ).render(true);
    });
}
