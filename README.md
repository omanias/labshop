# LabShop - API REST de E-commerce

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)

## 📋 Descripción

**LabShop** es una API REST completa para un e-commerce de prendas de vestir, construida con **NestJS** y **TypeScript**. La aplicación incluye funcionalidades avanzadas como gestión de productos, carrito de compras, integración con IA (Google Gemini) y comunicación mediante WhatsApp (Twilio).

## 🎯 Características Principales

### 1. **Gestión de Productos**
- CRUD completo de productos
- Búsqueda avanzada por tipo de prenda, categoría, color y descripción
- Filtrado por consultas (query parameters)
- Validación de datos con DTOs

### 2. **Carrito de Compras**
- Crear carritos con múltiples items
- Validación de cantidades positivas
- Relación con productos
- Cálculo automático de totales
- Gestión de items del carrito

### 3. **Integración con Google Gemini AI**
- Generación de texto mediante IA
- Búsqueda inteligente de productos
- Recomendaciones automáticas
- Procesamiento de lenguaje natural

### 4. **Integración con WhatsApp (Twilio)**
- Envío de mensajes por WhatsApp
- Notificaciones de órdenes
- Confirmaciones de compra
- Soporte al cliente automatizado

### 5. **Base de Datos**
- PostgreSQL como base de datos principal
- TypeORM para el mapeo objeto-relacional
- Relaciones entre tablas (1:N, N:M)
- Migraciones automáticas

## 🏗️ Arquitectura del Proyecto

```
src/
├── main.ts                    # Punto de entrada de la aplicación
├── app.module.ts              # Módulo principal
├── app.controller.ts          # Controlador principal
├── app.service.ts             # Servicio principal
│
├── entities/                  # Entidades de base de datos
│   ├── product.entity.ts      # Entidad de Productos
│   ├── cart.entity.ts         # Entidad de Carrito
│   └── cart-item.entity.ts    # Entidad de Items del Carrito
│
├── products/                  # Módulo de Productos
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
├── carts/                     # Módulo de Carrito
│   ├── carts.controller.ts
│   ├── carts.service.ts
│   ├── carts.module.ts
│   ├── carts.controller.spec.ts
│   ├── carts.service.spec.ts
│   └── dto/
│       ├── create-cart.dto.ts
│       └── cart-item-input.dto.ts
│
├── gemini/                    # Módulo de IA (Google Gemini)
│   ├── gemini.controller.ts
│   ├── gemini.service.ts
│   └── gemini.module.ts
│
└── whatsapp/                  # Módulo de WhatsApp (Twilio)
    ├── twilio.controller.ts
    ├── twilio.service.ts
    └── twilio.module.ts

test/                          # Tests E2E
├── app.e2e-spec.ts
└── jest-e2e.json
```

## 🚀 Instalación y Configuración

### Requisitos Previos
- **Node.js** versión 18 o superior
- **npm** o **yarn**
- **PostgreSQL** 12 o superior
- **Git**

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/omanias/labshop.git
cd labshop
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crear un archivo `.env` en la raíz del proyecto:

```env
# Configuración de Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=labshop

# Configuración de Ambiente
NODE_ENV=development
PORT=3000

# Google Gemini API
GOOGLE_API_KEY=your_google_api_key

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890

# RDS (si se usa AWS)
RDS_HOSTNAME=your_rds_hostname
RDS_PORT=5432
RDS_DB_NAME=labshop
RDS_USERNAME=admin
RDS_PASSWORD=your_password
```

4. **Iniciar la base de datos**
```bash
# Asegúrate que PostgreSQL está ejecutándose
psql -U postgres
CREATE DATABASE labshop;
```

## 🛠️ Comandos Disponibles

### Desarrollo
```bash
# Iniciar en modo desarrollo con watch
npm run start:dev

# Iniciar en modo depuración
npm run start:debug

# Iniciar normalmente
npm start
```

### Producción
```bash
# Compilar el proyecto
npm run build

# Ejecutar en modo producción
npm run start:prod
```

### Testing
```bash
# Ejecutar tests unitarios
npm test

# Ejecutar tests en modo watch
npm test:watch

# Ejecutar tests con cobertura
npm test:cov

# Ejecutar tests E2E
npm run test:e2e

# Ejecutar tests E2E en modo depuración
npm run test:debug
```

### Linting y Formato
```bash
# Ejecutar linting (ESLint)
npm run lint

# Formatear código (Prettier)
npm run format
```

## 📚 Endpoints Principales

### Productos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/products` | Obtener todos los productos |
| GET | `/products?q=search` | Buscar productos |
| GET | `/products/:id` | Obtener un producto por ID |
| POST | `/products` | Crear un nuevo producto |
| PUT | `/products/:id` | Actualizar un producto |
| DELETE | `/products/:id` | Eliminar un producto |

