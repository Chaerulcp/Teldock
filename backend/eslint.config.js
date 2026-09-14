module.exports = [
    {
        ignores: ['node_modules/**'],
    },
    {
        files: ['src/**/*.js', 'tests/**/*.js', 'scripts/**/*.js', '*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                Blob: 'readonly',
                Buffer: 'readonly',
                FormData: 'readonly',
                __dirname: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                module: 'readonly',
                process: 'readonly',
                require: 'readonly',
                setTimeout: 'readonly',
            },
        },
        rules: {
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'no-undef': 'error',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        },
    },
];
