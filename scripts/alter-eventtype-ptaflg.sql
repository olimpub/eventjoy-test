ALTER TABLE [EJ].[tblEventType]
ADD [PTAFlg] BIT NULL
GO

UPDATE [EJ].[tblEventType]
SET PTAFlg = 1
WHERE id = 46
GO
