

        const startButton = document.getElementById('startButton'); //Gets each respective HTML Element
        const frequencyDisplay = document.getElementById('frequency');
        const noteDisplay = document.getElementById('note');
        const canvas = document.getElementById('noteChart');
        const ctx = canvas.getContext('2d');

        let audioContext; //A bunch of initailized variables to use later on
        let analyser;
        let microphone;
        let bufferLength;
        let dataArray;
        let isDetecting = false;

        let smoothedFrequency = 0; //A bunch of initailized variables to use later on
        const SMOOTHING_FACTOR = 0.2; 
        const MIN_FREQ = 293.66; //Min and Max frequencies can be changed to move up and down and octave.
        const MAX_FREQ = 783.99;
        let last_frequency = 294.66
        let frequencies = new Array(100).fill(0); // Stores past frequency values for the chart
        const frequencyToNoteMap = new Map([ //This is the map of places on the canvas each note will go. I split the canvas into 11 sections.
                    ["D4", 10],  
                    ["D#4", 10], 
                    ["E4", 9], 
                    ["F4", 8], 
                    ["F#4", 8],
                    ["G4", 7],
                    ["G#4", 7],
                    ["A4", 6],
                    ["A#4", 6],
                    ["B4", 5],
                    ["C5", 4],
                    ["C#5", 4],
                    ["D", 3],
                    ["D#5", 3], 
                    ["E5", 2],
                    ["F5", 1],
                    ["F#5", 1],
                    ["G5", 0],
            ])
        let notes = [ 5,6,7 ] //These are the notes you want to appear 
        let notesXY = []

        let currentX = 0; // Track the X position of the line
        let path = []; // Array to store the positions of the points

        clear()
        defineNotes(notes)
        drawNotes()

        startButton.addEventListener('click', async () => {
            let color = true
            if (!isDetecting) {
                //Resets the path of points used to draw the frequency line
                path = []; // Array to store the positions of the points
                startButton.style.background = '#ccc'; // Set background to default color
                clear()
                defineNotes(notes)
                drawNotes()

                //This will do a countdown
                let countdown = 1;
                const countdownInterval = setInterval(async() => {

                    if(color && countdown < 4){
                        console.log("here")
                        startButton.innerHTML = countdown;
                        startButton.style.background = "#FFBABA"
                        color = !color
                    }
                    else{
                        startButton.style.background = "#CCC"
                        color = !color
                        countdown++;
                    }
                    if (countdown > 4) {
                        clearInterval(countdownInterval); // Stop the countdown
                        startButton.innerHTML = '<i class="fas fa-microphone"></i>';
                        startButton.style.background = '#BFD5FF'; // Change background to green
                        isDetecting = true;
                        await startNoteDetection();
                    }
                }, 500); // Update every half second for blinking.

            } else {
                stopNoteDetection();
                startButton.style.background = '#ccc';                
                startButton.innerHTML = '<i class="fas fa-microphone"></i>';
                isDetecting = false;
                frequencyDisplay.textContent = '0';
                noteDisplay.textContent = 'None';
                frequencies.fill(0);
                path = []; // Array to store the positions of the points
                clear(); // Clear the chart
            }
        });

        //This initalizes everything from the web audio api and will start detecting notes
        async function startNoteDetection() {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                microphone = audioContext.createMediaStreamSource(stream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                microphone.connect(analyser);
                
                detectNote();
            } catch (err) {
                console.error("Error accessing audio:", err);
            }
        }

        //This disconnects microphone and stops note detection
        function stopNoteDetection() {
            if (microphone) {
                microphone.disconnect();
            }
            if (audioContext && audioContext.state === 'running') {
                audioContext.close();
            }
        }

        //This is what is actually called to get the frequency and then pass that to the drawChart function to draw the line.
        function detectNote() {
            if (!isDetecting) return;

            analyser.getByteFrequencyData(dataArray);
           
            let maxIndex = 0;
            for (let i = 1; i < bufferLength; i++) {
                if (dataArray[i] > dataArray[maxIndex]) {
                    maxIndex = i;
                }
                
            }
            const sampleRate = audioContext.sampleRate;
            let frequency = maxIndex * sampleRate / analyser.fftSize;
            // console.log(frequency)
            if(frequency < MIN_FREQ){
                frequency = last_frequency
            }
            if(frequency > MAX_FREQ){
                frequency = last_frequency
            }

            if(Math.abs(frequency-last_frequency) > 200){
                frequency = last_frequency
            }
            // console.log(last_frequency)
            if (frequency > MIN_FREQ && frequency < MAX_FREQ) {
                // Apply smoothing
                last_frequency = frequency
                smoothedFrequency = smoothedFrequency * (1 - SMOOTHING_FACTOR) + frequency * SMOOTHING_FACTOR;

                frequencyDisplay.textContent = smoothedFrequency.toFixed(2);
                noteDisplay.textContent = frequencyToNote(smoothedFrequency);

                // Update chart data
                frequencies.push(smoothedFrequency);
                if (frequencies.length > 100) {
                    frequencies.shift(); // Keep only the last 100 values
                }
                if(isDetecting == true){
                    drawChart(frequency);
                }
            }
            requestAnimationFrame(detectNote);
        }

        //This is a helper to convert the frequency inputted into the actual note. Was used early on but later phased out for mapping notes.
        function frequencyToNote(frequency) {
            const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
            const A4 = 440;
            const semitone = 12;
            const noteNumber = Math.round(69 + semitone * Math.log2(frequency / A4));
            const octave = Math.floor(noteNumber / 12) - 1;
            const note = noteNames[noteNumber % 12];
            return `${note}${octave}`;

        }


        //This draws the chart based on all the frequency lines plotted this far.
        function drawChart(frequency) {
            if (!isDetecting) return;

            // Only clear if currentX hasn't reached the end
            if (currentX < canvas.width) {
                clear();  // Clear the canvas only when still drawing
            }

            let place = 0;
            for (let [noteName, noteplace] of frequencyToNoteMap) {
                if (noteName === frequencyToNote(smoothedFrequency)) {
                    place = noteplace;
                }
            }

            let y = (canvas.height / 11 * place) + canvas.height / 22;
           
            
            path.push({ x: currentX, y: y });

            // Draw the path so far
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(42, 107, 230, 0.6)'; // Blue with 60% opacity
            ctx.lineWidth = 5;
            for (let i = 0; i < path.length - 1; i++) {
                ctx.moveTo(path[i].x, path[i].y);
                ctx.lineTo(path[i + 1].x, path[i + 1].y);
            }
            ctx.stroke();

            // Draw notes
            drawNotes(); //THis redraws the notes you are trying to hit. Will change them green if hit/

            // This marks when you hit one of the notes.
            for (let j = 0; j < notesXY.length; j++) {
                let targetX = notesXY[j][0];
                let targetY = notesXY[j][1];
                if (targetX + 5 > currentX && currentX > targetX - 5) {
                    if (targetY + 10 > y && y > targetY - 10) {
                        console.log("hit");
                        notesXY[j][2] = 1; // Mark as hit
                    }
                }
            }

            if (currentX < canvas.width) {
                currentX += 2; // You can adjust this speed
            }
            else{
                stopNoteDetection()
                startButton.style.background = '#ccc'; // Set background to default color
            }
        }

        //This takes our list of notes we want and makes an X,Y list of each one so then we can consistenly redraw them every frame.
        function defineNotes(listOfYs) {
            const radius = 15;
            const width = canvas.width;
            const spacing = width / (listOfYs.length + 1); // Spacing between notes
            let note_y = 0;

            notesXY = []; // Reset the notesXY array

            listOfYs.forEach((y, i) => {
                const x = spacing * (i + 1); // X position for each note
                
                // Y position calculation
                if (y > 5) {
                    note_y = (canvas.height / 11 * y) + canvas.height / 22;
                } else {
                    note_y = (canvas.height / 11 * y) + canvas.height / 22;
                }

                // Initialize notesXY with x, y, and hit state (0 means not hit)
                notesXY.push([x, note_y, 0]); 
            });
        }

        //This draws the notes we are trying to hit, black if unhit and green if hit.

        function drawNotes() {
            const radius = 15; // radius for the note head
            const stemLength = 60; // length of the stem
            const width = canvas.width;
            const spacing = width / (notesXY.length + 1);
            
            notesXY.forEach((note, i) => {
                const x = spacing * (i + 1); // X-coordinate of the note
                const y = note[1]; // Y-coordinate of the note head
                const hit = note[2];  // Whether the note is hit (for coloring)
                
                // Set the fill color based on whether the note is hit
                ctx.fillStyle = hit === 1 ? "green" : "black";
                
                // Draw the note head (ellipse)
                ctx.beginPath();
                ctx.ellipse(x, y, radius, radius, 0, 0, Math.PI * 2); // Draw the ellipse for the note head
                ctx.fill();
                
                // Draw the stem
                ctx.beginPath();
                ctx.moveTo(x+radius, y);  // Start the stem from the bottom of the note head
                ctx.lineTo(x+radius, y - stemLength); // Extend the stem downward
                ctx.strokeStyle = hit === 1 ? "green" : "black";
                ctx.lineWidth = 2; // Stem width
                ctx.stroke();
            });
        }


        //This clears and resets things. It happens fairly consistently and then things are redrawn. There is likely a more efficient way to do this.
        function clear() {
          
            canvas.width = canvas.clientWidth; // Adjust to container size
            canvas.height = canvas.clientHeight;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawNotes(notes)
            // Draw staff lines
            ctx.strokeStyle = "#888";
            ctx.lineWidth = 1;
            for (let i = 1; i <= 5; i++) {
                let y = (canvas.height / 6) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
            
            
        }

        // const notesX = [100, 200, 300]; // example values
        const threshold = 2; // pixels of tolerance
        const sound1 = new Audio("static/first note.mp3");
        const sound2 = new Audio("static/second note.mp3");
        const sound3 = new Audio("static/third note.mp3");
        let hasPlayedAtX = {}; // to avoid playing the same note repeatedly
        let animationId = null;
        let lineX = 0;

        function drawMovingLine() {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
            clear();

            // Draw vertical blue line
            ctx.strokeStyle = "blue";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lineX, 0);
            ctx.lineTo(lineX, canvas.height);
            ctx.stroke();

            // 🔊 Check for hit
            notesXY.forEach(x => {
                if (Math.abs(lineX - x[0]+30) < threshold && !hasPlayedAtX[x[0]]) {
                    if(x == notesXY[0]){
                        sound1.pause();
                        sound1.currentTime = 0;
        
                        sound2.pause();
                        sound2.currentTime = 0;
        
                        sound3.pause();
                        sound3.currentTime = 0;
                        sound1.play();
                        setTimeout(() => {
                            sound1.pause();
                            sound1.currentTime = 0;
                        }, 1000); // Delay in milliseconds
                        hasPlayedAtX[x[0]] = true;
                    }
                    if(x == notesXY[1]){
                        sound1.pause();
                        sound1.currentTime = 0;
        
                        sound2.pause();
                        sound2.currentTime = 0;
        
                        sound3.pause();
                        sound3.currentTime = 0;
                        sound2.play();
                        setTimeout(() => {
                            sound2.pause();
                            sound2.currentTime = 0;
                        }, 1000); // Delay in milliseconds
                        hasPlayedAtX[x[0]] = true;
                    }
                    if(x == notesXY[2]){
                        sound1.pause();
                        sound1.currentTime = 0;
        
                        sound2.pause();
                        sound2.currentTime = 0;
        
                        sound3.pause();
                        sound3.currentTime = 0;
                        sound3.play();
                        setTimeout(() => {
                            sound3.pause();
                            sound3.currentTime = 0;
                        }, 1000); // Delay in milliseconds
                        hasPlayedAtX[x[0]] = true;
                    }
                    
                }
                   
            });

            // Move line to the right
            lineX += 2;

            // Wrap around if it reaches the end
            if (lineX >= canvas.width) {
                sound1.pause();
                sound1.currentTime = 0;

                sound2.pause();
                sound2.currentTime = 0;

                sound3.pause();
                sound3.currentTime = 0;
                clear();
                // lineX = 0;
                // hasPlayedAtX = {}; // reset for a new loop
            }

            // Keep animating
            animationId = requestAnimationFrame(drawMovingLine);
        }

        document.getElementById("soundButton").addEventListener("click", () => {
            if (animationId === null) {
                drawMovingLine(); // Start animation
            }
        });
