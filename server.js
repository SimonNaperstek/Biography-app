// if(process.env.NODE_ENV !== 'production'){
//     require('dotenv').parse()
// }

const express = require('express')
const app = express()
const expressLayouts = require('express-ejs-layouts')

const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser');
const indexRouter = require('./routes/index')
const screenRouter = require('./routes/screen')
app.set('view engine', 'ejs')
//😎
app.set('views',__dirname + '/views')
app.set('layout', 'layouts/layout')
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true}));
app.use(expressLayouts)
app.use(express.static(__dirname+'public'));
app.use(cookieParser());
const csv = require('csvtojson');
var upload = require('express-fileupload')
app.use(upload({
    preserveExtension: true,
    preserveExtension: 3,
    useTempFiles : true,
    tempFileDir : __dirname + '/tmp/'
}))

// All routes
app.use('/', indexRouter)
app.use('/screen', screenRouter)

app.listen(process.env.PORT || 3000) 
