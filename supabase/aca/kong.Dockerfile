FROM kong:2.8.1

# Embed the Kong declarative config directly into the image
# This avoids the need for volume mounts, making it compatible with Azure Container Apps
COPY kong.yml /var/lib/kong/kong.yml

ENV KONG_DATABASE=off
ENV KONG_DECLARATIVE_CONFIG=/var/lib/kong/kong.yml
ENV KONG_PROXY_ACCESS_LOG=/dev/stdout
ENV KONG_ERROR_LOG=/dev/stderr
ENV KONG_PROXY_LISTEN=0.0.0.0:8000
