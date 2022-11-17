const express = require("express")
const mysql = require("mysql")
const path = require("path")
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
const flash = require('connect-flash');


const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(flash());
app.set("view engine", "ejs");
app.set('/', path.join(__dirname, '/views'));
// app.use(function(req, res, next){
//     res.locals.message = req.flash();
//     next();
// });


const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "airport-dbms-trial"
})

const oneDay = 1000 * 60 * 60 * 24;
//session middleware
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false
}));

// parsing the incoming data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//serving public file
app.use(express.static(__dirname));

// cookie parser middleware
app.use(cookieParser());

let currUser
app.use((req, res, next)=>{
    res.locals.currUser=req.session.email
    res.locals.errmsg=req.session.err2
    next();
})
// a variable to save a session
var session;

// console.log(req.session.email)

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log("db connected")
})

function convert(str) {
    var date = new Date(str),
        mnth = ("0" + (date.getMonth() + 1)).slice(-2),
        day = ("0" + date.getDate()).slice(-2);
    return [date.getFullYear(), mnth, day].join("-");
}
var moment = require('moment');
exports.index = function (req, res) {
    res.render('index', { moment: moment });
}
app.get('/', (req, res) => {
    res.render('home.ejs');
})

app.get('/create_acct', (req, res) => {
    console.log("i am here")
    var username = req.query.username
    var email = req.query.email
    var password = req.query.password

    db.query("insert into login(email, username, password) values (?, ?, ?)", [email, username, password], (err, result) => {
        if (err) console.log(err)

        res.redirect('/sign_in')
    })
})
app.get('/search', (req, res) => {
    var email = req.query.email
    var password = req.query.password
    let sql = `select * from login where email='${email}'`
    console.log(email);

    let prompty = {
        validity: null
    };

    db.query(sql, (err, result) => {
        if (err) console.log(err)

        // console.log(password)
        // console.log(result[0].password)
        if (result.length == 0) {
            res.render('sign_in.ejs', { validity: null });
            // prompt("useremail does not exist")
        }
        else if (result[0].password == password) {
            session = req.session;
            session.email = req.query.email;
            // console.log(req.session)
            res.render('home.ejs', { result })
        }
        else {
            res.render('sign_in.ejs', { validity: null })
            // prompt("invali password")
        }

    })


})

app.get('/logout', (req, res) => {
    req.session.destroy();
    // console.log(req.session.user)

    res.redirect('/sign_in');

});

app.get('/home', (req, res) => {

    if (req.session.email != undefined) {
        res.render('home.ejs', { email: req.session.email });
    }
    else {
        res.render('home.ejs', { result6: [] })
    }
})




app.get('/sign_in', (req, res) => {
    res.render('sign_in.ejs', { validity: !null })
})
app.get('/index', (req, res) => {
    res.render('index.ejs')
})
app.get('/new', (req, res) => {
    res.render('reset.ejs')
})
app.get('/amenities', (req, res) => {

    db.query("select r.review, r.airline, l.username, r.rating from reviews as r join login as l on l.login_id=r.login_id", (err, result) => {
        res.render('amenities.ejs', { result })
    })

})


