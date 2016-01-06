var express = require("express"),
  bodyParser = require("body-parser"),
  passport = require("passport"),
  passportLocal = require("passport-local"),
  cookieParser = require("cookie-parser"),
  session = require("cookie-session"),
  db = require("./models/index"),
  flash = require('connect-flash'),
  methodOverride = require("method-override"),
  request = require("request"),
  app = express();
  var morgan = require('morgan');
  var routeMiddleware = require("./config/routes");
  var nodemailer = require('nodemailer');

// Middleware for ejs, grabbing HTML and including static files
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: true}) );
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));

app.use(session( {
  secret: 'thisismysecretkey',
  name: 'chocolate chip',
  // this is in milliseconds
  maxage: 3600000
  })
);

// get passport started
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function(req,res,next){
  res.locals = { currentUser: req.user };
  next();
});

// prepare our serialize functions
passport.serializeUser(function(user, done){
  console.log("SERIALIZED JUST RAN!");
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  console.log("DESERIALIZED JUST RAN!");
  db.User.find({
      where: {
        id: id
      }
    })
    .done(function(error,user){
      done(error, user);
    });
});

var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAILPASS
    }
});


app.get('/', routeMiddleware.preventLoginSignup, function(req,res){
    res.render('index');
});

app.get('/signup', routeMiddleware.preventLoginSignup, function(req,res){
    res.render('signup', { username: ""});
});

app.get('/login', routeMiddleware.preventLoginSignup, function(req,res){
    res.render('login', {message: req.flash('loginMessage'), username: ""});
});

app.get('/home', routeMiddleware.checkAuthentication, function(req,res){
  db.Post.findAll({
      where :{
        hasWon: false
      },
      include:[db.User]
  }).done(function(err,posts){
    res.render("home", {user: req.user, allPosts:posts});  
  });
});

// on submit, create a new users using form values
app.post('/submit', function(req,res){
  console.log(req.body);

  db.User.createNewUser(req.body.username, req.body.password, req.body.email,
  function(err){
    res.render("signup", {message: err.message, username: req.body.username});
  },
  function(success){
    res.render("index", {message: success.message});
  });
});

// authenticate users when logging in - no need for req,res passport does this for us
app.post('/login', passport.authenticate('local', {
  successRedirect: '/home',
  failureRedirect: '/login',
  failureFlash: true
}));

// Grab it Button - Should send "buyer" the Donor's email contact?
app.post('/grabbed', function(req,res){  
  var userId = req.body.UserId;
  var postId = req.body.PostId;
  var currentUserId = req.body.CurrentUserId;
  // first thing I need to go to the join table and change hasWon to true....
  db.Post.find(postId).done(function(err,post){
    post.updateAttributes({
    WinnerId: currentUserId,
    hasWon: true
  }).done(function(err,data){
    db.User.find({
      where: {
        id: userId
      }
    }).done(function(err,user){

    var email = user.email;

    var mailOptions = {
      to: email, // list of receivers
      subject: 'Congrats! ', // Subject line
      text: 'Great job! you just won post' + post.id  // plaintext body
   };

    transporter.sendMail(mailOptions, function(error, info){
    if(error){
        console.log(error);
    }else{
        console.log('Message sent: ' + info.response);
    }
    });
      res.redirect('/home');
    });
  });  
  });
  
  // then need to find the post that was created
  // find the user who created that post
});

// Like it Button 
app.post('/liked', function(req,res){  
  var userId = req.body.UserId;
  var postId = req.body.PostId;
  var currentUserId = req.body.CurrentUserId;

  db.PostsUsers.findOrCreate({ 
    where: {
    PostId: postId,
    UserId: currentUserId,
    isLiked: true
    }
  }).done(function(err,liked){
      res.redirect('/home');
  });  
});


//Submit New Post
app.post('/posts', function(req, res) {

  var latitude = req.body.latitude;
  var longitude = req.body.longitude;
  var url = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + latitude + "," + longitude + "&sensor=false";

  request(url, function(err,response,body){
    var location;
    var result = JSON.parse(body);

    if (result.results !== undefined) {
      var fullAddress = result.results[0].formatted_address;
      var addressArray = fullAddress.split(",");
      location = addressArray[1].trim();
    }
    else {
      location = null;
    }
    
  console.log("THIS IS LOCATION")
  console.log(location)
  console.log("DID WE MISS THIS???")
  var title = req.body.post.title;
  var description = req.body.post.description;
  var image_url = req.body.image_url;
  var UserId = req.body.post.UserId;
  console.log("IMAGE URL: ", image_url);
  db.Post.create({
    title: title,
    description: description,
    location: location,
    image_url: image_url,
    UserId: UserId
  }).done(function(err,success){
    if(err) {
      var errMsg = "title must be at least 6 characters";
      res.render('new',{errMsg:errMsg, id:UserId, title:title, description:description});
      // question about object above
    }
    else{
      res.redirect('/users/' + UserId + '/posts' );
    }
  });
});
});

