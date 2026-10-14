import re

filepath = r'C:\Users\user\Projects\eventjoy-test\docs\olimpub-media.md'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('Feltöltés — SAS (mint Anyagok)', 'Feltöltés — SAS (csak írás)')
content = content.replace('BlobUrl csak a ti SAS-os konténeretek.', 'BlobUrl a publikus Blob konténer nyers URL-je.')
content = content.replace('A letöltéshez **olvasó SAS** kell, ne nyilvános konténer a hangnak.', 'A konténer publikus (Blob), így a letöltéshez **nincs szükség SAS tokenre**.')
content = content.replace('"BlobUrl": "https://…read-sas…"', '"BlobUrl": "https://….blob.core.windows.net/op-media/…"')
content = content.replace('- `BlobUrl` = read SAS, TTL legalább **12 óra** (helyszíni letöltés / szünet után is).', '- `BlobUrl` = nyers, végleges, publikus URL. Nincs lejárat, SAS token nem kell hozzá.')
content = content.replace('| `ImageUrl` | read SAS vagy blob URL |', '| `ImageUrl` | publikus blob URL |')
content = content.replace('| `AudioUrl` | read SAS |', '| `AudioUrl` | publikus blob URL |')
content = content.replace('`ImageUrl` / `AudioUrl` TTL: ugyanaz a rend, mint a manifest read SAS (GET-enként új SAS oké).', '`ImageUrl` / `AudioUrl`: Nyers publikus URL, SAS paraméterek nélkül.')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Documentation olimpub-media.md updated successfully.")
