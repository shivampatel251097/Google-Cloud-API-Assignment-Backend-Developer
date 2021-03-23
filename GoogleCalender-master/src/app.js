const express = require('express')
const app = express()
const path = require('path')
const bodyParser = require('body-parser');

//Node mailer
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

var transporter = nodemailer.createTransport(smtpTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  auth: {
    user: 'patelshivam251097@gmail.com',
    pass: 'SH@ivam8601'
  }
}));

var event_arr=['Extracting finished. Refresh the browser to see your Google events'];

app.use(express.static(path.join(__dirname, 'public')))
app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get('/', (req, res) =>{
  res.render('index.html');
})

app.post('/', (req, res) => {
  const tkn=req.body.token;
  const fs = require('fs');
  const {google} = require('googleapis');

  const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
  // The file token.json stores the user's access and refresh tokens, and is
  // created automatically when the authorization flow completes for the first
  // time.
  const TOKEN_PATH = 'token.json';

  // Load client secrets from a local file.
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Calendar API.
    authorize(JSON.parse(content), listEvents);
  });

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client, callback);
      oAuth2Client.setCredentials(JSON.parse(token));
      callback(oAuth2Client);
    });
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback for the authorized client.
   */
  function getAccessToken(oAuth2Client, callback) {
    oAuth2Client.getToken(tkn, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  }

  /**
   * Lists the next events on the user's primary calendar.
   * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
   */
  function listEvents(auth) {
    async function fun(){
    const calendar = await google.calendar({version: 'v3', auth});
    calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 30,
      singleEvents: true,
      orderBy: 'startTime',
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const events = res.data.items;
      if (events.length) {
        console.log('Your upcoming events:', events);
        events.map((event, i) => {
          event_arr.push(event);
        });
      } else {
        console.log('No upcoming events found.');
      }
    });
  }
  fun()
  }
  res.send(event_arr);
  res.render('index.html');
});


app.post('/events', (req, res) =>{
  const { google } = require('googleapis')
  const { OAuth2 } = google.auth

  // Create a new instance of oAuth and set our Client ID & Client Secret.
  const oAuth2Client = new OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET)

  // Call the setCredentials method on our oAuth2Client instance and set our refresh token.
  oAuth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  })

  // Create a new calender instance.
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

  // Create a new event start date instance for temp uses in our calendar.
  const eventStartTime = new Date()
  eventStartTime.setDate(eventStartTime.getDay() + 2)

  // Create a new event end date instance for temp uses in our calendar.
  const eventEndTime = new Date()
  eventEndTime.setDate(eventEndTime.getDay() + 2)
  eventEndTime.setMinutes(eventEndTime.getMinutes() + 60)

  // Create a dummy event for temp uses in our calendar
  const event = {
    summary: `${req.body.summary}`,
    description: `${req.body.description}`,
    colorId: 6,
    start: {
      dateTime: eventStartTime,
    },
    end: {
      dateTime: eventEndTime,
    },
  }
//To check if calendar is already booked for the time slot
  calendar.freebusy.query(
    {
      resource: {
        timeMin: eventStartTime,
        timeMax: eventEndTime,
        items: [{ id: 'primary' }],
      },
    },
    (err, res) => {
      if (err) return console.error('Error in Free query block: ', err)
      const eventArray = res.data.calendars.primary.busy;

      // Check if event array is empty which means we are not busy
      if (eventArray.length === 0) {
        // If we are not busy create a new calendar event.
        return calendar.events.insert(
          { calendarId: 'primary', resource: event },
          err => {
            // Check for errors and log them if they exist.
            if (err) return console.error('Error while Creating Calender Event:', err)
            // Else log that the event was created.
            return console.log('Event created successfully.')
          })
        }
      // If event array is not empty log that we are busy.
      return console.log(`Calendar is busy at the time slot..`)
    }
  )
  console.log(req.body);
  var mailOptions = {
    from: 'patelshivam251097@gmail.com',
    to: req.body.to,
    subject: req.body.summary,
    text: req.body.description
  };
  
  transporter.sendMail(mailOptions, function(err, res){
    if (err) {
      console.log(err);
    } else {
      console.log('Email sent: ' + res.response);
    }
  }); 
  res.render('events.html')
})

app.listen(3000, () =>{
  console.log('Server running on port 3000')
})