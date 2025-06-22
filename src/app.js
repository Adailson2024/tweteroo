import express from 'express';
import cors from 'cors';
import { MongoClient,ObjectId } from 'mongodb';
import dotenv from "dotenv";
import Joi from 'joi';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const mongoURL=process.env.MONGO_URL;
const mongoClient=new MongoClient(mongoURL);
let db;

mongoClient.connect()
.then(()=>{
  console.log("Conexão com o banco estabelecida com sucesso!");
  db=mongoClient.db();
})
.catch((err)=>console.log(err.message));


app.get('/', (req, res) => {
  res.send('Bem-vindo ao meu servidor Express!');
});

app.post('/sign-up',async (req,res)=>{
  const usuario=req.body;
  const usuarioEsquema=Joi.object({
    username: Joi.string().required(),
	avatar: Joi.string().required()
  })
  const validacao=usuarioEsquema.validate(usuario,{abortEarly:false});

  if(validacao.error){
    const mensagem=validacao.error.details.map(detail => detail.message);
    return res.status(422).send(mensagem);
  }
  try{
  const usuarioExistente=
  await db.collection("usuarios").findOne({username:usuario.username});
  if(usuarioExistente){
    return res.status(409).send("Usuário com esse nome já cadastrado")
  }
  await db.collection("usuarios").insertOne(usuario)
    res.status(201).send("Usuário criado com sucesso!")
  } 
  catch(err){
    res.status(404).send(err.message)
  }
});

app.post('/tweets',async (req,res)=>{
  const {username,tweet}=req.body;
  const tweetEsquema=Joi.object({
    username: Joi.string().required(),
	tweet: Joi.string().required()
  });
  const validacao=tweetEsquema.validate(req.body,{abortEarly:false});

  if(validacao.error){
    const mensagem=validacao.error.details.map(detail => detail.message);
    return res.status(422).send(mensagem);
  }
  try{
  const usuarioExistente = await db.collection("usuarios").findOne({username:username});
if(!usuarioExistente){
  return res.status(409).send("Usuário não cadastrado")
}

  const novoTweet={
    username,
    tweet
  }
  await db.collection("tweets").insertOne(novoTweet)
    res.status(201).send("tweet criado com sucesso!")
  } 
  catch(err){
    res.status(404).send(err.message)
  }
});

app.get('/tweets', async (req, res) => {
    try {
        
        const todosTweets = await db.collection("tweets").find({}).sort({ _id: -1 }).toArray();
        if (todosTweets.length === 0) {
            return res.status(200).send([]);
        }
        const tweetsComAvatar = await Promise.all(todosTweets.map(async (tweet) => {
            const usuarioInfo = await db.collection("usuarios").findOne({ username: tweet.username });
            const avatarDoUsuario = usuarioInfo ? usuarioInfo.avatar : null; 
            return {
                _id: tweet._id,
                username: tweet.username,
                avatar: avatarDoUsuario,
                tweet: tweet.tweet
            };
        }));
        res.status(200).send(tweetsComAvatar);
    } catch (erro) {
        console.error("Erro ao buscar tweets:", erro);
        res.status(500).send("Erro interno do servidor ao buscar tweets.");
    }
});

app.get('/tweets/:id', async (req, res) => {
    const { id } = req.params; 

    try {
        if (!ObjectId.isValid(id)) {
            return res.status(400).send("ID do tweet inválido."); 
        }
        const tweetEncontrado = await db.collection("tweets").findOne({ _id: new ObjectId(id) });
        if (!tweetEncontrado) {
            return res.status(404).send("Tweet não encontrado.");
        }
        const usuarioInfo = await db.collection("usuarios").findOne({ username: tweetEncontrado.username });
        const avatarDoUsuario = usuarioInfo ? usuarioInfo.avatar : null;
        const tweetFormatado = {
            _id: tweetEncontrado._id,
            username: tweetEncontrado.username,
            avatar: avatarDoUsuario,
            tweet: tweetEncontrado.tweet
        };

        
        res.status(200).send(tweetFormatado);

    } catch (erro) {
        console.error("Erro ao buscar tweet por ID:", erro);
        res.status(500).send("Erro interno do servidor ao buscar o tweet.");
    }
});
app.put('/tweets/:id', async (req, res) => {
    const { id } = req.params; 
    const { username, tweet } = req.body; 

    
    const tweetSchema = Joi.object({
        username: Joi.string().required(),
        tweet: Joi.string().required()
    });

    const validation = tweetSchema.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const messages = validation.error.details.map(detail => detail.message);
        return res.status(422).send(messages); 
    }

    try {
        
        if (!ObjectId.isValid(id)) {
            return res.status(404).send("ID do tweet inválido.");
        }

        
        const tweetExistente = await db.collection("tweets").findOne({ _id: new ObjectId(id) });

       
        if (!tweetExistente) {
            return res.status(404).send("Tweet não encontrado."); 
        }

        if (tweetExistente.username !== username) {
            return res.status(401).send("Você não tem permissão para editar este tweet."); 
        }
        await db.collection("tweets").updateOne(
            { _id: new ObjectId(id) }, 
            { $set: { tweet: tweet } } 
        );
        res.status(204).send(); 

    } catch (erro) {
        console.error("Erro ao editar tweet:", erro);
        res.status(500).send("Erro interno do servidor ao tentar editar o tweet."); 
    }
});
app.delete('/tweets/:id', async (req, res) => {
    const { id } = req.params; 

    try {
        
        if (!ObjectId.isValid(id)) {
            return res.status(404).send("ID do tweet inválido.");
        }
        const tweetExistente = await db.collection("tweets").findOne({ _id: new ObjectId(id) });
        if (!tweetExistente) {
            return res.status(404).send("Tweet não encontrado.");
        }

        await db.collection("tweets").deleteOne({ _id: new ObjectId(id) });

        res.status(204).send(); 

    } catch (erro) {
        console.error("Erro ao deletar tweet:", erro);
        res.status(500).send("Erro interno do servidor ao tentar deletar o tweet.");
    }
});
const porta=process.env.PORTA;
app.listen(porta, () => {
  console.log(`Servidor está rodando liso na porta ${porta}`);
});