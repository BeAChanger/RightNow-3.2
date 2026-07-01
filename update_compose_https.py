from pathlib import Path

p = Path("/root/rightnow/docker-compose.prod.yml")
lines = p.read_text().splitlines()
out = []
in_frontend = False
inserted_volumes = False

for i, line in enumerate(lines):
    if line.startswith("  frontend:"):
        in_frontend = True
    elif in_frontend and line.startswith("  ") and not line.startswith("    ") and not line.startswith("  frontend:"):
        in_frontend = False

    if in_frontend and line.strip() == '- "80:80"':
        out.append(line)
        if i + 1 >= len(lines) or lines[i + 1].strip() != '- "443:443"':
            out.append('      - "443:443"')
        continue

    if in_frontend and line.strip() == "depends_on:" and not inserted_volumes:
        out.append("    volumes:")
        out.append("      - ./nginx.conf:/etc/nginx/nginx.conf:ro")
        out.append("      - ./letsencrypt:/etc/letsencrypt:ro")
        out.append("      - ./certbot-www:/var/www/certbot")
        inserted_volumes = True

    out.append(line)

p.write_text("\n".join(out) + "\n")
