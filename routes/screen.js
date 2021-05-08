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


let test='data:image/jpeg;base64,/9j/4QBqRXhpZgAATU0AKgAAAAgABAEAAAQAAAABAAACgAEBAAQAAAABAAAFAIdpAAQAAAABAAAAPgESAAMAAAABAAAAAAAAAAAAAZIIAAQAAAABAAAAAAAAAAAAAQESAAMAAAABAAAAAAAAAAD/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMAEAsMDgwKEA4NDhIREBMYKBoYFhYYMSMlHSg6Mz08OTM4N0BIXE5ARFdFNzhQbVFXX2JnaGc+TXF5cGR4XGVnY//bAEMBERISGBUYLxoaL2NCOEJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY//AABEIBQACgAMBIgACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAAAwQBAgUGB//EAE4QAAICAQMABgYGCAQFAgQFBQABAgMEBRESEyExUVKRBhQyQVOhFiIzYXGBFSM1QlRzorE0NnLBJHSDstElYkaChMIHJkPh8DdEkpPx/8QAGgEBAQEBAQEBAAAAAAAAAAAAAAECAwQFBv/EACgRAQACAQMEAgMBAQEBAQAAAAABEQIDEjEEExQhQVEVMjMFgSJhkf/aAAwDAQACEQMRAD8A+gAADBFP2/yJSKft/kc9ThceWAAcWwAAciLt03OyJuiy6i+XPeuO7iyTCruv1C3OtqlVFwUIRl27d7OmDO1bc3Sa5wuznOEoqV7cW1tuiDTabYaDdXOucZtWbRcdm+p7HZBaRw44l70nBnXW+mxpc+jktm/uLSzsnIsrhj4ttf1vrzuhskvuOkCbVcTIxVj6ldfbhLKpu2e6rU3Bot4PBdLbXp6x47dX1FGU/wAjoAbaEOLdLIx42TqnU5dsJrrRMAaQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZh7ZKRQ9v8AIlO2nwxlyyADogAAMEU/b/IlIp+3+Rz1OFx5YABxbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGYe2SkUPbJTtp8M5csgA6MgAAEVie+5KYJMXFLE0g3G6Jwc+2u5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5BuhuicDtm5HWnvuSAybxiopJmwAGkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADma5qb03Fh0VfSZF01XVDxSYHTB5+WH6Qxrd61GmV22/QOv6j+7cuaXrNWZpLzbl0PRbq5P8Aca7QOoCGrJpuxY5Nc1KqUeal3o1xc3Hy8aOTRYp0y3an2L5gWAc2nXdLyMn1erNpla3sop9r+4tZmbjYNXS5V0Kodm8mBYBRw9WwM+M5YmVC3gt5bdqX4HIxfSrEv1uzH9ZreNKMVTJRe8pv3AelBzYXyeu20+uRcI1J+r8Otf8Au3N87WNP0+ahl5VdU32Rb6wL4IcfKoyqFdj2xtrfZKL3RQl6RaTCmFss6tQs9nffr/IDqgjovqyao20TjZXLrUovdMiz7cinHcsTH6e1vZQctl+IFkHn9LztSs16/Ez3VFQpU1Cv3b/eWtZy8yu3GxMCH67Ik07ZR3jWl7wOsDzWVfqmi341mRmLMx7rVXOLrUXHfu2PSgAVM7U8PTop5mRCnfs5PtNsPPxc+rpcW+Fsfe4vsAsg8Vkaxh6rrkqp6rbThqEVV0MpQ5zZ7OMeMUt29vewNgeeqnqurX5E6Mh4ONVY4Vp1bynt7+sn0PPyrcrMwc5xndiyX6yK25J/cB2geYp/Sup6lqCx9Tlj0493Rxiq4s62HXfgY1s9RznkKP1ucoqPFL8AOiCHFyacvHhfjzVlU1vGS95MAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA876RPhq+i2T6q1kbb/e0eiKeqadRqeHLHvT2fWpLti+9AWzx+D9bQfSK2HXXO29wa962Zcy9L194VlNOqRmlHaLcNpv8y3omPXZoXqdmHZjR4uqdc/fuutgbaP8A5Vx/+W/2PNytsh6BYVdfL9db0ckn1tOT6js06FqVOL6jHVEsNJxjtX9dR7tyxjaBD6Ow0rLnz23+vFbbPffdAcvU6czM0r1On0fnRxS6Kasr+o0XM/T87J/Rmd0Vd1+PWulx7HsnJrr/AD3Jo6XrEoKizVv1K6uca9rGvxJ9S0mzIyKcvEyHRl0x4qbW6ku5gUsS7Eu12qWThW4OocGoxbXGxe/rXab4SX0zz/8Al4E2LpGVLUas7UsqN9lKarjXDjGO5nI0nJWtfpDDyY1c4xhbCUd+SXcBBR/nfJ/5WP8Aci9Eqa8qjKz74Rnk3XyU3JdaS9x0q9NnDX7dRdicJ0qvht1rYrT0bLxcu67SsyNEb5c512Q5RUu9AV9Orjh+k2o4mPtGiVUbXBdkZM09C8LGl6PwslRXKVrkpuUU+R09L0lYPT3W2u/KyHvZa1tv934G2g6bPStLrxLLFZKLb5Jdu4FD0OShp+VVHqhXlWRiu5bnoTmaJps9NqvhOxTdt0rd0uzc6YHn8f8Azrl/8rD+53bJwrhKdklGEVu231JHPr02cNeu1B2JwsqVfDbs2IvSDTMrVKK6cfIhVWpb2Rkm+a7uoCrj8/SDUK8uUXHTsaXKlNfay8X4HojhQxNfqrjCGbgxjFbJKh9XzO3DkoJTe8tutoDz2k1Qy/SPVb8iKnZTNV1qS9mO3uFtcML0xxvVoqCyqZdLGK7duxlvM0i/1+Wdp2Sse+yO1ilHlGf4o207SJ05s87NyPWMqUeCajtGEe5ICpgL/wDOWpfyaz0JzMfTZ065lZ7sTjdXGCjt1rY6YHN1bU46dVGFcHbk3PjTUu2T/wDBrounTwqrLcmSnl5Eud0l2b9y/A570bVo6rfnV5mM5ze0Okqbdce5HSwKtVhc3nZOPbXt1RrrcXv5gUI+jOmZcr73fZerrHP6tv1Yt92w9HnZy1DTMmx5FeNZwjKzrbi12M3WjZuFbb+i82FNNsnN12V8lFvuLOBpEsDByIVZDll3tynfJdsn7wOjTTXRVGqmuNcIrZRitkiQr4Nd9OHXXk3dNdFbSs225MsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAKWVqVGLm42LZz55Lag0urdF0876ZQdeDj50OueJfGwDsajn06bhzyshvo4bb7LdkuNkQysau+p7wsipx/BnB9IeOpZWmadF8q759NZt74Ig0zNngei+dVZL9bgc6uv+kDoWekWKtKyNQphOyqmfB+7l+B1qLOlphZttzipeZ5DJxvVP8A8OlB9UpwjZL8ZSTLVkdcr0hZ0Myqroqeax1WmnFLsbA72pahRpmJLJyXJVxaT4rcswkpwjNdklujzepazfZ6Hx1LHkqrppdi3269n2lzWNTvxqcPHxFGWXltRg5di6utgdo592pxp1ejT3XJyug5qXuWxy8ha5pcYZPrD1CHJdLTGnaW3/t2INalkv0q0/1Ph00qZcXYuqK79gPVg8xdk6ppGp4UcvLjlY+Xb0XscXFvsPTgAefyc3O1DV7tP062OPDHS6a5x3e79yMUZufpuq0YWoXRyKcnqquUeLUu5oC3rGrywLqMbHoeRlZG/CG+y2XvZewrMizGjLLqjVc/ajGW6R5bVcPMl6W4UY584ysjOVcuji+jXcesx4TqohC2122RjtKbW3J9+wEeRm4+NbTVdYozulxrW3tMg1PU4adPEhKuU/WblUmn7O5wPSPFy3renNZ0krb9qlwX6rq+Zv6TwyMfH0iLn6xkQyo7Sl9XnLdAesB5bVLta0jGWoWZtd8ItdJSq9l+TL+satZjrFow+Dyct7VufZFd7A7QPL5mXqOiKrKyM6vMxnNRtgoJOKfvWxZ1rUcqGpYmnYlsMd5CcndJb9ncB3wcPEWs4mo105FnruJYnvcoqLrf3keXqGXm6tbp+BfDGhjpdLdJbvd+5ID0APP6fn5mNrC03OvhkK2HOq6K2fV2po74HP0bVYatizvhXKtRscNm+46J4jQdWWm6HOFcOmy7smcaaV2yZ3HlZOj6HZmanf096XJxSSSb/dQHbB5hvXJYXrvr9MbOHSLGUFt2b7b9ppla5kPB0zVqpuGNKxQya9uwD1QOHr+bkQvwMLBtdd2Tbs5JJ7QXb2mcTMyIekuXg5FvKuVcbaVt2L3gdsHmdP1rIv8ASa+icv8Ag5uVdP8Aqj2lvFzr7vSDOi7dsPFrjFx2/e7WwO2DzOFfquuwnl42VHCxuTVUejUpS279y5oupZNuVk6fnqPrWPs+cVspxfvA7QPIaFfrmrVOx5sK6armnJwTlNL3FyzL1HVdWycXT8iONj4r4zs48nKXcB056nCGs16c65OU63Zz93UdA8ljRzK/TOiGdZCycceW1kVtyRZtzM/UtaysDFy4YcMbb91SlPf8QPSA5OkT1SN9+PqMY2Rh115EVtzX4HTsk4VylGLk0m1Fe/7gNwedro9IMup5E8uGHZ1uOOoKSX4sYms5Gb6K5Wb1V5NUJptLskl2geiB5zQZavmU4udl5kI4/Dd1qHXP72yPFzNQ1vpMjFzYYWNGTjWnBOU9ve9wPTg42g6jflTysTM4PJxZ8ZTh2TXuZP6Q5NuJomVkUT4WQjvGW3Z1oDpAoYN9luhY+RZLe2eNGcpd7cUzj4WtZNXofLUrn018d+1dvXsuwD04PMRWvPBhn4+dVlSlFT6BQXF7+5Mu6tq92JhYqrpUczKahCub6oN9u/4AdoHl83J1XSKFnW59WZXGS6WpQUdk+4t6xqmR02Hhaa49PlrkrJLqhDvAu6zqkNJxY3zrlYpWKGyfedA8T6TY+p4+nUxy8uGVTK6H1nBRlFntQObrWrfoyFMYUu6++fCutPtZY063Ltx+WbRGi3f2Yy5LY836R4uVLXdO45soq23atcF+qe3zOnqWdk6Pp1FKn63m3TVdcprbk337AdwHmsuOu6diyzXnV5PRrnZS60lt79mNb1m5aFh52nzcZXWQ2Wy60/cB6UiyL68aid10uFcFylLuRR0ujU652WajlQs5r6tcIbKBW9KqL7NIvnVkuqEK25wUU+YHRszqo6ZPPrfSVRqdqa/eSW40vOjqOn05cIOCtW6T9xwtPoyKvQ2+duVK2E8KThBxS4fUZBoWNrGToOM8bMrxa4xfRxUOXLrfaB68Hn9M1+U/R+7PzYpWY7lGaj72iCmWtZuHHNjn00ynHnXj8U1t7k2B6cHN0HU/0rpleS4qM/ZnFe5o6QAAAAAAAAAAAAAAAAAp6tievaXk4227sraj+Pu+ZcAHjvQ2U8+/1y1PbGohjw3IPSSmyGs2YNaahqcqt9u9PZnssfGpxouNFMKk3u1CKSb/ACM2Y1FtsLbKa52V+xOUU3H8H7gON6XwUPRjIjFbKKiku7rRbyv8s3f8m/8AsL99FWRU6r64W1vtjOO6Zl1VyqdThF1tceO3Vt3bAeJyP/6bU/8A8/fZ09eUsXI0nVHFypxnta0t+Ka23O88HFeKsZ41LoXZU61x8uwm4R48eK47bbAcXL9JcKEK44U45l9klGFVb3bIc3/Omnb/AAJnapwsXHm50Y1NUn2uEEm/I2lj0zvjdKqt2wWym4rkvzA4XpX/AIzRf+dh/dHoiO7GovcHdVCx1y5Qcop8X3olA8vRkV6L6SZyzZKunMasrtl2b9xjMyata1/T6sGatrxJ9LbZHsXcj0t1FWRDhfVCyHhnFNGKMenHhwoqhVHuhFJAcLU/85aV/KmeiIZ49M743SprlbDqjNxTa/BkwHmvSmyNGoaRkWvjVXkbyl3GvpJdXky0a2manXLNg4yi+p/WR6O6mrIrdd1cLIPtjNbojlhYsq64PHqcanvWuC2g/u7gOT6af5byfxj/AHOb6R4lbelZ2VS7sOqChdFe5NLr6j1d9FWTU6r6oW1vtjOO6Zvwjw4cVx22226gPIzxvRJdHGmmORZbJRjXVOcpPf7tzoa5kafHKpw9VxV6tOP1L5dkZdx2KcHEx5udGNTVN9soVpN+RJdTXfW67a42QfbGS3QHlMO6rF1/ExdGzLMjGsT6arnzjBd/3EGThadR6S5f6apXRZP16bZSaX3rqPX4+Jj4qax6KqU+1VwUf7G19FWRXwuqhZHunFNAcDS6PR+OqqOmUKd1ceXS1ylKMfz32PRkePj040OFFNdUfDCKivkSgfPtF0SeVpluoYc5Rzqr5dF3dXuOvqF8vSP0Vu6CDWTW07KfepL3HpKMajGg4UVQqi3u1CKit/yFeLRVbO2umuFlntyjBJy/F+8DyGLD0SswY33V112cfr1ysnyT8ztR07FzfRqWLi0Soqug3CE994v3dp0pYGHO7ppYtErfG605eZBquRnUVR9QxFkWS3XXLZR+8Dz3oo79RzllZUWnhUrHin4veWvSuyemZGJqtS3danVL809jq6Fp8tO0+NVsud05Oy2XfJ9pdyMenJr6O+qFsN9+M4poDy+Rgz0z0d0/JUW7sKcbrO/63tlz0dxpZOiZN9n1bM+dk2+5PdI71lcLa5V2QjOEls4yW6aFdcKq411wjCEVsoxWySA8z6N6pjabp36O1C2ONkY0mnGb25LdvdEmiSeo6/m6pVFrGcFVXPx7drO7kYWLlNPIx6bWuxzgpbeZNGEYRUYpKK7EgPO+hH7Iu/5iZDp2XTouualj501THJt6aucuyW+56XHx6MaDhRTXVFvdqEUlv+RjIxcfKio5FFdqXunBS/uB5mjOoz/TWmzGk7K448o812N/cb512j5mpX4+r0xxr6n+rtlLi5x70z0UcTHhZCyNFUZwjxjJRScV3IZGJjZSSyKKrkuzpIKX9wOB6N5NktSzMejJsysCpLo7LHy2fdud7PndXgZE8aPK6NcnBd8tuokqqrorUKoRhBdkYrZEgHhMCeg5OnxyNWunkZr9uNk5OXLuSRNoW30H1KKTW3S/Vfu6j1vqWKr+nWNT03xOC5eZt6rR0c6+hr4We3HitpfiBztAh0no1iQ7OVO3meZ0bC0SmuzE1umFWZTJpuycoqa711nuaqq6a411QjCEVsoxWyRpkYeNlbesY9V23Z0kFL+4HL9Hq9JTvs0mhwhvxlZ17T/Ddlj0jpnkaDmV1R5Tde6S9+3WdCEI1wUYRUYrsSWyRuB5jB9INOr9HKK3kRd0ceNfRL2uSiltsQ6LkvE9CYW+rPJjHlzr747vc9JHAxI3O6OLSrX2zVa3f5klGPTj1KqiqFda7IwjsvIDxmdPRMfBnmaPmyxsl9cK6pv6z7nEsekNFuRpul52djuyNW0sqte5NLc9PHAw4XdNDEojb41WlLzLDW/b2AePsp9EY1RnXVC6U9lGuuc3N7/duWdX46TrOm58oOOHXX0Mntv0fcd+rAxKbXbVjU12PtnGtJk1lcbIOE4qUX2qS3TA8j6W6vhZmDTRi3xun00JNw61FfeewKv6NwVV0Sw6Oj334dGtt/wLYHnfSD9t6L/OZn0qrsr9R1CEHOOJcp2RS/d953Lcem6yFllUJzre8JSju4v7iRrcDz2rekOn2aTdHGyI33X1uuuuHXJuS27DnaphzwfRXTMe1bWQvhy/Fts9VXg4lNrtqxqYWP8AfjWk/M3vx6ciKjdTCyMXySnFNJgSnP8ASCLnoWbGK3fQy2X5HRAHmcHMx8j0LtqqtjKdWFKM4rtj9Rl70U/y3hf6H/dnQhg4sI2RhjUxVvtpQS5fj3klNNdFUa6a41wj2RgtkgPHadh253opqlFK3slfNxXe00zXTqvRazT4TzKq6b4R2thOc01JLr6tz2VGPTjRcaKoVKT3ahFJNkdmBiXWq23FonYv35VpvzAraFDDhp0JYFE6KJtyUZb7v7+s6RgyAAAAAAAAAAAA0lJJGZPZGkI83yfZ7kBKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGAIp/Wkoe73kxFDrtf3IlAAAAVsrOx8OVUcixQd01CG69qT9xZPM+mViplpdrjKShlxk1Fdb22A9MV8vNx8JVvIsUOkmoR3T62zi5GvZ+ElkZulurEbSclPeUPxRp6V2Rto0uytqUZZVbTXvW4HpQczVtWjpzpprqlfk3vauqPa/vKi1zLw8iqGrYKx6rZcY2wnyin94HeBzNY1aOnKquFUr8i58a6ovrkVI63l4uTTVquCseF8uELIT5JN+5gdX17H9e9S6VesKHPht7u8snm+Sj6eTbaSWF7/wAS5p+r2alnWxxaU8Kvqd7fty+4DsAgy5Xwx5yxoRsuS+rGT2TPLejVuoPWNRTx6uEsj9e+k9h/d3gewBw8jWsiedbh6XiLJsp6rJylxjF9xNpmsPKyrMLLx3jZkFy4N7qS70B1ith5uPmwnPGs6SMJOEns1s0WTxfo7nZtVOZTgYXTzWROTnOajFAe0BytH1j9ITuoupePlUP9ZU3v+ZXnrWVk5N1WlYSyI0y4ztnPjHfuQHdBzdH1WOpQtjOqVN9MuNlcn1xZdyLq8eid1slCuC5Sb9yAlB55a7qN1DzMXS3PDX1k5T2nKPekT5Wty/QkNUwaVdV1OcG9ml7/ACA7QOLn69GujD9Qgsi7Ma6KG+2697ZNqmrfo/oKY0u/Lve0Kovbf/8AYDqA4Net5WPnUY2qYSoWRLjXZCfJN9xvqmtW4OqUYdWK73dBySi9nuB2webt9I8rT8iNeqafKmNm6rlXLnyfcbZGv52Bwuz9NdOJKSi5qzk4b96A71l1dTip2Ri5vaKb23f3EhwtfuohmaUrceNzsyEoScmuD6uszqWuWYOrVYMMWV7srco8H1tgdwHBp1vLq1KnE1LBWP0/VXOM+SbLWp6t6pkVYmNRLIy7VvGtPbZd7YHUBxcTWchahXhaliLGttW9coy5Rlt7jGbrV0dReBpuL61fBcrN5bRgB0p5uPDMhiSsSvsTlGHvaRZPJV5V+T6Y4aycaWPbCmacW90/wZ6uW/F7dbA5+pa5habbGm+U5Wy61XXHlLyL1NquphZFNKcVJJ9vWeOxbtVfpVlT9Tx5ZKqipRdnVFfcz0Gqav6nkVYmNRLIy7VvGtPbZd7A6oOFTreRTm1Yuq4axne+Nc4z5Rk+4arrt2BqteFViPIlbXyiovr3A7oKmnW5V2Kp5lCotbe8FLfYg1bVYacqoKuV2Rc9q6o9sgOkDhQ1rLx8uinVMJY8b5cYWQnySl3Mnv1WzF1qrDyKlGi9bVW79svCwOsDk42rTzNZuxMepSx8dbWWt/vdyILNbysjLuo0rCWQqJcbLJz4x37kB3QcvStXjndPVdU8fIx/tK5Ps+/8CnHXM3M52aXp/T48Hx6Sc+PPbwgegBxoa7C7Qr9QprfOiL51TezUl7mVatc1PJw68vG0lzq4KUt57OXfxQHowcOWq26lonrWm0ws5JqyNkuPDq6yp6FWZb0mqE6q1jLk42KX1m9+4D0dV1d0XKqyM0ns3F79ZIef9GMrFWj35EKIYtNds+SUm11bbvdmKtc1HMreRgaX0mL+7Kdm0p/ggPQg5VOtVZWi36hRF8qa5ylXLqcZRW+zOfi69qWdhQyMPSukjt9Zyntu/wD2gelBy9P1qjN0iWotOuFabsi+2O3ac9a/qVmL69VpfLD25Juxc3Fe/YD0baS3fUkQ05mNfJwoyKrZLtjCabXkc3Jqh6SaTRKi+VePY1KaXbJe+Jx9f03C06zB/RdSqzndFQjB9cl79wPYgwZAAAAAAAAAAAAAAAAAGDJgCOv7WX4EpFX9rL8CUAAAB5r0vnGu3SZzkoxjmQlJv3JNHpSjqWl42p9D60nKNM+aj7m/vAq+lFtVfo7luxraVfGP3t9hxtShOvQdBhZ1TVtKaZ1YeiumxuhOUbbIwe8Kp2Nwj+Rf1HTaNRVKvcv1Nisjxe3WgORmNU+muFZc9q7KJQrb8Rt6bSh+gpUtcrbbIxrj72zr6hpuLqVHQ5VfOKe6fY0/uKeJ6O4OLkxyP1t1sPYldY58fwAoZe9HpVpUsl9UqJVpvxnX1S/BphUs6MJqdijXGUeW8vdsiTUNOxdSo6HKr5x7V7mvwKmH6PYWJkxyP1t1sPYldPk4/gBwNcwL9S9LbMXHu6HniLnLvW76jr+i2ZF4j062pU5WH9SdaXb/AO78zo/o2haq9R+v0zr6Pt6tjW7SsezU6tQTnDIguLcHspLuYF8856NftXW/+aPRnM/QmItU/SEOkhc3ykoz2jJ/egOf6JyVdup49j/4iOVKU0/en2MxlNXem2GqeuVNEul292/YdHP0LDz8hZE1ZVftt0lU+MmvxJdO0nE0yMljQalPrlOT3lL8wLx5r0Msi8bNrUk5RyZtruPSnC+iunJScXdCcpOTshY1Lr924FfEfTemmdKhpxhjxhNr3SOZ6K4GVfgWV1ardi2VWSjZTGCfFnq9M0vF0ul1YtfFSe8pN7uT+8rZno9hZeS8n9bRdL2p0zcHL8QItG0yGFqOXc9QeVkWJK1NJNbfgbelkJz9HcxV9b4p7LuTW5d07TMXTanDGhx5PeUm93J/ey00pJprdP3AeZ0rTsvJ0zHtx9cvjU647RVcdo9XYXNKow9G0Kx+tLIxouU5WdW34CXorpznJwd9Vc3vKquxqD/Is5Wh4eTg1YTjKvHre/R1vZS/EDy/ozww9WrtyaHXVmJ+p8nvwW/snf1nUMmGpYmm4k4VWZKbdslvsl3F7UdKxtRxY0XKUYwalBwezi13Guo6NialTXXlKUpV+zYntJfmB5zXMfJxtQ0lZOpSynLLg1CUIx2+suvqOjnf510/+RMnh6LabFwk42TthNTVspty3X3l+3TabdSpz5OXTVQcI7Pq2YHH9K1vmaL/AM7D+6JfTX/Ld/4x/udLP02jPtxp3Oe+NYrYcXt1ozqWn06nhSxb3JQltvxezA4npB/iPR//AJiP+xLkf53xf+WkdPL0vHy54krHPfFmpw2fvXebT06mep1575dNCDguvq2YHJ9Jf2pon/NFPNots9M5QjmTxJW0Lo5xiny27V1nos3Tac2/GttcuWNPpIbP3mNS0rE1OuMcqvdwe8ZJ7Sj+YHKnoslqGHbm6zZbOuzlVCcYrk0Y0Fqv0h1mqxpXSsU4/wCkv4Og4eFkesJ23XLqjO6bm4/gbaloeHqNsbrVOu6PUrKpcZeYHOy5xl6b4UU1yjRLdHpDk4no9g4eZXlUqatgmuTlu5b951gPO4P+ddR/kwNYNU+nFnTbJ3Y6VTfv27UderTqatSuz48+mtioy3fVshqWl4up1xjkwbcHvGae0ov7mByPTJqyjCxq/wDEWZMOjXvNsn/O+J/y0i9g6DhYOR6xFWW3disum5NfgTz06mep16g3LpoQcF19WzAunkvSGqyXpPp79ZliqcJQhakntLu6z1pU1DT8bUsfocqpTh7u9AcTO0O22NUc/XLXBWJxU4RW8iT0ulCzEpwoR55d9i6BLti1+8WsX0dwcfIhc3ddOt719NY5KH4FpaXR+lHqEnOV3HhHk+qK+5Acv0QlXXg2YUodHl0Tavi+tt7+0a+hL6PTsjHs/wARVfNWL7zrPS6Fqn6Qi5xuceElF9Ul96K+b6P4WZkvJfS03SX1p0z4uX4gRZ9mLk1apRhxi82NEozlGOze6ey3OT6N4OTl6NTPG1m6mKTi6oQj9RnpdP03F02l1YtfBN7yb63J/eUr/RrAuvndDpqJWdc1TY4KQHOt0+rB0DWOjzfWp28pWS6vqy/I6vo/ZD6PYU+S4xpju9+zZEGq4WPp/ovm0Y1arrVTKWlejmDmaPiWSd0FZVGU412NRm9vegM+i+09L1O6C2ptusdf4dZa9C/8uY/4y/udjGxacXGjj0VqFUFsoopadoeJpmRO3F6SKn+5z3ivwQHmtOrss9B9SjV1z6Wb2+5cWz02g3VW6Fhyqa4KmMX9zSW5LpmmUaZjyox+ThKbm+T362UbPRbTpzk4dNVCb3lXXY4wl+QHK09xtwPSXIq+ws6Vwa/e+rI7Hor/AJbwv9L/AO5l1adjQ06eDVWq6JQdfGPuTWxtgYVen4deLS5OutbLk92B5z0dljw9H9QeZ/h+nsU+r3PYlqw8zC01ZGk6l0mIq+khVfHdce3tOzgaVjYGNbRUpSrtk5SU3v29pQfonpz3infGp9tMbXw8gLuiah+k9KpyujVbmuuK9xW0zSrK9SytQzZRsvsm1U0/Yh3HUooqxqIU0wUK4LaMV7iDA06jT+m6Dn+usdkuT362BcAAAAAAAAAAAAAAAAAAAwZMAR1/ay/AlIq/tZfgSgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZMAR1/ay/AlIq/tZfgSgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwZMAR1/ay/AlIq/tZfgSgAAANJWRi9m9mblTI+1/ICfpq/F8h01fi+RUBaS1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLW+mr8XyHTV+L5FQCi1vpq/F8h01fi+RUAotb6avxfIdNX4vkVAKLXI2Rk9k+s2KuP8Aa/kWiKjr+1l+BKRV/ay/AlAAAAVMj7X8i2VMj7X8gIwAVAFLUNSqwI/W+tY+tRRz43axlrlVCNMX2br/AMgd0HCldrGIuVkI3RXbsv8AwdDT9Sqzo/V+rYutxYF0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEmP8Aa/ky0Vcf7X8mWiKjr+1l+BKRV/ay/AlAAAAVMj7X8i2VMj7X8gIyO+2NNE7ZdkIuRIUtYTel3pdvH/dFRz9Ixnm32Z+SuTctoJ+47pz9Dael1bdq3T82dADDRw9Xxnh3wz8b6rUtppe87pz9caWl279r2S80BcotjdRC2PZOKkiQpaOmtLo38P8Auy6Bw6fSPFt1Z4yug6XGKhNJ/Wm32F/I1fAxp2QvyoQlXspJ+7cpUf5syf8Alof3ZFh49N3pNqU7K4zlGMFFyW+3UB2KMujItsrpsUp1dU47dm4ry6bb7aa5qVlWynFL2dzk5U4aZ6QQyZNRpyanGb7pR6/7E3o5VJ4M8uxbWZljtf3J9gHXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABJj/a/ky0Vcf7X8mWiKjr+1l+BKRV/ay/AlAAAAVMj7X8i2VMj7X8gIzS2uNtU65LeMk4tfibgqOBp2Q9MyrMLKfGDe8JvsO8nut000ytm4NObXxtj1rsku1HMjpupYv1cXKTh7k2B3G9lu+pI4Oo5D1PJrwsV8oJ7zmuw2em6llfVyspKHcmdPCwacKvjUut9sn2sCequNVUK4raMUor8jcADnZGl9JqMM2rInTYkozUV1TivcS4+AqdQyctTbd/FOLXZsXABwPSXoM+FOnQnGWTO2O0U+uC97Z3Kq41VQrgtowSil3JGscemN0ro1QVkupzUet/mSgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASY/2v5MtFXH+1/Jloio6/tZfgSkVf2svwJQAAAFTI+1/ItlTI+1/ICMAFQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASY/wBr+TLRVx/tfyZaIqOv7WX4EpFHquf3olAAAAVMj7X8i2VciLdu6TfV7kBEDPGXhl5DjLwy8iowDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDAM8ZeGXkOMvDLyAwDPGXhl5DjLwy8gMAzxl4ZeQ4y8MvIDfH+1/Jlsq0Ras3aa6veWiKhsXGSkvd2kqe/X7jEluiOMujez9n3MCYAACrfKUbdk2ur3MtFTI+1/IDTnPxS8xzn4peZgFRnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAGec/FLzHOfil5mABnnPxS8xzn4peZgAZ5z8UvMc5+KXmYAEtEm7ett9XvLRUx/tfyZbIoayjubAAAABUyPtfyLZUyPtfyAjAMNpLd7JLrbZUa2WQqg52SUYrtbfYcy7X8WD2gp2feuoq7Wa3mSXJwxa35nYx8PHxo7U1Rj9+3WwKNOv4s3tNTr+99Z067IWwU65qUX2NMiyMPHyY7XVRlv79utHH/WaJmRXJyxbH17+4D0AMJ7rdNNPr3MgAAABghysynDjCV0uKnNQj1drYE4BgDIKGFnyyc3Modaiseaimn7W63L4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASY/wBr+TLZUx/tfyZbIoAAAAAFTI+1/ItlTI+1/ICMp6tN16ZfJdvHbz2RcIM2j1jEtp98o7L8Soq6FBQ0yuSXXNtvzaOicf0fyd6JYs+qypvqZ2ABztdgp6ZZJrrg1JeaOicf0gydqI4sOuy1rdIC5pM3PTKJPt47eW6LhBh0er4lVT7Yx2f4k4HCj6xq2o5cFlXY+PjS6NKmXFyl+JaxK9Qx68mq22Nqj10W2Prf+r8yB05mm6hk3Y2M8mjJam4xkk4y/M2ePqGbp+bHJlGmV8eNVa/c/FgcjLzIY+JO6GuWW5sOvjF71t923YWNer9awdPy3bdB3Tp+pGf1Vv17/iZnVqdmivToadCpxq4Obmtpbd34lnOwMm3QcKqutO/H6KTg328UuoDfPndjvC0zGyLFO+TTum+UlFbskrws3Dy6ZU5d2RRJ7Wxunvt96NM2jLyo4mfTT0eTjyb6Gcu1PdbbklV2p5WVU5Y7xKIdc+UlJz+4Dn4mLblazqsY5VlFatW6rezb27y7od16yM7Dvuld6tYlCc+1prfrN9MxbqdT1K2ytxhbYnBt+11DTca6nVdStsg412zi4Sb9rZIDqgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACTH+1/JlsqY/2v5MtkUAAAAACpkfa/kWypkfa/kBGACo5Oo6ZOV3rWHLheutpPtII61kYy45mLJSXa11bndMNbgcOWt5GSuOHiybfvfXsT6dpk43etZkud760m+w6uxkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACTH+1/JlsqY/2v5MtkUAAAAACpkfa/kWypkfa/kBGACoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJMf7X8mWypj/AGv5MtkUAAAAACpkfa/kWyte4qzZw36u8CEG3KHw15jlD4a8yo1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNQbcofDXmOUPhrzA1Btyh8NeY5Q+GvMDUG3KHw15jlD4a8wNsf7X8i2VqJRdmyht1d5ZIoAAAAAFTI+1/ItlTI+1/ICMAFQAI7Lq6vtLIQ/1S2AkBHXdXb9nZCf8ApluSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASY/2v5MtlTH+1/JlsigAAAAAVMj7X8i2VMj7X8gIwCvnXPHwrrV2xjuvxKjnZ+o3W5HqeB12LqlLuMVaDGX1sq6c5vrezN/R/HUMR3vrna+19x1wOLboEY/Wxb5wmutbszgajdVkep5/VY+qM+87JyPSDHU8RXpbTqfau4Drgr4FzyMKm19so7v8SwAIa8qmzIsohNOyrZzjt2bnBx8jUn6S2RlTX9lDnBWPaMd+1feK8jIq9ItRjjY/TWSUO17RXUgPSA5eFqs8iOVC+josjGW84b7p9W5FpOrZWowrueGqsdpuVjl3dwHZBxYatmZcZX4OCrcZNpSlPZz27kb265BaZTn0w5VysjCxSfXDv8AIDrg5mqavHT8vFpcFJXS2m/Aupb+bJbs6UNUowoVqXSQc5Sb9lIC8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJMf7X8mWypj/a/ky2RQAAAAAKmR9r+RbKmR9r+QEZU1Wt26dfGK3fHfy2ZbMPrWxUc3QLVPTYRT64Nxa+Z0zz9td2i5crqYOeNPtivcdPH1XDvjurowfvU3tsBdObr9qr02cW+ubUUvmS5Gq4dEd3dGb7oPfc5lULtay43WxcMaHZHvA6ulVurTqIyWz47+e7LZhdS2MgcJXV0ellvTTjDpMeEYcn7T3Zvp3+Y9T/AAh/Y6tuPTdOE7aoTlB7xco78fwMxoqhbO2NcFZP2pJdctu8DiV/trWP5Mf+030SqV3onXVF7SnTOKfdvyOuqKVZOaqgpWLacuPXL8TaqquitV01xrhHqUYrZIDiaJqeHjaRXTk3Qotx1wsrm9mmiLTsKeZoOcpQcFmWWWVxa7N+uJ3LMLGtsVlmPVOa7JSgm0TJbLYDyun1T13CyrbU1LoI0Qb8aW7f/wDkW/R62eo5N2fbFqSrhSt+9L63zO5VTVTFxprjCLfJqK23bFVNVKcaa4wUnyaitt2/eBIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJMf7X8mWypj/a/ky2RQAAAAAKmR9r+RbKmR9r+QEYAKjEkpLaSTT6mmc+7RMO2W6rcG/AzogDnVaJhVS3dbm142dCMVFbRSSXUkvcZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEmP9r+TLZUx/tfyZbIoAAAAAFTI+1/ItlTI+1/ICMAFQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASY/2v5MtlTH+1/JlsigAAAAAVrop2buaXV2bFkqZH2v5Aa8Y/EXkOMfiLyNQVG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBtxj8ReQ4x+IvI1AG3GPxF5DjH4i8jUAbcY/EXkOMfiLyNQBNQkp7qafV2bFkqY/2v5MtkUAAAAACpkfa/kWypkfa/kBGACoApahqVODH631rH2RRz436xlrlVCNMX2br/wAgd0HClfrGIuVsI3RXbsv/AAdDT9SqzofV+rYutxYF0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEmP9r+TLZUx/tfyZbIoAAAAAFTI+1/ItlTI+1/ICMjvtjTRO2XZCLkSFLWE3pd+3bx/3RUc/SMd5t88/J+s3LaCfuO6c/Q2npdO3u3382dAAcLWMd4V8M/G2i1LaaXvO6c/XGlpd2/v2280BcosjdRC2PZOKkiQpaOmtLo38P+7LoFXM1HDwdvWsiFTfub7SDPy4W6JlZGJcmlVJxnCXY9ippNcMjV9TuuSlbC1Vx3Xsx2M52JjYun6q8eaTtqlKdafsvbuA3wNYwq8HEhk5sFfKqDkpy622l2nUturpqdttkYQXW5N9SOEsTHXob1Uw3eL0je3bLjvuU8qd12LoVMYRtU4KThZLaM2o+8D0OJqeFmyccbJhbJe5M2zNSw8HZZWRCpvsTfacieLqV+o4eRLEx6Ohn9aULOtxfaiXSa4X6vqd10VK2FqrjuvZjsBZ1PMhboWVk4d6aVbcZ1y7DfGzqsfR8S/Lu48qobyk93JuKKWp4eNi6bqsseaTshynWn7L/A5+jTldnYS1KDglRH1SLf1Xsl1/iB6xPdbrsfWt0ZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkx/tfyZbKmP9r+TLZFAAAAAAqZH2v5FsqZH2v5ARmltcbap1yW8ZJxf5m4KjgabkPTMmzCynxg3vGTO8nut11p9e5WzcGnNr42rZr2ZLtRzFp2pYv1cXKTivc2B3H1LdvZI4OpZD1PJrwsV8op7zkjZ6dqWV9XKykodyZ08HApwq+Na3b9qT7WBPVXGqqFcVtGKUV+RuABzMrSnZlyysXJsxbprabgt1Lb7mIaPXDCyqXbOdmSmrLZdbe50wBS9QX6I9Q6R8eh6Lnt9225FZo9NunY+JOct8dRVdseqUWvedIAc3H0y2ORC3Jzrsh19cYv6qXkMrSXZlyysXJsxbprabgt1Lb7mdIActaNWsHJods5WZK/WWy62zbI0ivI02jFdkozojFV2pdcXHbrOkANK1KNcYznzkls5bbbm4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEmP9r+TLZUx/tfyZbIoAAAAAFTI+1/ItlTI+1/ICMAFQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASY/wBr+TLZUx/tfyZbIoAAAAAFTI+1/ItFbITdvUn2e5ARAzxl4JeQ4y8EvIqMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyAwDPGXgl5DjLwS8gMAzxl4JeQ4y8EvIDAM8ZeCXkOMvBLyA3x/tfyZbKuPGSs3aa6vei0RQAAAABg0nJrqRuRT9sxnNQsMbvvY3fewDjctm772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBchu+9jd97AFyG772N33sAXIbvvY3fewBcjeEt3szcih7ZKdsJuGJDJgybQAAGCKftslIp+2znqcLiwADi2AAAAAAAAAAAAAAAAAAAAAAAAAAAAaxshKUoxlFyj2pPsA2AAAAAAAAAAAAAAAAAMSlGEXKTSiuttvsAyDEZRnFSi04vrTT7TIAAAAaqyEpuClFyj2xT60bAAAAAAAAAAAAANY2QlKUYzi5R7Un2AbAAAAAAAAAAAAAAAAAAAAAAAA2h7ZIRw9skO2nwxlyyADogAAMEU/bZKRT9tnPU4XFgAHFsAAHL09unVc6h9kmrY/mVNPyJy1md7f6rJcoQ+/iba3a8LMhlR33nTKvdd/uN8rG9S0nFml9bFlGcv/uOU3w0lpfS67k2t7RorUN+7frNnrMXB214106I9tqXUR6VLjgZWa1y6Wc7Eu9Lcru23I0ieRPNhXCUJfqoRW3v6i3NDo5Wp042PTe05V2tJNe7c0s1ZU4vT3Y9lcXNQ2n9/vOb26ZpH86H9y9r/wDhKf58BumrKSfpaKtrjbj3VV2PjGya6nubWTq/TFUXGfSuptNPq2IfSD/BVPuvgLf8xUfyZf3QmZG71ZO+6mrHttsqlxaj7yfE1CnJonb119Hupxn+7sVtJX/G6j/OKM4SnTrUa+3n2Ibpj2lLy1qLrlcsW7oF19Jt1Mh1PIWVp2JfFOKndBpP3Ervofo63GcVF47j2+/jtsRVY/rGiYMVOMOMoS3k+3YXM+ldr3HIxv8A0/VZ476qMj69f3S96OujlekVcZaZOzrU6mpRkvcay4tIa4f/AKhqVma3vTT9Sr7+9kr1dSc5UY1t1UXs7ILq/LvJa8fo9I6GhbPoWo/i1/5IdEtqWk1/WjHo1tNN+y+vtMxapbtTphp3rsN7K/uJc3Ljh4ksiUXJR23SZwZxcvR7MnBNVzucoL/27l/XbqpaJPacXzS47Pt7Bukp14vlFPv6ziVZTx9Yz4xqnbOTi1GC+5Har+zj+COZgftjUfxj/ZFn4SFrDz68uM3xlXKt7TjPtiV3rEXB214106I9tqXUQ0T6LUtVntyUYqXHv2iiF2W5GkTyZ5sK4ShL9VCK29/UTdK06ctQrU8VJNwyeqM0b3ZcasunHUXKVu76v3Ujlxplb6NUTr+0pj0kX96bJ9NsWfnW5q9iMVXD5Nl3SUnt1NK2ddFFmQ63tNw7IljEyq8uhXVNuL9z9xxNIpyJVWwjmumyFkukhwT2ff1nT0miFNVvR5CvUrHJyS7GMcpmSYTZuZDDjDlGU5zfGMIrrkRY2pK3I6CymdNzXJRn+8aanGiy7HhZbKm7duqa9zIqr7qdSqxsh13OcW4zS2lH8RMzaV6WadRrtwJ5bi4KG/KL92whqVUtMeds1BLdx36zlXxcc67TV1Rybo2f/L2yGRDjlT0xdUb71YkvC+uXzRN0rToW3VWZuBKyE1ZYnKKUvZ6veV6s/KlrEq5Y9ii4L9W5L6vX7RLn/tnT/wD5v7MQaXpHbvst6I/3ZJsT5GpKrIdFVNl9sVvKMP3SHIzYZmlZnFShOEJKUJLriY01qGpZ9djSslZySfviMy3GtxdQ6BJ2RranNLt6jVyiHE1RY+nUN41s6oVpSsS6l2HSvzqacWN8m3Ge3FJdct+4ppf/AJZ/+m/+0oZCksLSZ9I6oLbee2/F7GYmYhaiXVp1JSvhTfRZRKfsc/3jORqUasjoKqbL7IreSh+6VbcOUr8Z5Oo82rFKEXBLk1+BnTXGvVM+FjSslNSW/viW5Ka6Xcr9YzZqMo7xinGS60X87MjhVwnOLcZSUW0/Z3KWBOFmuZ0oSUltFbpl7UMb1vCtpe28o9X4lx4lJMvMjiumLi5ytmoJJkWRqKryHRTTO+yK3lGH7pztMtlqOXjyn/8A2tW0t/H2FnS2oZ2fXZsrXby2fvj7ibplaW8XPryYWNRlCdfVOEl1o2w8uOXhxyYxcVLdpP7tyhTtdrGbOnZxVSg2vfIzot1cNCi5TilBSUt32dpYylKTPV61pkM11yUJS48d+ztJ8PLeVyfQ2VxXsua9o4T/AMrUfzV/dnpl2DGZmSYcrWMzIosojVXNRdsd5Jr63/tLVuoKjHrnbVONlj2jUuuTZX13qjiNvZLIg+v8TbUsmdd+NTW4Qdra6SS9kTNTIkx9SVmQqLqbKLJLeKn+8Uasp4+sZ8Y02XTk4vjFfcjSxShrmFGzK6eS5brZLj1PuLGDZCOt6hCUkpNxaTf3Izcyq7hZ0MvnFRlXZB7ShNdaJsiNkqZRpmoWPsk12HNxZK3XsqdTThGuMZNe9nWNxNpLi4tdtGu9HZfO5unlvL8TtHL/APiT/of7nUGPyS4ss/KWs9Gsexw4fZ8l19ftFuqdT1i6KjNWqtOTb6mQzaXpHBvZb0NfMzR/mHJ/lRMqxXrXTVOynEvsUeqWy7DaOsQtrU8bHtuSX1nFeya+jn7N/wCpIejq/wDT5bfEkImZFunOouwvWlLatLdt+4rLWIpRssx7YUSeytkurrOUozl6N5Kh1pXNtLu3Rctx5X4DlbqieNKPW3CJN0yVDo5mfDGnCuMJ22z64wh7zGJnwybZ0yrnVdDrcJFW+mp5OPXHJlXlQq+pPbqkjbDyLVqU8W/o7LIw5KyC+TNbptKdQGsJwmm4TjJJ7bp9hsbQAAAAAbQ9skI4e2SHbT4Yy5ZAB0QAAGCKftslIp+2znqcLiwADi2AACHIxaclQV0FNQlyju+xm9tULqpVWLeMls13m4AjppropjVXFRhFbJdxWWkYKsc1jw3fkXQSoFb1DHVdVarSjTLlBb9jJMjHqyYRjbHkoyUkt+xolBaEORjVZNahdHlFSUkt/eg8ap5Eb3H9ZGPFS39xMCUIqsaqmdk647Stlyk9+1msceFHTWUwXSWfWab9pk4LQ85dTTOqca9LshlTi4+z9WLfv37Dr0YFfqFGPfFT6JLzRcBmMalbCLIx68mmVVseUJdq3JQaRiMVGKilsl1JFS3S8K612WURcn1tr3lwCho6a3V0ThHo9uPHbq2Kf6GwFGUfV47S6n1svglQMJbLZdiI68aqq6y2Edp29cnv27EoKIYY1Vd1l0Y7Ts9p79uxAtJwVY5rHhu/IuglQI6aK6KVVXFRrj1KPca42NVi1dHRBQguvZMmBaFTI03EybOktpi5eJPbcsU0101quqChFdiSNwShDkY1OVXwvgpx7dmaYun4uJJyoqUJPqb33ZZAoQyxqpZMchwTtiuKl3ISxqpZEb3BO2K4qXcTAtCKzGqsurunHedfsvfs3NLsHHvuhdbWnZD2Zb9hYBKgVsnAxstp31KbXUn2M2jhY8MaWPGtRqktnFE4FQIfVqvVfVuP6rjw47+4eq0+rLHdadSXHi+smBaFTH0zExrOdVMVLvb32NsrT8bLkpX1Kcl1J7lkEqBXx8LHxpynRWoOSSe33GcrI9Wq59HOzr2UYLdk4FDn6RjTppsttgoWXzdko+Hf3E+VgY2W1K+pTa6k+xlkCvVLaKjHqxq+FMFCK9yK8tKwpXO148XNvd/eXQKhFX9H43qscbo/1MXyUd31FoAUIsjHqyanXfBTi+vZkUtPxZ40ceVSdcexN9haAoVKtMw6ZQlXTGMoPeLXuFumYl05zspUpTe7bZbAqBDjYtOLXworUI9uy95MAURer1es+scf1vHjy39xKABXycHHypQldWpyj2PfsN441UciV6jtZJcXLft2JQShDjY1WLX0dMeMd99txj41WNXwpjxi3vtuTAtCGjFpx65V1Q2jJttN9u5BHScGNqsWPFSXWu5fkXQKgQZOHj5cVG+qM0uxv3GMXCx8RNUVqG/a+8sAVAix8arGi40wUFJ8ml3koAAAAAABtD2yQjh7ZIdtPhjLlkAHRAAAYIp+2yUin7bOepwuLAAOLYAAKWJmyuyr8a6ChZU90k/aj3iWa/0lHEqgpbR5WS39kr6xGWLZXqVS3lV9Wa8UWZ0yqWPh2Zl63uuTtl+HuRi5ul9OoDiYODHUcVZeXOcrbd2mpbcO3sIL77Z6Dm1XTc50WdHzfv2khuKeiBy9Xe3o/a14I/3Rfxv8NV/pX9jUSiUHDhixzNazYWyn0a4/UUtk+pEuApYeqXYUZylU4KyCk/ZM7lp1wecshi2RtlOeTk3rf9bXF7Rf3DIvtv8ARrHtnNux2R+t+DY3FPRg4epYKwcWWZj2WK+tqTlKW/LrXaY1HM6XJx6JdN0Mq+knGpbuW/u6hurkp3QcHAmqtShDFqyYY84tSjZB7Rf5jSMKGRZdfZObdeRJxin1LZjcU7wIM7qwMj+VL+zOLjadXdokciU7HbGpyjLl7O25Zn3RT0JDk2W1wi6aukbkk1vtsu841GEszSVl322TvdbkpcvZ23MX3Tv0LBtsbc3bDd9+zaJuKd8HJy4PO1ZYlkpKiFfOUU9uTZHDGji67RXXKbrdUmoye/Eu4pe0/KsybcqM+O1Vrgtl7i3KXGLk+xLc4eFg15mTn9NKbgr5LgpbI2w6I34ubi38rK6LWobvrW25Iykp1cPKhmY0L601GXYmQ6llWYsaHWovpLYwe/cyt6O49UNOrujHayaak9+3ZsekEXKjGipOLd8UmvcLnbZXt1TJw9RxI6bQszGnYrISTlvLfmvvGpZKs1GONarnRGHOUaotuTffsN9clO4Dh6bPo9R6LHryI40ob8bIP6sl+Jf1jJniabbbX1TS2T7tyxl6spdByHo3GhTqusWWuvpXJ9bNtS4NURyr5JNddVae9j/IbinVBwdPnGrVlTjxvrpnW5cLE+pru3GFhQzMnOV8puEb5JQUtkTcU7wODjZNmHp+oJTc/VpuMHJktekKzDjcrrFlyjyVrm+pl3FOyDh6lkWK3GxL5WNOHK3oV1yNMKaq1KqOHVkwommpxsg9l9/WTcUu1Z1s46g2o/8ADNqHV3JljTr55OBTdZspTju9kc3H9nWvxl/2shllTo0LCrrlOLufFygutL7ibqWnogeb510XU2YFGZGXNKalCW0oluyv9I6tdRdKXQURX1E9t2y7kpcWVY9Xli/V6NVKf379ZZvlOFM5Vx5zS3Ud+05OJjxxtfsrjKTiqE0pPfbrL+q9WmZP8tlifU2NMzNniaY8mde1iS3hv2NkuF610beXKtyfWlBdhxdSprn6O410o72Rrgovfs3O7i41WLVwpjxi3vtuZiZmSUwOVk/8LrdF3ZC9dHL8fcQdO1bqOoLrVS6Ov8v/ANzW4p3AcbH0qORhwvstseTZHmrFJ/VbK12VZlaLi2WPexZEYyffsybinogcvX+rCq2+NA6a7DV+6FPT8qzJty42KKVVrhHbuLp5dZ06crLxapdHO7Ja6R9kF1l/UP8A0rS4VYzkpTmo80t5Pf3/AImYyKdkHmbZV0KF2DTmq+Mk3zhL66+8sZ+TG7UpY96vlRXBNwqi3yb79hvKd4HF0qxxzrKaa8iOM48krYtcX+ZBo+nVZmmQnfOxvrUdpeyN1lPQg52iXWWYs67pOc6bHW5P37HRNRNxaAAKAAAAAAAAAAA2h7ZIRw9skO2nwxlyyADogAAMEU/bZKRT9tnPU4XFgAHFsAAFTVceeVp11NW3OaSW7+9E1FXHFrqns2oKLX5EoJXyOTTjahg1vHxlVZUm+EpvribR0r/0u7FlPe27eU598u06gJthbcTJxtUycCWLJUJcUuSftbbHYpi4Uwi+2MUjcFjGi3Dh6zHW82WMoSe0d4ze2/Ui1h4VzyLsnLcVbbHgowfsotVYldWVbkR5c7dk933FgzGP2W42Nh6jjY/qlbp6NbpWPtSf3FbNxbcT0dqosaU42Jbr8WeiIMzErzKeit5KKkpdT7hsLUMrG1DNrWPf0UKW1znF9ctibMwrXfVk4jjG2qPHjLslHuOgC7S1PGWdO7lkKuutLbhB77mulYtmLXdG3bedsprZ+5l4FoRZUJW4t1cfalBxW/3plXFxbKtHWLLbpFU49vve5fAr3aKOHi2U6RHGnt0ircXs+/cqfo3IekYuN9XpKrFKXX3NnZBNsLbm5uNas6GViyg7VHjKE37SKtbyJa/S8jgpKqT4w/dOll4NWVKMpcoWR9mcHs0MTApxZynHlOyXtTm92yTj7W0enYtmPblys22ttc47P3GuDh2U2Zjs2UbrHKOz9zOgDW1Lc/SMfJxKPV71B1w9mUX29bGrYl2XVTGhpSjbGW792x0ANvqi3IyMXOzuFGUqoUKScnB+3sTZeHcsyOZiOPSKPCUJ9kkdEE2wWqYqzZWueT0cIbbKEOv5kmbjRzMSyiT2U1tv3E4LXqkcrotVlSsdyrgl9V3Rf1mjbLw8mOTTk4rjOdcODjY+06YJtW3KpxMyWp15eQ60lBx4xfsk+nYtmPblys22ttc47P3F4CMYLcynTpOOfXfsoZE21s/caQp1SGOsWLqUUuKuT60jrAu0tzcnAu5UX49m99MeO8/3195Lj+vTuUr1XXWltxi99y6CbS3MqwboR1FPj/xDk4dfemaLTLJaVj0uShkUfWjJe5o6wG2C3Pr/AElOcFYqa4xe8pRe/I1vxcmrOeXh8JOceM4Te2+x0gNpbl4uLlrVJZWTw2lXx2i+wuZ9U78K6qvbnODit2WAWIotysvAut0OvEjx6WMYrrfV1HUXYZAjGhzdejF6bObfGVbU4PuaZvh4MY6THFt7Zw+v+LJb8CrIyIXWucuHWoN/V6vuLRK92W5NdGp0Y6xa3S4xXGNrfWl+BtbpW2lQxKZbTranGT98kdQDbBbi5mNqWbVXCyNMFCak0pdux2fcZBYxocunTOUc2GRGLhfa5R2fYY9Qyb9O9XyJpWVS3rtT7duzc6oJtgtzoLU5uEJqmtJrlNPff8jGTiZEM31vEcHKUeM4SeykdIDbBapirMc5TyeEYtbKEOvb8zk6M8+OlwWNGmcW3tze3E9CyDCxK8LHVNXJxXX1sbS0WmYbwsXhKXOyTcpy72y4AaiK9IAAAAAAAAAAAAANoe2SEcPbJDtp8MZcsgA6IAADBFP22SkU/bZz1OFxYABxbAAANbLIVVysskowit237ijdn2vKnj4dCtnX1zk5bJEN+b61pmbCcHXdVBqcG+zqM7oWnTrshbXGytpxkt0+83OHjZ+Tj6XTZHEcqK64pycut7bdZ0Ls9Qxqbaa5Wyu24RS7+8RlElLgOdVn3Ry4Y+XQq5W78JRlunsaz1K9512LRjdJOvZpuWy6+8boKdMFHCz3kSuqvr6K2n2o7kNWp5GQndj4jnjp7KXLrl+CG6CnSnOFceU5RjFdrb2Nji36hDJ0KeVdRGceW3Bvt6y1l58sXIoorpdjti9kn2bDdBToA51Gfd65HGyqFXKa5QalunsLdQullzoxKFa6/bk5bJDdBTogoYGfPKyLqZ0ut1bbps31HNeFCuxwUq3NRm2/ZT95birFwFPMzHRfj0wgpzunts32LvIrM+6eRZTh0K11dU5Slsk+4boHRBRx9Q6aq/lW67qE+VbZvh5jydOjlOGzcXLin3bi4RbByp6vKOlU5rqTdkuPFPs63/4LmHdkXKUr6OhX7q333FxPpVkHF1e7Lhm4ka4xUXb9V8va/Eu5GXbRXVHoHO+zq4RfUvzJuKXSOu+q2yyEJJyre0l3FPHz7XlxxcqlV2Tjyi4y3T2KWPffXqeoRx6Okk5p7t7JdQnIp3QUcPUFero2wdVtPtxb7CvHVcmdHrVeHyxl178vrNfgN0FOsDSmxXVQsjvtJbrdG0m1FuK3aXUn7zSMg4mBdmS1fJjOENvq81z9nq9xNXqeRdlW004vJVW8HNy6tjO+Fp1Qc+zOyZX2QxcXmq3s5TfHd/cb4+o124VmRYnWqt1OL9zRd0FLpFPIqhdCmU0rJ9cY7duxznqmTGj1qWG1jdrfL6yXfsYybIWaxp9kWnGUJST+7Ym4p1zWE4TT4SjJJ7PZ9hUxc6WXkTVUE8eHV0jftP7ipj5kKNOy8imiMOjtkuKftdaG4p2Acieq5MMdZTw2sdpNty6+v7i1mahGiqp1wdll3VXFe8boKXQcqWpZNWRRTkYqg7p8eSlui9Cy55U4Sq2qUU4z37WWMrE5HHIplPhG2Dl4VJbkWoU25GJOqixVzl1cn7jmargYmJpu9VahdFro5R9pyJMzBDtykoreTSS7W32Gld1Vv2dkJ7dvGW+xy9WU3RhrJ36Hmun2/wD53kXHGjquL+juG/X0qr7OP3knIp3G1Fbt7Je9mK7IWx5VzjNL3xe5xNTyKrdSWNfKbpripOuC3c5P8DoabfiWVyrxIdHxf1oOPFou73RSeeVj1ycbL6oSXuc0tjeu2u2PKucZpdW8XueeVmH6/myyseV7Vu26r5cUjs6fLEeLzw1CNT6+pbCMrkmFidtde3STjDk9lye25tJqK3bSS97fYeb1Cc8yynL32ojfGFS8XX1s6Gqrp8zCxJP9XZJymk+3Ym4p0q7qreuuyE9u3jLfY3ONmY9WDm4VuNBV87Ojkorqkmdk1E/YAAqAAAAAAAAAAAAAAAAAAA2h7ZIRw9skO2nwxlyyADogAAMEU/bZKRT9tnPU4XFgAHFsAAHHwrq8PUc2vInGt2T6SMpPbkjbKzKsvT890xbjCDj0nul1HRux6b1tbVCxLsUo77Gehr6LouEeja247dRmp4W3O/8Ahn/6X/7StPJnTp2mwVjprsilOxfu9R2+ir6LouEej248durYw6KnV0Trg611cGupE2luDOVC1fCjTlWZDUnvynyS6mXsL9t5/wCEP7F6GLjwUVGmuKi94pR7DeNVcbJWRhFTl7UkutiMaLcmFbt1TU649TnUor80Z0nPxqNMhXdZGuyneM4PtT6zqxqrjZKyMIqcu2SXWzlWetKbctNrnkfu3Lbb/wAkql5c6P8AlCX+r/c6eV+2sD/RIsYGnwo02GLfGNiXXJNbpstumuVkZuEXKPZJrrQjH0TLm5v7bwPwn/YjwbqsPPzasica5Ts6SLk9uSZ1pVVysjZKEXOPZJrrRQzVc73zwIZVa9hrbePmWYr2iHSrYX6rn2VvlCTjs+/qR0M/GWXhW0PtlHZfiVtLxbarL8i+MYTuafBfupFrLtupq5UUO6T6uKe2wx49kuRo0552VG61PfGqVfX4veTadfVh5WZRkTjXOVsrE5PbkmXNLxZ42Ntbs7bJOc2u9k92PTft0tULNuzlHfYRj6WZcrG/4zNz76VvVKvo4y8TNNOzsanQlXZbGNkYSi4Pt36ztwhGEVGMVGK9yXYRvEx3Z0jorc3+9x6xtS3A/wDhvB/nR/7mekRF6rR0Uauhh0cXuo8epExccaLcrWpKF+BOTShG7dyfuManltXYsI39Fj27t2xf+507aq7ocLYRnF+6S3NZY9MqlVKqDrXUouPUhMSW4cJU/p3FjTk2X7KScpz5bdRPhZVNGq58brIwcpppyfb1HVhjUQ48aoR4+ztHsMTxMefLlRXLm95bx7TO2VtzMSxXajnZVUXZSoKC2XttFbpcanDlfhZsqWk5KiUk+vu2PQV1wqio1xjGK9yXYRPDx5W9K6K3PxOK3LtS0dGZH1bGnktV2XJJRfey2aTqhY4ucIycXum12M3NQjkYlkK9dzYTkoynx4pvt6kb6P8A4jUP+YkdCVFM7Y2yrg7I+zJrrRmFVdbk64Ri5PlJpdrM7fa24kcmN+RleuZs8fopuKrjPj1L3kGPW8jRdQhS5Tbtbjv2vrTO/PFossU7Ka5TXZJx60bwrhDk4QjFye7aXaTYtufDVsOOnwsc4t8UujT62+7YqapT65nYFTcqVZCW6XavuOwsTHVvSqmtWeLj1m8qa5WRslCLnHsk11ou2ZipS3O0m2VEnp96Ssq9hpe3HvKC/YOo/wA2X90d+VNUrI2ShFzj7MmutGPVqFXOvoocJveUePUxt+C3Pzv8uS/kx/2K90lRPSsqzqpjWoyl4d4o7Uqq5VdFKEXW1txa6ivmRtjRGNFNdkF1Srfh+4TiWoajlUX5+nwqsjNxt3fF77HVjkVSulSpp2RW7j3HLqxbMjLon6pHFoplz4rbeT/I6yqgrHYoRU2tnJLrYxvkljIvrx6ZW2y2hFbtnJxb6cvIWZl31RUfsqnYvq/e/vOvbXXdW4WwjOL/AHZLfcg/RuF/CUf/AOtFmJkhR1e2E54nSSTw5y+vJPqfduRW+q16hiLTeCslLaaq7HD79jsqipVdEq4qtdXFLqMU41FD3pqhXv28Y7bknGy3Mcq8PXbLMhqEbq0oTl2br3GcaccjXrbsdqVcalGUl2NnUtprujxthGce6S3FdVdMeNcIwj3RWw2lqVOp47ldC9xosrk04yfb95z8XGuzMHMWLNV1XXNxbX7p27cWi6SlbTXNrsco77EkYqK2ikkvchtst57Uqc2nGx4TnR0cbYKKhF9TLOc7cfIwMrKcWq5SjZKK6lvudayqu1JWQjNJ7pSW+zMyjGcXGSTT6mmhsLcnPvqzM3Cpx5xscbekk4vfZI7BFVjU0b9FVCvft4x23JTUR9gACoAAAAAAAAAAAAAAAAAADaHtkhHD2yQ7afDGXLIAOiAAAwRT9tkpFP22c9ThcWAAcWwAAAcnPu1LEotv547rh17cXvtuTYktRsdVls6HVJcmoxe/WjO74WnQBzdNzXOm6WVbFcbpQTk0upFzJslHFnOmUFJR3Upv6pYmJSkwIqrP+HhO2UE3FOUk+o2rurtW9dkJpe+Mt9i2NwCN31Kzo3bBT8Ll1gSAw3st3skaV3VWtquyE2u3jLfYCQFFapQ894ynDbhy5811vuJVdNZdkZzqVMYp7cvrL8SXAsg1jOMoc4yTi+tST6ivbfJ2UOiyl1zls25dv4CxaBReqULP9Wc69uPJz5rqfcW4WQm5KE4ycXtJJ9gsbg1jZCUpRjOLlHtSfYJWQg4xlKKcupJvtKNgRwuqsbVdsJtdqjLfYQvqsk412Qm12qMt9gJAV4WWPNnByrdaimop/WX4kkrqozUJWQU32RcusliQFDVcp1aXfdj2R5w7JJ77PdFirIrcYRlbDpJRT4uXWxccCcFLN1GrEsphKUW5zUXvL2d/eW4TjOKlCSlF9jT7RfwNgc6rLmtVyqrbEqa4RaT6tty/CyFkeVc4zi+xp7iJiRsCOd9VclGyyEG+xOW25IUAaTtrhLjOcYtrfZsK2uVfSKcXDt5J9QG4NK7a7VvXZGaXvi9zWWTTFNu6tJPju5JbMCUGIyUlvFpp+9PtNHfSrOjdsFPwuXWBIDWdkK9ucox3ey3fayDJzqKMey3pa24JvjzXW17hcCyCvhZcMzHhbBx3aTcU9+JIr6nZ0asg5+FS6yWJAaznGEeU5KMV2tsoX5knqWHXTZF1WcuXF777CZodEGs5xri5TlGMV2tvYqafqNeap8XFSjJx48utpe8WLoI5X0wnwlbCMn+65dbJCgDEpKMeUmkl2tvsNa7a7VvXZCaXa4vfYDcGll1VX2lkIb9nKW25nnHjz5Ljtvy3A2BF6zQlFu6tKXWvrLrJG9lu9kkBkGld1VrarshNrtUZb7GbLIVLlZOMF3yewGwNOkh0fNTi4bb8t+owsimT2VsG2uWykutd4EgIvWaEot3VpS9l8l1koAEcL6rJOMLISku1KW+xtZZCqPKycYLvk9gNgc5ZU5ayqYzTpdPLZe9nRJE2AAKAAAAADaHtkhHD2yQ7afDGXLIAOiAAAwRT9tkpFP22c9ThcWAAcWwAAc/Xv2Pk/gv7otYf+Dp/lx/sjTUcaWXg248ZKLmtk37utEtEOiorrfW4xUd/wJ8jjaRg4+THKnfWrH0847S9xFTvHQM+vfeNc5xjv7ludbTsSWJC2MpKTnbKfV7tyCOmTWDl0dJHe+cpJ7dm5jbLVoMjGtyNLwHXHpYQjCU699ua2RnDWItRg6654l3Fp1OOymWbMCx42Mq7uF1EUlJLqfUkYqwcieZXkZdsJurdQjCO3aKkXrZKNM5SlwSi25dx52yrHlptsqcGyxcJSWRJrd9vWehvqjfROqW/GcXF7fectaZmrFeI8uKo4uK2h17FyiZSEN1k8jB0yiyT43tKx7+1si9LSqY3U24yVEq5btxXtLuZq9M5adRQ7NraNnCxLsaMxwsq66uWXkRlCqXJRhHbd/eSIn5W1aOJjr0hlHoa+KpUkuPY9+0kqip69lxkt4ypimu8nyMK56hDLx7YwfHhJSXajevElDU7spyTjOCjx7ti0OVG6eNpWTgpt3Qs6GH38uz5MnyqI41uk0x7IT2/HqLNumKzVa8vklGK3lHva7GS5mJLIycWyMklTPk0/eSpLUZYuO/SFRdNbi6eW3Hte/ab8lg61Y5ParIr579zj2k+VhXSzq8rHtjCSjwkpLfdFf0gqjkV0UxklfKzjHb3J9oqhLocJSxp5U1tPJm5v8PcR63XG7KwK57uMrWmk+3qOpVXGqqFcVtGKUV92xWzMSWRkYtsZJKmfJp+81Mf+Uv25up4GPVl4UaYKpWz4T4dXJEmbi04WdgTxq1W5W8Jcfei9m4ksm/FsjJJUz5NP3jOw5ZN2LOMklTZzafvMzj9LarU+OvZcu3amLItIwqM3B9ZyoK226TcpP3F+vElDU7cpyTjOCjx7tijRROiNqws2qOMpNtNb8BX2KcI8fRrOj1va1rd+/6yJ9RwMenRHdXDa6MYyVnvb6hp2JLL0G+mMtulsbjKXv61/wCDp5uJLJ0yeLGSUpRUeT+7YkY3Bbn6nTVa9OsnXBystgpNr2uw7VcIVwUK4qMV2JLsKWZgTvxqI12KFlDjKMmurdFulWKmKtlGVi7Wl1M3jHtJciOLTk+kGUr4KajCO0X2G1MY4Os200LamdPScF7miazT8n1+3LovjBzSXFrdPbvJMPBnVkWZORYrLprjul1JGalXHwf+Jx5XX6dZkztbbs3XyOvosciGAoZMJRlGTSUn18SOvT8rEcoYV8I0ye6hOO/H8C/jVTppULLJWSXbJ+8YxU+0mXL1LHhk61iVW9cHXJtb9pFqUVXmY2HVjysojFzdUHtyOldiSs1KjKUko1xcdu/cxnYLyLK7qbOjvq9mW2/5MTjPtbUMaq2Gp1WUYM8appxsW62fkNMwsfJtzZ31xsayJraXu6y/j0ZauVmTkRaS24QWyf4nO0+rLlbmyxroQ3yJpxlHf3slVMDWu6eDi6nVVJuND/V/+3f/AP6WqdIxbNOipQTsnDk7X27v3k+Lpsasa6q6Tslfu7JP37kK0/NjR6tHLiqNuO7j9ZItSOfbbPM0TBdrblK6MHLv69jpZmn4lOl5CroguNcpJtdj2fWbX6YpYuNRQ1CNNkZ9fv2Lt9Svx7KZdSnFxb/EsY/ZMuM5LD9GldRGMLJ1x3lFd/vK9mK3hqFOmWwuSTjdyW+/edTG0+xYE8PKnGyvjxjxW2yNIYWfGtULMiql1KSj9fYztLQWKebqOJj5S2iqeknB++XULcSnG1zCdEFBSUt0uzsLubgzunVfRbwvq6lJrtX3kMNPypZ9OVkXxm691xUdl1lqS3SsrhbBwsjGUX2xa7Th6XGFGnZuRXXBWVzs2lt2bHeOdiYFuNbdB2RnjWuUuDXX1mso9wkINP03GyNOhbfBW2XR5Sm+3rJtCsnPCcLJc3VZKtSfvSNIafmY9boxsqMafdyj9aP4F3CxIYWNGmvdpde797JjHslR1GPrOp4uJZv0TTnKPi2J46ZVTl13421KXVKMV1SN87CeTKu2qfR31PeMtvkR04WRLJhfl3Rm6/ZjBbJCvYrafj1ahZk5GVBWS6WUIxmvZSNKV6vLU8SDbphU5xTfs7p9RalgZFORZbhXRgrXylCcd1v3m1GnOrHyFKznfempTa71sSlUMTTsazQelnWpWOpy5vtW25r0k79N0zHnJ8bpcZvftSOrj4kqdLWI5JyVbhyX37kEdK302jHlZtbS+UbIrsY2z8Ft56VTG2m3GSonXLduC9pdzOdZN5Gq5LsxJ5UKtoRimto+ZfjhZV1tcszIjKFcuSjCO27+8zfgWxy5ZWHbGuc1tOMlupCYFGmu6rH1FPHnRjyqlKEJPsezJtNw6K9JV6gnbKltzb6+wtrEyJ4uRC+/nO6Ditl9WO6ZJj4sqdOjjOSclXw3QjH2W5Wm6djXaGrLK1KyUJbSfau3sIp5Fr9H8OCcm7p9HLZ9bW76jsYWJLG0yOLKSclFx5L79yCvSk9Jrw7Z/Xh1qcfc92xtn4LULabE6p4emWUW1yT5JrrX3lqVUM7XLa8hKddFacYPse5Yrxs+UoK7Ljwi93wjs5fiMrBtllrKxbVXbx4yUlupIbZLVaMarG9IeNMVGLp34r8TtHNxsDIhqPrd90bG4cdkttjpGsYSQAGkAAAAAG0PbJCOHtkh20+GMuWQAdEAABgin7bJSKfts56nC4sAA4tgAAAAACnLUqFl+rRU52J7S4x3UfxNLNYxoWzglZPg9pShDdIm6BfAT3W/eCgAAAAAAAAAABXjhY8cqWQq100u2TLAAAAAAABTu0vCutdllEXJ9ba95cAmLGsIRriowSjFdSSXYbAAAAAAAAAAAAAIqMerHc3VHi7JOcuvtbJQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAbQ9skI4e2SHbT4Yy5ZAB0QAAGCKftslIp+2znqcLiwADi2AADm2ZeTfl2Y+EoJVdU5z7+4zjZl9s7sW2MIZMI7p/uy395XqvhpmflLK3hXdLnCzbqf3G+E3marbmRjJUqCrhJr2jnctK2mQzndmOqyhS6ZqblF9bGiSyKtLuu3rdcVOW23W5It6P8A4jUP+YkV9K/y7kfhZ/YRAsLU5x0vHvcFO+/aMYL3tmfWc/Gsq9ZhXOuclFutPeO5SjXP9D6dkwi5qiSm4pdqLy1aq6yuvDi7pSltLq24L7xf2M35eRZmSxcOMOUFvOc+xb+43wcy2y+3GyYxjdVs249kkzmZWPjU6tfZqEJOm3aUbE3svuexc02ODXK67Eqmoxj12PfaX4biJmx1QRYuTXlURuq3cJdm6JToyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANoe2SEcPbJDtp8MZcsgA6IAADBFP22SkU/bZz1OFxYABxbAAAaT7UmEtlskAAS27AkktklsAAS2WyXUYUUuxJGQAaT7UmEtlsgACWy2SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABtD2yQjh7ZIdtPhjLlkAHRAAAYIp+2yUjsW0t/cc8+FjlqADi2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMw9slI619bf3Eh3w4YnlkAG0AAAMGQBrwj3IcI9xkEqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHCPcZAqBjhHuHFdxkCoAyAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAGQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAZAAAAAADAGQAAAAAAAAAAAAAAAAAAAMAZBgAZAAAAAAAAAAAAAAAAAAAAAAAABgAZAAAAAAABgr5mZThUu2+SjH3feWDx/pXdKeoxq3+rCCe34nbQ0u7nGLjranbw3OhL0rx09lRY13mPpZR/D2eaPKA+t4Ok+d5eo9X9LKP4ezzQ+llH8PZ5o8oB4Oknl6j1f0so/h7PND6WUfw9nmjygHg6R5eo9X9LKP4ezzQ+llH8PZ5o8oB4OkeXqPV/Syj+Hs80PpZR/D2eaPKAeDpHl6j1f0so/h7PND6WUfw9nmjygHg6R5eo9X9LKP4ezzQ+llH8PZ5o8oB4OkeXqPV/Syj+Hs80PpZR/D2eaPKAeDpHl6j1f0so/h7PND6WUfw9nmjygHg6R5eo9X9LKP4ezzQ+llH8PZ5o8oB4OkeXqPV/Syj+Hs80PpZR/D2eaPKAeDpHl6j1f0so/h7PND6WUfw9nmjygHg6R5eo9X9LKP4ezzQ+llH8PZ5o8oB4OkeXqPYY/pPi22KNkJVp9jfYdqMlOKcXun7z5qe09GLZW6VHk9+EnFHj6vpcdLHdi9XTdRlqZbcnZBgyfPe4AMADlahr2LhWurrssXao+4vZ1jpwr7Y9sK5SX5I+dyblJyk22+vd+89nSdPGtMzlxDydTrzpxEQ9V9LKP4efmh9LKP4ezzR5QH0PB0ni8vUer+llH8PZ5ofSyj+Hs80eUA8HSPL1Hq/pZR/D2eaH0so/h7PNHlAPB0jy9R6v6WUfw9nmh9LKP4ezzR5QDwdI8vUer+llH8PZ5ofSyj+Hs80eUA8HSPL1Hq/pZR/D2eaH0so/h7PNHlAPB0jy9R6v6WUfw9nmh9LKP4ezzR5QDwdI8vUe907VsfUE1U9prti+0vnz7SbZU6njyi9m7FF/fu0j6Cuw+Z1WjGlnUcPf0+rOpj7OxFeeVBPZLc2ypcaXt7ygfJ6jqJwnbi92nhGXuVz1xeFj1xeFlQHm8rUde1it+uLwseuLwsqAeVqHaxW/XF4WPXF4WVAPK1DtYrfri8LHri8LKgHlah2sVv1xeFj1xeFlQDytQ7WK364vCx64vCyoB5WodrFb9cXhY9cXhZUA8rUO1it+uLwseuLwsqAeVqHaxW/XF4WPXF4WVDA8rUO1i6NV0bOztJDm1Nxsj+Ox0j3dPqzqY+3DPHbLIAPQwAAAAAMHi/Sn9r/wDTie0PF+lP7X/6cT29D/V5Os/m44APuPkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB7H0T/ZT/AJj/ANjxx7H0T/ZT/mP/AGPB1/8AL/r19H/R3AAfFfXAABU1T9l5X8qX9mfPT6Fqn7Lyv5Uv7M+en1f87jJ83ruYAAfUfPAAAAMwhOb2hGUn/wC1bktWAGtns+poFQAAAAAAABY0/wDaOL/Oh/3I+iI+d6f+0cX+dD/uR9ER8f8A0P3h9Pov1lBmfZfmUS9mfZfmUT8z1f8AR9jS/VkAHkdQAFAAAAAQADAGQAABgyAAAAAAZr+0j/qR0zmV/aR/1I6Z9Lov1l59blkAHucQAAAABg8X6U/tf/pxPaHi/Sn9r/8ATie3of6vJ1n83HAB9x8gAOpp+jSyqPWbro1Y669/fsc9TUx04vJrHCc5qHLSbeyTbfUtg1t1Pqa9zO8tQ03TlthUdNZ8SZwpzc7JTe28nuY09TLP4qG88Ix+fa1pcIW6ljwsipRlPZprtOxqWXg4OZKj9G0T4pPfijkaP+1sb/WdTXNLzMnU5200uUGl17nn1ts60RnPqnbSuNOZxj2zjV6drMJ0146x74rdOPUcL1e12zqjVOcoPaSit9tj0GjadZpts83NcaoQi1s2Y9GrFdqmZbt1T3lt+LZiNXtzlOHuIanDfGMZepl5/orOj6To59H4uPUYhXZa+NcJTfdFbnRzdYuza3jV1whRJpRil1nUyum0jFqx8CiUrJLedir3O2WvnjEXHuXONLGZmp9Q81OudT2shKD7pLYzKqyMFOVc1GXZJx6mejr6fVtLyIZtMo3VrlCbhxK2M/XfRu6n/wDUx3yX4EjqZr3HE+17EfEuJCE7JcYRlOT90VuXtMdVVl0cjCne1Hs478S36OxjQsnOsX1aYbEvoxOVuXm2T65Shyf5tk1ta4yivUGnp+4n7efRJHHvlHlGmxx7eSi9jo+j2HXkZMrLknXTHlszez0iy+n5VKEak+qG3uOmWrlu24RdMxp41uylxzaVdkIxlOucYy7G49p2dcoqvxKNRpjx6X20u821r9i6Z/oX/aiY9Re31yTo1fvhxa6rLequuc2vDHc0O96Kf4rI/wBCIfRimm3Pk7UnKEd4J94y6jbllExwmOjuiJvlzHj3xjydNij28nB7ER35axqOLmf8ZTxp32cXHq2+5nK1KzHuzJWYseNclvttt1mtLVzymsoNTTxxj1KqAD0uAex9E/2U/wCY/wDY8cex9E/2U/5j/wBjwdf/AC/69fR/0dwAHxX1wAAVNU/ZeV/Kl/Znz0+hap+y8r+VL+zPnp9X/O4yfN67mAAH1HzxLd7Lrb7EehuowNGorjfQsjImt3y7Dzye3Wupr3noZ5GDrVNccmzoMiC2Un2Hj6nd6+vl6NCvf2xjLTdY5URxljXbbxlHY09HKpUavdTP2oRcX+TIcjRczDi78easiutSrfWSei8pWapOUpOUnDfds4ZRHbynDK4dYvfjGUe3JyFvl2pJtubWy9/WZjVOm+vpqZ7OSfCUWuR3aMSrTVbqOYt5c30UGcj1u3N1Wm619bsjsvcutHfT1ZzisY9RDnnp7ZueWdUlXZlrocWWOuKXFx23K3QXKfB02Kb6+Li9zr+kf7cq/wBMP7sva9qVmDdXDHhFTlHdza3Zzw1soxxxxjlrLSi8pynh5iyudT2shKD7pLY1PS0X/pzTL674x6epbxkkeaPTpas5zOOUVMOOppxjUxPqQAHdyWNP/aOL/Oh/3I+iI+d6f+0cX+dD/uR9ER8f/Q/eH0+i/WUGZ9l+ZRL2Z9l+ZRPzPV/0fY0v1ZAB5HVDlyccS6UW01BtNHM0jOnOfQ3zcnLrjKT7To5v+Cv/AND/ALHKqxXdpddtW6uqbcWveevSjGdOdzlle6KdfKbjiXSi2moNpr3dTINJsnbhRlZOU5NvrbNIZSy9Lun1KSrkpLu6ma6TNV6ZzfZHd+RmcNunMT9rd5Q6E5wgt5yjFd7YjJSW8Wmu9M42LGnNc78y2O7e0YOe2xvU4Yeo1wotUqbepxUt9mJ0a9fJvdVWQcnBTi5L91PsE5wgt5zjFd7exz9Rrlj3QzqV1x6prvRHv+lM2O27x6ut7+9kjSiY3X6Wcq9LOpZnq+Pypsg7N11blnHtjbXFqcZPZNpPsOdrWPVHHdyilY5JNl3Cx6qaoyrgk5RTk+8uWOHaiYSJndSwN01utmDnTwcimyVmLe1ye/CXYzjhjGXqZpuZp0Qc+vUZQtjTl1OE5dSa7GdAZYTjyRMSGQDCs1/aR/1I6ZzK/tI/6kdM+l0X6y8+tzDIAPc4gAAAADB4v0p/a/8A04ntDxfpT+1/+nE9vQ/1eTrP5uOAD7j5AXsDVcrB+rXJSr8EuwogxnhjnFZQ1jlOM3DvRt0nUuq6Hqtz/ej1JnCsioWSimmk2k+8wDGnpdufU+m89TfHuFzR/wBrY3+sv6/m5VOq2QqyLIRSX1Yy2ORjXSx8iF1aTlB7rc3zcqzNyXdaoqUltskc89LdqxlMeqax1NunOMctbsm+/wC2tnZt2cpbnZ9Ev8Vkf6EcEtafqF2nznOlRbktnyRrW0t2nOOKaedZxlkrVT4WQn28Wnt+B6nWs3NrrpyMKz9RKPXtHc8qXsLVsrChwrkpQ8MlukY1tGctuURdNaWpGNxPytV6hrORj2WRm3XBbybiuw09HchU6iq5bcLlxaIs3WMvMq6KbjCHvUFtuUa5yrsjOHVKL5J/gTHRmcMomIiydSsomJune1WpaXpKw4v61tjb/wBO/Ua+in22V/LOXn592oWxsu4pxWySQwM+7T5TlSotzWz5Ix2MuzOPzLfex7kT8Q6PozOEp340ns7YdRyrcS+q90Sqn0ie2yXaR12SqnGdcnGUetNPsOrH0jzlHb9XJr95x6zc6ephnOWHu2Izwyx25fCfVl6poWJhT26Xfk13dpnVoSu0HT51xc4wilLZdnUjiZGRbk2u26blNlvB1fKwa+jrcZQ9ykuwz2M8YiY5iba7uMzMTxVOp6K49sbL7ZQcYOOyb95ytLwbsuU549qhZUt119bLC9Is5WOX1NmtuO3Uc3GyLcW1W0z4yQjS1ZnLKfUyTnpxEYx8OxharqDyYY2RW7VKSUoyh1oq6/jU4upOFKUYuKk4r3Er9I81rZKpPxKJy7bbL7ZWWycpy7Wy6WlnGe6YqDU1MZwq7aAA9ryh7H0T/ZT/AJj/ANjxx7H0T/ZT/mP/AGPB1/8AL/r19H/R3AAfFfXAABU1T9l5X8qX9mfPT6Fqn7Lyv5Uv7M+en1f87jJ83ruYAAfUfPb0qEr642tqtySk17kdDVtJlh2RlRGdlEo+0lucwv4esZmJDo4TU4LsU1vscNTHUuMsP/x1wnCpjJe9GfWlmdk1RxfLddRPo3Rr0iy+i24fW22/E52Rr2bfW4KUa4vt4LZlXAzrcC521cXJrZ8jzZaGpnuymKmYdo1cMaiPh3qtQhqt2TgZajFSk1U17tjiLGsw9VrotX1o2x/PrRWds+m6VPafLluvcy1lapdl21WWxr6SppqSXbt3m8dHLTmseJhnLVjOPfK96R/tyr/TD+7JPSqmx5FNqhJ18NnJLsOXkZlmfnV3W8VLqX1fxO7rmp5GBmVqppxlDrjJdRx256eWERz7dd2OcZT8K+hVyw8DLzLo8YuG0d/eefL2dq2VnQULXFVr92K6mUT1aOnlGU558y4ameMxGOPwAA9Lgsaf+0cX+dD/ALkfREfO9P8A2ji/zof9yPoiPj/6H7w+n0X6ygzPsvzKJezPsvzKJ+Z6v+j7Gl+rIAPI6q+d/gr/APQ/7EGjfs+H4suWwVtU4S7JLZ7GmNRDGqVUG2l19Z2jOI05xYmP/VuVnwlgW2TrX6m+MotdzZY02Dt0icF2yUkXsimGRVKuxbxfyMY2PDGq6KttpdfWbnWidPbPKbP/AFbk6Zi4l9bhdD9dF7NNlyOLgU5UIxilb2xXJkuRp2PkT5yTjJ9ri+0zjYNGM+UItyfVybLlqxl7uSMa9IdUvca1j1rey76u3ciHB5afleq2tOM+uMu9l1Yday3kNylN9S3fYZysSvKUVZunF7pp9hMdTGMdvx8k4zM2ra2t8D/50XMZqWPW001wXYLKYW09FZ9aLW3X7yPEwqsRy6Pk+XbuzG7GcNq1O61g503n5Nkox2prT2Uvezogxjlt901MWp4+nU1S5z3ts7eUy4AMs5y5IiIZABhWa/tI/wCpHTOZX9pH/Ujpn0ui/WXn1uYZAB7nEAAAAAYPF+lP7X/6cT2h4v0p/a//AE4nt6H+rydZ/NxwAfcfIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2Pon+yn/Mf+x449j6J/sp/zH/seDr/AOX/AF6+j/o7gAPivrgAAqap+y8r+VL+zPnp9C1T9l5X8qX9mfPT6v8AncZPm9dzAAD6j54AAAAAAADMW4yUl1NdZNlZd+ZNTyJ8pJbLq7CAGZxiZtbmqAAaQAAFjT/2ji/zof8Acj6Ij53p/wC0cX+dD/uR9ER8f/Q/eH0+i/WUGZ9l+ZRL2Z9l+ZRPzPV/0fY0v1ZAB5HVgyAAMGQBgGQBgGQAAAAwZAAAAAABmv7SP+pHTOZX9pH/AFI6Z9Lov1l59bmGQAe5xAAAAMADyfpZizWVDKS3hKPFvuPWGltULa3CyKlGXamjro6s6WcZOWrp9zHa+bA9xLQNOk9/V/6mY+j2nfA/qZ9P8hh9Pn+Fn9vEA9x9HtO+B/Ux9HtO+B/Ux+Qw+jws/t4cHuPo9p3wP6mPo9p3wP6mPyGH0eFn9vDg9x9HtO+B/Ux9HtO+B/Ux+Qw+jws/t4cHuPo9p3wP6mPo9p3wP6mPyGH0eFn9vDg9x9HtO+B/Ux9HtO+B/Ux+Qw+jws/t4cHuPo9p3wP6mPo9p3wP6mPyGH0eFn9vDg9x9HtO+B/Ux9HtO+B/Ux+Qw+jws/t4cHuPo9p3wP6mPo9p3wP6mPyGH0eFn9vDg9x9HtO+B/Ux9HtO+B/Ux+Qw+jws/t4cHuPo9p3wP6mPo9p3wP6mPyGH0eFn9vDg9x9HtO+B/Ux9HtO+B/Ux+Qw+jws/t4cHuPo9p3wP6mY+j2nfA/qY/IYfR4Wf28Rt1nuPR7Fni6ZCNialJuTT925Jj6Ng49inXRHkuxt77eZ0DydT1Ua0bYj09PT9NOnO6QyAeJ7AwZAEOVV0+LbT2c4OPmj53dTZRbKq2PGcX1pn0kqZem4uY976Yya9/vPV03UdmZvh5uo0O7Hrl8+B7f6Pad8D+pmfo9p3wP6me78hh9PH4Wf28OD3H0e074H9TH0e074H9TH5DD6PCz+3hwe4+j2nfA/qY+j2nfA/qY/IYfR4Wf28OD3H0e074H9TH0e074H9TH5DD6PCz+3hwe4+j2nfA/qY+j2nfA/qY/IYfR4Wf28OD3H0e074H9TH0e074H9TH5DD6PCz+3hwe4+j2nfA/qY+j2nfA/qY/IYfR4Wf28touLPJ1Knit41yU5P8D3q7CDGxKMSHCiuMI/cTnz+p1+9lb26Gj2saRZMHOp7Ldo551SOVFcnu4rc+Zr9P3JuHsw1NvqXOBf8AVqvD8x6rV4fmebw83TvQoAv+q1eH5j1Wrw/MeHmd2FAF/wBVq8PzHqtXh+Y8PM7sKAL/AKrV4fmPVavD8x4eZ3YUAX/VavD8x6rV4fmPDzO7CgC/6rV4fmPVavD8x4eZ3YUAX/VavD8x6rV4fmPDzO7CgC/6rV4fmPVavD8x4eZ3YUAX/VavD8zPq1Xh+Y8PM7sKdEXO2O3YmdE1hCMFtFbGx7dDS7eNOWeW6WQYMndgAAAAAYMgwABjku8cl3kuBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GQY5LvHJd4uBkGOS7xyXeLgZBjku8cl3i4GwMGSgAAAAAwR2Pr2JCKft/kYz4WOWBsgDg2bIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgAGyGyAAbIbIABshsgANq39bb3EhFD2yU74cMTyyADaAAAEM/b/ImIZ+3+Rz1OFx5YABxbAAABHVfVc5quak4S4yS9zMQyKp3zpjNOyHXKK924EoI+nqV6oc10jXLj9xIAAAAAjd9SvVLmlZJbqPeBIAAABHffVjxUrZqCk+Kb97YEgBFRkU5Ck6pqai+L29zAlBFPJphfCmU0rJ9cY95KAAAAAgqyq7b7aYt86tlLdd4E4AAAAAAAAAAAAACOd9ULYVSmlOfsxfvN+S5cd1uuvbcDIBHfbGimdtnswXJ7ICQEdFsb6YWw34zipLdd5IAAAAEFeVXZk2URb6SvZy3XeTgAAAAAAAAAYclHtaW/V1vtMgACCrJrtyLaY786tlLdd4E4AAAijkUyu6GNkXYutxT7CUADHJcuO637dtzRX1SvlSpp2RW7j3ASAAAAAAAAAAAAAAAA2h7ZIRw9skO2nwxlyyADogAABDP2/yJiGft/kc9ThceWAAcWwAAcrF/wCH1rLqb2jbFWr/AHKWnyktQrzZNqOZOcf/AAS+kKnTbTdUt5WRlT+O5Y1DG6DR61X7WLxnH/5TlPNNGI+l1jNv7VUlWtvMxPK1JUTyVTXCuKcujlvyaQ0lWfoq2+C3uuc7Ip9732OZGeJbgz6dW25zi04vfdMWOplanZHDxL8etSd80uL+8xlZmbh4Ubbo1uyVqjxj3MpJ76bpH8+P/cX9f/wlH8+BbmrGt2bnYk6rMiFXQzmoNRfXHcmsv21qqnhBp1OXJrrRF6Q/4Gr+fAW/5io/ky/uhMzAxXmZ2Rk5VNEKkqp8VORJi6k/VsmeVFRnjNqaj7zXSf8AGaj/ADipGiWTHWKYdc5T6hc8if13UXhyzOiqVfBzUN+vYjzrpZWk4N09lKd0G9jEtUolo86GpK9UuEq+PWnxaN6lQ9EwfWJSjFSg04rtfWS79DtLsOPa1pmq9M3xx8nqk/DM7COZ6QxT0e5vZtbP5o3lwkNNNXT23and1KXVXv8AuwQqy8/Mrd+NXXGp+zGfbIuKlWaZ0MfqqVXBbe7dHPwNRpwsKGPlcq7qlx4be1+BnhUl+rSejzy6oJWQfFxl7mWdUyp4mnWX1pOUdmk1+By54l89BypOtqy6x28O5bjVtTxsnSJ10uUpNLdbez2dpLkp34PlCLfa1ucSqWStYz44sYbtxblPsXUjtVfZR/BHO0/9s6j/AKo/2RufhEmn5ttsr6ciCV1D2fH3kM8rUugnkqmuFcU5dHL2mka47mtT1V1JOxRi4rvfFHOjPEtwZq9XW5zi04vfdMxcrTrT1GfHCvjFKi98Zb/utk1+VYtSoxalFqUXOba7EU6Md5XozCuO/NQ3j90k2baLKeXK3OsWzntBLu2//csTKN45mXmTslhRqVUJceU/3mi1p+X65Q5SjwshJwnHuaODjY2DiuyjUoyhZGT2k29pr8jtaVXRDHcsaqdcJS32l7/vGMzMrJqObPGlTVVGLsulxTk+pGMe/Njk9Dk1xcZR3Vla6l+Jrq06oquOTR0lEn9aaXsFTAtX6RhXgW2W4zi3NSe6j+G5Zn2LFWpTWl5F9yirqXKDS97XYYjqc1o1mVOKV0N4Sj3S32KuRTN616ql+qvnG6X5DJpl+mFiJfqrrFc/y7fmZuSly3Isjm6fXZCDnYnybXsvb3FWlZv6empWVOSri5bLtjuWM/8AbOn/APzf2ZpO6GN6QuVu8Y21RjBtdr3E/wD0hNZl5N+XZRhRhtV1TnPv7iK/Jut03OqyauFtUGm12S6vca1Xw0zPy1lNwrun0kJtdTN8jMeZpubKNbjSoNRm/wB4tiCjIz6dKqvrrq6GupNxb65JF2/UuOJj2VQ52ZGyhBvvIl/ln/6X/wC0pZGP0ml6ddKErKqornGPbs0S5iPQvrLy8bIphmRrcLpcVKH7rFmZlX5tmPhRglV7c59/cVMevSbMmlY0J2WKSlunL6m3eSVXw0zUctZW8IXS5wnt1P7i3IzpbtlrGa7oqNnGKaTLmq5VuHjxvrScYzXSJr90qaXdG/WM22KkoyjHbddp08mmORj2Uy7JxcX9xceJSeVbNzJ12YtVHFyvntu/dHvI55mTkZVtOFGCVXVKc+/uKWiRtvyeV8dniQ6FfiTY+RDTMzKhlPhC2zpITa6nuS5n2tLOLnWTlfRfBQvpW7S7JLvN9Nyp5emwyLElKSbe33blXDUszPycuMXGqVfRwbXtfeV9Nz6sTTfVbuayIbx6NR632iykstVvWiV5ijF2Snxa2+9nQw5ZclKWVGEE/ZjF9hwn/lej+av7s9MuwYzMyS42u+s9JjOEoKDugoprrUi7ddmVUVQjXGy+b2ckvqxINe+rTj2tNwrvjKTS7ERanlKyOLYpz9Sm30koe8T6mRPVmZVOdXjZirfSp8ZQ+4qVSyv0xnxxYw3bi3Kfu6kQV+qPWMKWFCXR7yTm99n1PvLFWZViaxnu9uMJOP19updSJf2LuBmW23242TGMbqutuPZJMt5FKvplXJySl1NpnN0+XreqX5kItU8FCEmvaOsbx9wkuLjY1WLr/R0wUY9Bv+PWdo5f/wASf9D/AHOoMSXCks39PpKyrl0Ta6urjuXqruWs3U8IJRrT5JdbK2VdDF16u65uNcquKlt79ySj/MOT/JiZVFiZupZuM7aYUrZtfW/eNsbPzs+jpMaquCj1Pm+1m3o5+zf+pIejv7Of8yQi/RLenVYy0qWZbHi4bqUV3kdmZqGPT61fVX0S2coL2oplGnHnlej+RCpbyV0pJd+wjHSJ1JdDa7n1dCnLluS5KdPLzrVkU4+KoOdsefKXYkSYl+U7505VSTS3VkOxlXUPVa5U05VDVCjtG1fu7e410q1yzrIY9tl2Io7qU/c/uLc2OyCDFyqsqEpVNtRk4vddxOdGQAAAABtD2yQjh7ZIdtPhjLlkAHRAAACGft/kTEM/b/I56nC48sAA4tgAAw0n2pPYy+tbPrQABLZbJJIxxjvvst+/YyAMcVttstl2BpPtSZkAYaTWz2Y2W++y37zIAwkk90ktzE4twkobRk127dhsAORbTqV1EseSoSkuMrU+tr8DpY9EcfHrpj1xhFJN/cSgkRELYGk1s0mgCoGHGLe7Sb/AyABrwj2cV1/cbAAYSSe623faZAGEknukt2OMd99lv37GQAS2WyWyCSS2SSQAGHFPtSf4oyuoAA1utmt0YSS7El+CMgDGy336t+8bLffZb95kAYaTe723XYHFN7tJ7GQBhpPtSf4obLbbZbGQBjZbbdW3ZsZS2Wy22AAwopdiS/BBpPtSf4oyAMJJPdJJkOU741b40Yzs322k+wnAFTTsV4uPtY1K2cnOcl72y04p9qT/ABRkEiK9AlstkjHFb77Lfv2Mgoxxjttstu7YyAAa3WzW6MbLbbZbd2xkAYUUuxLq+4OMX2pPf7jIAbbLZJJAADGy332W/eZAAw4p9qTGy336t+8yAMJJLZJJBJJbLZGQBhJJbJJDit99lv8AgZAGGk1s0mgkktkkjIAJJdiSAAAAAAABtD2yQjh7ZIdtPhjLlkAHRAAACGft/kTEM/b/ACOepwuPLAAOLYAAObi5N1epXYmTLlv9eqTXau4RybsjVpVUy2ooX6xpe1LuNddrcMWOZW+NuO1KL799lsb6fR6ppXOL5Wzg7JSf70mtzHu6VPdqGJRb0dt8Iz7myWzIpqod07IqtdfL3HO0THps0uFk4xsnbu5ykt9+tnPn9XQtQpTbrqucYfhyQ3SU9FbfVTQ7rJqNaW7k/cbxalFSXWn1795y9Y/y/b/oj/dHQxv8NV/oX9jUSI7c/EplONl8IOHVJN9m5JRkVZNfOiyM496ZzMWquzXs2U4Rk4qOza7OpDHUcfXsiFe0a5VKckvczO6Sl63UsOm3o7MiEZ9zZLbkVU1qyycVCTSUu/c41H63Ds9UwoSonu+dkuuX3lex8/RXHUt3+sS+bJvWnchqOHZd0MMiDs7OKZNdfVRXztnGEV72zma5jU16VOcIRhKrZwcV2daK+ZO67UsSKqjY1Tz4TeybLOUxylOxj5mPlJui2NiXbszRajiOagr4OUpcEu9lGnHzHqdeTPHrpiouM+Mt+RjQ8eqXrNsoRdivkuTXWusbp4Kdec41wlOTSjFbt9xVeq4S475Na5dnWSZ/+AyP5Uv7M5uFjUy9HN3XFuVUpPddr6yzM3UDoW6jiUzULMiEZPsW5jOtcKK5QvjUpTS5Nb8t/cUNPxqZej28q4tyqk5Nrt7StNuXo9gN7t9LFfNmd0rTvZGTRjQ532RhHvbNKs7GulGNV0Zykm0k+3YoThG/0hULUpRrp5Qi+9iyqur0iodcVFyqk3su0u6Uow9QhTbmvLyElG+UYKb7F9xdtz8eGL6x0sXW+pS72UNJoqnl6hOUIyl08lu0NMhGMdSrSShG2W0e7tJEyLWlajDPx1LlFWrrlBe7tNdZunTDGdc5Q3vipNPtRj0fSWkUNJbvf+7NPSCCnTjQl1qV8U0W522fK3TqGJdb0Vd8JT7kyW/Ipxq+d1kYR72zl69TVRpyuqhGFlUk4OK7CPLldZrkYwpha66uUYTlslv7xur0tOvj5VGVHlRbGxL3pkz6luzk4mPlrVPWJ0V0wlDjJRlvuS69ZOrSbpVvZtJdX3lifVpSeOpYcreijkVub9yZLfkU48Od1kYR72yrZp+JLT1S4xhWoraa933kGY6lkYtca3k3qG8N5dW3eyXPyUv42Zj5SbotjYl27M0s1HDq5c74R4y4tN9jObR0sfSCvpKoVOVUt1B9vYb6TRVPL1CcoRlLp5Ldom6SnVpurvrU6pqcX2NMgep4St6L1mvn3bnIhKWPgauqd4qFrUUvdudCnAxZ6TCqUYqEq03Pu6u0tzJS9bdXTW52zjCK97Zpj5mPlJui2M9u3ZnHzVN52FRUo5EYV8oqcuqW3vJ68fMlqdORLHrpjFOM3GW/JDdNlFN9so6s3ZJ9G5KG79nqfYWtKuctJptunu3DeUpMo4/saz+Mv+1la2U3oum0xipK2aTi3ty+4zde1p3KNQxMizhTfCcl7kzbIy8fFSd9sa0+zd9pyr8bOulRKOJTS6pqSlGfYu7sJaYRv17KdqUnVCKgn7tzW6UptRldPrclVc50uhSST6t92X8qThi2yVirai3za9k51NUKvSOxVxUU6VJ7Lt6y5qv7Lyf5cixxIpalqPqukwcb4yvsgnGSXtfeWtKVbocq8qeSm9nKT32ZztQ/ytS/eoQO9FJLq2RnG5lZRrIqlfKhTTsiuTj3IesVPI6BTTsS5ce5HP1FeraliZa6oyfRTf49hWhOcsXUtQg3ynvGtrwrqLOXwlOpLUsOFvRSyK1PubJbsiqiMZWzUYyaim/e2UsHCxpaRVCUIuM605Sa7d12nLVkp6Bic23xyIxTfvSbG6Snor76seClbNQi3xTfezc5fpB/gqf58Dqe41E+xztMunO7O6SbcYXNR5P2UXKcmm+p21WKUF1cvceasstV+ZBxksR5L6ace3bc6WsuNel0VY6SqnOMdk+poxGS06FWoYl1vRVXwlPuTJMjJpxoc77Iwj3tnGysXOuphGvDoqlXJShKM/Z2F7vs12xQphc6q1xjOW22/vG6SnZx8mnJhzosjOPemQPVcFRjJ5MEpdhVwsbKhqNl9lMKa5w2lGEt92iP0fxqZ6SnOuMubfLddpd0pTsQnGcVKLTi+tNPtNjlej/Vi3VJtwrtlGDfcdU1E3FpIACgAAAAAAAAAANoe2SEcPbJDtp8MZcsgA6IAAAQz9v8iUin7f5HPU4XHlgAHFsAAFfOxvXMSyhycVPq3S7Owlqr6KmFe+6jFR/HY3AHN/RU6nOOLlWU1ze/BLs/Amjp1EcCWGk+jktn3v7y4CbYW3Is0ay3GdFmbZKtLaMduw6tceFcYdvFJbmwEYxBbhwondrea6rpUzio9aXb1I6GHp8cZ2TnOVttvtTl7yzGmuNkrIwipy9qSXWzckY0W5UNHdcXTDLtjjP/APTX/kraphrD0KvHUnNRtXX+O53jS2mu6HG2EZxT32ktxtgtz56VK6UY5GVZbTF79G12/iWMzAhlOE1OVdtfXGcfcWwXbBanjYVld3TX5M7ppbJPqSNsHEWHCyKk5c7HPdrs3LQFQiO+rpqLK29lOLjv3bkNGGqdO9UUm0oOHLbv3LQFfIq4+GqNPWIpNpRceW3fuQPSk9PoxOle1M1NS27dm2dEDbBbl6nDHeVTKWQ8e9J8bPc13FXEhz1yMoXyyOFbU7Pcm/cdq2mu6PG2EZx7pLcVU1Ux41VxhHuitjM43K2hxMT1Wd8lJy6axz227NzGLhLHnkycnJXzcmmuzctg1UIpafgywYuCulOr92DXsm2oYMc6uEJScVGal1e/YtgVFUW5v6KlOyDyMqy6ut8owkv7k2ZgRybIXQslVdDqjOJcA2wtqmLhzqtdt2RO6bXHd9SX5E91ML6p1WJOMls0SARFI5f6Jk61RZl2zx11dG/eu7cmy9OV067abJU2VLipR7i8Bthbc6jTOizIZU752WKLi3L3k+JiLFnfJScumsc9muzctAbYLU6MCFTyuT5xyJuTi12bldaRJV9Asu31bs6P7u7c6gG2C1LJ06q6uqMG6pU/Zyh2xGPhWV3K2/JndKK2SfUkXQNsFqVeAoLMXNv1ltvq9ndNGFplUtNhh2NyUOyS7U+8vAbYLc+vT7ekg78yyyMHvGPZ5m2Vp/TZCyKbpU3JcXKK33ReA2wWoYum9BmSyZXzsnKPF8i1lUes41lLbipxcd+4lAiKRQyNNV2lwwnY0oxiuW3cX0AIihy9dsqeDOhtO6eyhBPrb3LeLiwowYYzScVDi/v7yV0VStVrri7F1KTXWiQV7tXLWkTjW6a8y2GO+ro17l3bli7TqLcBYiThXH2dvdsXANsFuTbpFuRGCvzbLOElJbruOsAIiktTx8CFTyVJ843zcnFrs3I69LgsOeJbN2Ut7xT7YHQA2wtudDTrd4RtzLZ1xaaj2b7d7JMvT1ddG+qyVN0Vtzj7195dBNsFqmLiTpnKy2+d1kls2+peRydGw7rdLg6suylSb3ikehNKqa6YcKoRhFdkYobS0eHi14ePGmpfVXvfvJwDXCAAAAAAAAAAAAADaHtkhHD2yQ7afDGXLIAOiIujn8R+Q6OfxH5EoAi4T+I/Iw6pN+38iUE5EXRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlAqC0XRS8fyHRS8fyJQKgtF0UvH8h0UvH8iUCoLRdFLx/IdFLx/IlA2wWiVUk/b+RnhP4j8iQDgR9HP4j8h0c/iPyJQUf//Z';



