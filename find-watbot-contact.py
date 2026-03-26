import urllib.request, json

token = 'ubguYOY2hOC0g9n0hziA9jEeDBJtSc3Ggs9g8HjUwKUWMmO85bjQQaA7AQru'
bot_id = '72975'
target_id = 4797635

for page in range(1, 17):
    url = f'https://watbot.ru/api/v1/getContacts?api_token={token}&bot_id={bot_id}&count=100&page={page}'
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            d = json.loads(r.read())
            for c in d.get('data', []):
                if c.get('id') == target_id:
                    print(json.dumps(c, indent=2))
                    exit(0)
    except Exception as e:
        print(f'Page {page}: {e}')

print('Not found')
