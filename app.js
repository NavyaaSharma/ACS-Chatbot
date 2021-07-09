var builder = require('botbuilder')
var restify = require('restify')
var crypto = require('crypto')
var fetch = require('node-fetch')

var server = restify.createServer()
server.listen(process.env.PORT || 3978, function () {
    console.log("Server is listening to port 3978")
})

var appId = "12beee4a-668d-462d-9e4b-28e88a6a6896";
var appSecret = "Veb7#J}jy@0bjY#Ax}#45MdMFhC.5";

//Chat connector to bot emulator
var inMemoryStorage = new builder.MemoryBotStorage();
var connector = new builder.ChatConnector({
    appId: appId,
    appPassword: appSecret
})
var inMemoryStorage = new builder.MemoryBotStorage();
var bot = new builder.UniversalBot(connector).set('storage', inMemoryStorage);

server.post('/api/messages', connector.listen());

var luisAppId = "412fda03-55c0-4ed7-ac8c-1b52aec7c799"
var luisAPIKey = "79943167d9e14c51ade480b2ba8595f4"
var luisAPIHostName = "westus.api.cognitive.microsoft.com"
const luisModeUrl = "https://" + luisAPIHostName + "/luis/v2.0/apps/" + luisAppId + "?subscription-key=" + luisAPIKey;

var recognizer = new builder.LuisRecognizer(luisModeUrl);
var intents = new builder.IntentDialog({
    recognizers: [recognizer]
})

const axios = require('axios').default;
const { v4: uuidv4 } = require('uuid');

var subscriptionKey = "6b3e1658032a4ec39e0965bd0b280988";
var endpoint = "https://api.cognitive.microsofttranslator.com";

// Add your location, also known as region. The default is global.
// This is required if using a Cognitive Services resource.
var location = "southeastasia";
function translate(text, from, to) {
    var newstr = "xx";
    axios({
        baseURL: endpoint,
        url: '/translate',
        method: 'post',
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey,
            'Ocp-Apim-Subscription-Region': location,
            'Content-type': 'application/json',
            'X-ClientTraceId': uuidv4().toString()
        },
        params: {
            'api-version': '3.0',
            'from': from,
            'to': to
        },
        data: [{
            'text': text
        }],
        responseType: 'json'
    }).then(function (response) {
        newstr = response.data[0].translations[0].text
    })
    // console.log("hey", JSON.parse(response.data, null, 4))
    console.log("newstr", newstr)
    return newstr;
}

// bot.use({
//     botbuilder: (session, next) => {
//         session.sendTyping();
//         next();
//     }
// });
var useLang = "";
bot.use({
    receive: function (event, next) {
        //console.log("((((((((((((", event.text)
        //console.log("in recieve", useLang)
        if (useLang != "" && useLang != "en") {
            //console.log("heyyyyyyyyy")
            axios({
                baseURL: endpoint,
                url: '/translate',
                method: 'post',
                headers: {
                    'Ocp-Apim-Subscription-Key': subscriptionKey,
                    'Ocp-Apim-Subscription-Region': location,
                    'Content-type': 'application/json',
                    'X-ClientTraceId': uuidv4().toString()
                },
                params: {
                    'api-version': '3.0',
                    'from': useLang,
                    'to': 'en'
                },
                data: [{
                    'text': event.text
                }],
                responseType: 'json'
            }).then(function (response) {
                //console.log(response.data[0].translations[0].text)
                event.text = response.data[0].translations[0].text
                next();
            })
        }
        else {
            next();
        }

    },
    botbuilder: (session, next) => {
        session.sendTyping();
        next();
    }
})
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id == message.address.bot.id) {
                var reply = new builder.Message()
                    .address(message.address)
                    .text('Hi i am your customer support chatbot. \n To start chatting type /start');
                bot.send(reply);
            }
        })
    }
})


bot.dialog('/', [function (session) {
    builder.Prompts.choice(session, "Please select the language to continue", 'English|French|Italian', { listStyle: builder.ListStyle.button });
},
function (session, results) {
    if (results.response) {
        if (results.response.entity == 'French')
            useLang = 'fr';
        else if (results.response.entity == 'Italian')
            useLang = 'it';
        else {
            useLang = 'en'
        }
        if (useLang == "en")
            session.send('How can I help you today ?')
        else if (useLang == "fr")
            session.send("Comment puis-je vous aider aujourd'hui ?")
        else if (useLang == "it")
            session.send('Come posso aiutarti oggi ?')

        session.beginDialog('/start')
    }
}])
bot.dialog('/start', intents)

