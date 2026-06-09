# Marym Atelier Express Server

This is a Node.js/Express server that replaces Vercel for the Marym Atelier application. It provides a RESTful API for managing dresses, reservations, designers, FAQs, and application settings.

## Features

- **PostgreSQL Database**: Direct database connection pooling for high performance
- **RESTful API**: Complete API for all application features
- **CORS Support**: Configurable cross-origin resource sharing
- **Error Handling**: Comprehensive error handling with Arabic error messages
- **Health Checks**: Built-in health check endpoints for monitoring
- **WhatsApp Integration**: Support for reservation notifications (optional)
- **Environment Configuration**: Full support for environment variables

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your configuration:
```bash
cp .env.example .env
```

3. Configure your environment variables (see Configuration section)

## Running the Server

### Development
```bash
npm start
```

### With Custom Port
```bash
PORT=8000 npm start
```

### Production
```bash
NODE_ENV=production npm start
```

## Configuration

Create a `.env` file in the project root with the following variables:

### Server Configuration
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

### Database Configuration
- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_NAME` - Database name (default: marymatelier)
- `DB_USER` - Database user (required)
- `DB_PASSWORD` - Database password (required)

### CORS Configuration
- `CORS_ORIGIN` - Allowed origin for CORS (default: *)

### WhatsApp Configuration (Optional)
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp API access token
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp business phone number ID
- `WHATSAPP_ADMIN_NUMBER` - Admin phone number for notifications
- `WHATSAPP_SALES_NUMBER` - Sales phone number for notifications

## API Endpoints

### Health Check
- `GET /health` - Server health check
- `GET /api/health` - Detailed health check with environment status

### Dresses Management
- `GET /api/dresses` - List all dresses
- `POST /api/dresses` - Create new dress
- `PATCH /api/dresses?id={id}` - Update dress
- `DELETE /api/dresses?id={id}` - Delete dress
- `POST /api/dresses-positions` - Bulk update dress positions

#### Dress Schema
```javascript
{
  id: string,
  name: string,
  designer: string,
  category: string,
  price: number,
  position: number,
  size: string,
  color: string,
  bigSize: string,
  featured: boolean,
  images: array,
  details: object,
  available: boolean,
  createdAt: string (ISO 8601),
  updatedAt: string (ISO 8601)
}
```

### Reservations Management
- `GET /api/reservations` - List all reservations
- `POST /api/reservations` - Create new reservation
- `PATCH /api/reservations?id={id}` - Update reservation
- `DELETE /api/reservations?id={id}` - Delete reservation

#### Reservation Schema
```javascript
{
  id: string,
  dressId: string,
  dressName: string,
  clientName: string,
  clientPhone: string,
  weight: number,
  height: number,
  trialDate: string (ISO 8601),
  rentDate: string (ISO 8601),
  time: string,
  notes: string,
  status: string (pending|confirmed|completed|cancelled),
  createdAt: string (ISO 8601),
  updatedAt: string (ISO 8601)
}
```

### Designers Management
- `GET /api/designers` - List all designer names
- `POST /api/designers` - Create or update designer

### FAQs Management
- `GET /api/faqs` - List all FAQs
- `POST /api/faqs` - Create new FAQ
- `PATCH /api/faqs?id={id}` - Update FAQ
- `DELETE /api/faqs?id={id}` - Delete FAQ

#### FAQ Schema
```javascript
{
  id: string,
  question: string,
  answer: string,
  createdAt: string (ISO 8601)
}
```

### Settings Management
- `GET /api/settings` - List all settings
- `GET /api/settings?key={key}` - Get specific setting
- `POST /api/settings` - Create or update setting
- `PATCH /api/settings` - Update setting
- `DELETE /api/settings?key={key}` - Delete setting

#### Setting Schema
```javascript
{
  key: string,
  value: string,
  updatedAt: string (ISO 8601)
}
```

## Request/Response Format

### Request Headers
```
Content-Type: application/json
```

### Success Response (200, 201)
```json
{
  // Resource data or array of resources
}
```

### Error Response (4xx, 5xx)
```json
{
  "ok": false,
  "error": "Error message (may be in Arabic)",
  "details": "Additional details (development only)"
}
```

## Key Features

### Database Connection Pooling
- Maximum 20 concurrent connections
- 30 second idle timeout
- 2 second connection timeout
- Automatic error handling and recovery

### Data Type Conversion
The server automatically converts between:
- Database format (snake_case): `dress_id`, `client_name`, `big_size`
- API format (camelCase): `dressId`, `clientName`, `bigSize`

### Bulk Operations
- Dress positions can be updated in bulk with controlled concurrency (20 items per batch)
- Prevents N+1 update storms with efficient batching

### Request Size Limits
- JSON body limit: 50MB
- URL-encoded body limit: 50MB
- Supports large image uploads

### Logging
All requests are logged with timestamp and HTTP method/path information.

## Database Schema

The server expects the following PostgreSQL tables:

### dresses
- id (UUID/String)
- name (String)
- designer (String)
- category (String)
- price (Number)
- position (Number)
- size (String)
- color (String)
- big_size (String)
- featured (Boolean)
- images (JSON Array)
- details (JSON)
- available (Boolean)
- created_at (Timestamp)
- updated_at (Timestamp)

### reservations
- id (UUID/String)
- dress_id (String)
- dress_name (String)
- client_name (String)
- client_phone (String)
- weight (Number)
- height (Number)
- trial_date (Timestamp)
- rent_date (Timestamp)
- time (String)
- notes (String)
- status (String)
- created_at (Timestamp)
- updated_at (Timestamp)

### designers
- name (String, Primary Key)

### faqs
- id (UUID/String)
- question (String)
- answer (String)
- created_at (Timestamp)

### settings
- key (String, Primary Key)
- value (String)
- updated_at (Timestamp)

## Error Messages

The server returns error messages in English and Arabic:

### Common Errors
- 400: Bad Request - Missing required fields or invalid data
- 404: Not Found - Resource does not exist
- 405: Method Not Allowed - HTTP method not supported
- 500: Internal Server Error - Database or server error

## Deployment

### Environment Checklist
Before deploying to production:

1. [ ] Set `NODE_ENV=production`
2. [ ] Configure all required environment variables
3. [ ] Ensure PostgreSQL is accessible
4. [ ] Test database connection with `/api/health`
5. [ ] Configure CORS_ORIGIN for frontend domain
6. [ ] Set up WhatsApp credentials (if using notifications)
7. [ ] Enable process monitoring (PM2, systemd, Docker, etc.)

### Process Management

#### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "marym-atelier"
pm2 startup
pm2 save
```

