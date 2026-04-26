const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "commonjs",
            globals: {
                process: "readonly",
                require: "readonly",
                module: "readonly",
                console: "readonly",
                __dirname: "readonly",
                exports: "readonly",
                Promise: "readonly",
                Buffer: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-useless-escape": "off",
            "no-useless-assignment": "off",
            "preserve-caught-error": "off"
        }
    }
];
