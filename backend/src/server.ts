// Load environment variables first
import 'dotenv/config';

import app from './app';
import { config } from './lib/config';

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});
