import handlers from './_wired.js';

export default function handler(req, res) {
  return handlers.read(req, res);
}