intents.matches('Greeting', (session, args, next) => {
    if (useLang == "en")
        session.send("Hey there! How can I help you today?");
    else if (useLang == "fr")
        session.send("Salut! Comment puis-je vous aider aujourd'hui?")
    else if (useLang == "it")
        session.send("Ehilà! come posso aiutarti oggi?")

})

intents.matches('Problem', [(session, args, next) => {
    session.userData.issue = session.message.text;
    var hardwareEntity = args.entities.filter(e => e.type == 'hardware');
    var softwareEntity = args.entities.filter(e => e.type == 'software');
    var salesEntity = args.entities.filter(e => e.type == 'sales');

    if ((hardwareEntity.length > 0 && softwareEntity.length > 0) || (hardwareEntity.length > 0 && salesEntity.length > 0) || (salesEntity.length > 0 && softwareEntity.length > 0) || (hardwareEntity.length == 0 && salesEntity.length == 0 && softwareEntity.length == 0)) {
        delete session.userData.dept;
    }
    else {
        if (hardwareEntity.length > 0)
            session.userData.dept = "Hardware";
        else if (softwareEntity.length > 0)
            session.userData.dept = "Software";
        else if (salesEntity.length > 0)
            session.userData.dept = "Sales";
    }
    //console.log(session.userData.dept);
    if (!session.userData.dept) {
        session.beginDialog('menu');
    }
    else {
        next();
    }
}, (session, args, next) => {
    session.beginDialog('preconfirm');
}])

intents.matches('Thanks', (session, args, next) => {
    if (useLang == "en")
        session.send("Glad I could help you!");
    else if (useLang == "fr")
        session.send("Content d'avoir pu t'aider !")
    else if (useLang == "it")
        session.send("Felice di averti potuto aiutare!")
})

intents.matches('None', (session, args, next) => {
    if (useLang == "en")
        session.send("Sorry I didn't get that");
    else if (useLang == "fr")
        session.send("Désolé je n'ai pas compris")
    else if (useLang == "it")
        session.send("Mi dispiace non averlo capito")
})

