ALTER PROCEDURE [EJ].[spGetEventUserDataSheet]
    @EventUserID BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ReturnValue INT = 1;
    DECLARE @ReturnDescription NVARCHAR(MAX) = N'Success';

    BEGIN TRY
        DECLARE
            @EventID BIGINT,
            @RequesterRoleName NVARCHAR(200),
            @RequesterRoleCode NVARCHAR(100),
            @DataSheetType SMALLINT;

        DECLARE @Results TABLE
        (
            ResultNo SMALLINT,
            ResultName NVARCHAR(100)
        );

        -- context
        SELECT
            @EventID = EU.EventID,
            @RequesterRoleName = R.RoleName,
            @RequesterRoleCode = R.Code,
            @DataSheetType = RT.id
        FROM [EJ].[tblEventUser] EU
        LEFT JOIN [EJ].[tblEventRole] ER ON ER.ID = EU.EventRoleID
        LEFT JOIN [EJ].[tblRole] R ON R.ID = ER.RoleID
        LEFT JOIN [EJ].[tblRoleType] RT ON RT.ID = R.RoleTypeID
        WHERE EU.ID = @EventUserID;

        -- RS1: Return status
        SELECT @ReturnValue AS ReturnValue, @ReturnDescription AS ReturnDescription;

        -- RS2: Result list — PTA példány mindig kimegy (üres, ha nem PTA / még nincs adat)
        INSERT INTO @Results (ResultNo, ResultName)
        VALUES
            (1,  N'ReturnStatus'),
            (2,  N'ResultList'),
            (3,  N'ScreenContext'),
            (4,  N'Events'),
            (5,  N'EventSettings'),
            (6,  N'EventDesks'),
            (7,  N'EventRounds'),
            (8,  N'EventRoundDesks'),
            (9,  N'EventPlayers'),
            (10, N'GameSchedules'),
            (11, N'EventPrizes'),
            (12, N'EventParticpants');

        SELECT * FROM @Results ORDER BY ResultNo;

        -- RS3: Screen context
        SELECT
            @EventUserID AS RequestEventUserID,
            @EventID AS EventID,
            @RequesterRoleCode AS RequesterRoleCode,
            @RequesterRoleName AS RequesterRoleName,
            @DataSheetType AS DataSheetType;

        -- RS4: Event Data
        SELECT *
        FROM [EJ].[tblEvent] ev
        WHERE ID = @EventID;

        -- RS5: PTA.tblEventSettings — 0 vagy 1 sor
        SELECT *
        FROM [PTA].[tblEventSettings]
        WHERE EventID = @EventID;

        -- RS6: PTA.tblEventDesk
        SELECT *
        FROM [PTA].[tblEventDesk]
        WHERE EventID = @EventID
          AND ActiveFlg = 1;

        -- RS7: PTA.tblEventRound — EventID kötelező (esemény-példány, nem a sablon)
        SELECT *
        FROM [PTA].[tblEventRound]
        WHERE EventID = @EventID;

        -- RS8: PTA.tblEventRoundDesk
        SELECT erd.*
        FROM [PTA].[tblEventRoundDesk] erd
        INNER JOIN [PTA].[tblEventRound] er ON er.EventRoundID = erd.EventRoundID
        WHERE er.EventID = @EventID
          AND erd.ActiveFlg = 1;

        -- RS9: PTA.tblEventPlayer + User név (GM/játékos GET-ben nincs EventParticpants JOIN nélkül)
        SELECT
            ep.*,
            usr.FirstName AS UserFirstName,
            usr.LastName AS UserLastName,
            LTRIM(RTRIM(CONCAT(ISNULL(usr.LastName, N''), N' ', ISNULL(usr.FirstName, N'')))) AS PlayerDisplayName
        FROM [PTA].[tblEventPlayer] ep
        LEFT JOIN [EJ].[tblEventUser] eu ON eu.ID = ep.EventUserID
        LEFT JOIN [EJ].[tblUser] usr ON usr.ID = COALESCE(eu.UserID, ep.UserID)
        WHERE ep.EventID = @EventID
          AND ep.ActiveFlg = 1;

        -- RS10: PTA.tblGameSchedule + ugyanaz a User név (PlayerID = EventPlayerID vagy EventUserID)
        SELECT
            gs.*,
            usr.FirstName AS UserFirstName,
            usr.LastName AS UserLastName,
            LTRIM(RTRIM(CONCAT(ISNULL(usr.LastName, N''), N' ', ISNULL(usr.FirstName, N'')))) AS PlayerDisplayName
        FROM [PTA].[tblGameSchedule] gs
        INNER JOIN [PTA].[tblEventRoundDesk] erd ON erd.EventRoundDeskID = gs.EventRoundDeskID
        INNER JOIN [PTA].[tblEventRound] er ON er.EventRoundID = erd.EventRoundID
        OUTER APPLY (
            SELECT TOP 1 ep2.EventUserID, ep2.UserID, ep2.EventPlayerID
            FROM [PTA].[tblEventPlayer] ep2
            WHERE ep2.EventID = @EventID
              AND ep2.ActiveFlg = 1
              AND (
                    ep2.EventPlayerID = gs.PlayerID
                    OR ep2.EventUserID = gs.PlayerID
                  )
            ORDER BY CASE WHEN ep2.EventPlayerID = gs.PlayerID THEN 0 ELSE 1 END
        ) ep
        LEFT JOIN [EJ].[tblEventUser] eu
            ON eu.EventID = @EventID
           AND (
                 eu.ID = ep.EventUserID
                 OR (ep.EventUserID IS NULL AND eu.ID = gs.PlayerID)
               )
        LEFT JOIN [EJ].[tblUser] usr ON usr.ID = COALESCE(eu.UserID, ep.UserID)
        WHERE er.EventID = @EventID
          AND gs.ActiveFlg = 1;

        -- RS11: PTA.tblEventPrize
        SELECT *
        FROM [PTA].[tblEventPrize]
        WHERE EventID = @EventID;

        -- RS12: résztvevő nevek — szervező ÉS játékmester asztalokhoz kell (nem csak DataSheetType=1)
        SELECT
            eu.*,
            usr.FirstName,
            usr.LastName,
            usr.EmailAddress,
            usr.PhoneNumber,
            org.Name AS OrganizationName,
            org.ShortName AS OrganizationShortName
        FROM [EJ].[tblEventUser] eu
        INNER JOIN [EJ].[tblUser] usr ON usr.ID = eu.UserID
        OUTER APPLY (
            SELECT TOP 1 o.Name, o.ShortName
            FROM [EJ].[tblUserOrganization] uo
            INNER JOIN [EJ].[tblOrganization] o ON o.id = uo.OrganizationID
            WHERE uo.UserID = eu.UserID
              AND uo.ActiveFlg = 1
            ORDER BY CASE WHEN uo.IsPrimary = 1 THEN 0 ELSE 1 END, uo.id
        ) org
        WHERE eu.EventID = @EventID
            AND eu.ID <> @EventUserID
            AND eu.ActiveFlg = 1;
    END TRY
    BEGIN CATCH
        SET @ReturnValue = -1;
        SET @ReturnDescription = ERROR_MESSAGE();

        SELECT @ReturnValue AS ReturnValue, @ReturnDescription AS ReturnDescription;
    END CATCH
END
GO
