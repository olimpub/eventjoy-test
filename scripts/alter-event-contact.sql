ALTER TABLE [EJ].[tblEvent]
ADD EventImageUrl nvarchar(500) NULL;

ALTER TABLE [EJ].[tblEvent]
ADD ContactOrganizerID bigint NULL;

ALTER TABLE [EJ].[tblEvent]
ADD ContactName nvarchar(200) NULL;

ALTER TABLE [EJ].[tblEvent]
ADD ContactEmail nvarchar(320) NULL;

ALTER TABLE [EJ].[tblEvent]
ADD ContactPhone nvarchar(50) NULL;
GO
