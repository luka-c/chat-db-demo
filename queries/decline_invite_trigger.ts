export const createDeclineInviteTrigger = `
    CREATE TRIGGER IF NOT EXISTS DeclineInvite 
    AFTER UPDATE OF accepted ON Invites 
    BEGIN
        DELETE
        FROM Invites
        WHERE invitedUserId = old.invitedUserId
        AND invitedBy = old.invitedBy
        AND chatId = old.chatId
        AND new.accepted = false;
    END;
`;