#### Using systemd (Linux)
Create `/etc/systemd/system/marym-atelier.service`:
```ini
[Unit]
Description=Marym Atelier Server
After=network.target

[Service]
Type=simple
User=nodejs
WorkingDirectory=/path/to/marym-atelier
EnvironmentFile=/path/to/marym-atelier/.env
ExecStart=/usr/bin/node /path/to/marym-atelier/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### Using Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

## Testing

### Health Check
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/health
```

### List Dresses
```bash
curl http://localhost:3000/api/dresses
```

### Create Dress
```bash
curl -X POST http://localhost:3000/api/dresses \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Elegant Gown",
    "designer": "Designer Name",
    "price": 5000,
    "category": "Evening"
  }'
```

## Troubleshooting

### Database Connection Issues
1. Verify PostgreSQL is running
2. Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`
3. Test connection: `psql -h $DB_HOST -U $DB_USER -d $DB_NAME`

### Port Already in Use
```bash
# Use a different port
PORT=3001 npm start

# Or kill the process using the port
lsof -ti :3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000    # Windows
```

### Connection Pool Exhaustion
- Increase `max` pool size in `server/config/db.js`
- Check for long-running queries
- Monitor open connections: `SELECT count(*) FROM pg_stat_activity;`

## License

Proprietary - Marym Atelier

## Support

For issues or questions, contact the development team.
