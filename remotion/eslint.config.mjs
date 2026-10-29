import { config } from "@remotion/eslint-config-flat";
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default config;
