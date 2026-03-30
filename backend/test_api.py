import urllib.request
import json

req1 = urllib.request.Request('http://localhost:8000/api/simulate', data=json.dumps({
    'n_bits': 2000, 'distance_km': 50, 'noise_level': 0.02, 
    'attack_prob': 0.0, 'attack_strategy': 'intercept_resend'
}).encode('utf-8'), headers={'Content-Type': 'application/json'})

res1 = json.loads(urllib.request.urlopen(req1).read().decode('utf-8'))
print('API Test 1 (0% Attack):')
print('qber:', res1['qber'])
print('skr:', res1['skr'])
print('sifted_key_length:', res1['sifted_key_length'])
print('secure_threshold_breached:', res1['secure_threshold_breached'])
print('---')

req2 = urllib.request.Request('http://localhost:8000/api/simulate', data=json.dumps({
    'n_bits': 2000, 'distance_km': 10, 'noise_level': 0.0, 
    'attack_prob': 1.0, 'attack_strategy': 'intercept_resend'
}).encode('utf-8'), headers={'Content-Type': 'application/json'})

res2 = json.loads(urllib.request.urlopen(req2).read().decode('utf-8'))
print('API Test 2 (100% Attack):')
print('qber:', res2['qber'])
print('skr:', res2['skr'])
print('secure_threshold_breached:', res2['secure_threshold_breached'])
