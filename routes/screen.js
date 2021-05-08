const express = require('express')
const router = express.Router()
var admin = require("firebase-admin");
const firebase = require('firebase');
// const firebase = require("firebase/app");
const firestore = require('firebase/firestore')
const auth = require('../auth')
const jwt = require('jsonwebtoken');
const csv = require('csvtojson');
const fs = require('fs');
// import { uuid } from 'uuidv4';
const {uuid} = require("uuidv4");
const {jsPDF} = require('jspdf');
const imageDataURI = require('image-data-uri');

// import { jsPDF } from "jspdf";

// nounce
const braintree= require('braintree');
const gateway = new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId: 'gsvpjdndywph2qhd',
    publicKey:'j96ndx9hj4ny6m6y',
    privateKey:'89afbc59b04d256e6d1f856a48521aab'
    // privateKey:'89afbc59b04d256e6d1f856a48521aab'
});


firebase.auth.Auth.Persistence.NONE;


// var firebaseConfig = {
//     apiKey: "AIzaSyBHd50N3vrsVyjUYUa-753UnpZQesUHHWU",
//     authDomain: "node-web-app-9a6e2.firebaseapp.com",
//     databaseURL: "https://node-web-app-9a6e2-default-rtdb.firebaseio.com",
//     projectId: "node-web-app-9a6e2",
//     storageBucket: "node-web-app-9a6e2.appspot.com",
//     messagingSenderId: "667358112659",
//     appId: "1:667358112659:web:adc2bb76a044eb6c425666",
//     measurementId: "G-4SXFPNDF2N"
//   };
var firebaseConfig = {
    apiKey: "AIzaSyDRKMjyKT0MxQyyVMgZiJKTbkwHFBWDNII",
    authDomain: "generations-a0df0.firebaseapp.com",
    projectId: "generations-a0df0",
    storageBucket: "generations-a0df0.appspot.com",
    messagingSenderId: "725334318354",
    appId: "1:725334318354:web:7b3583d450322127c4e7cb",
    measurementId: "G-J7HELEP255"
  };

// Storage
const { Storage } = require('@google-cloud/storage');
// bucket config
// Creates a client
const storage = new Storage({
    keyFilename: 'generations-a0df0-firebase-adminsdk-axen8-ba8025bd73.json'
});
const bucket = storage.bucket("generations-a0df0.appspot.com");


// Initialize Firebase
   firebase.initializeApp(firebaseConfig);

//firebase.auth.Auth.Persistence;
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE)

const dbs = firebase.firestore();
dbs.settings({ timestampsInSnapshot: true});

// upload-file
let location='tmp/'+'work.csv';


// upload PDF
function upload(localFile, remoteFile) {

    // let uuid = UUID();
    let uuid = remoteFile;
    let path = localFile;
    return bucket.upload(localFile, {
        destination: remoteFile,
        uploadType: "media",
        metadata: {
            contentType: 'application/pdf',
            metadata: {
                firebaseStorageDownloadTokens: uuid
            }
        }
    })
        .then((data) => {
            try {
                console.log('in unsync ---->');
                fs.unlinkSync(path)
            } catch (err) {
                console.log(err);
            }
            let file = data[0];

            console.log('ok thats file name:<><><><><><><><><><>******');
            console.log(file.name + '***********' + uuid);
            return Promise.resolve("https://firebasestorage.googleapis.com/v0/b/" + 'generations-a0df0.appspot.com' + "/o/" + encodeURIComponent(file.name) + "?alt=media&token=" + uuid);

        });
}


router.post('/uploadfile', auth,async(req,res)=>{
// console.log(req.files.filename);
//     csv().fromStream(req.files.filename.data).then((ob)=>{
//         console.log(ob);
//         res.send("okay")
//     }).catch(err=>{
//         console.log(err);
//     })
    if(req.files && firebase.auth().currentUser){
        console.log(req.files)
        var file = req.files.filename
        var filename= file.name;
        var type = req.body.type;
        file.mv('tmp/'+filename,async (err)=>{
            if(err){
                res.send('error occured!')
            }else{
               await dbs
               .collection(type)
               .get()
               .then((querySnapshot) => {
               querySnapshot.forEach((doc) => {
                 doc.ref.delete();
               });
             });
                location = 'tmp/'+filename;
               console.log(filename);
                csv()
                .fromFile(location)
                .then((jsonObj)=>{
                    console.log('this is : '+jsonObj);
                  
                    jsonObj.forEach(async function(item){
                         let d;
                        console.log(item);
                        d=item;
                     await   dbs.collection(type).add({
                        No:parseInt(item.No),
                        question:item.STATEMENTS
                     }).then(()=>{
                        try {
                            console.log('in unsync ---->');
                            fs.unlinkSync(location)
                        } catch (err) {
                            console.log(err);
                        }
                     });

                    });
                   
                })
                res.redirect('/screen/admin');
            }
        })

    }else{
        res.redirect('/screen/admin');
    }
})



