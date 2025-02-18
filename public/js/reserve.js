/* Global Values */

let protoc = await fetch("/getCredentials");
let creds = await protoc.json();

/**
 * 0 - Guest
 * 1 - Normal
 * 2 - Admin
 * 3 - Error
 */
let credLevel = creds.credLevel;
let credEmail = creds.email;

let topForm = document.forms.topForm;

let protol = await fetch("/getLabs");
let labs = await protol.json();

let protor = await fetch("/getReservations");
let reservations = await protor.json();

const urlParams = new URLSearchParams(window.location.search);
const editID = urlParams.get("edit");

let editReservation = null

if (editID != null) {
    editReservation = reservations.filter(function (el) {
        return el.reservationID == editID;
    }
    )[0];
    let newArray = reservations.filter(function (el) {
        return el.reservationID != editID;
    }
    );
    reservations = newArray;
}

pageStartUp();

/* Start Up the Page */
async function pageStartUp() {

    await initializeTopForm();
    await updateCenter(0);
    initializeCenterListener();

    if (editID != null) {
        const lab = editReservation.labSeat.lab;
        const seat = editReservation.labSeat.seat;
        const date = editReservation.reservedDateAndTime.date;
        const startTime = editReservation.reservedDateAndTime.startTime;
        const endTime = editReservation.reservedDateAndTime.endTime;
        
        document.getElementById("labForm").value = lab;
        document.getElementById("dateForm").value = date;
        
        document.getElementById("timeForm").value = startTime;
        
        document.getElementById("timeFormEnd").value = endTime;
        await updateCenter([seat.substring(0, 1), seat.substring(1, 2), seat.substring(2, 3)]);
        updateBottom((new FormData(topForm).get("timeForm")), (new FormData(topForm).get("timeFormEnd")));
    }

}

/* Initialize Options for TopForm */
async function initializeTopForm() {
    await initializeTopFormLab();
    initializeTopFormDate();
    initializeTopFormTime();
}

/* Add Form Options for "Lab" */
async function initializeTopFormLab() {
    /* Add Options Based on Labs in DB */
    document.getElementById("labForm").innerHTML = "";

    for (let lab of labs) {
        document.getElementById("labForm").innerHTML += `<option value = "${lab.labCode}">${lab.labCode}</option>`;
    }

    /* Add EventListener to Change Center and Reserved */
    document.getElementById("labForm").addEventListener("change", async (e) => {
        await updateCenter(-1);
        hideBottom();

    });
    //  updateCenter(-1);//TODO: check if this is needed, if not remove,see if when we make other functions here async if rendering gets delayed
}

/* Add Form Options for "Date" */
function initializeTopFormDate() {
    document.getElementById("dateForm").innerHTML = "";

    const today = new Date();

    let result = new Date(today);
    result.setDate(result.getDate() + 7);

    let tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    document.getElementById("dateForm").setAttribute("value", tomorrow.toISOString().split("T")[0]);
    document.getElementById("dateForm").setAttribute("min", today.toISOString().split("T")[0]);
    document.getElementById("dateForm").setAttribute("max", result.toISOString().split("T")[0]);

    document.getElementById("dateForm").addEventListener("change", async (e) => {
        await updateCenter(-1);
        hideBottom();
    });
}

