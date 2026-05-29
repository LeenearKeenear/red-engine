podman-compose down -v

podman build --no-cache --network=host -t red-engine-image .

podman-compose up --build -d

podman logs -f red_engine_node