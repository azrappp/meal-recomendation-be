# Meal Screening REST API

This project is a REST API for a meal recommendation screening system.  
The current version focuses only on the **screening process**, including:

- client identity
- anthropometry assessment
- biochemical assessment
- clinical assessment
- medication assessment
- physical activity assessment
- energy requirement calculation
- screening result

This project does **not yet include**:

- 24-hour food recall
- food database
- diet recommendation
- meal recommendation
- MILP optimization

Those modules can be added later after the screening API is stable.

---

## Tech Stack

- Node.js
- TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- Docker
- Postman for API testing

---

## Project Structure

```text
meal_rest-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── generated/
│   └── prisma/
├── src/
│   ├── lib/
│   │   └── prisma.ts
│   ├── routes/
│   │   └── screening.routes.ts
│   └── index.ts
├── docker-compose.yml
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

## Development Commands

Start server:

npm run dev

Generate Prisma Client:

npx prisma generate

Run migration:

npx prisma migrate dev

Open Prisma Studio:

npx prisma studio
