
class TagGame {

    static handleServerData(data) {
        // You start out tagged when you join.
        if (data.privateId) {
            TagGame.setTaggedId(publicId);
        }
        // The player that just joined starts tagged.
        if (data.playerJoined) {
            TagGame.setTaggedId(data.playerJoined.id);
        }
        // If no one else is left, no one is tagged.
        if (data.playerLeft) {
            if (_.isEmpty(otherCharacters)) TagGame.taggedId = null;
        }
        // This is passed without tagCompleted to initiate a tag,
        // and with tagCompleted to confirm a tag.
        if (data.tagged) {
            if (data.tagCompleted) TagGame.setTaggedId(data.tagged);
            else if (data.tagged === publicId) {
                TagGame.canCompleteTagUntil = now() + 500;
            }
        }
        if (data.tagRound) {
            TagGame.tagRound = data.tagRound;
            TagGame.nextScoreUpdate = now() + TagGame.tagRound.interval * 1000;
        }
    }

    static update() {
        if (isKeyDown('T'.charCodeAt(0))) {
            TagGame.sendStartTagRound();
        }
        if (TagGame.nextScoreUpdate && now() >= TagGame.nextScoreUpdate) {
            var allCharacters = [mainCharacter, ...Object.values(otherCharacters)]
            for (var character of allCharacters) {
                character.score += (character.coins || 0);
            }
            if (!allCharacters.some(character => character.score >= TagGame.tagRound.goal)) {
                TagGame.nextScoreUpdate = now() + TagGame.tagRound.interval * 1000;
            } else {
                TagGame.nextScoreUpdate = null;
            }
        }
        // When the Tagged player touches another on his client, he sends a message indicating that he has done
        // this. This sets a window of 500 milliseconds in which if that character client sees the tagged player
        // tag them, then they will send a message indicating they are now the Tagged player.
        if (publicId === TagGame.taggedId) {
            for (var id in otherCharacters) {
                var target = otherCharacters[id];
                if (target.untaggableUntil > now()) continue;
                if (getGlobalSpriteHitBox(mainCharacter).overlapsRectangle(getGlobalSpriteHitBox(target))) {
                    TagGame.sendTaggedPlayer(id);
                    break;
                }
            }
        }
        // If we are still within the window of confirming that the local main character has been tagged, check if they
        // are in contact with the tagged character and send the final tagged message with their id if so.
        if (TagGame.canCompleteTagUntil > now()) {
            var taggedCharacter = otherCharacters[TagGame.taggedId];
            if (taggedCharacter && getGlobalSpriteHitBox(mainCharacter).overlapsRectangle(getGlobalSpriteHitBox(taggedCharacter))) {
                TagGame.sendTaggedPlayer(publicId, true);
                TagGame.canCompleteTagUntil = null;
            }
        }
    }

    static render() {
        mainContext.textAlign = 'right'
        mainContext.textBaseline = 'top';
        mainContext.font = '18px sans-serif';
        var allCharacters = [mainCharacter, ...Object.values(otherCharacters)];
        for (var i = 0; i < allCharacters.length; i++) {
            var coins = allCharacters[i].coins || 0;
            var score = allCharacters[i].score || 0;
            mainContext.globalAlpha = .8;
            draw.fillRectangle(mainContext, new Rectangle(mainCanvas.width - 85, 5 + 35 * i, 80, 30), 'black');
            mainContext.globalAlpha = 1;
            mainContext.fillStyle = 'white';
            mainContext.fillText(`${score} (+${coins})`, mainCanvas.width - 10, 10 + 35 * i);
            mainContext.fillStyle = allCharacters[i].color;
            mainContext.fillText(`${score} (+${coins})`, mainCanvas.width - 10 - 1, 10 + 35 * i - 1);
        }
    }

    static sendTaggedPlayer(id, tagCompleted) {
        sendData({action: 'tagged', id: id, tagCompleted});
    }

    static sendStartTagRound() {
        sendData({action: 'startTagRound', tagRound: {goal: 100, interval: 5}});
    }

    static setTaggedId(id) {
        // Everyone gets full life when a new player is tagged.
        if (id !== TagGame.taggedId) mainCharacter.health = mainCharacter.maxHealth;
        // No one should be tagged if only one player is present
        if (_.isEmpty(otherCharacters)) {
            TagGame.taggedId = null;
            return;
        }
        // The player who tagged the other player cannot be tagged for 5 seconds.
        var currentlyTaggedPlayer = getPlayerById(TagGame.taggedId);
        if (currentlyTaggedPlayer) {
            currentlyTaggedPlayer.blinkUntil = currentlyTaggedPlayer.untaggableUntil = now() + 5000;
        }
        // It is hard to keep 'stuck' players in sync, and maybe not necessary for the
        // game to work.
        // var newlyTaggedPlayer = getPlayerById(id);
        // if (newlyTaggedPlayer) newlyTaggedPlayer.stuckUntil = now() + 2000;
        TagGame.taggedId = id;
    }
}
// The id of the player who was most recently tagged, aka, IT.
TagGame.taggedId = null;
// This will be set to 500ms in the future when another client has tagged this client.
// If this client confirms the tag within that time frame, then this client will send a confirmation tag
// which tells all players that this client has been tagged.
TagGame.canCompleteTagUntil = null;
// Timestamp for the next time the score should update
TagGame.nextScoreUpdate = null;
TagGame.tagRound = null;
