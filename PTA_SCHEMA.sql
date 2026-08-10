-- ============================================================================
-- PROFI-T-ABILITY (PTA) ADATBÁZIS SÉMA - MS SQL Server (T-SQL) DDL Szkript
-- Készült: PROFI-T-ABILITY Játékmenet Specifikáció (v1.0) alapján
-- Futtatható: SQL Server Management Studio (SSMS) alatt
-- ============================================================================

-- 1. Új Schema létrehozása (ha még nem létezik)
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'PTA')
BEGIN
    EXEC('CREATE SCHEMA PTA;');
END
GO

-- ============================================================================
-- 2. PTA.EventSettings
--    A PROFI-T-ABILITY események specifikus beállításai és állapota.
--    A fő dbo.Events táblához kapcsolódik (1:1 kapcsolatban).
-- ============================================================================
IF OBJECT_ID('PTA.EventSettings', 'U') IS NULL
BEGIN
    CREATE TABLE PTA.EventSettings (
        EventID INT NOT NULL PRIMARY KEY, -- FK -> dbo.Events.ID (vagy önálló ID)
        CurrentStage VARCHAR(50) NOT NULL DEFAULT 'planning', 
        IsDemoMode BIT NOT NULL DEFAULT 0,
        MaxPlayersPerTable INT NOT NULL DEFAULT 4,
        TotalRounds INT NOT NULL DEFAULT 3,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT CK_PTA_CurrentStage CHECK (
            CurrentStage IN ('planning','organizing','checkin','draw','game','ceremony','closed')
        )
    );
    PRINT 'PTA.EventSettings tábla létrehozva.';
END
GO

-- ============================================================================
-- 3. PTA.EventMasters
--    Szervezők és Játékmesterek (akár konkrét asztalhoz is rendelve).
-- ============================================================================
IF OBJECT_ID('PTA.EventMasters', 'U') IS NULL
BEGIN
    CREATE TABLE PTA.EventMasters (
        MasterID INT IDENTITY(1,1) PRIMARY KEY,
        EventID INT NOT NULL,
        UserID INT NULL, -- FK -> dbo.Users.ID (ha regisztrált EventJoy felhasználó)
        Name NVARCHAR(150) NOT NULL,
        RoleType VARCHAR(50) NOT NULL, -- 'Főszervező', 'Szervező', 'Játékmester'
        AssignedTableNumber INT NULL,  -- pl. 1 -> "1. asztal játékmestere"
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_PTA_EventMasters_Event FOREIGN KEY (EventID) 
            REFERENCES PTA.EventSettings(EventID) ON DELETE CASCADE
    );
    PRINT 'PTA.EventMasters tábla létrehozva.';
END
GO

-- ============================================================================
-- 4. PTA.Players
--    Jelenléti ív, játékosok és csapatok nyilvántartása (min. 32 fő támogatása).
-- ============================================================================
IF OBJECT_ID('PTA.Players', 'U') IS NULL
BEGIN
    CREATE TABLE PTA.Players (
        PlayerID INT IDENTITY(1,1) PRIMARY KEY,
        EventID INT NOT NULL,
        EventUserID INT NULL, -- FK -> dbo.EventUsers.ID (ha létezik normál jegyvásárló/résztvevő ID)
        Name NVARCHAR(150) NOT NULL,
        Email NVARCHAR(255) NULL,
        TeamName NVARCHAR(100) NULL, -- pl. 'Alpha Csapat'
        AvatarInitials VARCHAR(10) NOT NULL, -- pl. 'TE'
        Status VARCHAR(50) NOT NULL DEFAULT 'Regisztrált',
        IsPlaying BIT NOT NULL DEFAULT 1, -- 1 = játszik a sorsolásban, 0 = csak megfigyelő/kiesett
        CheckedInAtUtc DATETIME2 NULL,
        CreatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        UpdatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_PTA_Players_Event FOREIGN KEY (EventID) 
            REFERENCES PTA.EventSettings(EventID) ON DELETE CASCADE,
        CONSTRAINT CK_PTA_Players_Status CHECK (
            Status IN ('Meghívva','Regisztrált','Bejelentkezett','Játszik','Kiesett')
        )
    );
    PRINT 'PTA.Players tábla létrehozva.';

    -- Keresést és státuszkoczkázást gyorsító indexek a Jelenléti Ívhez
    CREATE INDEX IX_PTA_Players_Event_Status ON PTA.Players(EventID, Status);
    CREATE INDEX IX_PTA_Players_Name_Email ON PTA.Players(EventID, Name, Email);
END
GO

