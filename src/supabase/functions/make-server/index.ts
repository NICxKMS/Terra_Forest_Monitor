// Minimal stub function to prevent deployment conflicts
// All functionality has been moved to forest-api

Deno.serve((req: Request) => {
  return new Response(JSON.stringify({ 
    message: "This function is deprecated. Use forest-api instead.",
    redirect: "/forest-api"
  }), {
    status: 301,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
});