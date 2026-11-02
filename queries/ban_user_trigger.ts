export const createBanUserTrigger = `    
    CREATE TRIGGER IF NOT EXISTS BanUser 
    AFTER INSERT ON Bans 
    BEGIN
        DELETE
        FROM ChatUser
        WHERE userId = new.bannedUserId
        AND chatId = new.chatId;

        DELETE
        FROM Invites
        WHERE invitedUserId = new.bannedUserId
        AND chatId = new.chatId;
    END;
`;