-- ============================================================================
-- 5. PTA.Rounds
--    A 3 forduló adminisztrációja és státuszai.
-- ============================================================================
IF OBJECT_ID('PTA.Rounds', 'U') IS NULL
BEGIN
    CREATE TABLE PTA.Rounds (
        RoundID INT IDENTITY(1,1) PRIMARY KEY,
        EventID INT NOT NULL,
        RoundNumber INT NOT NULL, -- 1, 2, 3
        Status VARCHAR(50) NOT NULL DEFAULT 'Tervezett', -- 'Tervezett','Kisorsolva','Folyamatban','Lezárt'
        StartedAtUtc DATETIME2 NULL,
        ClosedAtUtc DATETIME2 NULL,
        CONSTRAINT FK_PTA_Rounds_Event FOREIGN KEY (EventID) 
            REFERENCES PTA.EventSettings(EventID) ON DELETE CASCADE,
        CONSTRAINT UQ_PTA_Rounds_Event_RoundNumber UNIQUE (EventID, RoundNumber),
        CONSTRAINT CK_PTA_Rounds_Status CHECK (
            Status IN ('Tervezett','Kisorsolva','Folyamatban','Lezárt')
        )
    );
    PRINT 'PTA.Rounds tábla létrehozva.';
END
GO

-- ============================================================================
-- 6. PTA.Tables
--    Az egyes fordulók asztalai (pl. 1. asztal, 2. asztal...)
-- ============================================================================
IF OBJECT_ID('PTA.Tables', 'U') IS NULL
BEGIN
    CREATE TABLE PTA.Tables (
        TableID INT IDENTITY(1,1) PRIMARY KEY,
        RoundID INT NOT NULL,
        TableNumber INT NOT NULL, -- 1, 2, 3, 4...
        TableName NVARCHAR(50) NOT NULL, -- pl. '1. asztal'
        GameMasterID INT NULL, -- FK -> PTA.EventMasters.MasterID
        Status VARCHAR(50) NOT NULL DEFAULT 'Kisorsolva', -- 'Kisorsolva','Folyamatban','Kész'
        CompletedAtUtc DATETIME2 NULL,
        CONSTRAINT FK_PTA_Tables_Round FOREIGN KEY (RoundID) 
            REFERENCES PTA.Rounds(RoundID) ON DELETE CASCADE,
        CONSTRAINT FK_PTA_Tables_GameMaster FOREIGN KEY (GameMasterID) 
            REFERENCES PTA.EventMasters(MasterID),
        CONSTRAINT UQ_PTA_Tables_Round_TableNumber UNIQUE (RoundID, TableNumber),
        CONSTRAINT CK_PTA_Tables_Status CHECK (
            Status IN ('Kisorsolva','Folyamatban','Kész')
        )
    );
    PRINT 'PTA.Tables tábla létrehozva.';
END
GO

-- ============================================================================
-- 7. PTA.TablePlayers
--    Asztalbeosztás (sorsolás eredménye), ülésrend és fordulóeredmények.
-- ============================================================================
IF OBJECT_ID('PTA.TablePlayers', 'U') IS NULL
BEGIN
    CREATE TABLE PTA.TablePlayers (
        TablePlayerID INT IDENTITY(1,1) PRIMARY KEY,
        TableID INT NOT NULL,
        PlayerID INT NOT NULL,
        SeatOrder INT NOT NULL, -- 1, 2, 3, 4 (ülésrend, admin által mozgatható)
        ColorHex VARCHAR(10) NOT NULL, -- '#FF6060', '#28C76F', '#2AA9FF', '#F2E74B'
        Winnings DECIMAL(18,2) NULL,    -- Nyeremény a forduló végén (Ft/$)
        TruckValue DECIMAL(18,2) NULL,  -- Kamionérték / Vagyonérték
        RankAtTable INT NULL,           -- Helyezés az adott asztalnál (1..4)
        UpdatedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_PTA_TablePlayers_Table FOREIGN KEY (TableID) 
            REFERENCES PTA.Tables(TableID) ON DELETE CASCADE,
        CONSTRAINT FK_PTA_TablePlayers_Player FOREIGN KEY (PlayerID) 
            REFERENCES PTA.Players(PlayerID),
        CONSTRAINT UQ_PTA_TablePlayers_Table_Player UNIQUE (TableID, PlayerID),
        CONSTRAINT UQ_PTA_TablePlayers_Table_SeatOrder UNIQUE (TableID, SeatOrder)
    );
    PRINT 'PTA.TablePlayers tábla létrehozva.';

    -- Index annak gyors lekérdezésére, hogy kik ültek már együtt
    -- (a "ne üljenek kétszer együtt" sorsolási algoritmus optimalizálásához)
    CREATE INDEX IX_PTA_TablePlayers_Player_Table ON PTA.TablePlayers(PlayerID, TableID);
