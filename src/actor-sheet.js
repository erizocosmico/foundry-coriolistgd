import {ID} from './config';
import {localize} from './helpers/i18n';
import {roll, rollCreatureArmor} from './rolls';

const ALLOWED_ITEMS = {
    character: ['gear', 'weapon', 'armor', 'talent', 'injury'],
    npc: ['gear', 'weapon', 'armor', 'talent'],
    crew: ['bird_ability', 'armor'],
    creature: ['creature_ability', 'creature_attack'],
};

export class CoriolisActorSheet extends ActorSheet {
    #contextmenu = null;

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: [ID, 'sheet', 'actor', 'coriolis-window'],
            width: 800,
            height: 600,
            tabs: [
                {navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'overview'},
            ],
            dragDrop: [{dragSelector: '.item-list .item', dropSelector: null}],
        });
    }

    constructor(object, options) {
        switch (object.type) {
            case 'crew':
                options.width = 580;
                options.height = 580;
                options.tabs = [
                    {navSelector: '.sheet-tabs', contentSelector: '.sheet-body', initial: 'crew'},
                ];
                break;
            case 'npc':
            case 'creature':
                options.width = 450;
                options.height = 580;
                break;
            default:
        }

        super(object, options);
        this.setup = {};
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
        return `systems/${ID}/templates/sheets/${this.actor.type}.hbs`;
    }

    async getData(options) {
        const context = await super.getData(options);
        context.systemData = context.data.system;
        context.setup = this.setup;

        this._prepareItems(context);

        if (context.data.type === 'character') {
            this._prepareCharacterData(context);
        } else if (context.data.type === 'crew') {
            this._prepareCrewData(context);
        } else if (context.data.type === 'npc') {
            this._prepareNpcData(context);
        }

        return context;
    }

    _prepareCrewData(context) {
        context.crew = this.actor.members().map((actor) => ({
            id: actor._id,
            name: actor.name,
            img: actor.img,
            role: actor.system.crew_role || '-',
            supply: actor.system.supply || 0,
        }));
        context.supply = context.crew.reduce((supply, member) => supply + member.supply, 0);
    }

    _prepareNpcData(context) {
        context.attributes = Object.keys(this.actor.system.attributes).map((a) => ({
            id: a,
            value: this.actor.system.attributes[a] || 0,
        }));

        context.equipment = [...context.weapons, ...context.armor, ...context.gear];
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
        context.creatureAbilities = [];
        context.creatureAttacks = [];

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
                case 'creature_ability':
                    context.creatureAbilities.push(i);
                    break;
                case 'creature_attack':
                    context.creatureAttacks.push(i);
                    break;
            }
        }
    }

    /** @inheritdoc */
    activateListeners(html) {
        super.activateListeners(html);

        if (!this.isEditable) return;

        switch (this.actor.type) {
            case 'character':
                this._activateCharacterListeners(html);
                break;
            case 'crew':
                this._activateCrewListeners(html);
                break;
            case 'npc':
                this._activateNpcListeners(html);
                this._activateNpcHealthListeners(html);
                break;
            case 'creature':
                this._activateNpcHealthListeners(html);
                this._activateCreatureListeners(html);
                break;
        }

        html.find('.setup-toggle').on('click', (e) => this._onToggleSetup(e));
        html.find('.stat-counter-dot').on('click', (e) => this._onUpdateStat(e));

        if (this.actor.type === 'npc' || this.actor.type === 'character') {
            html.find('.attribute-plus').on('click', (e) => this._onUpdateAttribute(e, 1));
            html.find('.attribute-minus').on('click', (e) => this._onUpdateAttribute(e, -1));
            html.find('.attribute.rollable').on('click', (e) => this._onRollAttribute(e));
        }

        this._activateItemListeners(html);

        let handler = (ev) => this._onDragStart(ev);
        html.find('.item-list li.item').each((i, li) => {
            li.setAttribute('draggable', true);
            li.addEventListener('dragstart', handler, false);
        });
    }

    /** @override */
    async _onDropActor(event, actor) {
        if (this.actor.type !== 'crew') return super._onDropActor(event);

        const explorer = game.actors.get(foundry.utils.parseUuid(actor.uuid)?.documentId);
        if (explorer.type !== 'character') return super._onDropActor(event);

        const explorers = this.actor.system.explorers || [];
        if (explorers.includes(explorer._id)) return;

        await this.actor.update({
            'system.explorers': [...explorers, explorer._id],
        });

        return super._onDropActor(event);
    }

    _activateCharacterListeners(html) {
        html.find('.attribute-condition').on('click', (e) => this._onToggleCondition(e));
    }

    _activateCrewListeners(html) {
        html.find('.delete-crew').on('click', (e) => this._onDeleteCrewMember(e));
    }

    _activateNpcHealthListeners(html) {
        html.find('.health-plus').on('click', (e) => this._onUpdateMaxHealth(e, 1));
        html.find('.health-minus').on('click', (e) => this._onUpdateMaxHealth(e, -1));
    }

    _activateCreatureListeners(html) {
        html.find('.roll-armor').on('click', (e) => this._onRollCreatureArmor(e));
        html.find('.roll-random-attack').on('click', (e) => this._onRollCreatureRandomAttack(e));
    }

    _activateNpcListeners(html) {
        this.#contextmenu = ContextMenu.create(
            this,
            html,
            "[data-context='equipment']",
            [
                {
                    name: localize('gear.label'),
                    icon: '<i class="fas fa-gear"></i>',
                    callback: () => {
                        this._onAddItem(undefined, 'gear');
                    },
                },
                {
                    name: localize('gear.weapons.label_single'),
                    icon: "<i class='fas fa-gun'></i>",
                    callback: () => {
                        this._onAddItem(undefined, 'weapon');
                    },
                },
                {
                    name: localize('gear.armor.label'),
                    icon: "<i class='fas fa-shirt'></i>",
                    callback: () => {
                        this._onAddItem(undefined, 'armor');
                    },
                },
            ],
            {eventName: 'click'},
        );
        this.#contextmenu._setPosition = function (html, target) {
            html.addClass('expand-down');
            target.append(html);
            target.addClass('context');
            target.addClass('add-equipment-menu');
        };
    }

    _activateItemListeners(html) {
        html.find('.add-item').on('click', (e) => this._onAddItem(e));
        html.find('.edit-item').on('click', (e) => this._onEditItem(e));
        html.find('.delete-item').on('click', (e) => this._onDeleteItem(e));
        html.find('.roll-item').on('click', (e) => this._onRollItem(e));
        html.find('.show-item').on('click', (e) => this._onShowItem(e));
        html.find('.toggle-item').on('click', (e) => this._onToggleItem(e));
    }

    async _onAddItem(e, type = undefined) {
        if (e) {
            e.preventDefault();
            type = e.currentTarget.dataset.type;
        }

        if (!type) return;

        const name = `${localize('new')} ${game.i18n.localize('TYPES.Item.' + type)}`;
        const itemData = {name, type, data: {}};
        return await this.actor
            .createEmbeddedDocuments('Item', [itemData], {render: true})
            .then((items) => items[0].sheet.render(true));
    }

    _onRollAttribute(e) {
        e.preventDefault();
        e.stopPropagation();
        if (this.setup.attributes) return;
        const attr = e.currentTarget.dataset.attribute;
        roll(this.actor, attr);
    }

    _onToggleSetup(e) {
        e.preventDefault();
        const section = e.currentTarget.dataset.section;
        this.setup[section] = !this.setup[section];
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
        const a = e.currentTarget.dataset.attribute;
        const attr = this.actor.attribute(a);
        if (!attr) return;

        const newValue = attr + delta;
        if (newValue < 0 || newValue > 6) return;

        const key =
            this.actor.type === 'character'
                ? `system.attributes.${a}.value`
                : `system.attributes.${a}`;

        this.actor.update({
            [key]: newValue,
        });
    }

    _onUpdateMaxHealth(e, delta) {
        e.preventDefault();
        const newValue = this.actor.system.health.max + delta;
        if (newValue < 1) return;
        return this.actor.update({
            'system.health.max': newValue,
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

    _onDeleteCrewMember(e) {
        e.preventDefault();
        // TODO: show confirm before deleting
        const id = e.currentTarget.dataset.id;
        const explorers = this.actor.system.explorers || [];
        this.actor.update({'system.explorers': explorers.filter((e) => e !== id)});
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

    _onRollCreatureArmor(e) {
        e.preventDefault();
        return rollCreatureArmor(this.actor, this.actor.system.armor);
    }

    async _onRollCreatureRandomAttack(e) {
        e.preventDefault();

        const attacks = this.actor.items.filter((i) => i.type === 'creature_attack');
        if (attacks.length === 0) return;
        if (attacks.length === 1) return attacks[0].roll(this.actor);

        const last = this.actor.system.last_attack;

        const index = Math.floor(Math.random() * attacks.length);
        if (attacks[index]._id === last) {
            index = (index + 1) % attacks.length;
        }

        await this.actor.update({'system.last_attack': attacks[index]._id});

        return attacks[index].roll(this.actor);
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
