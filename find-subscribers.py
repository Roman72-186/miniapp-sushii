import urllib.request, json

token = 'ubguYOY2hOC0g9n0hziA9jEeDBJtSc3Ggs9g8HjUwKUWMmO85bjQQaA7AQru'
bot_id = '72975'
target_tag = 'подписка30'

contacts_with_tag = []

for page in range(1, 17):
    url = f'https://watbot.ru/api/v1/getContacts?api_token={token}&bot_id={bot_id}&count=100&page={page}'
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            d = json.loads(r.read())
            for c in d.get('data', []):
                if target_tag in c.get('tags', []):
                    contacts_with_tag.append({
                        'id': c.get('id'),
                        'telegram_id': c.get('telegram_id'),
                        'name': c.get('name'),
                        'phone': next((v.get('value') for v in c.get('variables', []) if v.get('name') == 'phone'), None),
                        'tariff': next((v.get('value') for v in c.get('variables', []) if v.get('name') in ['tariff', 'id_LT']), None),
                        'subscription_status': next((v.get('value') for v in c.get('variables', []) if v.get('name') == 'статусСписания'), None),
                        'subscription_start': next((v.get('value') for v in c.get('variables', []) if v.get('name') == 'датаНачала'), None),
                        'subscription_end': next((v.get('value') for v in c.get('variables', []) if v.get('name') == 'датаОКОНЧАНИЯ'), None),
                    })
    except Exception as e:
        print(f'Page {page}: {e}')

print(f'Found {len(contacts_with_tag)} contacts with tag "{target_tag}":')
print(json.dumps(contacts_with_tag, indent=2, ensure_ascii=False))

# Save to file
with open('/tmp/watbot-subscribers.json', 'w', encoding='utf-8') as f:
    json.dump(contacts_with_tag, f, indent=2, ensure_ascii=False)

print(f'\nSaved to /tmp/watbot-subscribers.json')
