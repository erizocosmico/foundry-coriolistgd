import {ID} from '../config';

export function labelFor(...args) {
    return `CORIOLIS.${args.join('.')}`;
}

export function localize(...args) {
    return game.i18n.localize(labelFor(...args));
}
