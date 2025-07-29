const cryptoLib = require('cryptlib');

const ENCRYPTION_BYPASS = false; // Set to true to bypass encryption
console.log("process.env.KEY", process.env.KEY);
const shaKey = cryptoLib.getHashSha256("6swLhSdZQqodUH1FqfQIB0nyfN69C7TS", 32);
const IV = "6swLhSdZQqodUH1F" || cryptoLib.generateRandomIV(16);

function encrypt(text) {
    if (ENCRYPTION_BYPASS) return text;
    return cryptoLib.encrypt(text, shaKey, IV);
}

function decrypt(encrypted) {
    if (ENCRYPTION_BYPASS) return encrypted;
    return cryptoLib.decrypt(encrypted, shaKey, IV);
}

// Example usage
const original = "FLb5MYENEF71DbfZlmoxj7Y37VvFJIAsbJipVZa2aCbvsjawLEPqGEofZ6T9Kd1jua4OipixjkJEGXe3eHVazg==";
// const encrypted = encrypt(original);
const decrypted = decrypt(original);

console.log("Original:", original);
console.log()
// console.log("Encrypted:", encrypted);
console.log("Decrypted:", decrypted);
