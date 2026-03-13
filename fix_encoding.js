const fs = require('fs');
let buf = fs.readFileSync('app/team/[breweryId]/analytics/page.tsx');
let str = buf.toString('utf8');

// There are a lot of broken strings. 
let decoded = "";
try {
  // If it was double-encoded: text -> utf8 bytes -> decoded as latin1 -> saved as utf8
  // We can reverse it by taking the utf8 string, getting its latin1 bytes, and decoding as utf8
  decoded = Buffer.from(str, 'latin1').toString('utf8');
} catch (e) {
  decoded = str;
}

// But wait, parts of the file might be correct UTF-8 and replacing the whole file could break normal German chars.
// It's safer to just replace precisely. 
// Let's identify what "â%" or "â³" is.

console.log(str.substring(18500, 19000));
