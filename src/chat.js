export async function createMessage(actor, template, rollData, roll = undefined) {
    const html = await renderTemplate(template, rollData);

    const chatData = {
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({
            alias: actor.data.name,
            actor,
        }),
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll,
        rollMode: game.settings.get('core', 'rollMode'),
        content: html,
    };

    if (['gmroll', 'blindroll'].includes(chatData.rollMode)) {
        chatData.whisper = ChatMessage.getWhisperRecipients('GM');
    } else if (chatData.rollMode === 'selfroll') {
        chatData.whisper = [game.user];
    }

    ChatMessage.create(chatData);
    return null;
}