### Carrito
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/carts` | Obtener todos los carritos |
| GET | `/carts/:id` | Obtener un carrito por ID |
| POST | `/carts` | Crear un nuevo carrito |
| PUT | `/carts/:id` | Actualizar un carrito |
| DELETE | `/carts/:id` | Eliminar un carrito |
| GET | `/carts/:id/items` | Obtener items del carrito |
| POST | `/carts/:id/items` | Agregar item al carrito |

### Gemini AI
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/gemini/generate` | Generar texto con IA |
| POST | `/gemini/search-products` | Buscar productos con IA |
| POST | `/gemini/recommend` | Obtener recomendaciones |

### WhatsApp (Twilio)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/whatsapp/send` | Enviar mensaje por WhatsApp |
| POST | `/whatsapp/webhook` | Webhook para mensajes entrantes |

## 🗄️ Entidades de Base de Datos

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

## 🔧 Tecnologías Utilizadas

### Backend Framework
- **NestJS** - Framework progresivo de Node.js
- **Express** - Servidor HTTP

### Lenguaje
- **TypeScript** - Lenguaje tipado

### Base de Datos
- **PostgreSQL** - Sistema de gestión de base de datos
- **TypeORM** - ORM para TypeScript

### Validación
- **class-validator** - Validación de clases
- **class-transformer** - Transformación de clases

### APIs Externas
- **Google Gemini** - Inteligencia Artificial
- **Twilio** - Servicio de WhatsApp
- **Axios** - Cliente HTTP

### Testing
- **Jest** - Framework de testing
- **Supertest** - Testing de HTTP

### Herramientas de Desarrollo
- **ESLint** - Linting
- **Prettier** - Formateador de código
- **SWC** - Compilador rápido

## 📖 Guía de Desarrollo

### Crear un Nuevo Módulo

1. Generar el módulo con NestJS CLI:
```bash
nest g module nombre-modulo
```

2. Generar el controlador:
```bash
nest g controller nombre-modulo
```

3. Generar el servicio:
```bash
nest g service nombre-modulo
```

4. Crear DTOs en `src/nombre-modulo/dto/`

5. Importar el módulo en `app.module.ts`

### Agregar una Nueva Entidad

1. Crear el archivo `src/entities/nueva-entidad.entity.ts`
2. Decorar con `@Entity()`
3. Importar en `app.module.ts` con `TypeOrmModule.forFeature([NuevaEntidad])`

### Ejemplo de DTOs

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

## 🔐 Variables de Entorno Requeridas

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
GOOGLE_API_KEY=tu_api_key

# Twilio
TWILIO_ACCOUNT_SID=tu_account_sid
TWILIO_AUTH_TOKEN=tu_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+numero

# AWS RDS (Opcional)
RDS_HOSTNAME=your_host
RDS_PORT=5432
RDS_DB_NAME=labshop
RDS_USERNAME=admin
RDS_PASSWORD=password
```

## 📊 Estructura de Respuestas

### Respuesta Exitosa
```json
{
  "statusCode": 200,
  "message": "Éxito",
  "data": { }
}
```

### Respuesta de Error
```json
{
  "statusCode": 400,
  "message": "Mensaje de error",
  "error": "BadRequest"
}
```

## 🚀 Despliegue



### Despliegue en AWS

1. Usar ElasticBeanstalk para el backend
2. RDS para PostgreSQL
3. Configurar variables de entorno en Elastic Beanstalk

## 🐛 Troubleshooting

### Problema: "Cannot find module '@nestjs/core'"
**Solución:** Ejecutar `npm install`

### Problema: "Database connection failed"
**Solución:** Verificar que PostgreSQL está corriendo y las credenciales en `.env` son correctas

### Problema: "API Key not found"
**Solución:** Asegurarse que `GOOGLE_API_KEY` está configurado en `.env`

## 📝 Notas de Desarrollo

- El proyecto usa `ValidationPipe` global para validar todos los DTOs
- Los logs en producción solo muestran errores
- El body parser está configurado para JSON y URL-encoded
- TypeORM genera automáticamente las tablas si no existen

## 👨‍💻 Autor

**Omar Manias** - [@omanias](https://github.com/omanias)

## 📄 Licencia

Este proyecto está bajo la licencia UNLICENSED

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para cambios mayores, abre primero un issue para discutir los cambios propuestos.

## 📞 Soporte

Para soporte, abre un issue en el repositorio o contacta al desarrollador.

---

**Última actualización:** Noviembre 2025
