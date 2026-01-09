import 'dotenv/config';

const port = process.env.PORT ?? '3000';
const nodeEnv = process.env.NODE_ENV ?? 'development';

console.log(`Environment: ${nodeEnv}`);
console.log(`Port configured: ${port}`);
console.log('Environment variables loaded successfully!');
