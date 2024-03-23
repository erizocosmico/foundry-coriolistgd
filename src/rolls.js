import {createMessage} from './chat.js';
import {ATTRIBUTES, ID} from './config.js';
import {labelFor, localize} from './helpers/i18n';

export class CoriolisBaseDie extends Die {
    constructor(termData) {
        termData.faces = 6;
        super(termData);
    }

    /** @override */
    static DENOMINATION = 'b';

    /** @override */
    get total() {
        return this.results.length;
    }

    /** @override */
    getResultLabel(result) {
        return {
            1: `<img src="systems/${ID}/assets/dice/base-1.png" />`,
            2: `<img src="systems/${ID}/assets/dice/base-2.png" />`,
            3: `<img src="systems/${ID}/assets/dice/base-3.png" />`,
            4: `<img src="systems/${ID}/assets/dice/base-4.png" />`,
            5: `<img src="systems/${ID}/assets/dice/base-5.png" />`,
            6: `<img src="systems/${ID}/assets/dice/base-6.png" />`,
        }[result.result];
    }
}

export class CoriolisGearDie extends Die {
    constructor(termData) {
        termData.faces = 6;
        super(termData);
    }

    /** @override */
    static DENOMINATION = 'g';

    /** @override */
    get total() {
        return this.results.length;
    }

    /** @override */
    getResultLabel(result) {
        return {
            1: `<img src="systems/${ID}/assets/dice/gear-1.png" />`,
            2: `<img src="systems/${ID}/assets/dice/gear-2.png" />`,
            3: `<img src="systems/${ID}/assets/dice/gear-3.png" />`,
            4: `<img src="systems/${ID}/assets/dice/gear-4.png" />`,
            5: `<img src="systems/${ID}/assets/dice/gear-5.png" />`,
            6: `<img src="systems/${ID}/assets/dice/gear-6.png" />`,
        }[result.result];
    }
}

export function registerDice3D(dice3d) {
    dice3d.addColorset(
        {
            name: 'CTGDBase',
            description: 'CTGDBase',
            category: 'Colors',
            foreground: ['#000000'],
            background: ['#c1af79'],
            outline: '#c1af79',
            texture: 'none',
        },
        'preferred',
    );

    dice3d.addColorset(
        {
            name: 'CTGDGear',
            description: 'CTGDGear',
            category: 'Colors',
            foreground: ['#c1af79'],
            background: ['#000000'],
            outline: '#000000',
            texture: 'none',
        },
        'preferred',
    );

    dice3d.addSystem({id: ID, name: 'Coriolis: The Great Dark'}, 'preferred');
    dice3d.addDicePreset({
        type: 'db',
        labels: [
            `systems/${ID}/assets/dice/base-1.png`,
            `systems/${ID}/assets/dice/base-2.png`,
            `systems/${ID}/assets/dice/base-3.png`,
            `systems/${ID}/assets/dice/base-4.png`,
            `systems/${ID}/assets/dice/base-5.png`,
            `systems/${ID}/assets/dice/base-6.png`,
        ],
        colorset: 'CTGDBase',
        system: ID,
    });
    dice3d.addDicePreset({
        type: 'dg',
        labels: [
            `systems/${ID}/assets/dice/gear-1.png`,
            `systems/${ID}/assets/dice/gear-2.png`,
            `systems/${ID}/assets/dice/gear-3.png`,
            `systems/${ID}/assets/dice/gear-4.png`,
            `systems/${ID}/assets/dice/gear-5.png`,
            `systems/${ID}/assets/dice/gear-6.png`,
        ],
        colorset: 'CTGDGear',
        system: ID,
    });
}

export async function rollArmor(actor, item) {
    const roll = await new Roll(`${item.system.rating}db`, {}).evaluate();
    return await postRoll(actor, undefined, item, undefined, undefined, roll);
}

export async function roll(actor, attribute = undefined, item = undefined) {
    if (!attribute) {
        try {
            attribute = await selectAttribute(actor);
        } catch (err) {
            if (err) console.error(err);
            return null;
        }
    }

    let base = actor.attribute(attribute);
    let baseBonus = item?.type === 'talent' ? item.system.bonus : 0;
    let gear = item?.type === 'talent' ? 0 : item?.system?.bonus || 0;
    const condition = actor.hasCondition(attribute);

    let baseMod, gearMod;
    try {
        const modifiers = await addDiceModifiers({
            base,
            gear,
            baseBonus,
            attribute,
            condition,
            item,
        });
        baseMod = modifiers.base;
        gearMod = modifiers.gear;
    } catch (err) {
        if (err) console.error(err);
        return null;
    }

    base += baseMod + baseBonus;
    if (condition) base -= 2;
    base = Math.max(1, base);

    gear += gearMod;
    gear = Math.max(0, gear);

    const roll = await new Roll(`${base}db + ${gear}dg`, {}).evaluate();
    return await postRoll(actor, attribute, item, baseMod, gearMod, roll);
}