// jspdf
router.post('/pdf', async (req, res)=> {
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
let aid= req.body.uid;
// '1619683844753'
let id= dbs.collection('biographies').doc(aid);
let data=await id.get(); 
if(data){
     questions=data.data().questions;
     answers=data.data().answers;

  

  
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
                    //  console.log(res)
                     doc.addPage();
                     console.log('[+] '+qno+' in response+++++++++++++++++++++++++++++++++++++');
                     
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


}


    setTimeout(async() => {
        let uid= uuid();
        console.log(uid);
        doc.save('tmp/'+'test.pdf');
        // link
        let z =await upload('tmp/'+'test.pdf', uid);
                let link = "https://firebasestorage.googleapis.com/v0/b/" + 'generations-a0df0.appspot.com' + "/o/" + encodeURIComponent(uid) + "?alt=media&token=" + uid;
                console.log(link);
                
        console.log('[+] saved!');
        res.send(link);
     
    }, 3000);

    // doc.save('tmp/'+ docname+".pdf");
   





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

 router.post('/bye', (req,res)=>{

    console.log('triggered!');
    let uid= req.body.uid; 
    console.log(uid);
    res.send('https://firebasestorage.googleapis.com/v0/b/generations-a0df0.appspot.com/o/bd37f096-7ff1-48[…]?alt=media&token=bd37f096-7ff1-48dc-b740-13b5fe16d232');
    // res.sendFile('tmp/'+'aka2.pdf');
 });

module.exports = router