// sign-in get 
router.get('/signin',(req,res)=>{   
    res.render('screen/signin');   
});

// sign-in post
router.post('/signin', async (req,res) => {
    let  email = req.body.email;
    let password = req.body.password;
    
    
    try{
        await  firebase.auth().signInWithEmailAndPassword(email,password).then(resp=>{
        
        let currentUser = firebase.auth().currentUser.uid;
    
        let token = jwt.sign({_id :currentUser},'somerandomsecretkeywhichwillworkasmysecretkeyfortestingsite',{expiresIn:'1h'});
        

        res.cookie('jwt_cookie', token,{
        //maxAge: 6000000,
        // maxAge: 60000,
        maxAge: 60*60*6*1000,
        httpOnly: true
        //  ,secure: true
        })
            res.redirect("/screen/admin");
        })
        }
        catch(err){
        console.log(err.code); 
        res.render('screen/signin',{
            email: req.body.email,
            errorMessage: 'invalid Email or password!'
        }); 
    }

   
})


//sign-in post
// router.post('/signin',(req,res)=>{
//     let  u_email = req.body.email;
//     let u_password = req.body.password;
//     const auth = firebase.auth();
//     auth.signInWithEmailAndPassword(u_email, u_password).then(resp=>{
    
//       res.render("screen/admin-panel");
      
//     }).catch(err=>{

//         switch(err.code){
//                 case "auth/user-not-found":
//                     console.log("User not found");
                
//                     break;
//                     default:
//                         console.log("Default");
//         }
           
//     });
//     // change
//     res.redirect('/screen/signin')
// })

// signout
router.get('/signout/:signout',auth,async(req,res)=>{  
    try{
        console.log(req.params.signout);
        res.clearCookie('jwt_cookie');
        console.log('logout successfully');    
        firebase.auth().signOut();
        res.redirect('/screen/signin');
    
    }
    catch(error){
        res.status(500).send(error);
    }
});


// test area end

//admin route
router.get('/admin', auth,(req,res) =>{
  
    if(firebase.auth().currentUser){
        res.render('screen/admin-panel');
    }else{
        res.redirect('/screen/signin');
    }
  
})

 router.get('/new-page',auth, (req,res) =>{
    if(firebase.auth().currentUser){
 res.render('screen/page');
    }else{
        res.redirect('/screen/signin')
    }

    
 })

router.post('/new-page',auth, (req,res)=>{
    if(firebase.auth().currentUser){

     let Qget = req.body.select;
     if(Qget !== undefined && Qget !== '' && Qget !== 'none')
     {   
     dbs.collection(Qget).orderBy("No", "asc").get().then( (snapshot) =>
     {
        let id_list= [];
       // console.log(snapshot.docs);
        snapshot.docs.forEach( doc =>{ 
            // console.log(doc.id);
                id_list= doc.id;
            }) 
        
       res.render('screen/page', { snapshot:snapshot, heading:Qget, id_list:id_list})
    })
     }else{
        res.redirect('/screen/admin');
    }
    }else{
        res.redirect('/screen/signin')
    }

})
// delete using id
router.get('/list/:d_id/:col_name',auth, (req,res) =>{
    if(firebase.auth().currentUser){
let col_name = req.params.col_name;
    let d_id = req.params.d_id;

   //delete doc
    dbs.collection(col_name).doc(d_id).delete({});
   //load list again afterwards 
    dbs.collection(col_name).orderBy('No',"asc").get().then( (snapshot) =>
    {
        let id_list= [];
      
        snapshot.docs.forEach( doc =>{ 
                id_list= doc.id;
            }
        ) 
        
       res.render('screen/page', { snapshot:snapshot, heading:col_name, id_list:id_list})
    })
     
    }else{
        res.redirect('/screen/signin')
    }


    
})

