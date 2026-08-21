import os
import sys
import json
import requests
from dotenv import load_dotenv
import time

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env'))

print("--- PHASE 3 DUPLICATE DETECTION TEST SCRIPT ---")
base_url = 'http://127.0.0.1:8000/api/complaints'
check_url = f'{base_url}/check-duplicate'

print("\n1. Testing: Missing Coordinates")
res_no_loc = requests.post(check_url, json={
    'category': 'civic_issue',
    'subcategory': 'road_damage',
    'description': 'A massive pothole that is very dangerous.',
    'summary': 'Dangerous pothole',
    'location': { 'lat': None, 'lng': None, 'address': 'Somewhere' }
})
print(f"Status: {res_no_loc.status_code}")
print(f"Result: {json.dumps(res_no_loc.json(), indent=2)}")


print("\n2. Testing: Exact Duplicate Simulation")
res_exact = requests.post(check_url, json={
    'category': 'civic_issue',
    'subcategory': 'road_damage',
    'description': 'Huge pothole! A bike fell into it yesterday and it is very dangerous.',
    'summary': 'Road damage caused by a large pothole.',
    'location': { 'lat': 12.9717, 'lng': 77.5947, 'address': 'MG Road near corner', 'state': 'karnataka', 'district': 'bangalore' }
})
print(f"Status: {res_exact.status_code}")
print(f"Result: {json.dumps(res_exact.json(), indent=2)}")


print("\n3. Testing: Same Location + Different Category (Garbage vs Pothole)")
res_diff_cat = requests.post(check_url, json={
    'category': 'civic_issue',
    'subcategory': 'garbage',
    'description': 'There is a large pile of uncollected garbage here.',
    'summary': 'Garbage accumulation.',
    'location': { 'lat': 12.9716, 'lng': 77.5946, 'address': 'MG Road', 'state': 'karnataka', 'district': 'bangalore' }
})
print(f"Status: {res_diff_cat.status_code}")
print(f"Result: {json.dumps(res_diff_cat.json(), indent=2)}")


print("\n4. Testing: Same Category but Distant (UNIQUE)")
res_distant = requests.post(check_url, json={
    'category': 'civic_issue',
    'subcategory': 'road_damage',
    'description': 'Pothole here.',
    'summary': 'Pothole.',
    'location': { 'lat': 13.9716, 'lng': 78.5946, 'address': 'Far away', 'state': 'karnataka', 'district': 'bangalore' }
})
print(f"Status: {res_distant.status_code}")
print(f"Result: {json.dumps(res_distant.json(), indent=2)}")

print("\n--- TEST SCRIPT COMPLETED ---")
