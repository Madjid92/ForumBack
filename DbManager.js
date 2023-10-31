//import { json } from 'body-parser';
import pg from 'pg';
const { Pool, Client } = pg;

const CONFIG_DB_HOST = {
    host: '127.0.0.1',
    user: 'postgres',
    password: '1992',
    port: 5432,
}

export const DB_NAME = "chatdb1";
export const MSG_TABLE = "messages";
const dbConnect = new Pool({
    ...CONFIG_DB_HOST, database: DB_NAME
});


const createDb = async () => {
    const dbCreateClient = new Client(CONFIG_DB_HOST);
    try {
        dbCreateClient.connect();
        console.log(`awaiting to create DB ${DB_NAME} ......`)
        await dbCreateClient.query(`CREATE DATABASE ${DB_NAME} `);
        console.log(`DB ${DB_NAME} created sucess`)
        return true
    } catch (error) {
        if (error.code === "42P04") {
            console.log(`Database  ${DB_NAME} already exists !`);
            return false;
        }
        console.log(`Unknown error when creating DB ${error}`)
        throw error;
    } finally {
        dbCreateClient.end();
        console.log(`Database  ${DB_NAME} disconnected`);
    }
}

const createTable = async (tableName) => {
    try {
        await dbConnect.connect();
        console.log(`awaiting to Create Table ${tableName} `);
        await dbConnect.query(`CREATE TABLE ${tableName}(name varchar,message varchar,sendTime bigint,token varchar)`);
        console.log(`Table ${tableName} created with success `);
        return true
    } catch (e) {
        console.error(e);
        return false;
    } /*finally {
        await dbConnect.end();
        console.log("disconnect when createTable");
    }*/
};

export const initDB = async () => {
    const isCreate = await createDb();
    if (isCreate) {
        await createTable(MSG_TABLE)
    }
}

export const insertMessage = async (login, content, date, token) => {
    try {
        await dbConnect.connect();
        await dbConnect.query(`INSERT INTO ${MSG_TABLE} VALUES ('${login}', '${content}', '${date}', '${token}')`);
        return true;
    } catch (e) {
        console.log(e)
    } /*finally {
        await dbConnect.end();
        console.log("disconnect when message inserted");
    }*/
};

export const selectMessages = async () => {
    try {
        const query = {
            // give the query a unique name
            name: 'fetch-user',
            text: `SELECT name as login, sendtime as date, message as content FROM ${MSG_TABLE}`,
            //values: [1],
          };
        await dbConnect.connect();
        const resp = await dbConnect.query(query);
        const msgs = resp.rows;
        msgs.map((e)=>{e.date = new Date(parseInt(e.date))});
        console.log(msgs);
        return msgs;
    } catch (e) {
        console.log(e)
    }
};
