# Stage 1: Build the application
FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /red-engine ./cmd/red/main.go

# Stage 2: Construct the bare execution container
# FIX: Pin to a specific Alpine version rather than 'latest'
FROM alpine:3.19

# FIX: Add tzdata for accurate log timestamps, and su-exec for privilege dropping
RUN apk --no-cache add ca-certificates git openssh tzdata su-exec

# Create the non-root user with a fixed UID/GID of 1000
RUN addgroup -g 1000 redgroup && \
    adduser -u 1000 -G redgroup -s /bin/sh -D reduser

WORKDIR /app
COPY --from=builder /red-engine ./red-engine

# Copy the new startup script and make it executable
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Create the data directory explicitly before changing ownership
RUN mkdir -p /app/data

# Ensure the user owns the application directory initially
RUN chown -R reduser:redgroup /app

# FIX: We REMOVED the "USER reduser" line here. 
# The container must start as root to execute entrypoint.sh, 
# which will dynamically fix the volume permissions and THEN drop to reduser.

EXPOSE 8080
VOLUME ["/app/data"]

# FIX: Route the startup through our self-healing script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["./red-engine", "-config", "/app/config.json"]