// All posts by User Id
app.get('/users/:user_id/posts',routeMiddleware.checkAuthentication, function(req, res) {
  var id = req.params.user_id;
  db.User.find(id).done(function(err,user){
    if(err || user === null){
      res.redirect('/home');
    } else {
      user.getPosts().done(function(err,allPosts){
        res.render('showForUser', {currentUser: req.user, user:user, allPosts: allPosts});  
      });
    }
  });
});


// All likes by User Id. Note use of currentUser being assigned to req.user
app.get('/users/:user_id/likes',routeMiddleware.checkAuthentication, function(req, res) {
  var userId = req.params.user_id;
  db.User.find(userId).done(function(err,user){
    if(err || user === null){
      res.redirect('/home');
    } 
    else {
      db.PostsUsers.findAll({include:[db.Post],
        where: {
          UserId: req.user.id,
          isLiked: true
        }
      }).done(function(err,likes){
        res.render('showLikes', {currentUser: req.user, user:user, likes: likes});
      });
    }
  });
});

// Unlike, resets isLiked to false
app.put('/likes/:post_id/dislike',routeMiddleware.checkAuthentication, function(req, res){
  db.PostsUsers.find({
    where: {
      PostId: req.params.post_id,
      UserId: req.user.id
    }
  }).done(function(err,post){
    post.updateAttributes({
      isLiked: false
    }).done(function(err,dislikedPost){
      res.redirect('/users/' + req.user.id + '/likes');
    });
  });
});


// this route takes us to a form where we edit existing posts
// See below: {post:post, user:user, currentUser:req.user}); these are the only
// key value pairs the view template can use.  Need something? you gotta add it to your logic here.
app.get('/users/:user_id/posts/:post_id/edit', routeMiddleware.checkAuthentication, function(req,res){
  var userId = req.params.user_id;
  var postId = req.params.post_id;
  db.User.find(userId).done(function(err,user){
    db.Post.find(postId).done(function(err,post){
      var description = post.description;
    res.render("edit", {post:post, user:user, description: description, currentUser:req.user});
    });  
  });
});

// this route takes us to a form where we create new posts
app.get('/users/:user_id/posts/new', routeMiddleware.checkAuthentication, function(req,res){
  var id = req.params.user_id;
  db.User.find(id).done(function(err,user){
    res.render("new",{currentUser:req.user,user:user});  
  });  
});

// this route shows us more information about a post by a user
app.get('/users/:user_id/posts/:post_id', routeMiddleware.checkAuthentication, function(req,res){
  var userId = req.params.user_id;
  var postId = req.params.post_id;
  db.User.find(userId).done(function(err,user){
    db.PostsUsers.findAll({
      where: {
        PostId: postId,
        isLiked: true
      }
    }).done(function(err,likes){
      db.Post.find({
      where: {
      UserId: userId,
      id: postId
      }
    }).done(function(err,post){
      if(err || post === null){
        res.redirect('/home');
      }
      else{
      res.render("showSinglePost", {post:post, user:user, currentUser:req.user, likes:likes});
      }
    });  
  });  
});
    
  
});


//Update a user's post
app.put('/users/:user_id/posts/:post_id',routeMiddleware.checkAuthentication, function(req, res) {
  var id = req.params.post_id;
  var userId = req.params.user_id;
  db.User.find(userId).done(function(err,user){
    db.Post.find(id).done(function(err,post){
      //if post.title not null then
      post.updateAttributes({
        title: req.body.post.title,
        description: req.body.post.description,
        image_url: req.body.image_url
    }).done(function(err, post){
      if(post.title === ''){
        var errMsg = "Please enter a title";
        res.render('edit',{errMsg:errMsg, post: post, user: user});
      } else {
        res.redirect('/users/' + user.id + '/posts'); 
      }
     });
    });
  });
});


//Delete
app.delete('/users/:user_id/posts/:post_id', function(req, res) {
  var id = req.params.post_id;
  var userId = req.params.user_id;
  db.Post.find(id).done(function(err,post){
      post.destroy().done(function(err,success){
        res.redirect('/users/' + userId + '/posts');
      });
    });
  });

// logout a user
app.get('/logout', function(req,res){
  //req.logout added by passport - delete the user id/session
  req.logout();
  res.redirect('/');
});

// catch-all for 404 errors
app.get('*', function(req,res){
  res.status(404);
  res.render('404');
});

app.listen(process.env.PORT || 3000, function(){
  console.log("get this party started on port 3000");
});