/* Add Form Options for "Time" */
function initializeTopFormTime() {
    document.getElementById("timeForm").innerHTML = "";
    document.getElementById("timeFormEnd").innerHTML = "";
    // Start at 8AM and end at 8PM.
    for (let t = 16; t < 40; t++) {
        let hour = Math.floor(t / 2) % 12;
        if (hour == 0)
            hour = 12;
        if (hour < 10) {
            hour = "0" + hour;
        }
        let minute = (t % 2) * 30;
        if (minute == 0) {
            minute = "00";
        }
        let ampm = (Math.floor(t / 2) < 12) ? "AM" : "PM";
        document.getElementById("timeForm").innerHTML += `<option value = "${t}">${hour}:${minute} ${ampm}</option>`;
    }
    for (let t = 16; t < 40; t++) {
        let hour = Math.floor((t + 1) / 2) % 12;
        if (hour == 0)
            hour = 12;
        if (hour < 10) {
            hour = "0" + hour;
        }
        let minute = ((t + 1) % 2) * 30;
        if (minute == 0) {
            minute = "00";
        }
        let ampm = (Math.floor((t + 1) / 2) < 12) ? "AM" : "PM";
        document.getElementById("timeFormEnd").innerHTML += `<option value = "${t}">${hour}:${minute} ${ampm}</option>`;
    }
    document.getElementById("timeFormEnd").value = 39;
    document.getElementById("timeForm").addEventListener("change", async (e) => {
        hideBottom();
        if (document.getElementById("timeFormEnd").value < document.getElementById("timeForm").value) {
            document.getElementById("timeFormEnd").value = document.getElementById("timeForm").value;
        }
        await updateCenter(-1);
    });
    document.getElementById("timeFormEnd").addEventListener("change", async (e) => {
        hideBottom();
        if (document.getElementById("timeFormEnd").value < document.getElementById("timeForm").value) {
            document.getElementById("timeForm").value = document.getElementById("timeFormEnd").value;
        }
        await updateCenter(-1);
    });
}

/* Update the Center Seating Display */
async function updateCenter(clickedPosition) {
    await updateCenterTables();
    await updateCenterListeners();
    updateCenterClicked(clickedPosition);
    await updateCenterReserved();
}

/* Create the Tables that will Represent the Seatings */
async function updateCenterTables() {
    document.getElementById("center").innerHTML = "";
    let tablesToAdd = [];
    for (let l of labs) {
        if (l.labCode == new FormData(topForm).get("labForm")) {
            tablesToAdd = l.labTables;
        }
    }

    /*tables of a specific lab
    for (let t of tables) {
        if (t.lab == (new FormData(topForm)).get("labForm")) {
            tablesToAdd.push(t);
        }
    }*/
    for (let t = 0; t < tablesToAdd.length; t++) {
        let insert = "";
        let table = tablesToAdd[t];

        insert += `<div class = "centerTable" style = "grid-template-columns: repeat(${table.columns}, 1fr);">`;

        for (let r = 0; r < table.rows; r++) {
            for (let c = 0; c < table.columns; c++) {
                insert += `<div id = "${t}${r}${c}" class= "seat"></div>`;
            }
        }
        insert += "</div>";

        document.getElementById("center").innerHTML += insert;
    }
}

/* Create the EventListeners for Each Seat in the Display */
async function updateCenterListeners() {
    let tablesToAdd = [];
    for (let l of labs) {
        if (l.labCode == new FormData(topForm).get("labForm")) {
            tablesToAdd = l.labTables;
        }
    }

    for (let t = 0; t < tablesToAdd.length; t++) {
        let table = tablesToAdd[t];
        for (let r = 0; r < table.rows; r++) {
            for (let c = 0; c < table.columns; c++) {
                document.getElementById(`${t}${r}${c}`).addEventListener("click", async (e) => {
                    await updateCenter([t, r, c]);
                    updateBottom((new FormData(topForm).get("timeForm")), (new FormData(topForm).get("timeFormEnd")));
                })
            }
        }
    }
}

