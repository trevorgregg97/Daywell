"""Read the public USDA SR Legacy archive in memory; emit only meal references.
No API key, no file writes. Pipe the JSON through the repository editing tool.
"""
import io, json, urllib.request, zipfile
url = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip'
ids = {175037,171287,171288,173410,174524,171077,170108,170393,171167,168930,173573}
with urllib.request.urlopen(url, timeout=60) as response:
    archive = zipfile.ZipFile(io.BytesIO(response.read()))
name = next(n for n in archive.namelist() if n.endswith('.json'))
data = json.loads(archive.read(name))
foods = next(iter(data.values()))
result = []
for food in foods:
    if food['fdcId'] not in ids:
        continue
    result.append({'fdcId':food['fdcId'], 'description':food['description'],
      'foodNutrients':[{'nutrient':{'id':n['nutrient']['id'], 'unitName':n['nutrient']['unitName']}, 'amount':n.get('amount')}
      for n in food['foodNutrients'] if n['nutrient']['id'] < 1300]})
assert len(result) == len(ids)
print(json.dumps(result, separators=(',',':')))
