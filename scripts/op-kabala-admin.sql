/*
  Olimpub kabala törzs — sysadmin lista és mentés.
  HTTP: docs/olimpub-kabala-admin.md

  OP.Kabala: név + aktív. A fájl OP.KabalaAsset (slot: profile | full, később animáció).
  A régi ImageUrl oszlopot profile assetté másolja, majd eldobja.

  spAdminListKabala: 1. result set kabala, 2. result set aktív asset.
  A HTTP réteg az assetet a kabala Assets tömbjébe ágyazza.
  A blob-host ellenőrzés az API rétegben van; az eljárás a https:// előtagot és a hosszt nézi.
*/
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'OP')
    EXEC(N'CREATE SCHEMA OP');
GO

IF OBJECT_ID(N'OP.Kabala', N'U') IS NULL
BEGIN
    CREATE TABLE OP.Kabala (
        id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_OP_Kabala PRIMARY KEY,
        Name nvarchar(80) NOT NULL,
        ActiveFlg bit NOT NULL CONSTRAINT DF_OP_Kabala_ActiveFlg DEFAULT (1)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_OP_Kabala_Name'
      AND object_id = OBJECT_ID(N'OP.Kabala')
)
BEGIN
    CREATE UNIQUE INDEX UX_OP_Kabala_Name
        ON OP.Kabala (Name)
        WHERE ActiveFlg = 1;
END
GO

IF OBJECT_ID(N'OP.KabalaAsset', N'U') IS NULL
BEGIN
    CREATE TABLE OP.KabalaAsset (
        id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_OP_KabalaAsset PRIMARY KEY,
        KabalaID int NOT NULL CONSTRAINT FK_OP_KabalaAsset_Kabala REFERENCES OP.Kabala (id),
        Slot nvarchar(32) NOT NULL,
        Kind nvarchar(16) NOT NULL,
        BlobUrl nvarchar(500) NOT NULL,
        Mime nvarchar(80) NULL,
        SizeInBytes int NULL,
        ContentHash char(64) NULL,
        ActiveFlg bit NOT NULL CONSTRAINT DF_OP_KabalaAsset_ActiveFlg DEFAULT (1),
        CONSTRAINT CK_OP_KabalaAsset_Kind CHECK (Kind IN (N'image', N'animation'))
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_OP_KabalaAsset_Slot'
      AND object_id = OBJECT_ID(N'OP.KabalaAsset')
)
BEGIN
    CREATE UNIQUE INDEX UX_OP_KabalaAsset_Slot
        ON OP.KabalaAsset (KabalaID, Slot)
        WHERE ActiveFlg = 1;
END
GO

IF COL_LENGTH(N'OP.Kabala', N'ImageUrl') IS NOT NULL
BEGIN
    INSERT INTO OP.KabalaAsset (KabalaID, Slot, Kind, BlobUrl, ActiveFlg)
    SELECT k.id, N'profile', N'image', k.ImageUrl, 1
    FROM OP.Kabala AS k
    WHERE k.ImageUrl IS NOT NULL
      AND LTRIM(RTRIM(k.ImageUrl)) <> N''
      AND NOT EXISTS (
          SELECT 1
          FROM OP.KabalaAsset AS a
          WHERE a.KabalaID = k.id
            AND a.Slot = N'profile'
            AND a.ActiveFlg = 1
      );

    ALTER TABLE OP.Kabala DROP COLUMN ImageUrl;
END
GO

CREATE OR ALTER PROCEDURE OP.spAdminListKabala
AS
BEGIN
    SET NOCOUNT ON;

    IF OBJECT_ID(N'OP.tblTeam', N'U') IS NULL
    BEGIN
        SELECT
            k.id,
            k.Name,
            k.ActiveFlg,
            CAST(0 AS int) AS TeamCount
        FROM OP.Kabala AS k
        ORDER BY k.Name;
    END
    ELSE
    BEGIN
        SELECT
            k.id,
            k.Name,
            k.ActiveFlg,
            (
                SELECT COUNT(*)
                FROM OP.tblTeam AS t
                WHERE t.KabalaID = k.id
                  AND t.ActiveFlg = 1
            ) AS TeamCount
        FROM OP.Kabala AS k
        ORDER BY k.Name;
    END

    SELECT
        a.id,
        a.KabalaID,
        a.Slot,
        a.Kind,
        a.BlobUrl,
        a.Mime,
        a.SizeInBytes,
        a.ActiveFlg
    FROM OP.KabalaAsset AS a
    WHERE a.ActiveFlg = 1
    ORDER BY a.KabalaID, a.Slot;
END
GO

