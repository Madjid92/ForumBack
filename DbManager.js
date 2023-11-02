//import { json } from 'body-parser';
import pg from 'pg';
const { Pool, Client } = pg;

export const DB_NAME = "chatdb1";
export const MSG_TABLE = "messages";


export class PoolConfig {
    static host = '127.0.0.1';
    static user = 'postgres';
    static password = '1992';
    static port = 5432;
    
    static pool = undefined;
    static client = undefined;

    static async getPool(){
        if(!this.pool) {
            this.pool = new Pool({host: this.host,user: this.user,password: this.password,port: this.port, database: DB_NAME})
            await this.pool.connect();
            return this.pool;
        }
        return this.pool;
       
    }
    static async getClient(){
        if(!this.client) {
            this.client = new Client({host: this.host,user: this.user,password: this.password,port: this.port})
            await this.client.connect();
            return this.client;
        }
        return this.client;
    }

    static async endClient() {
        if(!this.client){
            return;
        }
        await this.client.end();
        this.client = undefined;
    }


    static async endPool() {
        if(!this.pool){
            return;
        }
        await this.pool.end();
        this.pool = undefined;
    }

};



/*
const CONFIG_DB_HOST = {
    host: '127.0.0.1',
    user: 'postgres',
    password: '1992',
    port: 5432,
}

const dbConnect = new Pool({
    ...CONFIG_DB_HOST, database: DB_NAME
});*/


const createDb = async () => {
    const dbCreateClient = await PoolConfig.getClient();
    try {
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
        await PoolConfig.endClient();
        console.log(`Database  ${DB_NAME} disconnected`);
    }
}

const createTable = async (tableName) => {
    try {
        const pool = await PoolConfig.getPool();
        console.log(`awaiting to Create Table ${tableName} `);
        await pool.query(`CREATE TABLE ${tableName}(name varchar,message varchar,sendTime bigint,token varchar)`);
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
        const pool = await PoolConfig.getPool();
        await pool.query(`INSERT INTO ${MSG_TABLE} VALUES ('${login}', '${content}', '${date}', '${token}')`);
        return true;
    } catch (e) {
        console.log(e)
    } /*finally {
        await dbConnect.end();
        console.log("disconnect when message inserted");
    }*/
};

export const selectMessages = async () => {
    console.log("selectMessages .......");
    try {
        const query = {
            // give the query a unique name
            name: 'fetch-user',
            text: `SELECT name as login, sendtime as date, message as content FROM ${MSG_TABLE}`,
            //values: [1],
          };
        const pool = await PoolConfig.getPool();
        const resp = await pool.query(query);
        const msgs = resp.rows;
        msgs.map((e)=>{e.date = new Date(parseInt(e.date))});
        console.log("get message selectMessages : ", msgs.length);
        return msgs;
    } catch (e) {
        console.log(e)
    } /*finally {
        console.log("=====>>");
        await dbConnect.end();
        console.log("disconnect when message inserted");
    }*/
};

