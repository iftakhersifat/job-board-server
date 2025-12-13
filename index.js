require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express();
const port = process.env.PORT || 5000;
const sendStatusEmail = require("./utils/sendStatusEmail");
// from MongoDB
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// for access env file


//middleware
app.use(cors());
app.use(express.json());
// console.log("MAIL_USER:", process.env.MAIL_USER);
// console.log("MAIL_PASS:", process.env.MAIL_PASS);




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
    app.get('/jobs', async (req, res) => {
  const { email, status } = req.query;

  let query = {};

  if (email) {
    query.hr_email = email;
  }

  if (status) {
    query.status = status;
  }

  const result = await jobsCollection.find(query).toArray();
  res.send(result);
});

    // get specific job by string id
    app.get('/jobs/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await jobsCollection.findOne(query);
    res.send(result);
    });

    // job edit
    app.put('/jobs/update/:id', async (req, res) => {
  const id = req.params.id;
  const updatedData = req.body;

  // IMPORTANT FIX: remove _id before updating
  if (updatedData._id) {
    delete updatedData._id;
  }

  const result = await jobsCollection.updateOne(
    { _id: new ObjectId(id), status: "Pending" }, // Only allow editing if Pending
    { $set: updatedData }
  );

  res.send(result);
});



    // job apply (application)
app.post("/applications", async (req, res) => {
  const { applicantUID, applicantEmail, applicant, resume, id: jobId } = req.body;

  if (!applicantUID || !applicantEmail || !applicant || !jobId) {
    return res.status(400).send({ message: "Missing required fields" });
  }

  const application = {
    applicantUID,
    applicantEmail,
    applicant,
    resume,
    id: jobId, 
    status: "Pending", 
    appliedAt: new Date()
  };

  try {
    const result = await applicationCollection.insertOne(application);
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to submit application" });
  }
});



    // application j gula mongoDB te send korce segula server e show koraite cai
    app.get("/applications", async(req, res)=>{
    const email = req.query.email;
    const query = { applicantEmail: email };
    const result = await applicationCollection.find(query).toArray(); 

    // add job data
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
            application.status = application.status || "Pending";
        }
    }
    res.send(result)
});

    // delete
    app.delete("/applications/:id", async (req, res) => {
    const id = req.params.id;
    const result = await applicationCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
    });



    // add job j gula sever e pathabo 
   app.post('/jobs', async(req, res)=>{
  const jobData = req.body;

  // If employee (not admin), set status as "Pending"
  if(jobData.userRole && jobData.userRole !== 'admin'){
    jobData.status = "Pending";
  } else {
    jobData.status = "Active";
  }

  const result = await jobsCollection.insertOne(jobData);
  res.send(result);
});
// Reject job (admin)
app.patch('/jobs/:id/reject', async (req, res)=>{
  const id = req.params.id;
  const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });
  res.send(result);
});

// Approve job (admin only)
app.patch('/jobs/:id/approve', async(req, res)=>{
  const id = req.params.id;
  const updateDoc = { $set: { status: "Active" } };
  const result = await jobsCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);
  res.send(result);
});

    // delete add job 
    app.delete("/jobs/:id", async (req, res) => {
    const id = req.params.id;
    const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
    });

  // ami j job create korlam oi job e koto jon apply korce (view applications)
    app.get("/applications/job/:id", async(req,res)=>{
    const id = req.params.id;
    const query= {id: id};
    const result=await applicationCollection.find(query).toArray();
    res.send(result)
    })

  // status update jara job apply korce tader status update kora
  // status update for applications
// Status update for applications
app.patch("/applications/:id", async (req, res) => {
  const id = req.params.id;
  const { status } = req.body; // status to update

  try {
    // 1️⃣ Fetch the application to get email and applicant name
    const application = await applicationCollection.findOne({ _id: new ObjectId(id) });

    if (!application) {
      return res.status(404).send({ message: "Application not found" });
    }

    const recipientEmail = application.applicantEmail;
    const applicantName = application.applicant; // name from DB

    // 2️⃣ Update status in MongoDB
    const updateDoc = { $set: { status: status } };
    const result = await applicationCollection.updateOne({ _id: new ObjectId(id) }, updateDoc);

    // 3️⃣ Send professional email if status updated
    if (result.modifiedCount) {
      try {
        if (!recipientEmail) {
          console.error("No recipient email provided!");
        } else {
          const sendStatusEmail = require("./utils/sendStatusEmail");
          await sendStatusEmail(recipientEmail, status, applicantName);
        }
      } catch (err) {
        console.error("Failed to send email:", err.message);
      }
    }

    res.send(result);
  } catch (err) {
    console.error("Error updating application status:", err.message);
    res.status(500).send({ message: "Failed to update status" });
  }
});







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
