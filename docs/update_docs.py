import re

filepath = r'C:\Users\user\Projects\eventjoy-test\docs\olimpub-backend.md'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Update Line 20
content = content.replace(
    '| GET | `/op/media/manifest/:eventId` | szerv+QM; read SAS + hash. Játékos 403 |',
    '| GET | `/op/media/manifest/:eventId` | szerv+QM; nyers URL + hash (publikus Blob, nincs SAS). Játékos 403 |'
)

# Update Line 33
content = content.replace(
    'Média: [`olimpub-media.md`](./olimpub-media.md) — két slot (`ImageKey` / `AudioKey`), SAS, manifest.',
    'Média: [`olimpub-media.md`](./olimpub-media.md) — két slot (`ImageKey` / `AudioKey`), publikus Blob URL (nincs olvasási SAS), manifest.'
)

# Update Section 8
old_section_8 = 'Azure Blob (meglévő storage). Hash SHA256. UPSERT `OP.Media`. 200: `{ MediaKey, BlobUrl, ContentHash, Mime }`.'
new_section_8 = 'Azure Blob (meglévő storage). Hash SHA256. UPSERT `OP.Media`. 200: `{ MediaKey, BlobUrl, ContentHash, Mime }`. A konténer (`op-media`) **publikus**, így a `BlobUrl` állandó, SAS-paraméterek nélküli.'

if old_section_8 in content:
    content = content.replace(old_section_8, new_section_8)
else:
    print("Could not find section 8 text to replace.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Documentation updated successfully.")
