import * as Coriolis from './config';
import {CoriolisActor} from './actor';
import {CoriolisItem} from './item';
import {CoriolisItemSheet} from './item-sheet';
import {CoriolisActorSheet} from './actor-sheet';
import {preloadHandlebarsTemplates, registerHandlebarsHelpers} from './templates';
import './styles/coriolis.scss';
import {CoriolisBaseDie, CoriolisGearDie, handleRollPush, registerDice3D} from './rolls';

Hooks.once('init', async function () {
    console.log('Coriolis: The Great Dark | Initializing system');

    game[Coriolis.ID] = {
        CoriolisActor,
        CoriolisItem,
    };

    CONFIG.Dice.terms['b'] = CoriolisBaseDie;
    CONFIG.Dice.terms['g'] = CoriolisGearDie;

    CONFIG.Actor.documentClass = CoriolisActor;
    CONFIG.Item.documentClass = CoriolisItem;

    Actors.unregisterSheet('core', ActorSheet);
    Actors.registerSheet(Coriolis.ID, CoriolisActorSheet, {makeDefault: true});
    Items.unregisterSheet('core', ItemSheet);
    Items.registerSheet(Coriolis.ID, CoriolisItemSheet, {makeDefault: true});

    registerHandlebarsHelpers();
    registerSettings();
    await preloadHandlebarsTemplates();
});

Hooks.on('yzeCombatReady', () => {
    if (game.settings.get(Coriolis.ID, 'configuredYzeCombat')) return;
    try {
        game.settings.set('yze-combat', 'resetEachRound', true);
        game.settings.set('yze-combat', 'slowAndFastActions', false);
        game.settings.set('yze-combat', 'initAutoDraw', true);
        game.settings.set('yze-combat', 'duplicateCombatantOnCombatStart', true);
        game.settings.set('yze-combat', 'actorSpeedAttribute', 'system.ferocity');
        game.settings.set(Coriolis.ID, 'configuredYzeCombat', true);
    } catch (e) {
        console.error('Coriolis: Could not configure YZE Combat. Try refreshing the page.');
    }
});

Hooks.once('diceSoNiceReady', registerDice3D);
Hooks.on('renderChatMessage', handleRollPush);

function registerSettings() {
    for (let k of Object.keys(Coriolis.SETTINGS)) {
        game.settings.register(Coriolis.ID, k, Coriolis.SETTINGS[k]);
    }
}