app.get('/review_search', (req, res) => {

    let myobject = {
        airline: req.query.airline,
        username: req.query.username
    }

    db.query("select r.review, r.airline, l.username, r.rating from reviews as r join login as l on l.login_id=r.login_id where l.username like '%" + myobject.username + "%' and r.airline like '%" + myobject.airline + "%'", (err, result) => {
        res.render('amenities.ejs', { result })
    })
})
app.get('/find_flight', (req, res) => {
    if (req.session.email != undefined) {
        console.log(req.session.email)
    }
    else if (req.session.email == undefined) {
        console.log("req.session.email")
    }
    // console.log(session.email)
    res.render('find_flight.ejs', {date_result: true, flight_result: true})
})
app.get('/booking/:flight_id/:arrival_schedule_id', (req, res) => {
    let myobject={
        passengers: req.query.passengers
    }
    console.log(myobject);
    if (req.session.email != undefined) {
        console.log("me yaha hun");
        // console.log(result.schedule_id)
        db.query("select * from arrival_flights as af join flight as f on af.flight_id=f.flight_id where f.flight_id=? and af.arrival_schedule_id=?", [req.params.flight_id, req.params.arrival_schedule_id], (err, myresult) => {
            if (err) console.log(err)
            // console.log(result);
            // req.params.passengers
            console.log(req.query.passengers);
            if (myresult[0].passenger_no < myresult[0].capacity) {
                console.log(myresult[0].passenger_no);
                console.log(myresult[0].capacity);
                db.query("update arrival_flights set passenger_no=passenger_no+? where flight_id=?", [req.params.passengers, req.params.flight_id], (err, result2) => {
                    if (err) console.log(err)
                })
                res.render('booking.ejs', {
                    flight_id: req.params.flight_id,
                    schedule_id: req.params.arrival_schedule_id, abc: 3,
                    myresult: myresult, 
                    passengers: req.query.passengers
                })
            }
            else {
                // req.flash('message', 'laude sab book ho chuke he')
                // prompt("flight full")
                // alert("flight is full")
                // res.redirect('/home')
                req.session.err2=`Flight you have selected is full... please try for different flight`
                // console.log("flight full");
                // let sql=`select * from arrival_flights as af join route as r on r.route_id=af.route_id where arrival_schedule_id=${req.params.arrival_schedule_id} and flight_id=${req.params.flight_id}`
                // db.query(sql, (err, result)=>{
                //     console.log(result);
                //     let sql2 = `select f.flight_id, f.airline, r.from_route, r.to_route, af.arrival_time, af.duration, af.arrival_schedule_id, af.economy_cost, af.business_cost, af.first_cost from flight as f join arrival_flights as af on f.flight_id=af.flight_id join route as r on r.route_id=af.route_id where r.from_route= '${result[0].from_route}' and r.to_route= '${result[0].to_route}' and date(af.arrival_time) = '${moment(new Date(result[0].arrival_time)).format('YYYY-MM-DD')}' order by f.airline`
                //     db.query(sql, (err, results)=>{
                //         console.log(results);
                //         for (let values of results) {
                //             values.arrival_time = moment(new Date(values.arrival_time)).format('YYYY-MM-DD HH:mm:ss')
                //         }
                //         console.log(results)
                //         let result3 = results
                //         res.render('flight_output.ejs', { results, result3, result2: 'Cost' })
                //     })
                // })
                    res.render('find_flight.ejs', {date_result: true, flight_result: true})

            }
        })

    }
    else {
        res.redirect('/sign_in')
    }
})

app.get('/bookticket/:flight_id/:schedule_id/:name/:email/:mobile_no/:aadhar_no/:class', (req, res) => {
    let data = {
        name: req.params.name,
        email: req.params.email,
        mobile_no: req.params.mobile_no,
        aadhar_no: req.params.aadhar_no,
        class: req.params.class
    }
    // console.log(data)
    // console.log("schedule_id is" + req.params.schedule_id)
    
    console.log(req.params.flight_id)
    let sql2 = `select aadhar_no from passengers`
    let sql3 = `select * from bookings where flight_id=${req.params.flight_id} and schedule_id=${req.params.schedule_id}`

    db.query(sql2, (err, result) => {
        if (err) { console.log(err) }
        else {
            let check = false;
            for (let values of result) {
                if (values.aadhar_no == data.aadhar_no) {
                    check = true;
                    break;
                }
            }
            if (!check && data.name != null && data.email != null && data.mobile_no != null && data.aadhar_no != null) {
                let sql1 = `insert into passengers(name, email, mobile_no, aadhar_no) values ('${data.name}','${data.email}','${data.mobile_no}','${data.aadhar_no}')  `
                let sql4 = `select passenger_id from passengers where aadhar_no='${data.aadhar_no}'`
                db.query(sql1, (err, result1) => {
                    if (err) console.log(err)

                    db.query(sql3, (err, result2) => {
                        if (err) console.log(err)
                        db.query(sql4, (err, result3) => {
                            if (err) console.log(err)
                        
                            console.log(result2[0].booking_id)
                            db.query("insert into tickets(booking_id, passenger_id, user_mail) values (?, ?, ?)", [result2[0].booking_id, result3[0].passenger_id, req.session.email], (err, result4) => {
                                console.log(data.name)
                                res.render('booking.ejs', {
                                    flight_id: req.params.flight_id,
                                    schedule_id: req.params.schedule_id
                                })
                            })
                        })
                    })

                })
            }
            else if (check) {
                let sql1 = `insert into passengers(name, email, mobile_no, aadhar_no) values ('${data.name}','${data.email}','${data.mobile_no}','${data.aadhar_no}')  `
                let sql4 = `select passenger_id from passengers where aadhar_no='${data.aadhar_no}'`
                db.query(sql1, (err, result1) => {
                    if (err) console.log(err)

                    db.query(sql3, (err, result2) => {
                        if (err) console.log(err)
                        db.query(sql4, (err, result3) => {
                            if (err) console.log(err)
                            console.log(result2[0].booking_id)
                            db.query("insert into tickets(booking_id, passenger_id, user_mail) values (?, ?, ?)", [result2[0].booking_id, result3[0].passenger_id, req.session.email], (err, result4) => {
                                console.log(data.name)
                                res.render('booking.ejs', {
                                    flight_id: req.params.flight_id,
                                    schedule_id: req.params.schedule_id
                                })
                            })
                        })
                    })

                })

            }
        }

    })


})