CREATE OR ALTER PROCEDURE OP.spAdminSaveKabala
    @Json nvarchar(max)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @id int,
        @Name nvarchar(200),
        @ActiveRaw nvarchar(10),
        @ActiveFlg bit;

    DECLARE @Assets TABLE (
        Slot nvarchar(32) NOT NULL,
        Kind nvarchar(16) NULL,
        BlobUrl nvarchar(1000) NULL,
        Mime nvarchar(80) NULL,
        SizeInBytes int NULL
    );

    SET @id = TRY_CONVERT(int, JSON_VALUE(@Json, '$.id'));
    SET @Name = NULLIF(LTRIM(RTRIM(JSON_VALUE(@Json, '$.Name'))), N'');
    SET @ActiveRaw = LOWER(LTRIM(RTRIM(JSON_VALUE(@Json, '$.ActiveFlg'))));

    INSERT INTO @Assets (Slot, Kind, BlobUrl, Mime, SizeInBytes)
    SELECT
        LOWER(LTRIM(RTRIM(Slot))),
        LOWER(LTRIM(RTRIM(Kind))),
        NULLIF(LTRIM(RTRIM(BlobUrl)), N''),
        NULLIF(LTRIM(RTRIM(Mime)), N''),
        SizeInBytes
    FROM OPENJSON(@Json, '$.Assets')
    WITH (
        Slot nvarchar(32) '$.Slot',
        Kind nvarchar(16) '$.Kind',
        BlobUrl nvarchar(1000) '$.BlobUrl',
        Mime nvarchar(80) '$.Mime',
        SizeInBytes int '$.SizeInBytes'
    );

    IF @Name IS NULL
    BEGIN
        SELECT CAST(-1 AS int) AS ReturnValue, N'Add meg a kabala nevét.' AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END

    IF LEN(@Name) > 80
    BEGIN
        SELECT CAST(-1 AS int) AS ReturnValue, N'A kabala neve legfeljebb 80 karakter.' AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END

    IF @ActiveRaw IS NULL OR @ActiveRaw NOT IN (N'true', N'false', N'1', N'0')
    BEGIN
        SELECT CAST(-1 AS int) AS ReturnValue, N'Az aktív jelölő hiányzik.' AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END

    SET @ActiveFlg = CASE WHEN @ActiveRaw IN (N'true', N'1') THEN 1 ELSE 0 END;

    IF EXISTS (SELECT Slot FROM @Assets GROUP BY Slot HAVING COUNT(*) > 1)
    BEGIN
        SELECT CAST(-1 AS int) AS ReturnValue, N'Ugyanaz a kabala fájl kétszer szerepel.' AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM @Assets
        WHERE Slot NOT IN (N'profile', N'full')
           OR Kind IS NULL
           OR Kind <> N'image'
    )
    BEGIN
        SELECT CAST(-1 AS int) AS ReturnValue, N'Ismeretlen kabala fájl.' AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM @Assets
        WHERE BlobUrl IS NOT NULL
          AND (LEN(BlobUrl) > 500 OR LEFT(BlobUrl, 8) <> N'https://')
    )
    BEGIN
        SELECT CAST(-1 AS int) AS ReturnValue, N'A kép címe nem fogadható.' AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM @Assets
        WHERE SizeInBytes IS NOT NULL
          AND (SizeInBytes < 1 OR SizeInBytes > 5242880)
    )
    BEGIN
        SELECT CAST(-1 AS int) AS ReturnValue, N'A kép túl nagy (max 5 MB).' AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END

    IF @id IS NOT NULL AND @id > 0 AND NOT EXISTS (SELECT 1 FROM OP.Kabala WHERE id = @id)
    BEGIN
        SELECT CAST(-1 AS int) AS ReturnValue, N'A kabala nem található.' AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END

    IF @ActiveFlg = 1 AND EXISTS (
        SELECT 1
        FROM OP.Kabala
        WHERE ActiveFlg = 1
          AND Name = @Name
          AND id <> ISNULL(NULLIF(@id, 0), -1)
    )
    BEGIN
        SELECT CAST(-1 AS int) AS ReturnValue, N'Már van ilyen nevű kabala.' AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END

    BEGIN TRY
        BEGIN TRAN;

        IF @id IS NULL OR @id <= 0
        BEGIN
            INSERT INTO OP.Kabala (Name, ActiveFlg)
            VALUES (@Name, @ActiveFlg);

            SET @id = CONVERT(int, SCOPE_IDENTITY());
        END
        ELSE
        BEGIN
            UPDATE OP.Kabala
            SET Name = @Name,
                ActiveFlg = @ActiveFlg
            WHERE id = @id;
        END

        UPDATE a
        SET a.ActiveFlg = 0
        FROM OP.KabalaAsset AS a
        INNER JOIN @Assets AS s ON s.Slot = a.Slot
        WHERE a.KabalaID = @id
          AND a.ActiveFlg = 1
          AND s.BlobUrl IS NULL;

        UPDATE a
        SET a.Kind = s.Kind,
            a.BlobUrl = s.BlobUrl,
            a.Mime = s.Mime,
            a.SizeInBytes = s.SizeInBytes
        FROM OP.KabalaAsset AS a
        INNER JOIN @Assets AS s ON s.Slot = a.Slot
        WHERE a.KabalaID = @id
          AND a.ActiveFlg = 1
          AND s.BlobUrl IS NOT NULL;

        INSERT INTO OP.KabalaAsset (KabalaID, Slot, Kind, BlobUrl, Mime, SizeInBytes, ActiveFlg)
        SELECT @id, s.Slot, s.Kind, s.BlobUrl, s.Mime, s.SizeInBytes, 1
        FROM @Assets AS s
        WHERE s.BlobUrl IS NOT NULL
          AND NOT EXISTS (
              SELECT 1
              FROM OP.KabalaAsset AS a
              WHERE a.KabalaID = @id
                AND a.Slot = s.Slot
                AND a.ActiveFlg = 1
          );

        COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRAN;

        IF ERROR_NUMBER() IN (2601, 2627)
        BEGIN
            SELECT CAST(-1 AS int) AS ReturnValue, N'Már van ilyen nevű kabala.' AS ReturnDescription, CAST(NULL AS int) AS id;
            RETURN;
        END

        DECLARE @Err nvarchar(4000) = ERROR_MESSAGE();
        SELECT CAST(-1 AS int) AS ReturnValue, @Err AS ReturnDescription, CAST(NULL AS int) AS id;
        RETURN;
    END CATCH

    SELECT CAST(1 AS int) AS ReturnValue, N'Success' AS ReturnDescription, @id AS id;
END
GO
