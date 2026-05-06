import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
 
  const { record } = await req.json() 

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )


  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: `Course: ${record.courseCode}. Title: ${record.title}. Description: ${record.description}`,
    }),
  })

  const { data } = await response.json()
  const embedding = data[0].embedding

  
  const { error } = await supabase
    .from('listings')
    .update({ description_embedding: embedding })
    .eq('id', record.id)

  if (error) console.error("Database Update Error:", error)

  return new Response(JSON.stringify({ success: true }), { 
    headers: { 'Content-Type': 'application/json' } 
  })
})