app.post("/confirmation", (req, res)=>{
    const arr2 = req.body;
    
    console.log("hi");
    console.log(arr2);
    console.log(JSON.parse(arr2[0]));
    const new_arr=[]
    for(let i=0; i<arr2.length; i++)
    {
        new_arr.push(JSON.parse(arr2[i]))
    }
    console.log(new_arr);
})
app.get('/interbooking/:flight_id/:schedule_id/:passengers', (req, res) => {

   let obj = [
        
    
    ]
    for(let i=0; i< req.params.passengers; i++){
        // var Name=`name${i}`
       
        const object = JSON.stringify(req.query);
        const Name = `name`+`${i}`;
        const Email = `email`+`${i}`;
        const Class = 'class'+ `${i}`;
        const Mobile_no = `mobile_no`+`${i}`;
        const Aadhar_no = `aadhar_no`+`${i}`;
        // const {Name: name, Class: class_, Mobile_no: mobile_no, Aadhar_no: aadhar_no, flight_id, schedule_id} = req.query;
        obj.push(
            {
                name: req.query[Name],
                email: req.query[Email],
                class: req.query[Class],
                mobile_no: req.query[Mobile_no],
                aadhar_no: req.query[Aadhar_no],
                flight_id: req.params.flight_id,
                schedule_id: req.params.schedule_id
                
            }
        )
    }
    
    db.query("select af.arrival_schedule_id, r.to_route, r.from_route, f.airline, f.flight_id, af.terminal_of_arrival, af.economy_cost, af.business_cost, af.first_cost, af.arrival_time  from bookings as b join flight as f on f.flight_id=b.flight_id join arrival_flights as af on af.flight_id=b.flight_id  join route as r on r.route_id=af.route_id where af.flight_id=? and af.arrival_schedule_id=?", [obj[0].flight_id, obj[0].schedule_id], (err, result) => {
        if (err) console.log(err);
        result[0].arrival_time= moment(new Date(result[0].arrival_time)).format('YYYY-MM-DD HH:mm:ss')
        console.log(result)
        console.log(obj);
        console.log(obj.length);
        res.render('interbook.ejs', { result , passengers: req.params.passengers, obj})
    })
})
app.get('/airline/:to_route/:from_route/:arrival_time', (req, res) => {
    let input = {
        to: req.params.to_route,
        from: req.params.from_route,
        arrival_time: req.params.arrival_time,
        date: req.params.arrival_time,
        airline: req.query.choose_airline,
        sort_opt: req.query.sort_by_cond
    }
    // let input = req.body;
    console.log(input);
    if(req.params.to_route == 'no_value'){
        // console.log("i am here");
        input.to=""
    }
    if(input.from=="no_value"){
        input.from=""
    }
    if(input.date=='no_value'){
        console.log("yeah i am here");
        input.arrival_time=""
        input.date=""
    }
    console.log(input);
    input.arrival_time = convert(input.arrival_time)
    // console.log(input.arrival_time)
    console.log(input.to);

    let sql2 = "select f.flight_id, f.airline, r.from_route, r.to_route, af.arrival_time, af.duration, af.arrival_schedule_id, af.economy_cost, af.business_cost, af.first_cost from flight as f join arrival_flights as af on f.flight_id=af.flight_id join route as r on r.route_id=af.route_id where r.from_route like '%" + input.from + "%' and r.to_route like '%" + input.to + "%' and date(af.arrival_time) like '%" + input.arrival_time + "%' and f.airline like '%" + input.airline + "%' order by f.airline"
    let sql4 = `select f.flight_id, f.airline, r.from_route, r.to_route, af.arrival_time, af.duration, af.arrival_schedule_id, af.economy_cost, af.business_cost, af.first_cost from flight as f join arrival_flights as af on f.flight_id=af.flight_id join route as r on r.route_id=af.route_id where r.from_route like '%${input.from}%' and r.to_route like '%${input.to}%' and date(af.arrival_time) like '%${input.arrival_time}%' and f.airline like '%${input.airline}%' order by f.airline`
    let sql3 = "select f.flight_id, f.airline, r.from_route, r.to_route, af.arrival_time, af.duration, af.arrival_schedule_id, af.economy_cost, af.business_cost, af.first_cost from flight as f join arrival_flights as af on f.flight_id=af.flight_id join route as r on r.route_id=af.route_id where r.from_route like '%" + input.from + "%' and r.to_route like '%" + input.to + "%' and date(af.arrival_time) like '%" + input.arrival_time + "%' order by f.airline"

    console.log(input.to);
    console.log(input.from);
    console.log(input.date);
    console.log(input.airline);

    db.query(sql4, (err, results) => {
        if (err) console.log(err)
        console.log(results);
        console.log(input.sort_opt)

        if (results.length == 0) {
            res.render('find_flight.ejs', {date_result: true, flight_result: true})
        }
        else {

            db.query(sql3, (err, result3) => {
                for (let values of results) {
                    values.arrival_time = moment(new Date(values.arrival_time)).format('YYYY-MM-DD HH:mm:ss')
                }
                for (let values of result3) {
                    values.arrival_time = moment(new Date(values.arrival_time)).format('YYYY-MM-DD HH:mm:ss')
                }

                res.render('flight_output.ejs', { results, result3, result2: input.sort_opt, input})
            })
        }

    })


})

