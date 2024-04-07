import {createMessage} from './chat.js';
import {ID} from './config.js';
import addDiceModifiers from './dialogs/add-dice-modifiers.js';
import selectActor from './dialogs/select-actor.js';
import selectAttribute from './dialogs/select-attribute.js';
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
        return this.results.filter((r) => r.result === 6).length;
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
        return this.results.filter((r) => r.result === 6).length;
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

export async function rollArmor(actor, value, item = undefined) {
    const roll = await new Roll(`${value}db`, {}).evaluate();
    if (!item) {
        item = {
            type: 'armor',
            name: `${localize('creature.armor')}`,
        };
    }
    return await postRoll(actor, undefined, item, undefined, undefined, roll);
}

export async function rollBirdAbility(crew, item) {
    try {
        const actor = await selectActor(crew);
        return await roll(actor, 'insight', item);
    } catch (err) {
        return null;
    }
}

function hasGearBonus(item) {
    return !(item?.type === 'talent' || item?.type === 'bird_ability');
}

export async function rollCreatureAttack(actor, item) {
    let base = item.system.base_dice;
    let gear = 0;

    let baseMod, gearMod;
    try {
        const modifiers = await addDiceModifiers({
            base,
            gear,
            baseBonus: 0,
            attribute: undefined,
            condition: false,
            item,
        });
        baseMod = modifiers.base;
        gearMod = modifiers.gear;
    } catch (err) {
        if (err) console.error(err);
        return null;
    }

    base += baseMod;
    base = Math.max(1, base);

    gear += gearMod;
    gear = Math.max(0, gear);

    const roll = await new Roll(`${base}db + ${gear}dg`, {}).evaluate();
    return await postRoll(actor, undefined, item, baseMod, gearMod, roll);
}

export async function roll(actor, attribute = undefined, item = undefined) {
    if (!attribute) {
        try {
            attribute = await selectAttribute(actor);
        } catch {
            return null;
        }
    }

    let base = actor.attribute(attribute);
    let baseBonus = hasGearBonus(item) ? 0 : item.system.bonus;
    let gear = hasGearBonus(item) ? item?.system?.bonus || 0 : 0;
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
    const {roll: previousRoll, data: previousData, actor} = previousRollData;
    const item = previousData.item;
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

    await message.update({content: html});

    if (item && DAMAGEABLE_ITEMS.includes(item.type)) {
        await item.update({'system.bonus': Math.max(0, item.system.bonus - gearDamage)});
    }

    return await actor.update({
        'system.hope.value': Math.max(0, actor.system.hope.value - hopeLost),
    });
}

const DAMAGEABLE_ITEMS = ['weapon', 'gear'];

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
        actor,
        data,
    };
}

async function postRoll(
    actor,
    attribute = undefined,
    item = undefined,
    baseMod = 0,
    gearMod = 0,
    roll,
) {
    const numSuccesses = successes(roll);

    let damage = undefined;
    if (item?.system?.damage) {
        damage = (item.system.damage || 0) + Math.max(0, numSuccesses - 1);
    }

    let despair = undefined;
    if (item?.system?.despair) {
        despair = (item.system.despair || 0) + Math.max(0, numSuccesses - 1);
    }

    let blight = undefined;
    if (item?.system?.blight) {
        blight = (item.system.blight || 0) + Math.max(0, numSuccesses - 1);
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
        canPush:
            actor.type === 'character' &&
            item?.type !== 'armor' &&
            item?.type !== 'creature_attack',
        pushed: false,
        damage,
        despair,
        blight,
        item,
    };

    return createMessage(actor, `systems/${ID}/templates/chat/roll.hbs`, rollData, roll);
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
