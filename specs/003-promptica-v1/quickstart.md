# Quickstart

1. **Install Dependencies**: `npm install`
2. **Environment Variables**: Create a `.dev.vars` file with your Turso credentials:
   ```env
   TURSO_DATABASE_URL=libsql://[your-db].turso.io
   TURSO_AUTH_TOKEN=[your-token]
   ```
3. **Database Setup**:
   ```bash
   npm run db:push
   npm run db:seed
   ```
4. **Run Locally**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:8788`.
