const express = require('express')
const cors = require('cors')
const app = express();
const port = process.env.PORT || 3000;
// from MongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// for access env file
require('dotenv').config()

//middleware
app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mojyanw.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // get jobs collection from mongoDB
    const jobsCollection = client.db('jobBoard').collection('job')
    const applicationCollection = client.db('jobBoard').collection('applications')
    
    // jobs api
    app.get('/jobs', async (req, res)=>{
        const cursor =jobsCollection.find();
        const result = await cursor.toArray();
        res.send(result); 
    })
    // get specific jobs id
    app.get('/jobs/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)}
        const result = await jobsCollection.findOne(query);
        res.send(result);
    })

    // job apply (application)
    app.post("/applications", async(req, res)=>{
        const application = req.body;
        const result = await applicationCollection.insertOne(application);
        res.send(result);
    })

    // application j gula mongoDB te send korce segula server e show koraite cai
    app.get("/applications", async(req, res)=>{
        const email = req.query.email;
        const query = { applicant: email }; 
        const result = await applicationCollection.find(query).toArray(); 
        // add data from application collection
      for (const application of result) {
    const jobId = application.id; 
    const job = await jobsCollection.findOne({ _id: new ObjectId(jobId) });
    
    if (job) {
      application.company = job.company;
      application.title = job.title;
      application.company_logo = job.company_logo;
      application.location = job.location;
      application.jobType = job.jobType;
      application.category = job.category;
      application.status = job.status;
    }
  }
        res.send(result)
    })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Job Board Server is Cooking')
})

app.listen(port, () => {
  console.log(`Job Board Server is running on port ${port}`)
})
