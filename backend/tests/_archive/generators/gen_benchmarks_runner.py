import base64
data = base64.b64decode(open('gen_benchmarks_content.b64').read())
open('tests/test_physics_benchmarks.py', 'wb').write(data)
print('done')
