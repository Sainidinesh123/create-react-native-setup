import { stdout as output } from 'node:process';

const enabled = Boolean(output.isTTY) && !process.env.NO_COLOR;

const wrap =
  (open, close) =>
  (text) =>
    enabled ? `\u001b[${open}m${text}\u001b[${close}m` : String(text);

export const color = {
  cyan: wrap(36, 39),
  green: wrap(32, 39),
  yellow: wrap(33, 39),
  magenta: wrap(35, 39),
  bold: wrap(1, 22),
  dim: wrap(2, 22),
};

/** Colorize a question label for interactive prompts. */
export function promptLabel(text) {
  return color.cyan(color.bold(text));
}
