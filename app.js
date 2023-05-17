const express = require("express");
const path = require("path");
const ejs = require("ejs");
const app = express();
const bodyParser = require("body-parser")
const portNumber = process.env.PORT || 3001;
const env = require("dotenv").config();
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const uri = `mongodb+srv://pokeUser:${password}@cluster0.g5ljk63.mongodb.net/?retryWrites=true&w=majority`;
const { MongoClient, ServerApiVersion } = require('mongodb');
const { readSync } = require("fs");
app.use(express.static(__dirname + '/templates'));


const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  async function searchOpinion(client, databaseAndCollection, pokemon, res) {
    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });

      let filter = {pokemon : {$eq : pokemon.toLowerCase()}};
      const result = await client.db(databaseAndCollection.db)
                           .collection(databaseAndCollection.collection)
                           .findOne(filter);

      let selected = "";
      for (let i = 0; i < result.info.length; i++){
        selected += `<tr><td>${result.rating[i]}</td><td>${result.info[i]}</td></tr>`;
      }
     
      return selected;
      
 
    } catch(e) {
        console.error(e);
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
    }
  }

async function insertOpinion(client, databaseAndCollection, submission, res) {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    let result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).updateOne(
      {pokemon: submission.pokemon.toLowerCase()}, {$push: {info: submission.info, rating: submission.rating}}, {upsert:true});
    res.render("index", {pokemon: ""});
  }catch(e){
      console.error(e);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

async function clearOpinion(client, databaseAndCollection, res) {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    //console.log("Pinged your deployment. You successfully connected to MongoDB!");
    const result = await client.db(databaseAndCollection.db)
    .collection(databaseAndCollection.collection)
    .deleteMany({});
    res.render("index", {pokemon: ""});
  }catch(e){
      console.error(e);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}


//define page handling
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));

app.get("/", (req, res) => res.render("index", {pokemon: ""}));

app.post("/input", async (req,res)=>{
  let pokemon = req.body.pokemon;
  const pokeJSON = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.toLowerCase()}`);
  if (pokeJSON.ok){
    const pokeData = await pokeJSON.json();
    let types = "";
    let name = (pokeData.name.charAt(0).toUpperCase() + pokeData.name.slice(1));
  
    pokeData.types.forEach(t => {
      types += `${t.type.name} `
    })
  
    const variables = {
      pokeImage: pokeData.sprites.front_default,
      name: name, 
      pokemon: name,
      height: pokeData.height/10,
      weight: pokeData.weight/10,
      type: types
    }
    res.render("input", variables);
  } else {
    res.render("invalid");
  }
});

app.post("/opinions", async (req,res)=>{
  let pokemon = req.body.pokemon;
  const pokeJSON = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.toLowerCase()}`);
  
  if (pokeJSON.ok){
    const pokeData = await pokeJSON.json();
    let types = "";
    let name = (pokeData.name.charAt(0).toUpperCase() + pokeData.name.slice(1));
  
    pokeData.types.forEach(t => {
      types += `${t.type.name} `
    })

    let selected = await searchOpinion(client,databaseAndCollection,pokemon, res).catch(console.error);
  
    const variables = {
      pokeImage: pokeData.sprites.front_default,
      name: name, 
      pokemon: name,
      height: pokeData.height/10,
      weight: pokeData.weight/10,
      type: types,
      opinions: selected
    }
    res.render("opinions", variables);
  } else {
    res.render("invalid");
  }
 
});

app.post("/submitted", (req,res)=>{
  let pokemon = req.body.pokemonName; 
  let rating = req.body.rating;
  let info = req.body.info;
  let submission = {pokemon, rating, info};
  insertOpinion(client,databaseAndCollection,submission,res).catch(console.error);
});

app.post("/clear", (req,res)=>{
  clearOpinion(client,databaseAndCollection,res).catch(console.error);
});

app.listen(portNumber, () => console.log(`running at http://localhost:${portNumber}`));


async function makeTable(pokeJSON){
  const pokeData = await pokeJSON.json();
  let types = "";
  let name = (pokeData.name.charAt(0).toUpperCase() + pokeData.name.slice(1));

  pokeData.types.forEach(t => {
    types += `${t.type.name} `
  })

  const variables = {
    pokeImage: pokeData.sprites.front_default,
    name: name, 
    pokemon: name,
    height: pokeData.height/10,
    weight: pokeData.weight/10,
    type: types
  }

  return variables;
}
