'use strict';

const express = require('express');
const {Sequelize} = require('sequelize');
const crypto = require('crypto');
// See https://github.com/vercel/pkg/issues/141#issuecomment-311746512
require('sqlite3')
require('mysql2')


const APP_PORT = Number(cleanString(process.env.PORT) ?? 80)
const APP_INTERFACE = cleanString(process.env.INTERFACE) ?? '0.0.0.0'

const DB_DIALECT = cleanString(process.env.DB_DIALECT)
if (!['memory', 'sqlite', 'mysql'].includes(DB_DIALECT)) throw `DB_DIALECT "${DB_DIALECT}" is not supported`

const DB_NAME = cleanString(process.env.DB_NAME)
const DB_USERNAME = cleanString(process.env.DB_USERNAME)
const DB_PASSWORD = cleanString(process.env.DB_PASSWORD)
const DB_ADDRESS = cleanString(process.env.DB_ADDRESS)
const DB_PORT = Number(cleanString(process.env.DB_PORT))

const FEATURE_OPTIONAL = isEnabled(cleanString(process.env.FEATURE_OPTIONAL))
const FEATURE_PREMIUM = isEnabled(cleanString(process.env.FEATURE_PREMIUM))

let sequelize;

if (DB_DIALECT === 'memory') {
    sequelize = new Sequelize('sqlite::memory:')
}

if (DB_DIALECT === 'sqlite') {
    sequelize = new Sequelize({
        dialect: DB_DIALECT,
        storage: DB_ADDRESS
    });
}

if (DB_DIALECT === 'mysql') {
    sequelize = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
        dialect: DB_DIALECT,
        host: DB_ADDRESS,
        port: Number(DB_PORT)
    })
}

const index = express();
index.set('json spaces', 4)

index.get('/', async (req, res) => {
    const QUERY = 'SELECT 1 + 1;'
    let error = undefined;
    try {
        await sequelize.authenticate()
        await sequelize.query(QUERY)
    } catch (e) {
        console.log(e)
        error = e
    }

    res.status(error ? 500 : 200).json({
        MESSAGE: error ? 'Some error occurred' : 'Successfully executed query',
        QUERY,
        ERROR: error,
        DB_DIALECT,
        DB_ADDRESS,
        DB_PORT,
        DB_NAME,
        DB_USERNAME,
        DB_PASSWORD: anonymize(DB_PASSWORD),
        FEATURE_OPTIONAL,
        FEATURE_PREMIUM
    })
});

function anonymize(password) {
    if (password === undefined) return
    try {
        return crypto.createHash('sha256').update(password, 'utf-8').digest('hex').slice(0, 4)
    } catch (e) {
        console.log(e)
        return e
    }
}

function cleanString(value) {
    if (value === undefined) return undefined
    if (value === null) return undefined

    let s = String(value)
    if (s.startsWith('"') && s.endsWith('"') || s.startsWith("'") && s.endsWith("'")) {
        s = s.slice(1, -1)
    }

    return s
}

function isEnabled(value) {
    return ['true', true, 'True', 1, '1'].includes(value)
}

index.listen(APP_PORT, APP_INTERFACE, () => {
    console.log(`Listening on ${APP_INTERFACE}:${APP_PORT}`);
});

module.exports = index;