/* Update the Reserved Seats to be Red */
async function updateCenterReserved() {
    /* Remove all currently reserved seats. */
    const allReserved = document.querySelectorAll("reservedSeat");
    allReserved.forEach((element) => {
        element.classList.remove("reservedSeat");
    });

    /* For each reservation, check if they apply then color red if applicable. */
    for (let r of reservations) {
        // Check if same lab...
        if ((new FormData(topForm)).get("labForm") == r.labSeat.lab) {
            // Check if same date...
            if ((new FormData(topForm)).get("dateForm") == r.reservedDateAndTime.date) {
                // Check if same time...
                const timeForm = new FormData(topForm).get("timeForm");
                const timeFormEnd = new FormData(topForm).get("timeFormEnd");
                let occupiedTime = [];

                for (let i = timeForm; i <= timeFormEnd; i++) {
                    occupiedTime.push(parseInt(i));
                }

                for (let reserves of reservations) {
                    // Check if same lab...
                    if ((new FormData(topForm)).get("labForm") == reserves.labSeat.lab && reserves.labSeat.seat == r.labSeat.seat) {
                        // Check if same date...
                        if ((new FormData(topForm)).get("dateForm") == reserves.reservedDateAndTime.date && reserves.reservedDateAndTime.date == r.reservedDateAndTime.date) {
                            // Check if same time...
                            if (reserves.labSeat.seat == r.labSeat.seat) {
                                for (let i = reserves.reservedDateAndTime.startTime; i <= reserves.reservedDateAndTime.endTime; i++) {
                                    if (occupiedTime.indexOf(parseInt(i)) != -1) {
                                        occupiedTime.splice(occupiedTime.indexOf(parseInt(i)), 1);
                                    }
                                }
                            }
                        }
                    }
                }

                const noOfSeats = timeFormEnd - timeForm + 1;

                let now = document.getElementById(`${r.labSeat.seat}`);

                if (noOfSeats != 1) {
                    const huePercentageAdd = 100 / (noOfSeats - 1);
                    let huePercentage = 0;
                    let gradientStyle = `linear-gradient(90deg`;
                    for (let i = timeForm; i <= timeFormEnd; i++) {
                        if (occupiedTime.indexOf(parseInt(i)) === -1) {
                            gradientStyle += `, rgba(203,8,8,1) ${huePercentage}%`;
                        } else if (occupiedTime.indexOf(parseInt(i)) !== -1) {
                            gradientStyle += `, rgba(0,128,0,1) ${huePercentage}%`;
                        }
                        huePercentage += huePercentageAdd;
                    }
                    gradientStyle += `)`;

                    now.style.background = gradientStyle;
                    now.classList.add("reservedSeat");
                }
                else {
                    if (occupiedTime.indexOf(parseInt(timeForm)) === -1) {
                        now.style.background = "rgb(203,8,8)";
                    } else {
                        now.style.background = "green";
                    }
                    now.classList.add("reservedSeat");
                }
            }
        }
    }
}

/* Update the Clicked Seat to be Darker */
function updateCenterClicked(clickedPosition) {
    // -1 is a special value indicating to remove the currently clicked seat.
    // 0 is a special value indicating to do nothing.

    if (clickedPosition == -1) {
        const pastClicked = document.querySelectorAll("clickedSeat");
        pastClicked.forEach((element) => {
            element.classList.remove("clickedSeat");
        });
    }

    if (clickedPosition != -1 && clickedPosition != 0) {
        let nowClicked = document.getElementById(`${clickedPosition[0]}${clickedPosition[1]}${clickedPosition[2]}`);
        nowClicked.classList.add("clickedSeat");
    }
}

/* Initialize the EventListener for clicking outside the seats but still within
the center. This should cause the bottom panel to be hidden from view. */
function initializeCenterListener() {
    let center = document.getElementById("center");
    center.addEventListener("click", async (e) => {
        if (!e.target.classList.contains("seat")) {
            hideBottom();
            await updateCenter(-1);
        }
    });
}

/* Delete contents of "bottom" and hide it. */
function hideBottom() {
    document.getElementById("bottom").innerHTML = "";
    document.getElementById("bottom").classList.add("hidden");
}

/* Update contents of "bottom" based on the seat clicked in the center panel and the clicked timeslot. */
async function updateBottom(clickedSlotStart, clickedSlotEnd) {

    hideBottom();
    document.getElementById("bottom").classList.remove("hidden");

    updateBottomTables();
    await updateBottomReserved();
    updateBottomListeners();
    updateBottomConfirmListener();

    /* Check if interval has reserved seat. */
    let clickedSlotReserved = -1;
    for (let x = clickedSlotStart; x <= clickedSlotEnd; x++) {
        if (document.getElementById(`S${x}`).classList.contains("reservedSlot")) {
            clickedSlotReserved = x;
            break;
        };
    }

    /* If it doesn't, click the start and end slots. */
    if (clickedSlotReserved == -1) {
        await updateBottomClicked(clickedSlotStart);
        await updateBottomClicked(clickedSlotEnd);
    }
    /* If it does, click the reserved slot. */
    else {
        await updateBottomClicked(clickedSlotReserved);
    }

}

