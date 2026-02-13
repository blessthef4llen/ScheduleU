import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Simple test query
    cur.execute("SELECT NOW();")
    result = cur.fetchone()
    
    print("Connected successfully!")
    print("Current DB time:", result)

    cur.close()
    conn.close()

except Exception as e:
    print("Connection failed:")
    print(e)
