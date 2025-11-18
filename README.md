# LabShop - E-Commerce REST API

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)

## 📋 Description

**LabShop** is a complete REST API for an e-commerce clothing store, built with **NestJS** and **TypeScript**. The application includes advanced features such as product management, shopping cart, AI integration (Google Gemini), and WhatsApp communication (Twilio).

## 🎯 Main Features

### 1. **Product Management**
- Complete CRUD for products
- Advanced search by garment type, category, color, and description
- Filtering by queries (query parameters)
- Data validation with DTOs

### 2. **Shopping Cart**
- Create carts with multiple items
- Validation of positive quantities
- Product relations
- Automatic total calculation
- Cart item management

### 3. **Google Gemini AI Integration**
- Text generation via AI
- Intelligent product search
- Automatic recommendations
- Natural language processing

### 4. **WhatsApp Integration (Twilio)**
- Send messages via WhatsApp
- Order notifications
- Purchase confirmations
- Automated customer support

### 5. **Database**
- PostgreSQL as the main database
- TypeORM for object-relational mapping
- Table relationships (1:N, N:M)
- Automatic migrations

## 🏗️ Project Architecture

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Main module
├── app.controller.ts          # Main controller
├── app.service.ts             # Main service
│
├── entities/                  # Database entities
│   ├── product.entity.ts      # Product entity
│   ├── cart.entity.ts         # Cart entity
│   └── cart-item.entity.ts    # Cart items entity
│
├── products/                  # Products module
│   ├── products.controller.ts
│   ├── products.service.ts
│   ├── products.module.ts
│   ├── products.controller.spec.ts
│   ├── products.service.spec.ts
│   └── dto/
│       ├── create-product.dto.ts
│       ├── update-product.dto.ts
│       └── product-query.dto.ts
│
├── carts/                     # Shopping cart module
│   ├── carts.controller.ts
│   ├── carts.service.ts
│   ├── carts.module.ts
│   ├── carts.controller.spec.ts
│   ├── carts.service.spec.ts
│   └── dto/
│       ├── create-cart.dto.ts
│       └── cart-item-input.dto.ts
│
├── gemini/                    # AI module (Google Gemini)
│   ├── gemini.controller.ts
│   ├── gemini.service.ts
│   └── gemini.module.ts
│
└── whatsapp/                  # WhatsApp module (Twilio)
    ├── twilio.controller.ts
    ├── twilio.service.ts
    └── twilio.module.ts

test/                          # E2E tests
├── app.e2e-spec.ts
└── jest-e2e.json
```

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** version 18 or higher
- **npm** or **yarn**
- **PostgreSQL** 12 or higher
- **Git**

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/omanias/labshop.git
cd labshop
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=labshop

# Environment Configuration
NODE_ENV=development
PORT=3000

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# AWS RDS (if using AWS)
RDS_HOSTNAME=your_rds_hostname
RDS_PORT=5432
RDS_DB_NAME=labshop
RDS_USERNAME=admin
RDS_PASSWORD=your_password
```

4. **Initialize the database**
```bash
# Make sure PostgreSQL is running
psql -U postgres
CREATE DATABASE labshop;
```

## 🛠️ Available Commands

### Development
```bash
# Start in development mode with watch
npm run start:dev

# Start in debug mode
npm run start:debug

# Start normally
npm start
```

### Production
```bash
# Build the project
npm run build

# Run in production mode
npm run start:prod
```

### Testing
```bash
# Run unit tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:cov

# Run E2E tests
npm run test:e2e

# Run E2E tests in debug mode
npm run test:debug
```

### Linting & Formatting
```bash
# Run linting (ESLint)
npm run lint

# Format code (Prettier)
npm run format
```

## 📚 Main Endpoints

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Get all products |
| GET | `/products?q=search` | Search products |
| GET | `/products/:id` | Get product by ID |
| POST | `/products` | Create a new product |
| PUT | `/products/:id` | Update a product |
| DELETE | `/products/:id` | Delete a product |

### Shopping Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/carts` | Get all carts |
| GET | `/carts/:id` | Get cart by ID |
| POST | `/carts` | Create a new cart |
| PUT | `/carts/:id` | Update a cart |
| DELETE | `/carts/:id` | Delete a cart |
| GET | `/carts/:id/items` | Get cart items |
| POST | `/carts/:id/items` | Add item to cart |