/* Create and insert all html code for the content in the bottom panel. */
function updateBottomTables() {
    let insert = "";

    /* First, add the details on the left side of the bottom panel. */
    insert += `<div id = "bottomDetails"><div>Seat No: <span id = "bottomDetailsSeat">${document.querySelector(`.clickedSeat`).id}</span></div>`;
    insert += `<div>Lab Room: <span id = "bottomDetailsLab">${(new FormData(topForm).get("labForm"))}</span></div>`;
    insert += `<div>Date: <span id = "bottomDetailsDate">${(new FormData(topForm).get("dateForm"))}</span></div></div>`;

    /* Then, add the table in the center to represent the slots of that seat. */
    insert += `<div id = "bottomTableContainer"><table><tr>`;
    // Start at 8AM and end at 8PM.
    for (let t = 8; t < 20; t++) {
        let hour = t % 12;
        if (hour == 0)
            hour = 12;
        if (hour < 10) {
            hour = "0" + hour;
        }
        let ampm = (t < 12) ? "AM" : "PM";

        insert += `<td colspan = "2">${hour}${ampm}</td>`;
    }
    insert += "</tr><tr>";
    for (let t = 16; t < 40; t++) {
        insert += `<td id = "S${t}" class = "slot tooltip"><span class="tooltiptext">${formatTime(t)} - ${formatTime(t + 1)}</span></td>`;
    }
    insert += `</tr><tr><td colspan = "14"><span id = "bottomDetailsSelected">Selected Time: <span id = "bottomDetailsSelectedTime"><span id = "startTime">--:-- --</span> to <span id = "endTime">--:-- --</span></span></span></td>`;
    insert += `<td colspan = "10"><span id = "bottomDetailsReserver">Reserved By: <span id = "reserver">None</span></span></td></tr>`;
    insert += `</tr></table></div>`;

    /* Lastly, add the button to submit and checkbox to submit as anonymous on the right side. */
    if (credLevel == 0) {
        insert += `<div id = "bottomForm"><form><input type = "submit" name = "submit" id = "submit" value = "Login to Reserve A Slot" disabled>`
    } else if (credLevel == 1) {
        insert += `<div id = "bottomForm"><form><input type = "submit" name = "submit" id = "submit" value = "Confirm Reservation" disabled>`
        insert += `<div id = "bottomForm"><form><input style = "display:none" type = "submit" name = "submit2" class="small" id = "submit2" value = "Edit Reservation">`
        insert += `<br><div id = "checkboxContainer"><input type = "checkbox" name = "anonymous" id = "anonymous">`
        insert += `<label id = "anonyLabel" for = "checkbox">Anonymous?</label><div></form>`;
    } else if (credLevel == 2) {
        insert += `<div id = "bottomForm"><form><div id = "walkInContainer"><label for = "walkIn"></label></label>Walk-In:</label>`;
        insert += `<input type = "text" name = "walkIn" id = "walkIn" placeholder="Email"></div>`;
        insert += `<input type = "submit" name = "submit" id = "submit" value = "Confirm Reservation" disabled>`
        insert += `<input style = "display:none" type = "submit" name = "submit2" id = "submit2" class="small" value = "Edit Reservation">`
        insert += `<div id = "checkboxContainer"><input type = "checkbox" name = "anonymous" id = "anonymous">`
        insert += `<label id = "anonyLabel" for = "checkbox">Anonymous?</label><div></form>`;
    }

    document.getElementById("bottom").innerHTML += insert;
}

