if(process.env.NODE_ENV != "production"){
  require('dotenv').config();
}


const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema , reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");  //review
const listingsRouter = require("./routes/listing.js");
const  reviewsRouter = require("./routes/review.js");
const  userRouter = require("./routes/user.js");


const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");

const passport = require("passport");
const LocalStrategy = require("passport-local");
const  User = require("./models/user.js");


//connecting database

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const DBURL = process.env.ATLASDB_URL;


main().then(()=>{
    console.log("CONNECTED TO DB");
}).catch((err)=>{
    console.log(err);
});

async function main(){
  await mongoose.connect(DBURL);
}

app.set("view engine", "ejs" );
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname,"/public")));


const store = MongoStore.create({
  mongoUrl : DBURL,
  crypto : {
    secret : process.env.SECRET,
  },
  touchAfter: 24*3600,
});

store.on("error",()=>{
  console.log("ERROR in MONGO SESSION STORE",err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie:{
    expires:Date.now()+ 7 * 24 * 60 * 60 * 1000,
    maxAge :  7 * 24 * 60 * 60 * 1000,
    httpOnly : true, 
  }
};



app.use(session(sessionOptions));
app.use(flash());

//password authentication

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use((req,res,next)=>{
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user;
  next();
})

// app.get("/demouser",async (req,res)=>{
//   let fakeUser = new User ({
//     email: "student@gmail.com",
//     username: "delta-student",
//   });
//   let registeredUser = await User.register(fakeUser,"helloworld");
//   res.send(registeredUser);
// }); 




app.use("/listings",listingsRouter);
app.use("/listings/:id/reviews",reviewsRouter);
app.use("/",userRouter);




// app.get("/testListing" , async (req,res)=>{
//   let sampleListing = new Listing({ 
//     title:"my new villa",
//     description: "by the beach",
//     price: 12,
//     location:"kolkata , india",
//     country: "india",
//   });
//   await sampleListing.save();
//   console.log("sample was saved");
//   res.send("successful testing ");
// });

app.all("*",(req,res,next)=>{    
  next(new ExpressError(404,"page not found!"));
});

app.use((err,req,res,next)=>{
let {statusCode=500,message="something went wrong"} = err;
res.status(statusCode).render("error.ejs",{message});
});

app.listen(8080,()=>{
    console.log("server is listening on port 8080");
});
