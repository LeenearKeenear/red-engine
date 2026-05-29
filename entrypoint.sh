#!/bin/sh

# Ensure the config file exists so the engine doesn't panic
if [ ! -f "/app/config.json" ]; then
    echo "⚠️  No config.json found! Creating a placeholder..."
    echo "{}" > /app/config.json
fi

# Automatically fix permissions on the mounted data folder
chown -R reduser:redgroup /app/data
chown reduser:redgroup /app/config.json

# Drop privileges to reduser and execute the main application
exec su-exec reduser "$@"