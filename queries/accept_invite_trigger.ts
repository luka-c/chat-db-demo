export const createAcceptInviteTrigger = `
    CREATE TRIGGER IF NOT EXISTS AcceptInvite 
    AFTER UPDATE OF accepted ON Invites 
    BEGIN
        DELETE
        FROM Invites
        WHERE invitedUserId = old.invitedUserId
        AND chatId = old.chatId
        AND new.accepted = true;

        INSERT OR IGNORE INTO ChatUser 
        (userId, chatId)
        SELECT old.invitedUserId, old.chatId
        WHERE new.accepted = true
        AND NOT EXISTS (SELECT 1 FROM Bans WHERE bannedUserId = old.invitedUserId AND chatId = old.chatId);
    END;
`;
