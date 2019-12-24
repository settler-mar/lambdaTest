const mysql = require('mysql');
const connection = mysql.createConnection({
    host: process.env.RDS_HOSTNAME,
    user: process.env.RDS_USERNAME,
    password: process.env.RDS_PASSWORD,
    port: process.env.RDS_PORT,
});

module.exports = function() {
    let _init = false;
    let toInsert = [];
    const cols = [`address` , `city`, `state`, `zip`]

    function createdBase() {
        return new Promise(resolve => {
              connection.query("CREATE DATABASE IF NOT EXISTS  " + process.env.RDS_BASE, (err, result) => {
              if (err) throw err;
        console.log("Database created");
        connection.query('USE '+process.env.RDS_BASE+';',resolve);
    });
    })
    }

    function createdTable() {
        return new Promise(resolve => {
              const sql_create_db = 'CREATE TABLE IF NOT EXISTS `' + process.env.RDS_TABLE + '` (' +
                '`id` INT NOT NULL AUTO_INCREMENT ,' +
                '`address` VARCHAR(255) NOT NULL ,' +
                '`city` VARCHAR(80) NOT NULL ,' +
                '`state` VARCHAR(80) NOT NULL ,' +
                '`zip` INT NOT NULL ,' +
                'PRIMARY KEY (`id`)' +
                ') ENGINE = InnoDB;';
        connection.query(sql_create_db, (err, result) => {
            if (err) throw err;
        console.log("Table created");

        resolve();
    });
    })
    }

    function truncateTable() {
        return new Promise(resolve => {
              const sql_create_db = 'TRUNCATE `' + process.env.RDS_TABLE + '`';
        connection.query(sql_create_db, (err, result) => {
            if (err) throw err;
        console.log("Table TRUNCATE");
        resolve();
    });
    })
    }

    function init() {
        if (_init) return Promise.resolve();
        _init = true;

        connection.connect();
        let p = createdBase().then(() => createdTable())

        if(process.env.TRUNCATE_DB!=1){
            p = p.then(()=> truncateTable())
        }

        return p;
    }

    function testData(data) {
        return new Promise(resolve => {
              let sql = 'SELECT id FROM ' + process.env.RDS_TABLE + ' WHERE ';
        let w = [];
        let param = [];
        for (let key in data) {
            w.push(key + ' = ?')
            param.push(data[key])
        }
        sql += w.join(' and ') + ' limit 1';

        connection.query(sql, param, function(error, results, fields) {
            if (error) throw error;
            console.log(results)
            resolve(!!results.length)
        });
    })
    }

    function insertDo(){
        if(toInsert.length == 0) return Promise.resolve();
        console.log("insert do",toInsert.length);
        return new Promise(resolve => {
              let values = toInsert.map( obj => cols.map( key => obj[key]||''));
        let sql = 'INSERT INTO ' + process.env.RDS_TABLE + ' ('+cols.join(',')+') VALUES ?';
        connection.query(sql, [values], (err) => {
            if (err) throw err;
        toInsert = [];
        resolve(true);
    });
    })
    }

    function insert(data, testUniq = true) {
        return new Promise(resolve => {
              let p = Promise.resolve(false);

        if (testUniq) {
            p = p.then(() => {
                  return testData(data);
        })
        }

        p.then((res) => {
            if (!res) {
            toInsert.push(data);
            if(!process.env.INSER_COUNT || toInsert.length >= process.env.INSER_COUNT){
                insertDo().then(()=>resolve(true));
            }else{
                resolve(true)
            }
            return ;
        }
        resolve(false);
    })
    })
    }

    async function end() {
        await insertDo();
        connection.end();
        _init = false;
    }

    return {
        init,
        insert,
        end
    }
}
