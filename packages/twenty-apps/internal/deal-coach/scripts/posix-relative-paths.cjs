// twenty-sdk builds manifest and upload paths with path.relative, which yields
// backslashes on Windows; the server rejects any resource path containing them.
const path = require('node:path');
const { syncBuiltinESMExports } = require('node:module');

const relative = path.relative;

path.relative = (from, to) => relative(from, to).split(path.sep).join('/');
syncBuiltinESMExports();
