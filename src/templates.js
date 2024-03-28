import {ID} from './config';
import {localize} from './helpers/i18n';

export async function preloadHandlebarsTemplates() {
    const templatePaths = [
        'parts/character/bio',
        'parts/character/talents',
        'parts/character/gear',
        'parts/character/overview',
        'parts/crew/crew',
        'parts/crew/bird',
        'parts/crew/notes',
        'dialogs/roll_modifiers',
        'dialogs/roll_attribute',
        'chat/item',
        'chat/roll',
    ];

    return loadTemplates(templatePaths.map((t) => `/systems/${ID}/templates/${t}.hbs`));
}

export function registerHandlebarsHelpers() {
    Handlebars.registerHelper('loc', function (...args) {
        args.pop();
        return localize(...args);
    });

    Handlebars.registerHelper('ifThen', function (cond, result, other) {
        return cond ? result : other;
    });

    Handlebars.registerHelper('range', function (start, end) {
        let range = [];
        for (let i = start; i <= end; i++) {
            range.push(i);
        }
        return range;
    });

    Handlebars.registerHelper('partial', function (typ, tpl) {
        return `/systems/${ID}/templates/parts/${typ}/${tpl}.hbs`;
    });

    Handlebars.registerHelper('hasItems', function (arr, options) {
        if (arr?.length > 0) {
            return options.fn(this);
        }

        return options.inverse(this);
    });

    Handlebars.registerHelper('features', function (str) {
        return str
            .trim()
            .split(',')
            .map((s) => s.trim())
            .filter((x) => x);
    });
}
