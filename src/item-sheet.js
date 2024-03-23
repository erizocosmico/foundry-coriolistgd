import {ATTRIBUTES, ID, RANGES} from './config';
import {localize} from './helpers/i18n';

const MAX_TALENT_LEVEL = 3;
const MAX_BONUS = 3;

export class CoriolisItemSheet extends ItemSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: [ID, 'sheet', 'item', 'coriolis-window'],
            width: 520,
        });
    }

    constructor(object, options) {
        switch (object.type) {
            case 'talent':
                options.height = 425;
                break;
            case 'armor':
                options.width = 400;
                break;
            default:
                break;
        }
        super(object, options);
    }

    get template() {
        return `systems/${ID}/templates/items/${this.item.type}.hbs`;
    }

    async getData(options) {
        const context = await super.getData(options);
        context.systemData = context.data.system;
        context.yesOrNo = {true: 'Yes', false: 'No'};

        if (['talent', 'bird_ability', 'gear', 'weapon'].includes(context.data.type)) {
            context.bonuses = {0: localize('talents.no_bonus')};
            for (let i = 1; i <= MAX_BONUS; i++) {
                context.bonuses[`${i}`] = `+${i}`;
            }
        }

        if (['bird_ability', 'weapon'].includes(context.data.type)) {
            context.ranges = {'': '-'};
            for (let range of RANGES) {
                context.ranges[range] = localize('ranges', range);
            }
        }

        if (['talent', 'gear'].includes(context.data.type)) {
            context.attributes = {'': localize('talents.no_attribute')};
            for (let attr of ATTRIBUTES) {
                context.attributes[attr] = localize('attributes', attr, 'name');
            }
        }

        if (['weapon', 'gear', 'armor'].includes(context.data.type)) {
            context.weights = {
                0: localize('gear.tiny'),
                0.5: '1/2',
                1: '1',
                2: '2',
                3: '3',
                4: '4',
            };
        }

        if (context.data.type === 'talent') {
            context.levels = {};
            for (let i = 1; i <= MAX_TALENT_LEVEL; i++) {
                context.levels[`${i}`] = `${i}`;
            }
        } else if (context.data.type === 'injury') {
            context.injuryTypes = {
                physical: localize('injuries.physical'),
                mental: localize('injuries.mental'),
                blight: localize('injuries.blight'),
            };
        } else if (context.data.type === 'weapon') {
            context.weaponTypes = {
                melee: localize('gear.weapons.melee'),
                ranged: localize('gear.weapons.ranged'),
            };
        }

        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);
        if (!this.isEditable) return;
    }
}
