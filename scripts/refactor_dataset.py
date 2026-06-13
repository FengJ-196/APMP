import csv
import re
import os
import sys

def standardize_storypoints(sp_str):
    if not sp_str:
        return None
    try:
        val = float(sp_str)
    except ValueError:
        return None
        
    if val <= 0.0 or val > 20.0:
        return None
        
    # Standard Fibonacci mapping: 1, 2, 3, 5, 8, 13, 20
    if val <= 1.2:
        return 1
    elif val <= 2.2:
        return 2
    elif val <= 3.2:
        return 3
    elif val <= 4.2:   # 4.0 -> 5 (conservative rounding up)
        return 5
    elif val <= 6.2:   # 5.0, 6.0 -> 5 (closest Fibonacci)
        return 5
    elif val <= 7.2:   # 7.0 -> 8
        return 8
    elif val <= 10.5:  # 8.0, 10.0 -> 8
        return 8
    elif val <= 16.5:  # 12.0, 13.0, 14.0, 16.0 -> 13
        return 13
    else:              # 18.0, 20.0 -> 20
        return 20

def clean_description(desc):
    if not desc:
        return ""
    
    # Remove markdown image/video links: ![text](/uploads/...)
    desc = re.sub(r'!\[.*?\]\(.*?\)', '', desc)
    # Remove standard markdown links but keep text: [text](link) -> text
    desc = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', desc)
    # Remove HTML tags (e.g. <details>, <summary>, <br>, etc.)
    desc = re.sub(r'<[^>]*>', '', desc)
    # Remove code blocks syntax (keep the code, just remove the ``` language identifiers)
    desc = re.sub(r'```[a-zA-Z]*', '', desc)
    
    # Replace multiple spaces/newlines with single spaces
    desc = re.sub(r'\s+', ' ', desc).strip()
    return desc

def clean_title(title):
    if not title:
        return ""
    # Strip prefixes like (bug): or (feat): if present, but actually we can keep them 
    # since they indicate type. Just normalize whitespace.
    return re.sub(r'\s+', ' ', title).strip()

def refactor_dataset():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(script_dir, "data", "issues.csv")
    output_path = os.path.join(script_dir, "data", "issues_cleaned.csv")
    
    print(f"Loading raw dataset from {input_path}...")
    if not os.path.exists(input_path):
        print(f"Error: Dataset not found at {input_path}")
        sys.exit(1)
        
    csv.field_size_limit(10 * 1024 * 1024) # 10MB limit for descriptions
    
    total_records = 0
    written_records = 0
    
    # Statistics trackers
    points_distribution = {}
    project_distribution = {}
    rejection_reasons = {
        'empty_description': 0,
        'short_description': 0,
        'short_title': 0,
        'invalid_points': 0
    }
    
    with open(input_path, 'r', encoding='utf-8', errors='ignore') as infile:
        reader = csv.DictReader(infile)
        
        fieldnames = [
            'idproject', 'issuekey', 'title', 'description', 
            'original_storypoints', 'storypoints', 'clean_text'
        ]
        
        with open(output_path, 'w', encoding='utf-8', newline='') as outfile:
            writer = csv.DictWriter(outfile, fieldnames=fieldnames)
            writer.writeheader()
            
            for row in reader:
                total_records += 1
                
                idproject = row.get('idproject', '').strip()
                issuekey = row.get('issuekey', '').strip()
                title_raw = row.get('title', '').strip()
                desc_raw = row.get('description', '').strip()
                sp_raw = row.get('storypoints', '').strip()
                
                # 1. Title validation
                title_cleaned = clean_title(title_raw)
                if len(title_cleaned) < 5:
                    rejection_reasons['short_title'] += 1
                    continue
                    
                # 2. Description validation
                if not desc_raw:
                    rejection_reasons['empty_description'] += 1
                    continue
                
                desc_cleaned = clean_description(desc_raw)
                if len(desc_cleaned) < 30:
                    rejection_reasons['short_description'] += 1
                    continue
                    
                # 3. Story Point validation & mapping
                sp_mapped = standardize_storypoints(sp_raw)
                if sp_mapped is None:
                    rejection_reasons['invalid_points'] += 1
                    continue
                    
                # 4. Construct clean document text
                clean_text = f"Task Title: {title_cleaned}\nTask Description: {desc_cleaned}"
                
                # Track stats
                points_distribution[sp_mapped] = points_distribution.get(sp_mapped, 0) + 1
                project_distribution[idproject] = project_distribution.get(idproject, 0) + 1
                
                writer.writerow({
                    'idproject': idproject,
                    'issuekey': issuekey,
                    'title': title_cleaned,
                    'description': desc_cleaned,
                    'original_storypoints': sp_raw,
                    'storypoints': sp_mapped,
                    'clean_text': clean_text
                })
                written_records += 1
                
    print("\n" + "="*50)
    print("REFACTORING COMPLETED SUCCESSFULLY")
    print("="*50)
    print(f"Total input issues:      {total_records}")
    print(f"Cleaned issues saved:    {written_records} ({written_records/total_records*100:.2f}%)")
    print("\nRejection Reasons:")
    for reason, count in rejection_reasons.items():
        print(f"  - {reason}: {count} ({count/total_records*100:.2f}%)")
        
    print("\nStandardized Story Points Distribution:")
    for points in sorted(points_distribution.keys()):
        count = points_distribution[points]
        print(f"  - {points} points: {count} issues ({count/written_records*100:.2f}%)")
        
    print(f"\nSaved refactored dataset file: {output_path}")

if __name__ == '__main__':
    refactor_dataset()