// editing question get 
router.get('/edit/:d_id/:col_name',auth, (req,res)=>{
    
    let col_name = req.params.col_name;
    let d_id = req.params.d_id;
    
    if(firebase.auth().currentUser){
        res.render('screen/edit-screen',{col_name:col_name,d_id:d_id});
    }else{
        res.redirect('/screen/signin');
    }

})

// Edit posts
router.post('/edit/edit',auth, (req,res)=>{

    if(firebase.auth().currentUser){

    let d_id = req.body.tid;
    let col_name = req.body.button;
    let q = req.body.question;

    if(q !== '' && q.length >= 10 && q != undefined){

       
        
        dbs.collection(col_name).doc(d_id).update({
            question: q
        });

        dbs.collection(col_name).orderBy('No',"asc").get().then( (snapshot) =>
        {   
            let id_list= [];
            snapshot.docs.forEach( doc =>{ 
                    id_list= doc.id;
                }
            ) 
                 res.render('screen/page', { snapshot:snapshot, heading:col_name, id_list:id_list})
        })
    }else{
        res.redirect('/screen/admin');
    }

    }else{
        res.redirect('/screen/signin')
    }

  
})


// getting question to upload on firestore
// router.post('/admin',auth, (req,res) =>{

// let questionType = req.body.options;
// let question = req.body.question;

// if(question !== undefined && question !== '' && question.length >= 10 ){
//     var timestamp = new Date().getTime();

//     dbs.collection(questionType).add({
//         question: question,
//         timeStamp: timestamp
//     });

//     res.redirect('/screen/admin');
// }else{
  
//     res.redirect('/screen/admin');
// }
    
// })
// new better version
router.post('/writingType',auth,async(req,res)=>{

    if(firebase.auth().currentUser){

    let questionType = req.body.options;
let question = req.body.question;
// console.log(req.body);
if(question !== undefined && question !== '' && question.length >= 10 ){
    // var timestamp = new Date().getTime();
// find the eg. mySelf collection- and get its doc eg. No and then add index+1 to it. and then add.
// let number ;
// let count = 0;
// await dbs.collection(questionType).orderBy('No').get('No').then((no)=>{
//     number = no.docs;
//     number.forEach((i)=>{
//         console.log('logging questions: '+ i.data().No);
//         count= i.data().No;
//         console.log('count is: '+ count);
//     })
//     number= count++;
//     console.log('number: '+ number);
// })
var len;
let st;
dbs.collection(questionType).get().then(async snapshot => {

 len  = snapshot.size;
 len=len+1;
    console.log(len);
 
    await  dbs.collection(questionType).add({
        question: question,
        No: len
    }).then(()=>{
        res.render('screen/writingType',{type:questionType});
    });
 })



   // res.redirect('/screen/admin');
}else{
    res.redirect('/screen/admin');
}

    }else{
        res.redirect('/screen/signin')
    }


  
})


// redirect to collection type page
router.get('/writingType/:type',auth,(req,res)=>{
    if(firebase.auth().currentUser){
console.log(req.params.type);
    if(req.params.type == 'himSelf'){
        res.render('screen/writingType',{type: req.params.type})
    }
    else if(req.params.type == 'herSelf'){
        res.render('screen/writingType',{type: req.params.type})
    }  
    else if(req.params.type == 'mySelf'){
        res.render('screen/writingType',{type: req.params.type})
    } 
    else{ 
        res.redirect('/screen/admin')
    }
    }else{
        res.redirect('/screen/signin')
    }


    
})

router.get('/request', (req,res)=>{

    res.send('in request..')
    // console.log('request recevied!');
    // const nounceFromTheClient = 'd5dcb2d2-c2fa-0b79-5b59-24fb39f9d378';
    // const deviceData = {"correlation_id":"5eb3c1c3ee2f448cbac494c069f35532"};
    // const amount = req.body.amount;
    // // const amount = '1.0';

    // gateway.transaction.sale({
    //     amount:amount,
    //     // paymentMethodNounce:nounceFromTheClient,
    //     paymentMethodNounce:'fake-paypal-one-time-nounce',
    //     deviceData:deviceData,
    //     options: {
    //         submitForSettlement: true 
    //     }
    // },(err, result)=>{
    //     if(err != null) {
            
    //         console.log(err);
    //         console.log('success: false');
    //         console.log({success:false,error:err});
    //             res.send({success:false,error:err});
    //     }
    //     else{
    //         res.json({
                
    //             result: 'success'
    //         });
    //     }
    // })
})

