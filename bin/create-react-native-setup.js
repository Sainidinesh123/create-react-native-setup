#!/usr/bin/env node
import { main } from '../src/index.js';

main(process.argv.slice(2)).catch((error) => {
  console.error(`\ncreate-react-native-setup failed: ${error.message || error}\n`);
  process.exitCode = 1;
});
