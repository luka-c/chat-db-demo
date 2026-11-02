export const createDbQuery = `
    CREATE TABLE IF NOT EXISTS Users
    (
        id INTEGER NOT NULL,
        username VARCHAR(64) NOT NULL,
        password CHAR(256) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE (username)
    );

    CREATE TABLE IF NOT EXISTS Chats
    (
        id INTEGER NOT NULL,
        name VARCHAR(64) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    );

    CREATE TABLE IF NOT EXISTS Invites
    (
        invitedUserId INTEGER NOT NULL,
        chatId INTEGER NOT NULL,
        invitedBy INTEGER NOT NULL,
        accepted BOOLEAN DEFAULT NULL,
        PRIMARY KEY (invitedUserId, chatId, invitedBy),
        FOREIGN KEY (invitedUserId) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (chatId) REFERENCES Chats(id) ON DELETE CASCADE,
        FOREIGN KEY (invitedBy) REFERENCES Users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Messages
    (
        id INTEGER NOT NULL,
        senderId INTEGER NOT NULL,
        chatId INTEGER NOT NULL,
        content VARCHAR(256) NOT NULL,
        sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        FOREIGN KEY (senderId) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (chatId) REFERENCES Chats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ChatUser
    (
        userId INTEGER NOT NULL,
        chatId INTEGER NOT NULL,
        isAdmin BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (userId, chatId),
        FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (chatId) REFERENCES Chats(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Bans
    (
        bannedUserId INTEGER NOT NULL,
        chatId INTEGER NOT NULL,
        bannedBy INTEGER NOT NULL,
        bannedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (bannedUserId, chatId),
        FOREIGN KEY (bannedUserId) REFERENCES Users(id) ON DELETE CASCADE,
        FOREIGN KEY (chatId) REFERENCES Chats(id) ON DELETE CASCADE,
        FOREIGN KEY (bannedBy) REFERENCES Users(id) ON DELETE CASCADE
    );
`;