// Nonce request
router.post('/request', async(req,res)=>{
    if(firebase.auth().currentUser){

    console.log('request recevied!');
    const nonceFromTheClient = req.body.payment_method_nonce;
    const deviceData = req.body.deviceData;
    const amount = req.body.amount;
    // const amount = '1.0';

    gateway.transaction.sale({
        amount:amount,
      
        paymentMethodNonce:nonceFromTheClient,
        deviceData:deviceData,
        options: {
            submitForSettlement: true 
        }
    },(err, result)=>{
        if(err != null) {
            res.json({result:'false'})
            console.log('success: false');
            console.log(err);
                res.send({success:false,error:err});
        }
        else{
            res.json({
                result: 'true'
            });
        }
    })

    }else{
        res.redirect('/screen/signin')
    }

})

// display
// router.get('/setprice' ,auth, (req,res)=>{

// })
// sets the value
router.post('/setprice',auth ,async (req,res)=>{
    let price= req.body.price;
    // let p = parseInt(price);

  if(firebase.auth().currentUser){
    dbs.collection('payment').doc('dollar').set({
        price:price
    }).then(()=>{
        res.redirect('/screen/admin');
    });

  }else{
      res.redirect('/screen/signin');
  }

})

var request = require('request').defaults({ encoding: null });






// jspdf
router.get('/test', async (req, res)=> {
    let questions;
    let answers;
    let docname;
    // import { jsPDF } from "jspdf";
// Default export is a4 paper, portrait, using millimeters for units
const doc = new jsPDF({
    orientation: "landscape",
    // unit: "in",
    // format: [4, 2]
});
// config
// doc.setFont('courier');
// doc.SetFontType('bold');

// let uid= 'FoMMTprFRjfZrfMk490lEtjoKQD3';
let uid= 'ahsan';
let myref= await dbs.collection('biographies').where('userId','==' ,uid).get().then((snap)=>{
    let mysnap = snap;
    mysnap.docs.forEach((doc)=>{
        // docname=doc.data().name;
        questions=doc.data().questions;
        answers=doc.data().answers;
    });

    // answers
    let answer_list=[];
    let url_list=[];
    let if_image=[];
    // answers list
    answers.forEach((answer)=>{
        // console.log(answer.answer);
       answer_list.push(answer.answer); 
    });
    // url list
    answers.forEach((url)=>{
        url_list.push(url.imgUrl);
    });
    // if_image list
    answers.forEach((img)=>{
        if_image.push(img.ifImg);
    });

    console.log(url_list);

    // console.log(questions);
    // console.log(answers);

    // question
    var l=10;
    var ansl=20;
    var qno=0;
    questions.forEach((question)=>{
     
        if(question){
             console.log(question.question);
             console.log(l);
            //  console.log(qno+' '+l);
             doc.text('Q'+(qno+1)+': '+question.question, 10, l);
             
             // let get_length= temp_store.length;
            //  console.log(answer_list[qno])
            console.log(ansl);
             doc.text('A: '+answer_list[qno]+".", 10, ansl);
            // test 
            console.log(  url_list[qno])

        // ////////////////////////////////
        // request.get(url_list[qno],async function (error, response, body) {
            
        //     if (!error && response.statusCode == 200) {
        //         console.log('im here[]')
        //         doc.addPage();
        //         data = "data:" + response.headers["content-type"] + ";base64," + Buffer.from(body).toString('base64');
        //             doc.addImage(data, 'JPEG', 10, 10, 150, 76);
                    

        //             doc.save('tmp/'+"temp.pdf");
                    
        //     }
          
        // }); 
        // test end ///////////////////
            if(if_image[qno] === true){
                console.log('[+] in url_list...')
                // Returns a Promise
                imageDataURI.encodeFromURL(url_list[qno])
                
                // RETURNS image data URI :: 'data:image/png;base64,PNGDATAURI/'
                .then(res => {
                    console.log('[+] '+qno+' in response+++++++++++++++++++++++++++++++++++++');
                    doc.addPage();
                    doc.text(qno +'  '+l+'  '+ansl,10,10)
                    doc.addImage(res, 'PNG', 10,20, 150, 76);
                    l=l+50;
                    
                })
                
            }

             l =l+20;
             ansl= l+10;
             // doc.text('',l,l);
             
             qno=qno+1;
        }
       
        
    })

    setTimeout(() => {
        console.log('[+] saved!');
        doc.save('tmp/'+"mytest.pdf");
    }, 3000);

    // doc.save('tmp/'+ docname+".pdf");
   


});


// doc.text("my life is a joke!", 10, 10);

// doc.save('tmp/'+ "document.pdf");
 res.send('test passed');
});



