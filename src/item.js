import {ID} from './config';
import {localize} from './helpers/i18n';
import {roll, rollArmorItem, rollBirdAbility, rollCreatureAttack} from './rolls';

const MAX_WEAPONS_AT_HAND = 3;

export class CoriolisItem extends Item {
    /** @override */
    _preCreate() {
        this.updateSource({img: `systems/${ID}/assets/icons/items/${this.type}.jpg`});
        return Promise.resolve();
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    _preUpdate(changes, ...args) {
        const actor = this.parent;
        switch (this.type) {
            case 'weapon':
                // Remove from equipped when it's changed to at hand and add to equipped when removed
                // from at hand.
                if (changes?.system?.at_hand && this.system.equipped) {
                    changes.system.equipped = false;
                } else if (changes?.system?.at_hand === false && !this.system.equipped) {
                    changes.system.equipped = true;
                }

                if (changes?.system?.at_hand && actor) {
                    const weaponsAtHand = Array.from(actor.items.values()).filter(
                        (i) => i.type === 'weapon' && i?.system?.at_hand,
                    ).length;
                    if (weaponsAtHand >= MAX_WEAPONS_AT_HAND) {
                        ui.notifications.error(localize('errors.max_weapons_at_hand'));
                        return false;
                    }
                }
                break;
            case 'armor':
                // Remove from equipped when it's changed to worn and add to equipped when removed
                // from worn.
                if (changes?.system?.worn && this.system.equipped) {
                    changes.system.equipped = false;
                } else if (changes?.system?.worn === false && !this.system.equipped) {
                    changes.system.equipped = true;
                }
                break;
        }

        return super._preUpdate(changes, ...args);
    }

    async roll(actor = this.parent) {
        if (!ROLLABLE_ITEMS.includes(this.type)) return;
        if (!actor) return;

        if (this.type === 'armor') {
            return await rollArmorItem(actor, this);
        }

        if (this.type === 'bird_ability') {
            return await rollBirdAbility(actor, this);
        }

        if (this.type === 'creature_attack') {
            return await rollCreatureAttack(actor, this);
        }

        let attribute = this.system?.attribute;
        if (this.type === 'weapon') {
            attribute = this.system.type === 'ranged' ? 'agility' : 'strength';
        }

        return await roll(actor, attribute, this);
    }

    async show(actor = this.parent) {
        if (!actor) return;
        ui.notifications.warn('Posting items to chat is not implemented yet');
        /*return await createMessage(actor, `/systems/${ID}/templates/chat/item.hbs`, {
            item: this,
        });*/
    }
}

const ROLLABLE_ITEMS = ['armor', 'weapon', 'gear', 'talent', 'bird_ability', 'creature_attack'];