app.get('/output', (req, res) => {

    let nowdate= new Date();
    let input = {
        to: req.query.to,
        from: req.query.from,
        date: req.query.date,
        // airline: req.query.airline
    }
    let date2=new Date(input.date);
    if(nowdate>date2)
    {
        res.render('find_flight.ejs', {date_result: false})
    }
    else{
    // console.log(input.date);

    let sql = "select f.flight_id, f.airline, r.from_route, r.to_route, af.arrival_time, af.duration, af.arrival_schedule_id, af.economy_cost, af.business_cost, af.first_cost from flight as f join arrival_flights as af on f.flight_id=af.flight_id join route as r on r.route_id=af.route_id where r.from_route like '%" + input.from + "%' and r.to_route like '%" + input.to + "%' and date(af.arrival_time) like '%" + input.date + "%' order by f.airline "


    db.query(sql, (err, results) => {
        if (err) console.log(err)

        for (let values of results) {
            values.arrival_time = moment(new Date(values.arrival_time)).format('YYYY-MM-DD HH:mm:ss')
        }
        // console.log(results)
        if(results.length==0)
        {
            // req.session.err2="no such flights available"
            res.render('find_flight.ejs', {date_result: true, flight_result: false})
        }
        else{

            let result3 = results
            res.render('flight_output.ejs', { results, result3, result2: 'Cost' , input})
        }

    })

    }
})
app.get('/my_account', (req, res) => {

    if (req.session.email == undefined) {
        res.redirect('/sign_in')
    }

    let sql = `select * from tickets as t
    join login as l on l.email=t.user_mail join
     bookings as b on b.booking_id=t.booking_id  join
     arrival_flights as af on af.arrival_schedule_id=b.schedule_id join flight as f on f.flight_id=af.flight_id join route as r on r.route_id=af.route_id join passengers as p on p.passenger_id=t.passenger_id`
   
     console.log(req.session.email);
    db.query(sql, (err, results) => {
        if (err) console.log(err)
        for (let values of results) {
            values.arrival_time = moment(new Date(values.arrival_time)).format('YYYY-MM-DD HH:mm:ss')
        }
        console.log(results);
        res.render('my_account.ejs', { results })

    })

})

