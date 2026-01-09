import 'dotenv/config';
import express from 'express';

const app = express();
const port = parseInt(process.env.PORT ?? '3000', 10);
const nodeEnv = process.env.NODE_ENV ?? 'development';

app.get('/', (_req, res) => {
  res.json({ message: 'YTB API is running', environment: nodeEnv });
});

app.listen(port, () => {
  console.log(`Server running in ${nodeEnv} mode on port ${port}`);
});
