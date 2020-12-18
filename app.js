//dependency
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
const server = require('http').Server(app);
const dotenv = require('dotenv');
const io = require('socket.io')(server);
dotenv.config({ path:'./config.env'});

//Config
app.use(bodyParser.urlencoded({extended: true}));
app.use((req, res, next) => {
    req.io = io;
    next();
});

//static files path
app.use(express.static(__dirname + 'public'));

//db
// const DB = process.env.DATABASE.replace('<PASSWORD>',process.env.DATABASE_PASSWORD);
// mongoose.connect(DB,{
//     useNewUrlParser: true, 
//     useUnifiedTopology: true
// }).then(() => console.log("DB connection successful!"));
mongoose.connect("mongodb://127.0.0.1:27017/realtime_chart");

const schema =  mongoose.Schema({name: String});

const Vote = mongoose.model('Vote', schema);

// Render homepage.
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/public/index.html');
});

// Route for voting
app.post('/vote', function(req, res) {
	var field = [{name: req.body.name}];

	var newVote = new Vote(field[0]);
	
	newVote.save(function(err, data) {
		console.log('Saved');
	});

	Vote.aggregate(
		
		[{ "$group": {
			"_id": "$name",
			"total_vote": { "$sum": 1 }
		}}],

		function(err, results) {
			if (err) throw err;
			console.log(results);
			req.io.sockets.emit('vote', results);
		}
		);

	res.send({'message': 'Successfully added.'});
});

app.get('/data', function(req, res) {
	Vote.find().exec(function(err, msgs) {
		res.json(msgs);
	});
});

/*
Socket.io Setting
*/

io.on('connection', function (socket) {

	Vote.aggregate(

		[{ "$group": {
			"_id": "$name",
			"total_vote": { "$sum": 1 }
		}}],

		function(err, results) {
			if (err) throw err;

			socket.emit('vote', results);
		}
	);
});

// Start
server.listen(3000);
console.log('Open http://localhost:3000');