async function reroll(message, previousRollData) {
    const {roll: previousRoll, data: previousData} = previousRollData;
    const base = rerollable(previousRoll, CoriolisBaseDie);
    const gear = rerollable(previousRoll, CoriolisGearDie);

    const roll = await new Roll(`${base}db + ${gear}dg`, {}).evaluate();
    const numSuccesses = successes(roll) + successes(previousRoll);
    const hopeLost = ones(roll, CoriolisBaseDie) + ones(previousRoll, CoriolisBaseDie);
    const gearDamage = ones(roll, CoriolisGearDie) + ones(previousRoll, CoriolisGearDie);
    let damage = undefined;
    if (previousData.item && previousData.item.type === 'weapon') {
        damage = (previousData.item.system.damage || 0) + Math.max(0, numSuccesses - 1);
    }

    const rollData = {
        ...previousData,
        pushResults: resultsFromRoll(roll, previousRoll),
        successes: numSuccesses,
        successLabel:
            numSuccesses === 1 ? labelFor('rolls', 'success') : labelFor('rolls', 'successes'),
        success: numSuccesses > 0,
        fail: numSuccesses === 0,
        hopeLost,
        gearDamage,
        damage,
        canPush: false,
        pushed: true,
    };

    if (game.dice3d) {
        await game.dice3d.showForRoll(
            roll,
            message.user,
            true,
            message.whisper,
            message.blind,
            message._id,
            message.speaker,
        );
    }

    const html = await renderTemplate(`systems/${ID}/templates/chat/roll.hbs`, rollData);

    return await message.update({content: html});
}

export async function handleRollPush(message, html) {
    html.find('button.coriolis-roll-push').click(async (e) => {
        e.preventDefault();
        const actor = game.actors.get(message.speaker.actor);
        if (!actor) return;

        const rollData = prevRollData(actor, message, html);
        if (!rollData) return;

        await reroll(message, rollData);
    });
}

function prevRollData(actor, message, html) {
    const data = {
        systemId: ID,
        results: resultsFromRoll(message.rolls[0]),
    };

    const rollDataElem = html.find('.roll-data');
    if (rollDataElem.length > 0) {
        const dataset = rollDataElem[0].dataset;
        data.label = dataset.label;
        data.baseMod = Number(dataset.baseMod) || 0;
        data.gearMod = Number(dataset.gearMod) || 0;
        const itemId = dataset.itemId;
        if (itemId) {
            const item = actor.items.get(itemId);
            if (!item) {
                ui.notifications.error('errors.cannot_push_roll_item_does_not_exist');
                return null;
            }
            data.item = item;
        }
    }

    return {
        roll: message.rolls[0],
        data,
    };
}

async function postRoll(actor, attribute, item = undefined, baseMod = 0, gearMod = 0, roll) {
    const numSuccesses = successes(roll);
    let damage = undefined;
    if (item && item.type === 'weapon') {
        damage = (item.system.damage || 0) + Math.max(0, numSuccesses - 1);
    }

    const rollData = {
        systemId: ID,
        isArmor: item?.type === 'armor',
        label: item ? item.name : localize('attributes', attribute, 'name'),
        results: resultsFromRoll(roll),
        baseMod,
        gearMod,
        successes: numSuccesses,
        successLabel:
            numSuccesses === 1 ? labelFor('rolls', 'success') : labelFor('rolls', 'successes'),
        success: numSuccesses > 0,
        fail: numSuccesses === 0,
        canPush: actor.type === 'character' && item?.type !== 'armor',
        pushed: false,
        damage,
        item,
    };

    return createMessage(actor, `systems/${ID}/templates/chat/roll.hbs`, rollData, roll);
}

export async function selectAttribute(actor) {
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

export async function addDiceModifiers({base, baseBonus, gear, attribute, condition, item}) {
    const data = {
        baseDice: base,
        isTalent: item?.type === 'talent',
        talentMod: baseBonus,
        baseTotal: base + baseBonus + (condition ? -2 : 0),
        gearDice: gear,
        attribute,
        condition,
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

function successes(roll) {
    let successes = 0;
    for (let term of roll.terms) {
        if (term instanceof CoriolisBaseDie || term instanceof CoriolisGearDie) {
            for (let r of term.results) {
                if (r.result === 6) successes++;
            }
        }
    }

    return successes;
}

function rerollable(roll, diceType) {
    let dice = 0;
    for (let term of roll.terms) {
        if (term instanceof diceType) {
            for (let r of term.results) {
                if (isRerollable(r.result)) dice++;
            }
        }
    }
    return dice;
}

function ones(roll, diceType) {
    let ones = 0;
    for (let term of roll.terms) {
        if (term instanceof diceType) {
            for (let r of term.results) {
                if (r.result === 1) ones++;
            }
        }
    }
    return ones;
}

function resultsFromRoll(roll, previousRoll) {
    const results = {base: [], gear: []};

    if (previousRoll) {
        const {base, gear} = resultsFromRoll(previousRoll);
        results.base.push(...base.filter((r) => !isRerollable(r)));
        results.gear.push(...gear.filter((r) => !isRerollable(r)));
    }

    for (let term of roll.terms) {
        if (term instanceof CoriolisBaseDie) {
            results.base.push(...term.results.map((r) => r.result));
        }
        if (term instanceof CoriolisGearDie) {
            results.gear.push(...term.results.map((r) => r.result));
        }
    }

    return results;
}

function isRerollable(r) {
    return r > 1 && r < 6;
}