app.post('/newreview', (req, res) => {
    let ans = {
        airline: req.body.airline,
        review: req.body.review,
        username: req.body.username,
        rating: req.body.rating
    }
    console.log(ans);
    let sql2 = `select * from login as l where l.username='${ans.username}'`;
    db.query(sql2, (err, results) => {
        if (err) console.log(err);
        console.log(results);
        let sql = `insert into reviews(login_id, review, airline, rating) values (${results[0].login_id}, '${ans.review}', '${ans.airline}', ${ans.rating});`
        db.query(sql, (err, result2) => {
            if (err) console.log(err);
            db.query("select r.review, r.airline, l.username, r.rating from reviews as r join login as l on l.login_id=r.login_id", (err, result) => {
                res.render('amenities.ejs', { result })
            })
        })
    })

})
app.get('/showticket/:flight_id/:to_route/:from_route/:airline/:username/:terminal/:economy_cost/:business_cost/:first_cost/:class/:arrival_time', (req, res) => {
    let obj = {
        flight_id: req.params.flight_id,
        to_route: req.params.to_route,
        from_route: req.params.from_route,
        airline: req.params.airline,
        username: req.params.username,
        terminal: req.params.terminal,
        economy_cost: req.params.economy_cost,
        first_cost: req.params.first_cost,
        business_cost: req.params.business_cost,
        class: req.params.class,
        arrival_time: req.params.arrival_time
    }
    console.log(obj);
    res.render('show_ticket', { obj })
})

app.get('/cancel_ticket/:ticket_id', (req, res) => {
    let sql = `delete from tickets where ticket_id=${req.params.ticket_id}`
    let sql2 = `update arrival_flights as af join bookings as b on b.schedule_id=af.arrival_schedule_id join tickets as t on b.booking_id=t.booking_id set passenger_no=passenger_no-1 where t.ticket_id=${req.params.ticket_id}`
    db.query(sql2, (err, results3) => {
        if(err)console.log(err)
        db.query(sql, (err, results2) => {
            if(err)console.log(err)
            let sql3 = `select * from tickets as t
    join login as l on l.email=t.user_mail join
     bookings as b on b.booking_id=t.booking_id  join
     arrival_flights as af on af.arrival_schedule_id=b.schedule_id join flight as f on f.flight_id=af.flight_id join route as r on r.route_id=af.route_id join passengers as p on p.passenger_id=t.passenger_id where  t.user_mail='${req.session.email}'`
            // console.log(req.session.email);
            db.query(sql3, (err, results) => {
                if (err) console.log(err)

                res.render('my_account.ejs', { results })

            })
        })
    })
})

app.get('/navbar', (req, res) => {
    res.render('templates/partials/navbar.ejs')
})
app.get('/details', (req, res)=>{
    res.render('details.ejs')
})


app.get('/booking', (req, res) => {
    res.render('booking.ejs')
})
app.get('/reset', (req, res) => {
    let data = {
        name: req.query.username,
        age: req.query.age,
        country: req.query.country,
        phone: req.query.phone,
        address: req.query.address
    }
    let sql = `update login set username='${data.name}',age='${data.age}',country='${data.country}',address='${data.address}' where email='${req.session.email}';`

    db.query(sql, (err, results) => {
        if (err) console.log(err)

        res.render('reset.ejs', { results })

    })

})

app.listen(3000, () => {
    console.log("Listening on port 3000!");
    let i = 1;
    let a = 2;
    console.log(`${a}`+"."+"name"+`${i}`)
})