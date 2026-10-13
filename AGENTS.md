# NaijaMarket — Base44 Dev Environment

## Project Overview
NaijaMarket is a PHP/MySQL digital marketplace for Nigerian small businesses.
Pure PHP (PDO) + MySQL, Bootstrap 5 via CDN, no build step.

The repo also contains a static HTML site (SAGTECH/) — a separate company portfolio,
not part of the running application.

## Running the app
```bash
docker compose -f docker-compose.base44.yml up -d --build
```
App is served on **port 3000** (Apache inside the container on port 80).

## Services
- **web** — PHP 8.2 Apache (`naijamarket/naijamarket/Dockerfile`), code bind-mounted at `/var/www/html`
- **db** — MariaDB 10.11, schema auto-imported from `schema.sql` on first boot

## Database
- MariaDB container, root password `naijamarket_dev_pw` (dev only)
- `schema.sql` is mounted into `/docker-entrypoint-initdb.d/` so it runs on first boot
- `config/db.php` reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` from env
  (falls back to XAMPP defaults `127.0.0.1` / `root` / empty when env is absent)

## Demo logins (seeded in schema.sql)
| Role   | Email                  | Password    |
|--------|------------------------|-------------|
| Admin  | admin@naijamarket.ng   | Admin@123   |
| Vendor | lagoon@naijamarket.ng | Vendor@123  |
| Vendor | kano@naijamarket.ng    | Vendor@123  |
| Buyer  | buyer@naijamarket.ng   | Buyer@123   |

## No external credentials needed
Payment gateway (Paystack/Flutterwave) runs in **test/stub mode** — no real API keys required.

## Verification
- `curl http://localhost:3000/` should return the NaijaMarket homepage
- Login at `/login.php` with any demo account above