END
GO

-- ============================================================================
-- 8. PTA.Feedbacks
--    Résztvevői vélemények az esemény lezárása után
-- ============================================================================
IF OBJECT_ID('PTA.Feedbacks', 'U') IS NULL
BEGIN
    CREATE TABLE PTA.Feedbacks (
        FeedbackID INT IDENTITY(1,1) PRIMARY KEY,
        EventID INT NOT NULL,
        PlayerID INT NULL, -- NULL, ha anonim visszajelzés
        AuthorName NVARCHAR(150) NOT NULL,
        Rating INT NOT NULL, -- 1..5 csillag
        Comment NVARCHAR(MAX) NULL,
        SubmittedAtUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_PTA_Feedbacks_Event FOREIGN KEY (EventID) 
            REFERENCES PTA.EventSettings(EventID) ON DELETE CASCADE,
        CONSTRAINT FK_PTA_Feedbacks_Player FOREIGN KEY (PlayerID) 
            REFERENCES PTA.Players(PlayerID),
        CONSTRAINT CK_PTA_Feedbacks_Rating CHECK (Rating BETWEEN 1 AND 5)
    );
    PRINT 'PTA.Feedbacks tábla létrehozva.';
END
GO

-- ============================================================================
-- 9. NÉZET (VIEW): PTA.vw_TournamentRankings
--    A bajnokság összesített rangsorát nyújtja mind a 3 forduló adatai alapján:
--    összes nyeremény, összes kamionérték, kombinált pontszám és végső helyezés.
-- ============================================================================
IF OBJECT_ID('PTA.vw_TournamentRankings', 'V') IS NOT NULL
    DROP VIEW PTA.vw_TournamentRankings;
GO

CREATE VIEW PTA.vw_TournamentRankings
AS
SELECT 
    p.EventID,
    p.PlayerID,
    p.Name AS PlayerName,
    p.TeamName,
    p.AvatarInitials,
    p.Status AS PlayerStatus,
    COUNT(tp.TablePlayerID) AS PlayedRoundsCount,
    SUM(ISNULL(tp.Winnings, 0)) AS TotalWinnings,
    SUM(ISNULL(tp.TruckValue, 0)) AS TotalTruckValue,
    (SUM(ISNULL(tp.Winnings, 0)) + SUM(ISNULL(tp.TruckValue, 0))) AS CombinedScore,
    RANK() OVER (
        PARTITION BY p.EventID 
        ORDER BY (SUM(ISNULL(tp.Winnings, 0)) + SUM(ISNULL(tp.TruckValue, 0))) DESC
    ) AS TournamentRank
FROM PTA.Players p
LEFT JOIN PTA.TablePlayers tp ON p.PlayerID = tp.PlayerID
GROUP BY 
    p.EventID,
    p.PlayerID,
    p.Name,
    p.TeamName,
    p.AvatarInitials,
    p.Status;
GO

PRINT 'PTA.vw_TournamentRankings nézet létrehozva.';
GO

-- ============================================================================
-- 10. NÉZET (VIEW): PTA.vw_PlayerPairingHistory
--     A sorsoló algoritmus számára nyújt azonnali listát arról, hogy
--     egy adott eseményen melyik két játékos ült már egy asztalnál.
-- ============================================================================
IF OBJECT_ID('PTA.vw_PlayerPairingHistory', 'V') IS NOT NULL
    DROP VIEW PTA.vw_PlayerPairingHistory;
GO

CREATE VIEW PTA.vw_PlayerPairingHistory
AS
SELECT DISTINCT
    r.EventID,
    tp1.PlayerID AS PlayerID_A,
    tp2.PlayerID AS PlayerID_B,
    r.RoundNumber,
    t.TableNumber
FROM PTA.TablePlayers tp1
JOIN PTA.TablePlayers tp2 
    ON tp1.TableID = tp2.TableID 
    AND tp1.PlayerID < tp2.PlayerID
JOIN PTA.Tables t 
    ON tp1.TableID = t.TableID
JOIN PTA.Rounds r 
    ON t.RoundID = r.RoundID;
GO

PRINT 'PTA.vw_PlayerPairingHistory nézet létrehozva.';
GO

-- ============================================================================
-- ELLENŐRZŐ LEKÉRDEZÉS (Példa SSMS-ben való teszteléshez):
-- SELECT * FROM sys.tables WHERE schema_id = SCHEMA_ID('PTA');
-- ============================================================================