router.get('/ok', (req,res)=>{
   
// test
let imgUrl='https://firebasestorage.googleapis.com/v0/b/generations-a0df0.appspot.com/o/images%2F1618820025415?alt=media&token=f66f4570-c786-48a8-96e7-4b89b3b0f808';




request.get(imgUrl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
             data = "data:" + response.headers["content-type"] + ";base64," + Buffer.from(body).toString('base64');
                // console.log(data);
             var doc = new jsPDF();

        doc.text(10, 10, 'my life is a joke!');

        doc.addImage(data, 'JPEG', 10, 30, 150, 76);

        doc.text(10, 120, 'please end my life!');
        // let uid= uuid();
        // console.log(uid);
        console.log('joke on you');
        // doc.save('tmp/'+uid+'.pdf');
        doc.save('tmp/'+'joe.pdf');

       
        // let z = upload('tmp/'+uid+'.pdf', uid);
        // let link = "https://firebasestorage.googleapis.com/v0/b/" + 'generations-a0df0.appspot.com' + "/o/" + encodeURIComponent(uid) + "?alt=media&token=" + uid;
        // console.log(link);
            }


      
        res.send('ok boi check now:')

            
});  





 })

 router.get('/joke', (req,res)=>{
    var data = [{
        "Name": "Ronan",
        "Email": "sodales.elit@eratSed.co.uk",
        "Company": "Malesuada Malesuada Ltd"
      }, {
        "Name": "Calvin",
        "Email": "amet.nulla@Vestibulumante.ca",
        "Company": "Donec Egestas Foundation"
      }, {
        "Name": "Kane",
        "Email": "Duis.mi@consectetueradipiscingelit.net",
        "Company": "Arcu Institute"
      }, {
        "Name": "Kasper",
        "Email": "magna.Phasellus.dolor@velconvallisin.co.uk",
        "Company": "Tempor LLP"
      }, {
        "Name": "joke",
        "Email": "joke@velconvallisin.co.uk",
        "Company": "Tempor LLP"
      }];
      
      
    
  
       var doc = new jsPDF('p', 'pt', 'a4');
  //Dimension of A4 in pts: 595 × 842
  
  var pageWidth = 595;
  var pageHeight = 842;
  
  var pageMargin = 20;
  
  pageWidth -= pageMargin * 2;
  pageHeight -= pageMargin * 2;
  
  var cellPadding = 10;
  var cellWidth = 180;
  var cellHeight = 70;
  var lineHeight = 20;
  
  var startX = pageMargin;
  var startY = pageMargin;
  
  
  doc.setFontSize(12);
  
  var page = 1;
  
  function createCard(item) {
  
    //cell projection
    var requiredWidth = startX + cellWidth + (cellPadding * 2);
  
    var requiredHeight = startY + cellHeight + (cellPadding * 2);
  
  
  
    if (requiredWidth <= pageWidth) {
  
      textWriter(item, startX + cellPadding, startY + cellPadding);
  
      startX = requiredWidth;
      //  startY += cellHeight + cellPadding;
  
    } else {
  
  
      if (requiredHeight > pageHeight) {
        doc.addPage();
        page++;
        doc.setPage(page);
  
        startY = pageMargin;
      } else {
        startY = requiredHeight;
      }
  
      startX = pageMargin;
  
  
      textWriter(item, startX + cellPadding, startY + cellPadding);
  
      startX = startX + cellWidth + (cellPadding * 2);
    }
  
  }
  
  function textWriter(item, xAxis, yAxis) {
    doc.text(item.Name, xAxis, yAxis);
    doc.text(item.Email, xAxis, yAxis + lineHeight);
    doc.text(item.Company, xAxis, yAxis + (lineHeight * 2));
  }
  
  
  for (var i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
  
  doc.save('tmp/'+'grid.pdf');
  res.send('test passed!');
 })


 router.get('/oka', (req,res)=>{
     res.render('screen/joke')
 })

 router.post('/pdf', (req,res)=>{

    console.log('triggered!');
    let uid= req.body.uid; 
    console.log(uid);
    res.send('https://firebasestorage.googleapis.com/v0/b/generations-a0df0.appspot.com/o/bd37f096-7ff1-48[…]?alt=media&token=bd37f096-7ff1-48dc-b740-13b5fe16d232');
    // res.sendFile('tmp/'+'aka2.pdf');
 });

module.exports = router