### Gemini AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/gemini/generate` | Generate text with AI |
| POST | `/gemini/search-products` | Search products with AI |
| POST | `/gemini/recommend` | Get recommendations |

### WhatsApp (Twilio)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/whatsapp/send` | Send WhatsApp message |
| POST | `/whatsapp/webhook` | Webhook for incoming messages |

## 🗄️ Database Entities

### Product
```typescript
{
  id: number (Primary Key)
  tipo_prenda: string
  categoria: string
  color: string
  descripcion: string
  precio: number
  stock: number
  createdAt: Date
  updatedAt: Date
}
```

### Cart
```typescript
{
  id: number (Primary Key)
  customer_email: string
  total: number
  status: string
  items: CartItem[]
  createdAt: Date
  updatedAt: Date
}
```

### CartItem
```typescript
{
  id: number (Primary Key)
  cart_id: number (Foreign Key)
  product_id: number (Foreign Key)
  quantity: number
  price: number
  product: Product
  cart: Cart
}
```

## 🔧 Technologies Used

### Backend Framework
- **NestJS** - Progressive Node.js framework
- **Express** - HTTP server

### Language
- **TypeScript** - Typed language

### Database
- **PostgreSQL** - Database management system
- **TypeORM** - ORM for TypeScript

### Validation
- **class-validator** - Class validation
- **class-transformer** - Class transformation

### External APIs
- **Google Gemini** - Artificial Intelligence
- **Twilio** - WhatsApp service
- **Axios** - HTTP client

### Testing
- **Jest** - Testing framework
- **Supertest** - HTTP testing

### Development Tools
- **ESLint** - Linting
- **Prettier** - Code formatter
- **SWC** - Fast compiler

## 📖 Development Guide

### Create a New Module

1. Generate module with NestJS CLI:
```bash
nest g module module-name
```

2. Generate controller:
```bash
nest g controller module-name
```

3. Generate service:
```bash
nest g service module-name
```

4. Create DTOs in `src/module-name/dto/`

5. Import module in `app.module.ts`

### Add a New Entity

1. Create file `src/entities/new-entity.entity.ts`
2. Decorate with `@Entity()`
3. Import in `app.module.ts` with `TypeOrmModule.forFeature([NewEntity])`

### Example DTOs

```typescript
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  tipo_prenda: string;

  @IsString()
  categoria: string;

  @IsNumber()
  precio: number;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
```

## 🔐 Required Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=labshop

# Environment
NODE_ENV=development
PORT=3000

# Google Gemini
GOOGLE_API_KEY=your_api_key

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+number

# AWS RDS (Optional)
RDS_HOSTNAME=your_host
RDS_PORT=5432
RDS_DB_NAME=labshop
RDS_USERNAME=admin
RDS_PASSWORD=password
```

## 📊 Response Structure

### Success Response
```json
{
  "statusCode": 200,
  "message": "Success",
  "data": { }
}
```

### Error Response
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "BadRequest"
}
```

## 🚀 Deployment

### AWS Deployment

1. Use ElasticBeanstalk for the backend
2. RDS for PostgreSQL
3. Configure environment variables in Elastic Beanstalk

## 🐛 Troubleshooting

### Issue: "Cannot find module '@nestjs/core'"
**Solution:** Run `npm install`

### Issue: "Database connection failed"
**Solution:** Verify that PostgreSQL is running and credentials in `.env` are correct

### Issue: "API Key not found"
**Solution:** Make sure `GOOGLE_API_KEY` is configured in `.env`

## 📝 Development Notes

- The project uses a global `ValidationPipe` to validate all DTOs
- Production logs only show errors
- Body parser is configured for JSON and URL-encoded
- TypeORM automatically generates tables if they don't exist

## 👨‍💻 Author

**Omar Manias** - [@omanias](https://github.com/omanias)

## 📄 License

This project is under the UNLICENSED license

## 🤝 Contributions

Contributions are welcome. For major changes, please open an issue first to discuss the proposed changes.

## 📞 Support

For support, open an issue in the repository or contact the developer.

---

**Last updated:** November 2025
