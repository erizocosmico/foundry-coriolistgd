import {ID} from './config';
import {localize} from './helpers/i18n';
import {roll} from './rolls';

const ALLOWED_ITEMS = {
    character: ['gear', 'weapon', 'armor', 'talent', 'injury'],
    npc: ['gear', 'weapon', 'armor', 'talent'],
    crew: ['bird_ability'],
};

export class CoriolisActorSheet extends ActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: [ID, 'sheet', 'actor', 'coriolis-window'],
            width: 800,
            height: 600,
            tabs: [
                {navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'overview'},
            ],
            //dragDrop: [{dragSelector: '.item-list .item', dropSelector: null}],
        });
    }

    constructor(object, options) {
        switch (object.type) {
            case 'crew':
                options.width = 580;
                options.height = 670;
                break;
            case 'npc':
                options.width = 580;
                options.height = 640;
                break;
            default:
        }

        super(object, options);
        this.locked = true;
    }

    /** @override */
    async _onDropItemCreate(itemData) {
        const type = itemData.type;

        if (!ALLOWED_ITEMS[this.actor.type].includes(type)) {
            return false;
        }

        return super._onDropItemCreate(itemData);
    }

    get template() {
        return `systems/${ID}/templates/${this.actor.type}-sheet.hbs`;
    }

    async getData(options) {
        const context = await super.getData(options);
        context.systemData = context.data.system;
        context.locked = this.locked;

        if (context.data.type === 'character') {
            this._prepareCharacterData(context);
        }
        this._prepareItems(context);

        return context;
    }

    _prepareCharacterData(context) {
        const system = context.data.system;
        let perc = (this.actor.encumbrance / this.actor.maxEncumbrance) * 100;
        perc = perc >= 100 ? 100 : perc;
        context.encumbrance = {
            current: this.actor.encumbrance,
            max: this.actor.maxEncumbrance,
            percentage: perc,
            status: encumbranceStatus(perc),
        };

        context.stats = [
            {
                key: 'health',
                label: localize('stats.health'),
                value: system.health.value,
                max: system.health.max,
            },
            {
                key: 'hope',
                label: localize('stats.hope'),
                value: system.hope.value,
                max: system.hope.max,
            },
            {
                key: 'heart',
                label: localize('stats.heart'),
                value: system.heart.value,
                max: system.heart.max,
            },
        ];
    }

    _prepareItems(context) {
        context.gear = [];
        context.talents = [];
        context.injuries = [];
        context.weapons = [];
        context.armor = [];
        context.birdAbilities = [];
        context.weaponsAtHand = [];
        context.wornArmor = [];

        for (let i of context.items) {
            i.img = i.img || DEFAULT_TOKEN;
            switch (i.type) {
                case 'injury':
                    context.injuries.push(i);
                    break;
                case 'gear':
                    context.gear.push(i);
                    break;
                case 'weapon':
                    if (i.system.at_hand) context.weaponsAtHand.push(i);
                    context.weapons.push(i);
                    break;
                case 'talent':
                    context.talents.push(i);
                    break;
                case 'bird_ability':
                    context.birdAbilities.push(i);
                    break;
                case 'armor':
                    if (i.system.worn) context.wornArmor.push(i);
                    context.armor.push(i);
                    break;
            }
        }
    }

    /** @inheritdoc */
    activateListeners(html) {
        super.activateListeners(html);

        if (!this.isEditable) return;

        switch (this.actor.data.type) {
            case 'character':
                this._activateCharacterListeners(html);
                break;
        }

        let handler = (ev) => this._onDragStart(ev);
        html.find('.item-list li.item').each((i, li) => {
            li.setAttribute('draggable', true);
            li.addEventListener('dragstart', handler, false);
        });
    }

    _activateCharacterListeners(html) {
        html.find('.attributes-edit-switch').on('click', (e) => this._onToggleLocked(e));
        html.find('.attribute-condition').on('click', (e) => this._onToggleCondition(e));
        html.find('.attribute-plus').on('click', (e) => this._onUpdateAttribute(e, 1));
        html.find('.attribute-minus').on('click', (e) => this._onUpdateAttribute(e, -1));
        html.find('.attribute.rollable').on('click', (e) => this._onRollAttribute(e));

        html.find('.stat-counter-dot').on('click', (e) => this._onUpdateStat(e));

        html.find('.add-item').on('click', (e) => this._onAddItem(e));
        html.find('.edit-item').on('click', (e) => this._onEditItem(e));
        html.find('.delete-item').on('click', (e) => this._onDeleteItem(e));
        html.find('.roll-item').on('click', (e) => this._onRollItem(e));
        html.find('.show-item').on('click', (e) => this._onShowItem(e));
        html.find('.toggle-item').on('click', (e) => this._onToggleItem(e));
    }

    async _onAddItem(e) {
        e.preventDefault();
        const type = e.currentTarget.dataset.type;
        const name = `${localize('new')} ${game.i18n.localize('TYPES.Item.' + type)}`;
        const itemData = {name, type, data: {}};
        return await this.actor
            .createEmbeddedDocuments('Item', [itemData], {render: true})
            .then((items) => items[0].sheet.render(true));
    }

    _onRollAttribute(e) {
        e.preventDefault();
        if (!this.locked) return;
        const attr = e.currentTarget.dataset.attribute;
        roll(this.actor, attr);
    }

    _onToggleLocked(e) {
        e.preventDefault();
        this.locked = !this.locked;
        this._render();
    }

    _onToggleCondition(e) {
        e.stopPropagation();
        const key = e.currentTarget.dataset.attribute;
        const attr = this.actor.data.system.attributes[key];
        if (!attr) return;

        this.actor.update({[`system.attributes.${key}.condition`]: !attr.condition});
    }

    _onUpdateAttribute(e, delta) {
        e.preventDefault();
        const key = e.currentTarget.dataset.attribute;
        const attr = this.actor.data.system.attributes[key];
        if (!attr) return;

        const newValue = attr.value + delta;
        if (newValue < 0 || newValue > 6) return;

        this.actor.update({
            [`system.attributes.${key}.value`]: newValue,
        });
    }

    _onUpdateStat(e) {
        e.preventDefault();
        let newValue = Number(e.currentTarget.dataset.value);
        const stat = e.currentTarget.dataset.stat;
        if (!this.actor.data.system[stat]) return;

        const {value, max} = this.actor.data.system[stat];
        if (value === 1 && newValue === 1) {
            newValue = 0;
        }

        if (newValue < 0 || newValue > max) return;

        this.actor.update({
            [`system.${stat}.value`]: newValue,
        });
    }

    _onEditItem(e) {
        e.preventDefault();
        const id = e.currentTarget.dataset.id;
        const item = this.actor.items.get(id);
        if (item) item.sheet.render(true);
    }

    _onDeleteItem(e) {
        e.preventDefault();
        // TODO: show confirm before deleting
        const id = e.currentTarget.dataset.id;
        const item = this.actor.items.get(id);
        if (item) item.delete();
    }

    _onRollItem(e) {
        e.preventDefault();
        e.stopPropagation();
        const id = e.currentTarget.dataset.id;
        const item = this.actor.items.get(id);
        if (item) item.roll(this.actor);
    }

    _onShowItem(e) {
        e.preventDefault();
        const id = e.currentTarget.dataset.id;
        const item = this.actor.items.get(id);
        if (item) item.show(this.actor);
    }

    _onToggleItem(e) {
        e.preventDefault();
        const id = e.currentTarget.dataset.id;
        const prop = e.currentTarget.dataset.prop;
        const item = this.actor.items.get(id);
        if (item) {
            item.update({[`system.${prop}`]: !item.system[prop]});
        }
    }
}

function encumbranceStatus(percentage) {
    if (percentage === 100) {
        return 'max';
    }

    if (percentage > 75) {
        return 'high';
    }

    if (percentage > 50) {
        return 'medium';
    }

    return 'low';
}
