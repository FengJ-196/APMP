import csv
import json
import os
import sys
import time
import urllib.request
import urllib.error
import uuid

# Helper to read env variables from .env.local
def load_env():
    env_vars = {}
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, "..", ".env.local")
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    env_vars[key.strip()] = val.strip()
    return env_vars

def get_embeddings(texts, api_key, model="google/gemini-embedding-2"):
    url = "https://openrouter.ai/api/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model,
        "input": texts,
        "dimensions": 768
    }
    
    data_bytes = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method='POST')
    
    with urllib.request.urlopen(req) as response:
        res_body = response.read().decode('utf-8')
        res_json = json.loads(res_body)
        embeddings = [item['embedding'] for item in sorted(res_json['data'], key=lambda x: x['index'])]
        return embeddings

def get_embeddings_with_retry(texts, api_key, model="google/gemini-embedding-2", retries=5, delay=2):
    for i in range(retries):
        try:
            return get_embeddings(texts, api_key, model)
        except Exception as e:
            if i == retries - 1:
                raise e
            print(f"Embedding request failed. Retrying in {delay} seconds... (Error: {e})")
            time.sleep(delay)
            delay *= 2

def qdrant_request(url, method='GET', payload=None):
    headers = {"Content-Type": "application/json"}
    data_bytes = json.dumps(payload).encode('utf-8') if payload else None
    
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return json.loads(res_body)
    except urllib.error.HTTPError as e:
        res_body = e.read().decode('utf-8')
        try:
            return json.loads(res_body)
        except:
            return {"error": res_body, "status_code": e.code}

def get_uuid(issuekey):
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"apmp.issues.{issuekey}"))

def main():
    env = load_env()
    
    # We use OPENROUTER_API_KEY as standard OpenRouter key
    api_key = env.get('OPENROUTER_API_KEY') or env.get('VITE_OPENROUTER_API_KEY')
    qdrant_url = env.get('QDRANT_URL', 'http://localhost:6333')
    collection_name = env.get('QDRANT_COLLECTION', 'issues')
    
    if not api_key:
        print("Error: OPENROUTER_API_KEY is not defined in .env.local")
        sys.exit(1)
        
    print(f"Qdrant URL: {qdrant_url}")
    print(f"Qdrant Collection: {collection_name}")
    
    # 1. Check if collection exists, if not, create it
    check_url = f"{qdrant_url}/collections/{collection_name}"
    check_res = qdrant_request(check_url, 'GET')
    
    collection_exists = "result" in check_res
    if collection_exists:
        try:
            # Check if vectors config is standard or nested structure
            vectors_config = check_res["result"]["config"]["params"]["vectors"]
            current_size = vectors_config["size"] if "size" in vectors_config else vectors_config.get("size")
            if current_size != 768:
                print(f"Collection exists but has size {current_size} instead of 768. Recreating...")
                qdrant_request(check_url, 'DELETE')
                collection_exists = False
        except Exception as e:
            print(f"Error checking collection config: {e}. Recreating to be safe.")
            qdrant_request(check_url, 'DELETE')
            collection_exists = False
            
    if not collection_exists:
        print(f"Creating collection '{collection_name}' with vector size 768...")
        create_payload = {
            "vectors": {
                "size": 768,
                "distance": "Cosine"
            }
        }
        create_res = qdrant_request(check_url, 'PUT', create_payload)
        if create_res.get("result") is True:
            print(f"Collection '{collection_name}' created successfully!")
        else:
            print(f"Failed to create collection: {create_res}")
            sys.exit(1)
    else:
        print(f"Collection '{collection_name}' already exists with correct size 768.")
        
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_csv = os.path.join(script_dir, "data", "issues_cleaned.csv")
    if not os.path.exists(input_csv):
        print(f"Error: Standardized dataset not found at {input_csv}. Please run scripts/refactor_dataset.py first.")
        sys.exit(1)
        
    # Read rows
    print(f"Reading cleaned dataset from {input_csv}...")
    rows = []
    csv.field_size_limit(10 * 1024 * 1024)
    with open(input_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
            
    total_records = len(rows)
    print(f"Found {total_records} cleaned records to vectorize.")
    
    # Batch process
    batch_size = 50
    start_time = time.time()
    successful_upserts = 0
    
    print("\nStarting batch vectorization...")
    for idx in range(0, total_records, batch_size):
        batch_rows = rows[idx:idx+batch_size]
        texts = [row['clean_text'] for row in batch_rows]
        
        try:
            # 1. Retrieve embeddings from OpenRouter
            embeddings = get_embeddings_with_retry(texts, api_key)
            
            # 2. Construct Qdrant points payload
            points = []
            for sub_idx, row in enumerate(batch_rows):
                point_id = get_uuid(row['issuekey'])
                points.append({
                    "id": point_id,
                    "vector": embeddings[sub_idx],
                    "payload": {
                        "idproject": row['idproject'],
                        "issuekey": row['issuekey'],
                        "title": row['title'],
                        "description": row['description'],
                        "storypoints": int(row['storypoints']),
                        "clean_text": row['clean_text']
                    }
                })
                
            # 3. Upsert points into Qdrant
            upsert_url = f"{qdrant_url}/collections/{collection_name}/points?wait=true"
            upsert_res = qdrant_request(upsert_url, 'PUT', {"points": points})
            
            if upsert_res.get("result", {}).get("status") == "completed":
                successful_upserts += len(points)
                elapsed = time.time() - start_time
                progress = (idx + len(batch_rows)) / total_records * 100
                speed = successful_upserts / elapsed if elapsed > 0 else 0
                print(f"Processed {idx + len(batch_rows)}/{total_records} ({progress:.2f}%) | "
                      f"Successful: {successful_upserts} | Speed: {speed:.1f} pts/sec", end='\r')
            else:
                print(f"\nFailed to upsert points in batch {idx}: {upsert_res}")
                
            # Rate limit politeness
            time.sleep(0.5)
            
        except Exception as err:
            print(f"\nFatal error processing batch at index {idx}: {err}")
            print("Skipping this batch and continuing...")
            time.sleep(2)
            
    print(f"\n\nVectorization complete in {time.time() - start_time:.1f} seconds.")
    print(f"Successfully vectorized and indexed {successful_upserts}/{total_records} issues to Qdrant.")

if __name__ == '__main__':
    main()
