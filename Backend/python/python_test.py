from supabase import create_client
import os
from dotenv import load_dotenv


load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SERVICE_KEY")
print(url)
print(key)

supabase = create_client(url, key)

res = supabase.table("courses").select("*").limit(1).execute()
print(res.data)