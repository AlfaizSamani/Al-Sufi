FROM supabase/edge-runtime:v1.54.4

# Copy all edge functions into the container image
# This avoids needing volume mounts (incompatible with Azure Container Apps)
COPY supabase/functions /home/deno/functions

EXPOSE 8083
