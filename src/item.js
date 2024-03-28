import {createMessage} from './chat';
import {ID} from './config';
import {localize} from './helpers/i18n';
import {roll, rollArmor, rollBirdAbility} from './rolls';

const MAX_WEAPONS_AT_HAND = 3;
const MAX_ARMOR_WORN = 1;

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
        switch (this.data.type) {
            case 'weapon':
                if (changes?.system?.at_hand && this.data.system.equipped) {
                    changes.system.equipped = false;
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
                if (changes?.system?.worn && actor) {
                    const armorWorn = Array.from(actor.items.values()).filter(
                        (i) => i.type === 'armor' && i?.system?.worn,
                    ).length;
                    if (armorWorn >= MAX_ARMOR_WORN) {
                        ui.notifications.error(localize('errors.max_armor_worn'));
                        return false;
                    }
                }
        }

        return super._preUpdate(changes, ...args);
    }

    async roll(actor = this.parent) {
        if (!ROLLABLE_ITEMS.includes(this.type)) return;
        if (!actor) return;

        if (this.type === 'armor') {
            return await rollArmor(actor, this);
        }

        if (this.type === 'bird_ability') {
            return await rollBirdAbility(actor, this);
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

const ROLLABLE_ITEMS = ['armor', 'weapon', 'gear', 'talent', 'bird_ability'];