/* Based on current reservations, mark all reserved slots as "reservedSlots" to make them red. */
async function updateBottomReserved() {
    for (let r of reservations) {
        let clickedSeat = document.querySelector(".clickedSeat");
        if (clickedSeat != null) {
            if (clickedSeat.id == r.labSeat.seat) {
                if (r.reservedDateAndTime.date == (new FormData(topForm)).get("dateForm")) {
                    if (r.labSeat.lab == (new FormData(topForm)).get("labForm")) {
                        for (let i = r.reservedDateAndTime.startTime; i <= r.reservedDateAndTime.endTime; i++) {
                            document.getElementById(`S${i}`).classList.add("reservedSlot");
                        }
                    }
                }
            }
        }
    }
}

/* Create the EventListeners for all slots in the table. */
function updateBottomListeners() {
    let allSlots = document.querySelectorAll(".slot");
    allSlots.forEach((element) => {
        element.addEventListener("click", (e) => {
            updateBottomClicked(element.id.slice(1));
        });
    });
}

function updateBottomConfirmListener() {
    if (credLevel == 1 || credLevel == 2) {
        document.getElementById("submit").addEventListener("click", async (e) => {
            e.preventDefault();

            if (e.target.value == "Confirm Reservation") {
                let clickedSeat = document.querySelector(".clickedSeat");

                let rangeTime = document.getElementsByClassName("clickedSlot");
                let clickedStart = parseInt(rangeTime[0].id.substring(1));
                let clickedEnd = parseInt(rangeTime[rangeTime.length - 1].id.substring(1));
                let clickedDate = (new FormData(topForm)).get("dateForm");
                let clickedLab = (new FormData(topForm)).get("labForm");
                let clickedAnonymous = document.getElementById("anonymous").checked;
                let clickedEmail = credEmail;
                let currentTime = new Date();
                let currentDate = currentTime.getDate();
                let walkInStudent = null;

                // -2 for normal users, -1 for admin but invalid, others for admin but valid.
                let walkInValid = -2;
                if (credLevel == 2) {
                    walkInStudent = document.getElementById("walkIn").value;
                    walkInValid = walkInStudent.search("@dlsu.edu.ph");
                }

                //get current date in the format YYYY-MM-DD
                if (currentDate < 10) {
                    currentDate = "0" + currentDate;
                }
                let currentMonth = currentTime.getMonth() + 1;
                if (currentMonth < 10) {
                    currentMonth = "0" + currentMonth;
                }
                let currentYear = currentTime.getFullYear();
                currentDate = `${currentYear}-${currentMonth}-${currentDate}`;


                //get current time in hours and minutes
                let currentHours = currentTime.getHours();
                let currentMinutes = currentTime.getMinutes();
                let morning = true;
                if (currentHours > 12) {
                    currentHours -= 12;
                    morning = false;
                }
                if (currentMinutes < 10) {
                    currentMinutes = "0" + currentMinutes;
                }
                let currentFullTime = `${currentHours}:${currentMinutes} ${morning ? "AM" : "PM"}`;//`12:00 AM
                //get current date

                let clickedReservation = {
                    email: clickedEmail,
                    labSeat: {
                        lab: clickedLab,
                        seat: clickedSeat.id
                    },
                    reservedDateAndTime: {
                        date: clickedDate,
                        startTime: clickedStart,
                        endTime: clickedEnd
                    },
                    requestDateAndTime: {
                        date: currentDate,
                        startTime: currentFullTime
                    },
                    isAnonymous: clickedAnonymous,
                    walkInStudent
                };

                if (walkInValid != -1) {
                    if (editID == null) {
                        let response = await fetch("/addReservation", {
                            method: "POST",
                            body: JSON.stringify(clickedReservation),
                            headers: {
                                Accept: "application/json, text/plain, */*",
                                "Content-Type": "application/json"
                            }
                        });
                        if (response.status == 201) {
                            alert("Reservation successful.");
                            window.location.assign("reserve.html");
                        }
                        else {
                            alert("Reservation failed. Please try again.");
                            window.location.assign("reserve.html");
                        }
                    } else {
                        clickedReservation.reservationID = editID;
                        let response = await fetch("/editReservation", {
                            method: "PUT",
                            body: JSON.stringify(clickedReservation),
                            headers: {
                                Accept: "application/json, text/plain, */*",
                                "Content-Type": "application/json"
                            }
                        });
                        if (response.status == 201) {
                            alert("Edit successful.");
                            window.location.assign("reserve.html");
                        }
                        else {
                            alert("Edit failed. Please relog and try again.");
                            window.location.assign("reserve.html");
                        }
                    }
                } else {
                    alert("Please input a valid dlsu email for the walk-in student.");
                }


            } else if (e.target.value == "Delete Reservation") {
                //TODO: Add Check for valid time for delete reservation here (also check if they are admin or user cuz that will affect when they can edit).
                let rID = 0;
                const slot = document.querySelector(".reservedSlot.clickedSlot").id.substring(1);

                let valid=true;
                for (let r of reservations) {
                    if (document.querySelector(".clickedSeat").id == r.labSeat.seat) {
                        if ((new FormData(topForm)).get("dateForm") == r.reservedDateAndTime.date) {
                            if (slot >= r.reservedDateAndTime.startTime && slot <= r.reservedDateAndTime.endTime) {
                                if ((new FormData(topForm)).get("labForm") == r.labSeat.lab) {
                                    rID = r.reservationID;
                                    break;
                                }
                            }
                        }
                    }
                }
                if(credLevel==1){
                    for (let r of reservations) {
                        if (r.reservationID == rID) {
            
                            let today = new Date();
                            let yearNow = today.getFullYear();
                            let dayNow = today.getDate();
                            let monthNow = today.getMonth() + 1;
            
                            let resDate = new Date(r.reservedDateAndTime.date);
                            let yearRes = resDate.getFullYear();
                            let dayRes = resDate.getDate();
                            let monthRes = resDate.getMonth() + 1;
            
                            if (yearRes < yearNow) {
                                alert("You cannot delete a reservation that has already passed!");
                                valid = false;
                            }
                            else if (yearRes == yearNow && monthRes < monthNow) {
                                alert("You cannot delete a reservation that has already passed!");
                                valid = false;
                            }
                            else if (yearRes == yearNow && monthRes == monthNow && dayRes <= dayNow) {
                                alert("You cannot delete a reservation that has already passed! Or one that is on the same day.");
                                valid = false;
                            }
                        }
                    }
                }

                if(credLevel==2){
                    for(let r of reservations){
                        if(rID == r.reservationID){
                            let today = new Date();
                            let resDate= new Date(r.reservedDateAndTime.date);
                            let yearRes = resDate.getFullYear();
                            let dayRes = resDate.getDate();
                            let monthRes = resDate.getMonth()+1;
                            let startTimeRes = r.reservedDateAndTime.startTime;
            
                            //formatting the time of reservation to +10 minutes
                            let minutes = startTimeRes % 2;
                            startTimeRes /= 2;
                            let startTimeResHour = Math.floor(startTimeRes);
                            let startTimeResMin;
                            if (minutes == 0) {
                                startTimeResMin =10;
                            }
                            else {
                                startTimeResMin = 40;
                            }
                            startTimeRes= startTimeRes;
                            
                            resDate= new Date(yearRes, monthRes-1, dayRes, startTimeResHour, startTimeResMin);
                            
                            if(resDate>today){
                                alert("You cannot delete a reservation that has not started yet!");
                                valid = false;
                            }
                        }//marker
                    }
                }


                if(valid==true){
                    let result=confirm("Are you sure you want to delete this reservation?");
                    if(result==true){
                        let response = await fetch("/deleteReservation", {
                            method: "DELETE",
                            body: JSON.stringify({ reservationID: rID }),
                            headers: {
                                Accept: "application/json, text/plain, */*",
                                "Content-Type": "application/json"
                            }
                        });
                        if (response.status == 201) {
                            alert("Deletion successful.");
                            window.location.assign("reserve.html");
                        }
                        else {
                            alert("Deletion failed. Please try again.");
                            window.location.assign("reserve.html");
                        }
                    }
                }
            }
        });
        document.getElementById("submit2").addEventListener("click", async (e) => {
            //TODO: Add Check for valid time for editing reservation here (also maybe check if they are admin or user cuz that will affect when they can edit).
            e.preventDefault();
            let rID = 0;
            const slot = document.querySelector(".reservedSlot.clickedSlot").id.substring(1);
            
            let valid=true;
            for (let r of reservations) {
                if (document.querySelector(".clickedSeat").id == r.labSeat.seat) {
                    if ((new FormData(topForm)).get("dateForm") == r.reservedDateAndTime.date) {
                        if (slot >= r.reservedDateAndTime.startTime && slot <= r.reservedDateAndTime.endTime) {
                            if ((new FormData(topForm)).get("labForm") == r.labSeat.lab) {
                                rID = r.reservationID;
                                break;
                            }
                        }
                    }
                }
            }
            for (let r of reservations) {  
                if (r.reservationID == rID) {
                    let today = new Date();
                    let yearNow = today.getFullYear();
                    let dayNow = today.getDate();
                    let monthNow = today.getMonth()+1;
    
                    let resDate = new Date(r.reservedDateAndTime.date);
                    let yearRes = resDate.getFullYear();
                    let dayRes = resDate.getDate();
                    let monthRes = resDate.getMonth()+1;
                    
                    if (yearRes < yearNow) {
                        alert("You cannot edit a reservation that has already passed!");
                        valid = false;
                    }
                    else if (yearRes == yearNow && monthRes < monthNow) {
                        alert("You cannot edit a reservation that has already passed!");
                        valid = false;
                    }
                    else if (yearRes == yearNow && monthRes == monthNow && dayRes <= dayNow) {
                        alert("You cannot edit a reservation that has already passed! Or one on the same day.");
                        valid = false;
                    }
                }
            }
            if(valid==true){
                let result=confirm("Are you sure you want to edit this reservation?");
                if(result==true){   
                    window.location.assign(`reserve.html?edit=${rID}`)
                }
            }
        })
    } else if (credLevel == 0) {
        const resLogin = document.getElementById("submit");
        resLogin.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.assign("index.html");
        })
    }
}