bot.dialog('menu', [
    function (session) {
        if (useLang == "en") {
            builder.Prompts.choice(session, "To let me understand your problem better please select under which category your problem falls?",
                'Need troubleshooting with a device|Need assistance to setup a device|Enquire about a product|Get demo for a product|Give for repair|Complaint about a product|Others', { listStyle: builder.ListStyle.button });
        }
        else if (useLang == "fr") {
            builder.Prompts.choice(session, "Pour me permettre de mieux comprendre votre problème, veuillez sélectionner dans quelle catégorie appartient votre problème ?",
                'Need troubleshooting with a device|Need assistance to setup a device|Enquire about a product|Get demo for a product|Give for repair|Complaint about a product|Others', { listStyle: builder.ListStyle.button });
        }
        else if (useLang == "it") {
            builder.Prompts.choice(session, "Per farmi capire meglio il tuo problema, seleziona in quale categoria rientra il tuo problema?",
                'Need troubleshooting with a device|Need assistance to setup a device|Enquire about a product|Get demo for a product|Give for repair|Complaint about a product|Others', { listStyle: builder.ListStyle.button });
        }

    },
    function (session, results) {
        if (results.response.entity == "Need troubleshooting with a device") {
            session.beginDialog('askAgain2');
        }
        else if (results.response.entity == "Need assistance to setup a device") {
            session.beginDialog('askAgain2');
        }
        else if (results.response.entity == "Enquire about a product") {
            session.beginDialog('opt2');
        }
        else if (results.response.entity == "Get demo for a product") {
            session.beginDialog('opt2');
        }
        else if (results.response.entity == "Give for repair") {
            session.beginDialog('opt2');
        }
        else if (results.response.entity == "Complaint about a product") {
            session.beginDialog('opt2');
        }
        else if (results.response.entity == "Others") {
            session.beginDialog('askAgain2');
        }
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

bot.dialog('opt1.1', [(session, args, next) => {
    session.userData.dept = "Hardware"
    session.beginDialog('preconfirm');
}, (session, results) => {
    session.endDialogWithResult(results);
}])

bot.dialog('opt1.3', [(session, args, next) => {
    session.userData.dept = "Software"
    session.beginDialog('preconfirm')
}, (session, results) => {
    session.endDialogWithResult(results);
}])

bot.dialog('opt2', [(session, args, next) => {
    session.userData.dept = "Sales"
    session.beginDialog('preconfirm')
}, (session, results) => {
    session.endDialogWithResult(results);
}])

bot.dialog('askAgain', [
    function (session) {
        builder.Prompts.choice(session, "Please chose the best suited category under which your problem falls", 'Hardware|Software|Sales', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        if (results.response) {
            session.userData.dept = results.response.entity;
            session.endDialogWithResult(results)
        }
    }
]);

bot.dialog('askAgain2', [
    function (session) {
        if (useLang == "en") {
            builder.Prompts.choice(session, "Please chose the best suited category under which your problem falls", 'Hardware|Software|Sales', { listStyle: builder.ListStyle.button });
        }
        else if (useLang == "fr") {
            builder.Prompts.choice(session, "Veuillez choisir la catégorie la mieux adaptée à laquelle appartient votre problème", 'Hardware|Software|Sales', { listStyle: builder.ListStyle.button });
        }
        else if (useLang == "it") {
            builder.Prompts.choice(session, "Scegli la categoria più adatta in cui ricade il tuo problema", 'Hardware|Software|Sales', { listStyle: builder.ListStyle.button });
        }
    },
    function (session, results) {
        if (results.response) {
            session.userData.dept = results.response.entity;
            session.beginDialog('preconfirm')
        }
    }
]);

bot.dialog('preconfirm', [(session, args, next) => {
    if (useLang == "en") {
        session.send("Thanks for contacting me. You will be connected to our " + session.userData.dept + " Department customer service team");
    }
    else if (useLang == "fr") {
        session.send("Merci de m'avoir contacté. Vous serez connecté à notre " + session.userData.dept + " Department customer service team");
    }
    else if (useLang == "it") {
        session.send("Grazie per avermi contattato. Sarai connesso al nostro " + session.userData.dept + " Department customer service team");
    }
    session.beginDialog('confirm');
}, (session, results) => {
    if (session.userData.status == "Yes") {
        var id = crypto.randomBytes(20).toString('hex');
        console.log(id)
        data = {
            "id": id,
            "issue": session.userData.issue
        }
        let options = {
            method: 'POST',
            headers: {
                'Content-Type':
                    'application/json;charset=utf-8'
            },
            body: JSON.stringify(data)
        }

        let fetchRes = fetch(
            "https://chatbot-dictionary.herokuapp.com/save/query",
            options);
        fetchRes.then(res =>
            res.json()).then(d => {
                console.log(d)
                if (useLang == "en") {
                    session.send("Please click on the link to connect to our " + session.userData.dept + " Department customer service team. " + `http://localhost:8080?id=${id}&dept=${session.userData.dept}`);
                    session.send("Thanks for contacting me.")
                }
                else if (useLang == "fr") {
                    session.send("Veuillez cliquer sur le lien pour vous connecter à notre " + session.userData.dept + " Department customer service team. " + `http://localhost:8080?id=${id}&dept=${session.userData.dept}`);
                    session.send("Merci de m'avoir contacté.")
                }
                else if (useLang == "it") {
                    session.send("Fare clic sul collegamento per connettersi al nostro " + session.userData.dept + " Department customer service team. " + `http://localhost:8080?id=${id}&dept=${session.userData.dept}`);
                    session.send("Grazie per avermi contattato.")
                }
                delete session.userData.dept;
                delete session.userData.issue;
                session.replaceDialog('/start');
            })
    }
    else {
        session.replaceDialog('menu');
    }
}])

bot.dialog('confirm', [
    function (session) {
        if (useLang == "en") {
            builder.Prompts.choice(session, "Do you wish to continue connecting?", 'Yes|No', { listStyle: builder.ListStyle.button });
        }
        else if (useLang == "fr") {
            builder.Prompts.choice(session, "Souhaitez-vous continuer à vous connecter ?", 'Yes|No', { listStyle: builder.ListStyle.button });
        }
        else if (useLang == "it") {
            builder.Prompts.choice(session, "Vuoi continuare a connetterti?", 'Yes|No', { listStyle: builder.ListStyle.button });
        }
    },
    function (session, results) {
        if (results.response) {
            session.userData.status = results.response.entity;
            session.endDialogWithResult(results)
        }
    }
]);

bot.dialog('restart', [
    function (session) {
        builder.Prompts.choice(session, "Do you wish to start again", 'Yes|No', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        if (results.response) {
            session.userData.restart = results.response.entity;
            session.endDialogWithResult(results)
        }
    }
]);