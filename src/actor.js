import {ID} from './config';
import {roll} from './rolls';

const MIN_ATTR = 2;
const MAX_ATTR = 6;

export class CoriolisActor extends Actor {
    static async create(data, options = {}) {
        data.prototypeToken = data.prototypeToken || {};
        let defaults = {};
        if (data.type === 'character') {
            defaults = {
                actorLink: true,
                disposition: 1,
                vision: true,
            };
        }
        mergeObject(data.prototypeToken, defaults, {overwrite: false});
        return super.create(data, options);
    }

    get maxEncumbrance() {
        return this.system.attributes.strength.value + 6;
    }

    get encumbrance() {
        const itemWeight = this.items
            .filter((i) => ['weapon', 'gear', 'armor'].includes(i.type) && i.system.equipped)
            .reduce((weight, item) => weight + (item.system.weight || 0), 0);

        const supplyWeight = Math.floor((this.system.supply || 0) / 2) * 0.5;
        return itemWeight + supplyWeight;
    }

    attribute(key) {
        if (this.type === 'character') {
            return this.system.attributes[key]?.value;
        }

        if (this.type === 'npc') {
            return this.system.attributes[key];
        }

        return undefined;
    }

    hasCondition(attr) {
        if (this.type === 'character') {
            return this.system.attributes[attr]?.condition;
        }

        return false;
    }

    /** @override */
    _preCreate() {
        this.updateSource({img: `systems/${ID}/assets/icons/actors/${this.type}.jpg`});
        return Promise.resolve();
    }

    _preUpdate(changes, ...args) {
        if (
            (this.type === 'character' || this.type === 'npc') &&
            changedAttributeValue(this.type, changes)
        ) {
            if (!attributeChangesValid(this.type, changes)) return false;
            if (this.type === 'character') {
                this._updateStats(changes);
            }
        }
        return super._preUpdate(changes, ...args);
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    getRollData() {
        const data = this.toObject(false).system;
        return data;
    }

    rollAttribute(attr) {
        return roll(this, attr);
    }

    members() {
        if (this.type !== 'crew') return [];

        return (this.system.explorers || []).map((id) => game.actors.get(id)).filter((x) => x);
    }

    _updateStats(changes) {
        const attributes = {};
        for (let a of Object.keys(this.system.attributes)) {
            attributes[a] = this.system.attributes[a].value;
        }

        for (let a of Object.keys(changes.system.attributes)) {
            attributes[a] = changes.system.attributes[a].value;
        }

        const {health, hope, heart} = this.system;
        changes.system = changes.system || {};
        changes.system.health = {};
        changes.system.health.max = attributes.strength + attributes.agility;
        changes.system.health.value = Math.min(changes.system.health.max, health.value);

        changes.system.hope = {};
        changes.system.hope.max = attributes.logic + attributes.empathy;
        changes.system.hope.value = Math.min(changes.system.hope.max, hope.value);

        changes.system.heart = {};
        changes.system.heart.max = attributes.insight + attributes.perception;
        changes.system.heart.value = Math.min(changes.system.heart.max, heart.value);
    }
}

function changedAttributeValue(type, changes) {
    for (let a of Object.keys(changes?.system?.attributes || {})) {
        const attr = changes.system.attributes[a];
        const val = type === 'character' ? attr.value : attr;
        if (val) return true;
    }
    return false;
}

function attributeChangesValid(type, changes) {
    for (let a of Object.keys(changes.system?.attributes || {})) {
        const attr = changes.system.attributes[a];
        const val = type === 'character' ? attr.value : attr;
        if (!val) continue;
        if (val < MIN_ATTR || val > MAX_ATTR) return false;
    }
    return true;
}