/* Triggers when a slot is clicked. Updates which slots in the table are clicked based on what was clicked before. */
async function updateBottomClicked(clickedSlot) {
    document.getElementById("submit").value = "Confirm Reservation";
    document.getElementById("submit").classList.remove("small");
    if(credLevel!=0){
        document.getElementById("submit2").style.display = "none";
        document.getElementById("checkboxContainer").style.display = "inline";
    }else{
        document.getElementById("submit").value = "Login to Reserve A Slot";
    }
    if (document.getElementById("walkInContainer") != null) {
        document.getElementById("walkIn").value = ""
        document.getElementById("walkInContainer").style.display = "flex";
    }
    if (credLevel == 2 && editID != null) {
        document.getElementById("walkInContainer").style.display = "none";
        document.getElementById("walkIn").value = "temp@dlsu.edu.ph"
        document.getElementById("anonymous").style.display = "none";
        document.getElementById("anonyLabel").style.display = "none";
    }

    /* If the slot clicked is a reserved slot... */
    if (document.getElementById(`S${clickedSlot}`).classList.contains("reservedSlot")) {
        /* Remove all currently "clicked" and "selecting" slots. */
        document.querySelectorAll(".clickedSlot, .selectingSlot").forEach((element) => {
            element.classList.remove("clickedSlot", "selectingSlot");
        });
        /* Find the reservation that matches the clicked slot. */
        var email = null
        for (let r of reservations) {
            if (document.querySelector(".clickedSeat").id == r.labSeat.seat) {
                // Check if same date...
                if ((new FormData(topForm)).get("dateForm") == r.reservedDateAndTime.date) {
                    // Check if same time...
                    if (clickedSlot >= r.reservedDateAndTime.startTime && clickedSlot <= r.reservedDateAndTime.endTime) {
                        // Check if same lab...
                        if ((new FormData(topForm)).get("labForm") == r.labSeat.lab) {
                            for (let i = r.reservedDateAndTime.startTime; i <= r.reservedDateAndTime.endTime; i++) {
                                let now = document.getElementById(`S${i}`);
                                now.classList.add("clickedSlot");
                            }
                            if (r.isAnonymous) {
                                document.getElementById("reserver").innerHTML = "Anonymous";
                            } else {
                                if (r.walkInStudent == null) {
                                    document.getElementById("reserver").innerHTML = `<a href = search_profile.html?username=${r.email}>${r.email}</a>`;
                                } else {
                                    document.getElementById("reserver").innerHTML = `${r.walkInStudent} (${r.email})`;
                                }
                            }
                            email = r.email;
                            document.getElementById("startTime").innerHTML = formatTime(r.reservedDateAndTime.startTime);
                            document.getElementById("endTime").innerHTML = formatTime(r.reservedDateAndTime.endTime + 1);
                            break;
                        }
                    }
                }
            }
        }
        if (credLevel == 0)
            document.getElementById("submit").disabled = true;
        else if (credLevel == 1) {
            if (email != credEmail)
                document.getElementById("submit").disabled = true;
            else {
                document.getElementById("submit").disabled = false;
                document.getElementById("submit").value = "Delete Reservation";
                document.getElementById("submit").classList.add("small");
                document.getElementById("submit2").style.display = "inline";
                document.getElementById("checkboxContainer").style.display = "none";
            }
        }
        else {
            document.getElementById("submit").disabled = false;
            document.getElementById("submit").value = "Delete Reservation";
            document.getElementById("submit").classList.add("small");
            document.getElementById("submit2").style.display = "inline";
            document.getElementById("checkboxContainer").style.display = "none";
            document.getElementById("walkInContainer").style.display = "none";
        }
    }
    /* If the slot clicked is NOT a reserved slot and they HAVEN'T selected a slot (dark green) before... */
    else if (document.querySelector(".selectingSlot") == null) {
        document.getElementById(`S${clickedSlot}`).classList.add("selectingSlot");
        document.querySelectorAll(".clickedSlot").forEach((element) => {
            element.classList.remove("clickedSlot");
        });
        document.getElementById("reserver").innerHTML = "None";
        document.getElementById("submit").disabled = true;
        document.getElementById("startTime").innerHTML = "--:-- --";
        document.getElementById("endTime").innerHTML = "--:-- --";
    }
    /* If the slot clicked is NOT a reserved slot and they HAVE selected a slot (dark green) before... */
    else {
        let lastSelected = document.querySelector(".selectingSlot").id.slice(1);
        document.querySelector(".selectingSlot").classList.remove("selectingSlot");
        if (lastSelected < clickedSlot) {
            let actualEnd = 0;
            for (let i = lastSelected; i <= clickedSlot; i++) {
                if (document.getElementById(`S${i}`).classList.contains("reservedSlot")) {
                    break;
                }
                document.getElementById(`S${i}`).classList.add("clickedSlot");
                actualEnd = i;
            }
            document.getElementById("startTime").innerHTML = formatTime(lastSelected);
            document.getElementById("endTime").innerHTML = formatTime(parseInt(actualEnd) + 1);
        } else {
            let actualEnd = 0;
            for (let i = lastSelected; i >= clickedSlot; i--) {
                if (document.getElementById(`S${i}`).classList.contains("reservedSlot")) {
                    break;
                }
                document.getElementById(`S${i}`).classList.add("clickedSlot");
                actualEnd = i;
            }
            document.getElementById("startTime").innerHTML = formatTime(actualEnd);
            document.getElementById("endTime").innerHTML = formatTime(parseInt(lastSelected) + 1);
        }
        document.getElementById("reserver").innerHTML = "None";
        document.getElementById("submit").disabled = false;
    }
}

function formatTime(t) {
    let hour = Math.floor(t / 2) % 12;
    if (hour == 0)
        hour = 12;
    if (hour < 10) {
        hour = "0" + hour;
    }
    let minute = (t % 2) * 30;
    if (minute == 0) {
        minute = "00";
    }
    let ampm = (Math.floor(t / 2) < 12) ? "AM" : "PM";
    return "" + hour + ":" + minute + " " + ampm;
}