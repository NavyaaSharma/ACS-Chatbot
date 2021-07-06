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

bot.use({
    botbuilder: (session, next) => {
        session.sendTyping();
        next();
    }
});
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id == message.address.bot.id) {
                var reply = new builder.Message()
                    .address(message.address)
                    .text('Hi i am your customer support chatbot');
                bot.send(reply);
            }
        })
    }
})

bot.dialog('/', intents)

intents.matches('Greeting', (session, args, next) => {
    session.send("Hey there! How can I help you today ?");
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
    console.log(session.userData.dept);
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
    session.send("Glad I could help you!");
})

intents.matches('None', (session, args, next) => {
    session.send("Sorry I didn't get that");
})

bot.dialog('menu', [
    function (session) {
        builder.Prompts.choice(session, "To let me understand your problem better please select under which category your problem falls?",
            'Need troubleshooting with a device|Need assistance to setup a device|Enquire about a product|Get demo for a product|Give for repair|Complaint about a product|Others', { listStyle: builder.ListStyle.button });
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

// bot.dialog('menu2', [
//     function (session) {
//         builder.Prompts.choice(session, "For what do you need the assistance?",
//             'Washing machines, AC, Microwave, Oven, Fridge, TV, Charger|PC, Laptop, Mobile, Tablet|Company software/ Account activation|Others|I want to go back', { listStyle: builder.ListStyle.button });
//     },
//     function (session, results) {
//         if (results.response.entity == "Washing machines, AC, Microwave, Oven, Fridge, TV, Charger") {
//             session.beginDialog('opt1.1')
//         }
//         else if (results.response.entity == "PC, Laptop, Mobile, Tablet") {
//             session.beginDialog('askAgain2')
//         }
//         else if (results.response.entity == "Company software/ Account activation") {
//             session.beginDialog('opt1.3')
//         }
//         else if (results.response.entity == "Others") {
//             session.beginDialog('askAgain2')
//         }
//         else if (results.response.entity == "I want to go back") {
//             session.beginDialog('menu');
//         }
//     },
//     function (session, results) {
//         session.endDialogWithResult(results);
//     }
// ]);

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
        builder.Prompts.choice(session, "Please chose the best suited category under which your problem falls", 'Hardware|Software|Sales', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        if (results.response) {
            session.userData.dept = results.response.entity;
            session.beginDialog('preconfirm')
        }
    }
]);

bot.dialog('preconfirm', [(session, args, next) => {
    session.send("Thanks for contacting me. You will be connected to our " + session.userData.dept + " Department customer service team");
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
                session.send("Please click on the link to connect to our " + session.userData.dept + " Department customer service team. " + `https://chatbotmeeting.z23.web.core.windows.net?id=${id}&dept=${session.userData.dept}`);
                session.send("Thanks for contacting me.")
                delete session.userData.dept;
                delete session.userData.issue;
                session.replaceDialog('/');
            })
    }
    else {
        session.replaceDialog('menu');
    }
}])

bot.dialog('confirm', [
    function (session) {
        builder.Prompts.choice(session, "Do you wish to continue connecting?", 'Yes|No', { listStyle: builder.ListStyle.button });
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