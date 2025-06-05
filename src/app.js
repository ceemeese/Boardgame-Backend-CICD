const express = require('express');
const cors = require('cors')
const knex= require('knex');

const app = express();
app.use(cors());
app.use(express.json());

const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

const secret_name = "rds!db-6f48bbe0-009d-4725-a6b4-f39035f95b17";

const client = new SecretsManagerClient({
  region: "us-east-1",
});


let db;

// Función para inicializar la base de datos
async function initializeDatabase() {
  try {
    console.log('Obteniendo credenciales...');
    
    const response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT",
      })
    );

    const secret = response.SecretString;
    const credentials = JSON.parse(secret);

    console.log(' Credenciales obtenidas');
    console.log(' Conectando a RDS...');

    // Crear conexión con Knex
    db = knex({
      client: 'mysql2',
      connection: {
        host: 'databaseaa2.cj62uscy8a6v.us-east-1.rds.amazonaws.com',
        user: credentials.username,
        password: credentials.password,
        database: 'BoardgameDBAA2',
        port: 3306
      },
      pool: {
        min: 2,
        max: 10
      }
    });

    // Probar la conexión
    await db.raw('SELECT 1');
    console.log(' Conexión a RDS establecida');
    
    return db;
  } catch (error) {
    console.error(' Error al conectar:', error);
    throw error;
  }
}



// Middleware para hacer db disponible en todas las rutas
app.use((req, res, next) => {
  if (db) {
    req.db = db;
  }
  next();
});

//BOARDGAMES
app.get('/boardgames', async (req, res) => {
    const data = await db('boardgames').select('*');
    res.json(data);
});

app.get('/boardgames/:id', async (req, res) => {
    const data = await db('boardgames').select('*').where({id : req.params.id}).first();
    res.json(data);
});
    
app.post('/boardgames', async (req, res) => {

    await db('boardgames').insert({
        name: req.body.name,
        description: req.body.description,
        minPlayers: req.body.minPlayers,
        maxPlayers: req.body.maxPlayers,
        category: req.body.category
    });
    res.status(201).json({});
});

app.put('/boardgames/:id', async (req, res) => {

    await db('boardgames').update({
        name: req.body.name,
        description: req.body.description,
        minPlayers: req.body.minPlayers,
        maxPlayers: req.body.maxPlayers,
        category: req.body.category
    }).where({id: req.params.id})
    res.status(204).json({});
});

app.delete('/boardgames/:id', async (req, res) => {
    await db('boardgames').delete().where({id : req.params.id});
    res.status(204).json({});
});





//USERS
app.get('/users', async (req, res) => {
    const data = await db('users').select('*');
    res.json(data);
});

app.get('/users/:id', async (req, res) => {
    const data = await db('users').select('*').where({id : req.params.id}).first();
    res.json(data);
});

app.post('/users', async (req, res) => {

    await db('users').insert({
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        alias: req.body.alias,
        password: req.body.password,
    });
    res.status(201).json({});
});

app.put('/users/:id', async (req, res) => {

    await db('users').update({
        name: req.body.name,
        surname: req.body.surname,
        email: req.body.email,
        alias: req.body.alias,
        password: req.body.password,
    }).where({id: req.params.id})
    res.status(204).json({});
});

app.delete('/users/:id', async (req, res) => {
    await db('users').delete().where({id : req.params.id});
    res.status(204).json({});
});




//GAME
app.get('/game-info/:id/players', async (req, res) => {
    const players = await db('gamesUsers')
        .join('users', 'gamesUsers.userId', 'users.id')
        .select('users.id', 'users.alias')
        .where('gamesUsers.gameId',req.params.id)

    res.json(players);
});

//DEVOLVER INFORMACION MAS COMPLETA CON GAMEUSERS
app.get('/game-info', async (req, res) => {
    const data = await db('games')
        .join('boardgames', 'games.boardgameId', 'boardgames.id')
        .leftJoin('gamesUsers', 'games.id', 'gamesUsers.gameId')
        .select(
            'games.id',
            'games.name',
            'games.boardgameId',
            'boardgames.name as boardgameName'
        )
        .count('gamesUsers.userId as numPlayers')
        .groupBy('games.id', 'boardgames.name')
    res.json(data);
});

//DEVOLVER INFORMACION MAS COMPLETA CON GAMEUSERS DE PARTIDA ESPECIFICA
app.get('/game-info/:id', async (req, res) => {
    const data = await db('games')
        .join('boardgames', 'games.boardgameId', 'boardgames.id')
        .leftJoin('gamesUsers', 'games.id', 'gamesUsers.gameId')
        .select(
            'games.id',
            'games.name',
            'games.boardgameId',
            'boardgames.name as boardgameName'
        )
        .count('gamesUsers.userId as numPlayers')
        .where('games.id', req.params.id)
        .groupBy('games.id', 'boardgames.name')
        .first();
    res.json(data);
});

app.get('/games/:id', async (req, res) => {
    const data = await db('games').select('*').where({id : req.params.id}).first();
    res.json(data);
});

app.post('/games', async (req, res) => {

    const data = await db('games').insert({
        name: req.body.name,
        boardgameId: req.body.boardgameId
    });
    res.status(201).json(data);
});

app.put('/games/:id', async (req, res) => {

    data = await db('games').update({
        name: req.body.name,
        boardgameId: req.body.boardgameId,
    }).where({id: req.params.id})
    res.status(204).json({});
});

app.delete('/games/:id', async (req, res) => {
    await db('gamesUsers').delete().where({gameId : req.params.id});
    await db('games').delete().where({id : req.params.id});
    res.status(204).json({});
});



//TABLA GAME USERS
app.get('/games-details', async (req, res) => {
    const data = await db('gamesUsers').select('*');
    res.json(data);
});

app.get('/games-details/:id', async (req, res) => {
    const data = await db('gamesUsers').select('*').where({id : req.params.id}).first();
    res.json(data);
});

//DEVOLVER USUARIOS DE PARTIDA ESPECIFICA
app.get('/games-details/:gameId/users', async (req, res) => {

    const data = await db('gamesUsers')
        .join('users', 'gamesUsers.userId', 'users.id')
        .select('users.id', 'users.name')
        .where('gamesUsers.gameId', req.params.gameId);
    res.status(201).json(data);
});

app.post('/games-details/:gameId/users', async (req, res) => {

    const [newGameId] = await db('gamesUsers').insert({
        gameId: req.params.gameId,
        userId: req.body.userId
    });
    res.status(201).json({id: newGameId});
});

//solo modificar usuario
app.put('/games/-details/:gameId/users/:userId', async (req, res) => {

    await db('gamesUsers').update({
        userId: req.body.newUserId
    }).where({ gameId: req.params.gameId, userId: req.params.userId})
    res.status(204).json({});
});


app.delete('/games-details/:gameId/users', async (req, res) => {
    await db('gamesUsers').delete().where({gameId : req.params.gameId});
    res.status(204).json({});
});





async function startServer() {
    try {
        
        await initializeDatabase();
        
        
        app.listen(8080, () => {
            console.log("Backend iniciado correctamente por puerto 8080");
            console.log(" Base de datos conectada y lista");
        });
        
    } catch (error) {
        console.error('💥 Error al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();